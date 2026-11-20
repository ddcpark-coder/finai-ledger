#!/usr/bin/env python3
"""Focused local tests for the dedicated FinAI bootstrap path checks."""
import os
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


if __name__ == '__main__':
    unittest.main()
