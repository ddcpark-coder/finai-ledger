import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


spec = importlib.util.spec_from_file_location(
    'private_config', Path(__file__).resolve().parents[1] / 'ops/finai-api-private-config.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PrivateConfigTests(unittest.TestCase):
    def setUp(self):
        self.global_grant = ('GRANT USAGE ON *.* TO `einteg86_fapi`@`localhost` '
                             "IDENTIFIED BY PASSWORD '*" + 'A' * 40 + "'")
        self.database_grant = ('GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, REFERENCES, INDEX, ALTER '
                               'ON `einteg86\\_finai\\_dev`.* TO `einteg86_fapi`@`localhost`')

    def check(self, grants, database=module.DB, user='einteg86_fapi@localhost'):
        module.check_grants(database, user, grants)

    def test_only_named_database_and_exact_privileges_are_allowed(self):
        self.check([self.global_grant, self.database_grant])
        for altered in [
            [self.global_grant.replace('USAGE', 'SELECT'), self.database_grant],
            [self.global_grant, self.database_grant.replace('ALTER', 'ALTER, DROP')],
            [self.global_grant, self.database_grant + ' WITH GRANT OPTION'],
            [self.global_grant, self.database_grant.replace('\\_dev', '\\_other')],
            [self.global_grant, self.database_grant, self.database_grant],
            [self.global_grant],
        ]:
            with self.subTest(altered=altered), self.assertRaises(module.Denied):
                self.check(altered)
        with self.assertRaises(module.Denied):
            self.check([self.global_grant, self.database_grant], user='someone@localhost')

    def test_password_rejects_dotenv_injection(self):
        key = 'A' * 43 + '='
        safe = 'Aa1' * 10
        self.assertIn(('DB_PASSWORD=' + safe + '\n').encode(), module.config_text(safe, key))
        for password in [safe + '\nAPP_DEBUG=true', safe + '#', 'too-short']:
            with self.assertRaises(module.Denied):
                module.config_text(password, key)

    def test_new_config_is_private_and_never_overwrites_existing_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            os.chmod(root, 0o700)
            module.write_new_config(root, os.getuid(), b'original')
            env = root / 'shared' / '.env'
            self.assertEqual(env.read_bytes(), b'original')
            self.assertEqual(env.stat().st_mode & 0o777, 0o600)
            with self.assertRaises(FileExistsError):
                module.write_new_config(root, os.getuid(), b'replacement')
            self.assertEqual(env.read_bytes(), b'original')

    def test_existing_symlink_is_never_followed(self):
        with tempfile.TemporaryDirectory() as tmp, tempfile.TemporaryDirectory() as other:
            root = Path(tmp)
            os.chmod(root, 0o700)
            (root / 'shared').symlink_to(other, target_is_directory=True)
            with self.assertRaises(module.Denied):
                module.write_new_config(root, os.getuid(), b'secret')
            self.assertFalse((Path(other) / '.env').exists())

    @unittest.skipUnless(shutil.which('php'), 'PHP CLI unavailable')
    def test_php_database_check_fails_closed_without_leaking_details(self):
        result = subprocess.run(['php', '-r', module.PHP_DB_CHECK],
                                input='{"password":"synthetic"}', text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stdout, '')
        self.assertEqual(result.stderr, '')


if __name__ == '__main__':
    unittest.main()
