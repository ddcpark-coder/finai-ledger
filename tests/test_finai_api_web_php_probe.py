import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest import mock


SCRIPT = Path(__file__).resolve().parents[1] / 'ops' / 'finai-api-web-php-probe.py'
SPEC = importlib.util.spec_from_file_location('finai_web_php_probe', SCRIPT)
probe = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(probe)
NONCE = 'a' * 32


class WebPhpProbeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.root.chmod(0o700)
        self.name = 'finai-php-check-' + NONCE + '.php'

    def test_success_removes_only_its_probe(self):
        existing = self.root / '.htaccess'
        existing.write_text('preserved')

        def reply(name, nonce):
            self.assertEqual(name, self.name)
            self.assertEqual((self.root / name).read_bytes(), probe.php_source(nonce))
            return {'nonce': nonce, 'php_ok': True, 'extensions_ok': True, 'uid_ok': True}

        result = probe.probe_once(self.root, os.getuid(), NONCE, reply)
        self.assertTrue(result['php_ok'])
        self.assertFalse((self.root / self.name).exists())
        self.assertEqual(existing.read_text(), 'preserved')

    def test_failed_request_still_removes_the_probe(self):
        def fail(name, nonce):
            raise probe.Denied('synthetic request failure')

        with self.assertRaises(probe.Denied):
            probe.probe_once(self.root, os.getuid(), NONCE, fail)
        self.assertEqual(list(self.root.iterdir()), [])

    def test_existing_file_or_symlink_is_never_overwritten(self):
        target = self.root / self.name
        target.write_text('preserved')
        with self.assertRaises(FileExistsError):
            probe.probe_once(self.root, os.getuid(), NONCE, lambda *_: None)
        self.assertEqual(target.read_text(), 'preserved')
        target.unlink()
        target.symlink_to(self.root / 'missing')
        with self.assertRaises(FileExistsError):
            probe.probe_once(self.root, os.getuid(), NONCE, lambda *_: None)
        self.assertTrue(target.is_symlink())

    def test_changed_probe_is_not_deleted(self):
        def replace(name, nonce):
            path = self.root / name
            path.unlink()
            path.write_text('different')
            return {}

        with self.assertRaises(probe.Denied):
            probe.probe_once(self.root, os.getuid(), NONCE, replace)
        self.assertEqual((self.root / self.name).read_text(), 'different')

    def test_http_response_requires_exact_boolean_payload_and_nonce(self):
        response = mock.MagicMock()
        response.status = 200
        response.read.return_value = json.dumps({'nonce': NONCE, 'php_ok': True,
                                                  'extensions_ok': True, 'uid_ok': True}).encode()
        opener = mock.MagicMock()
        opener.open.return_value.__enter__.return_value = response
        with mock.patch.object(probe.urllib.request, 'build_opener', return_value=opener):
            self.assertTrue(probe.request_probe(self.name, NONCE)['uid_ok'])
            response.read.return_value = b'{"nonce":"wrong","php_ok":true}'
            with self.assertRaises(probe.Denied):
                probe.request_probe(self.name, NONCE)

    @unittest.skipUnless(shutil.which('php'), 'PHP not installed on this runner')
    def test_generated_php_lints_and_returns_only_boolean_capabilities(self):
        source = probe.php_source(NONCE)
        lint = subprocess.run(['php', '-l'], input=source, capture_output=True, check=False)
        self.assertEqual(lint.returncode, 0)
        result = subprocess.run(['php'], input=source, capture_output=True, check=False)
        self.assertEqual(result.returncode, 0)
        data = json.loads(result.stdout)
        self.assertEqual(set(data), {'nonce', 'php_ok', 'extensions_ok', 'uid_ok'})
        self.assertEqual(data['nonce'], NONCE)
        self.assertTrue(all(type(data[k]) is bool for k in ('php_ok', 'extensions_ok', 'uid_ok')))


if __name__ == '__main__':
    unittest.main()
