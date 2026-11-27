import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'ops' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


extract = load('private_extract', 'finai-api-private-extract.py')
verifier = load('release_verifier', 'finai-laravel-release.py')
COMMIT = 'a' * 40


class PrivateExtractTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.parent = self.root / 'private'
        self.parent.mkdir(mode=0o700)
        source = self.root / 'build'
        source.mkdir(mode=0o700)
        for name in verifier.REQUIRED:
            path = source / name
            path.parent.mkdir(parents=True, exist_ok=True)
            if name == verifier.BUILD_MARKER:
                path.write_text(json.dumps({'application': 'finai-ledger-api', 'commit': COMMIT}))
            else:
                path.write_text('synthetic ' + name)
        prefix = 'finai-api-' + COMMIT[:12]
        self.archive = self.parent / (prefix + '-package.tar.gz')
        self.manifest = self.parent / (prefix + '-manifest.json')
        verifier.pack(source, self.archive, self.manifest, COMMIT)
        self.archive_sha = hashlib.sha256(self.archive.read_bytes()).hexdigest()
        self.manifest_sha = hashlib.sha256(self.manifest.read_bytes()).hexdigest()
        self.target = self.parent / ('release-' + COMMIT + '-' + self.archive_sha[:12])

    def run_extract(self):
        return extract.extract_release(self.parent, os.getuid(), COMMIT, self.archive_sha,
                                       self.manifest_sha, verifier.verify)

    def test_creates_verified_private_release_without_touching_existing_files(self):
        sentinel = self.parent / 'existing'
        sentinel.write_text('preserved')
        self.assertEqual(self.run_extract(), self.target)
        self.assertEqual((self.target / 'artisan').read_text(), 'synthetic artisan')
        self.assertEqual((self.target / 'public' / 'index.php').stat().st_mode & 0o777, 0o600)
        self.assertEqual(sentinel.read_text(), 'preserved')
        self.assertFalse((self.target / '.env').exists())

    def test_existing_release_or_symlink_is_never_overwritten(self):
        self.target.mkdir()
        (self.target / 'sentinel').write_text('preserved')
        with self.assertRaises(FileExistsError):
            self.run_extract()
        self.assertEqual((self.target / 'sentinel').read_text(), 'preserved')

    def test_checksum_mismatch_stops_before_any_release_write(self):
        self.archive.write_bytes(self.archive.read_bytes() + b'changed')
        with self.assertRaises(extract.Denied):
            self.run_extract()
        self.assertFalse(self.target.exists())

    def test_linked_staged_archive_is_rejected(self):
        actual = self.root / 'archive'
        self.archive.rename(actual)
        self.archive.symlink_to(actual)
        with self.assertRaises(OSError):
            self.run_extract()
        self.assertFalse(self.target.exists())

    def test_failed_extraction_removes_only_new_release_directory(self):
        sentinel = self.parent / 'unrelated'
        sentinel.write_text('preserved')
        real_open = os.open

        def fail_file_open(path, *args, **kwargs):
            if str(path).endswith('/vendor/autoload.php'):
                raise OSError('synthetic failure')
            return real_open(path, *args, **kwargs)

        with mock.patch.object(extract.os, 'open', side_effect=fail_file_open):
            with self.assertRaises(OSError):
                self.run_extract()
        self.assertFalse(self.target.exists())
        self.assertEqual(sentinel.read_text(), 'preserved')
        self.assertTrue(self.archive.exists())
        self.assertTrue(self.manifest.exists())

    def test_unsafe_names_are_rejected(self):
        for name in ('../outside', '/absolute', 'dir/../escape', 'dir//file', 'dir\\file'):
            with self.subTest(name=name), self.assertRaises(extract.Denied):
                extract.path_parts(name)


if __name__ == '__main__':
    unittest.main()
