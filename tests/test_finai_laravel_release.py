#!/usr/bin/env python3
"""Focused packaging checks, using only disposable synthetic files."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

PATH = Path(__file__).resolve().parents[1] / "ops" / "finai-laravel-release.py"
spec = importlib.util.spec_from_file_location("laravel_release", PATH)
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class LaravelReleaseTests(unittest.TestCase):
    def candidate(self, parent):
        root = Path(parent) / "backend"
        root.mkdir()
        for name in release.REQUIRED:
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("synthetic " + name)
        return root

    def test_archive_and_per_file_manifest_are_bound_to_sha256(self):
        with tempfile.TemporaryDirectory() as parent:
            root = self.candidate(parent)
            archive = Path(parent) / "backend.tar.gz"
            manifest_path = Path(parent) / "manifest.json"
            release.pack(root, archive, manifest_path, "a" * 40)
            manifest = json.loads(manifest_path.read_text())
            self.assertEqual(manifest["archive_sha256"], hashlib.sha256(archive.read_bytes()).hexdigest())
            release.verify(archive, manifest)
            data = bytearray(archive.read_bytes())
            data[-1] ^= 1
            archive.write_bytes(data)
            with self.assertRaises(release.Denied):
                release.verify(archive, manifest)

    def test_secrets_unsafe_public_files_and_links_are_rejected(self):
        for item in (".env", "config/.env.production", "database/data.sqlite",
                     "bootstrap/cache/config.php", "public/vendor/autoload.php",
                     "public/debug.php", "public/.env"):
            with self.subTest(item=item), tempfile.TemporaryDirectory() as parent:
                root = self.candidate(parent)
                path = root / item
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("not allowed")
                with self.assertRaises(release.Denied):
                    release.collect(root)
        with tempfile.TemporaryDirectory() as parent:
            root = self.candidate(parent)
            (root / "public" / "linked").symlink_to(Path(parent))
            with self.assertRaises(release.Denied):
                release.collect(root)

    def test_traversal_and_unexpected_public_php_are_rejected(self):
        for path in ("/etc/passwd", "../outside", "public/../config/app.php",
                     "public/shell.phtml", "public/.git/config"):
            with self.subTest(path=path), self.assertRaises(release.Denied):
                release.validate_path(path)


if __name__ == "__main__":
    unittest.main()
