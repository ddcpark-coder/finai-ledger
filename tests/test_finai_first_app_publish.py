import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from contextlib import nullcontext

SOURCE = Path(__file__).parents[1] / 'ops' / 'finai-first-app-publish.py'
spec = importlib.util.spec_from_file_location('finai_first_publish', SOURCE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class FakeGate:
    def __init__(self):
        self.active = 'none'
        self.unpublishes = 0

    def prepare_public_root(self, root):
        return root.stat().st_mode & 0o777

    def verify_staged_release(self, root, digest):
        assert (root / 'releases' / digest).is_dir()

    def active_release(self, root):
        return self.active

    def mutation_lock(self, root):
        return nullcontext()

    def conditional_promote(self, expected, digest, root):
        assert self.active == expected == 'none'
        root.chmod(0o711)
        (root / 'current').symlink_to(root / 'releases' / digest)
        self.active = digest
        return 'PROMOTED'

    def unpublish(self, digest, root):
        assert self.active == digest
        (root / 'current').unlink()
        root.chmod(0o700)
        self.active = 'none'
        self.unpublishes += 1
        return 'UNPUBLISHED'


class FirstPublishTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.home = Path(self.temp.name)
        self.home.chmod(0o711)
        self.app = self.home / 'app.e-integrator.si'
        self.root = self.home / 'finai-deploy'
        self.app.mkdir(mode=0o750)
        self.root.mkdir(mode=0o700)
        (self.root / '.gate-backups').mkdir(mode=0o700)
        (self.root / 'releases').mkdir(mode=0o700)
        (self.root / 'releases' / module.RELEASE_SHA).mkdir(mode=0o700)
        (self.app / '.well-known').mkdir()
        self.original = b'# cPanel directives remain intact\n'
        self.config = self.app / '.htaccess'
        self.config.write_bytes(self.original)
        self.config.chmod(0o644)
        self.original_sha = module.sha(self.original)
        self.gate = FakeGate()

    def tearDown(self):
        self.root.chmod(0o700)
        self.home.chmod(0o700)
        self.temp.cleanup()

    def publish(self, check_live, check_unpublished):
        return module.publish(self.home, os.getuid(), self.gate, self.original_sha,
                              check_live, check_unpublished)

    def assert_original_state(self):
        self.assertEqual(self.config.read_bytes(), self.original)
        self.assertFalse(os.path.lexists(self.app / '_finai_current'))
        self.assertFalse(os.path.lexists(self.root / 'PUBLIC_DOCROOT_CONFIRMED'))
        self.assertFalse(os.path.lexists(self.root / 'ALLOW_PRODUCTION'))
        self.assertEqual(self.gate.active, 'none')
        self.assertEqual(self.root.stat().st_mode & 0o777, 0o700)
        self.assertTrue((self.app / '.well-known').is_dir())

    def test_publication_tests_rollback_and_retains_existing_configuration(self):
        checks = []
        self.publish(lambda _: checks.append('live'), lambda: checks.append('unpublished'))
        self.assertEqual(checks, ['live', 'unpublished', 'live'])
        self.assertEqual(self.gate.unpublishes, 1)
        self.assertEqual(self.gate.active, module.RELEASE_SHA)
        self.assertTrue(self.config.read_bytes().startswith(self.original))
        self.assertIn(module.BEGIN, self.config.read_bytes())
        self.assertEqual(os.readlink(self.app / '_finai_current'), str(self.root / 'current'))
        self.assertTrue((self.app / '.well-known').is_dir())
        backup = self.root / '.gate-backups' / ('app-htaccess-' + self.original_sha + '.bak')
        self.assertEqual(backup.read_bytes(), self.original)

    def test_failed_live_check_restores_the_original_app_state(self):
        def fail(_):
            raise RuntimeError('synthetic HTTP failure')
        with self.assertRaisesRegex(module.Stop, 'rolled back'):
            self.publish(fail, lambda: None)
        self.assertEqual(self.gate.unpublishes, 1)
        self.assert_original_state()

    def test_failure_after_rollback_republication_restores_the_original_state(self):
        checks = []
        def fail_second(_):
            checks.append('live')
            if len(checks) == 2:
                raise RuntimeError('synthetic second HTTP failure')
        with self.assertRaisesRegex(module.Stop, 'rolled back'):
            self.publish(fail_second, lambda: None)
        self.assertEqual(len(checks), 2)
        self.assertEqual(self.gate.unpublishes, 2)
        self.assert_original_state()

    def test_changed_existing_configuration_stops_before_any_change(self):
        self.config.write_bytes(b'changed elsewhere\n')
        with self.assertRaisesRegex(module.Stop, 'changed since review'):
            self.publish(lambda _: None, lambda: None)
        self.assertEqual(self.config.read_bytes(), b'changed elsewhere\n')
        self.assertFalse(os.path.lexists(self.app / '_finai_current'))
        self.assertEqual(self.gate.active, 'none')


if __name__ == '__main__':
    unittest.main()
