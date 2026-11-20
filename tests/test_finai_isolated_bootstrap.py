#!/usr/bin/env python3
"""Focused local tests for the dedicated FinAI bootstrap path checks."""
import os
import hashlib
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'ops' / 'finai-isolated-bootstrap.sh'


class BootstrapPathTests(unittest.TestCase):
    def check_path(self, path, uid, mode):
        return subprocess.run(
            ['bash', '-c', 'source "$1"; finai_check_path "$2" "$3" "$4"',
             'finai-test', str(SCRIPT), str(path), str(uid), mode],
            capture_output=True, text=True, timeout=5,
        )

    def test_owned_mode_is_valid_even_with_different_group(self):
        with tempfile.TemporaryDirectory(prefix='finai-path-qa-') as directory:
            path = Path(directory) / 'app'
            path.mkdir(mode=0o750)
            path.chmod(0o750)
            uid = os.getuid()
            result = self.check_path(path, uid, '750')
            self.assertEqual(result.returncode, 0, result.stderr)
            # Simulate a provider-assigned group different from the account UID.
            result = subprocess.run(
                ['bash', '-c', 'source "$1"; expected_uid="$3"; other_gid="$4"; '
                 'stat() { printf "%s:%s:750\\n" "$expected_uid" "$other_gid"; }; '
                 'finai_check_path "$2" "$expected_uid" 750',
                 'finai-test', str(SCRIPT), str(path), str(uid), str(uid + 100000)],
                capture_output=True, text=True, timeout=5,
            )
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_bad_mode_owner_missing_path_and_symlink_fail_closed(self):
        with tempfile.TemporaryDirectory(prefix='finai-path-qa-') as directory:
            path = Path(directory) / 'app'
            path.mkdir(mode=0o750)
            path.chmod(0o750)
            uid = os.getuid()
            self.assertNotEqual(self.check_path(path, uid, '700').returncode, 0)
            self.assertNotEqual(self.check_path(path, uid + 1, '750').returncode, 0)
            self.assertNotEqual(self.check_path(path / 'missing', uid, '750').returncode, 0)
            alias = Path(directory) / 'alias'
            alias.symlink_to(path, target_is_directory=True)
            self.assertNotEqual(self.check_path(alias, uid, '750').returncode, 0)

    def test_wrong_user_stops_without_creating_host_files(self):
        with tempfile.TemporaryDirectory(prefix='finai-stop-qa-') as directory:
            env = dict(os.environ, HOME=directory)
            result = subprocess.run(['bash', str(SCRIPT), 'ssh-ed25519 synthetic'],
                                    env=env, capture_output=True, text=True, timeout=5)
            self.assertEqual(result.returncode, 65)
            self.assertIn('STOP_WRONG_ACCOUNT', result.stderr)
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_existing_keys_and_gate_are_checked_before_writes(self):
        with tempfile.TemporaryDirectory(prefix='finai-existing-qa-') as directory:
            home = Path(directory)
            ssh_dir = home / '.ssh'
            ssh_dir.mkdir(mode=0o700)
            auth = ssh_dir / 'authorized_keys'
            original = b'ssh-ed25519 OTHER_PUBLIC_KEY_WITHOUT_NEWLINE'
            auth.write_bytes(original)
            deploy = home / 'finai-deploy'
            deploy.mkdir(mode=0o700)
            gate = deploy / 'finai-isolated-ssh-gate.py'
            gate.write_bytes(b'reviewed synthetic gate')
            digest = hashlib.sha256(gate.read_bytes()).hexdigest()

            def check(material, expected_hash=digest):
                return subprocess.run(
                    ['bash', '-c', 'source "$1"; finai_check_existing_access "$2" "$3" "$4" "$5"',
                     'finai-test', str(SCRIPT), str(home), str(os.getuid()), material, expected_hash],
                    capture_output=True, text=True, timeout=5,
                )

            self.assertEqual(check('NEW_PUBLIC_KEY').returncode, 0)
            self.assertEqual(auth.read_bytes(), original)
            self.assertIn('STOP_PUBLIC_KEY_ALREADY_PRESENT', check('OTHER_PUBLIC_KEY').stderr)
            self.assertIn('STOP_EXISTING_GATE_DIFFERS', check('NEW_PUBLIC_KEY', '0' * 64).stderr)
            self.assertEqual(auth.read_bytes(), original)
            gate.chmod(0o777)
            self.assertIn('STOP_WRITABLE_EXISTING_GATE', check('NEW_PUBLIC_KEY').stderr)
            gate.chmod(0o700)
            ssh_dir.chmod(0o777)
            self.assertIn('STOP_WRITABLE_PRIVATE_DIRECTORY', check('NEW_PUBLIC_KEY').stderr)


if __name__ == '__main__':
    unittest.main()
