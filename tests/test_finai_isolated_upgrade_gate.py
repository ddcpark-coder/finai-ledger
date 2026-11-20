"""Synthetic tests for upgrading only the dedicated inactive FinAI gate."""
import hashlib
import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock

PATH = Path(__file__).resolve().parents[1] / 'ops' / 'finai-isolated-upgrade-gate.py'
spec = importlib.util.spec_from_file_location('finai_upgrade', PATH)
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)


class UpgradeGateTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='finai-gate-upgrade-qa-')
        self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name) / 'home'
        self.home.mkdir(mode=0o700)
        self.root = self.home / 'finai-deploy'
        self.root.mkdir(mode=0o700)
        self.gate = self.root / 'finai-isolated-ssh-gate.py'
        self.old = b'print("old synthetic gate")\n'
        self.new = b'print("new synthetic gate")\n'
        self.old_sha = hashlib.sha256(self.old).hexdigest()
        self.new_sha = hashlib.sha256(self.new).hexdigest()
        self.gate.write_bytes(self.old)
        self.gate.chmod(0o700)
        self.ssh = self.home / '.ssh'
        self.ssh.mkdir(mode=0o700)
        self.auth = self.ssh / 'authorized_keys'
        self.material = 'A' * 44
        self.line = f'restrict,command="{self.gate}" ssh-ed25519 {self.material} finai-dedicated-deploy\n'
        self.auth.write_text(self.line)
        self.auth.chmod(0o600)
        self.stage_checks = []

    def upgrade(self, verify=None):
        tool.upgrade(self.home, os.getuid(), self.material, self.new,
                     self.old_sha, self.new_sha,
                     verify or (lambda: self.stage_checks.append('checked')))

    def test_upgrade_is_atomic_and_retains_old_gate_and_keys(self):
        self.upgrade()
        self.assertEqual(self.stage_checks, ['checked'])
        self.assertEqual(self.gate.read_bytes(), self.new)
        self.assertEqual((self.root / '.gate-backups' / (self.old_sha + '.py')).read_bytes(), self.old)
        self.assertEqual(self.auth.read_text(), self.line)
        self.assertFalse((self.root / 'current').exists())

    def test_wrong_key_active_release_and_bad_gate_fail_closed(self):
        self.auth.write_text('ssh-ed25519 ' + self.material + ' unscoped\n')
        with self.assertRaises(tool.Stop):
            self.upgrade()
        self.assertEqual(self.gate.read_bytes(), self.old)
        self.auth.write_text(self.line)
        (self.root / 'current').symlink_to(self.root / 'foreign')
        with self.assertRaises(tool.Stop):
            self.upgrade()
        (self.root / 'current').unlink()
        self.gate.write_bytes(b'changed')
        with self.assertRaises(tool.Stop):
            self.upgrade()

    def test_failed_staged_integrity_leaves_gate_and_keys_unchanged(self):
        def fail():
            raise tool.Stop('synthetic corrupt stage')
        with self.assertRaises(tool.Stop):
            self.upgrade(fail)
        self.assertEqual(self.gate.read_bytes(), self.old)
        self.assertEqual(self.auth.read_text(), self.line)
        self.assertFalse((self.root / '.gate-backups').exists())

    def test_corrupt_new_gateway_restores_the_previous_gateway(self):
        real_replace = os.replace
        calls = []
        def corrupt_first(source, target):
            real_replace(source, target)
            calls.append(str(target))
            if len(calls) == 1:
                Path(target).write_bytes(b'corrupt synthetic gate')
        with mock.patch.object(tool.os, 'replace', side_effect=corrupt_first):
            with self.assertRaises(tool.Stop):
                self.upgrade()
        self.assertEqual(len(calls), 2)
        self.assertEqual(self.gate.read_bytes(), self.old)
        self.assertEqual(self.auth.read_text(), self.line)


if __name__ == '__main__':
    unittest.main()
