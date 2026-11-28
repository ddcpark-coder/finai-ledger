import importlib.util
import json
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

    def test_keyboard_codes_round_trip_all_printable_characters(self):
        printable = ''.join(chr(code) for code in range(32, 127))
        for password in (printable[:47], printable[47:], 'Aa1!z9"\\$' * 2):
            encoded = ''.join(
                'z00' if char == 'z' else
                f'z{module.KEYBOARD_SYMBOLS.index(char) + 1:02d}'
                if char in module.KEYBOARD_SYMBOLS else char
                for char in password)
            self.assertRegex(encoded, r'^[A-Za-z0-9]+$')
            self.assertEqual(module.decode_keyboard_password(encoded), password)
        self.assertEqual(module.decode_keyboard_password('Abz02z009' + 'a' * 11),
                         'Ab!z9' + 'a' * 11)

    def test_keyboard_codes_reject_malformed_entries_without_echoing_them(self):
        for encoded in ['a' * 16 + 'z', 'a' * 16 + 'z0', 'a' * 16 + 'z99',
                        'a' * 16 + 'zAB', 'a' * 16 + '!', 'a' * 73]:
            with self.subTest(sample_length=len(encoded)), self.assertRaises(module.Denied) as error:
                module.decode_keyboard_password(encoded)
            self.assertNotIn(encoded, str(error.exception))

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
        self.assertIn(('DB_PASSWORD="' + safe + '"\n').encode(), module.config_text(safe, key))
        self.assertIn(b'\\$', module.config_text('Abc1${APP_ENV}123456', key))
        for password in [safe + '\nAPP_DEBUG=true', safe + '\x00', 'too-short', 'A' * 73]:
            with self.assertRaises(module.Denied):
                module.config_text(password, key)

    def test_password_round_trips_through_locked_phpdotenv(self):
        php = shutil.which('php')
        autoload = Path(__file__).resolve().parents[1] / 'backend/vendor/autoload.php'
        if not php or not autoload.is_file():
            if os.environ.get('FINAI_REQUIRE_DOTENV_TESTS') == '1':
                self.fail('PHP and locked Composer dependencies are required for this test')
            self.skipTest('PHP or Composer dependencies unavailable')
        program = r'''try {
    require $argv[1];
    $input = json_decode(stream_get_contents(STDIN), true, flags: JSON_THROW_ON_ERROR);
    $parsed = \Dotenv\Dotenv::parse($input['content']);
    exit(isset($parsed['DB_PASSWORD']) && hash_equals($input['password'], $parsed['DB_PASSWORD']) ? 0 : 1);
} catch (Throwable $e) { exit(1); }'''
        printable = ''.join(chr(i) for i in range(32, 127))
        samples = [printable[:47], printable[47:],
                   'A1${APP_ENV}#\\"\' zZZ', 'Z1\\${APP_ENV}#\\\\"9zz']
        for password in samples:
            with self.subTest(sample_length=len(password)):
                contents = module.config_text(password, 'A' * 43 + '=').decode('ascii')
                result = subprocess.run([php, '-r', program, str(autoload)],
                    input=json.dumps({'content': contents, 'password': password}), text=True,
                    stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)
                self.assertEqual((result.returncode, result.stdout, result.stderr), (0, '', ''))

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
