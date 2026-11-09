#!/usr/bin/env python3
"""Synthetic-only tests for FinAI static web release validation."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "ops" / "finai-static-release-verify.py"
spec = importlib.util.spec_from_file_location("finai_web_integrity", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def fixture(root: Path) -> None:
    root.mkdir()
    (root / "index.html").write_text("<!DOCTYPE html><html>" + "FinAI " * 35 + "</html>", encoding="utf-8")
    assets = root / "_next" / "static"
    assets.mkdir(parents=True)
    (assets / "chunk.js").write_text("console.log('synthetic FinAI QA')", encoding="utf-8")


class IntegrityTests(unittest.TestCase):
    def test_manifest_contains_sha256_for_all_assets(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / "out"
            fixture(root)
            m = mod.scan(root)
            self.assertEqual(m["format"], "finai-static-manifest-v1")
            self.assertEqual(m["file_count"], 2)
            self.assertEqual(len(m["files"][0]["sha256"]), 64)
            self.assertTrue(any(x["path"] == "index.html" for x in m["files"]))

    def test_reject_symlinks_and_secret_config(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / "out"
            fixture(root)
            (root / "unauthorized.js").symlink_to(root / "index.html")
            with self.assertRaises(mod.InvalidRelease):
                mod.scan(root)
            (root / "unauthorized.js").unlink()
            (root / ".htaccess").write_text("Deny from all")
            with self.assertRaises(mod.InvalidRelease):
                mod.scan(root)
            (root / ".htaccess").unlink()
            (root / "config.php").write_text("unsafe")
            with self.assertRaises(mod.InvalidRelease):
                mod.scan(root)

    def test_reject_escape_and_case_collision(self):
        for value in ("../outside.txt", "nested/../outside", "/etc/passwd",
                      ".env", "foo\\bar", "cert/private.key"):
            with self.subTest(path=value):
                with self.assertRaises(mod.InvalidRelease):
                    mod.valid_relative(value)
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / "out"
            fixture(root)
            (root / "INDEX.HTML").write_text("case alias")
            with self.assertRaises(mod.InvalidRelease):
                mod.scan(root)

    def test_reject_missing_index_or_framework_asset(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / "out"
            fixture(root)
            (root / "_next" / "static" / "chunk.js").unlink()
            with self.assertRaises(mod.InvalidRelease):
                mod.scan(root)
            (root / "index.html").unlink()
            with self.assertRaises(mod.InvalidRelease):
                mod.scan(root)

    def test_manifest_roundtrip_and_file_tampering(self):
        with tempfile.TemporaryDirectory() as td:
            parent = Path(td)
            root = parent / "out"
            fixture(root)
            manifest = parent / "manifest.json"
            def invoke(flag):
                return subprocess.run([sys.executable, "-B", str(SCRIPT), "--root", str(root),
                                       flag, str(manifest)], text=True, capture_output=True)
            self.assertEqual(invoke("--write-manifest").returncode, 0)
            self.assertEqual(invoke("--verify-manifest").returncode, 0)
            stored = json.loads(manifest.read_text())
            self.assertEqual(stored["file_count"], 2)
            (root / "_next" / "static" / "chunk.js").write_text("tampered")
            result = invoke("--verify-manifest")
            self.assertEqual(result.returncode, 64)
            self.assertIn("DENIED", result.stderr)

    def test_manifest_cannot_be_written_into_export(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / "out"
            fixture(root)
            result = subprocess.run([sys.executable, "-B", str(SCRIPT), "--root", str(root),
                                     "--write-manifest", str(root / "manifest.json")],
                                     text=True, capture_output=True)
            self.assertEqual(result.returncode, 64)
            self.assertFalse((root / "manifest.json").exists())


if __name__ == "__main__":
    unittest.main()
