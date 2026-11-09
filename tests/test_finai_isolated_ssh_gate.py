#!/usr/bin/env python3
"""Tests for dedicated FinAI-only SSH forced-command gate. No server access."""
import hashlib
import importlib.util
import io
from pathlib import Path
import tarfile
import tempfile
import unittest

MODULE = Path(__file__).resolve().parents[1] / "ops" / "finai-isolated-ssh-gate.py"
spec = importlib.util.spec_from_file_location("finai_isolated_gate", MODULE)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


def archive(*items):
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as tar:
        for name, data, kind in items:
            info = tarfile.TarInfo(name)
            info.size = len(data)
            if kind == "symlink":
                info.type = tarfile.SYMTYPE
                info.linkname = "../../etc/passwd"
            tar.addfile(info, io.BytesIO(data))
    return buffer.getvalue()


def valid_archive():
    return archive(
        ("./index.html", b"<html>" + b"x" * 600 + b"</html>", "regular"),
        ("./_next/static/chunk.js", b"console.log('FinAI offline QA');", "regular"),
    )


class GateTests(unittest.TestCase):
    def test_command_allowlist(self):
        good = hashlib.sha256(b"synthetic").hexdigest()
        self.assertEqual(gate.parse("finai:status:v1"), ("status", None))
        self.assertEqual(gate.parse("finai:stage:v1:" + good), ("stage", good))
        self.assertEqual(gate.parse("finai:promote:v1:" + good), ("promote", good))
        for bad in ("id", "bash -c id", "finai:status:v1;id",
                    "finai:stage:v1:" + good + " extra",
                    "finai:promote:v1:../../etc/passwd", "", "finai:deploy:all"):
            with self.assertRaises(gate.Denied):
                gate.parse(bad)

    def test_sha_pinned_staging_and_explicit_promotion(self):
        data = valid_archive()
        digest = hashlib.sha256(data).hexdigest()
        with tempfile.TemporaryDirectory() as parent:
            root = Path(parent) / "finai-deploy"
            root.mkdir()
            self.assertEqual(gate.stage(data, digest, root), "STAGED")
            self.assertEqual(gate.stage(data, digest, root), "STAGED_ALREADY_PRESENT")
            self.assertTrue((root / "releases" / digest / "index.html").exists())
            self.assertFalse((root / "current").exists())
            with self.assertRaises(gate.Denied):
                gate.promote(digest, root)
            (root / "ALLOW_PRODUCTION").write_text(gate.LIVE_MARKER + "\n")
            with self.assertRaises(gate.Denied):
                gate.promote(digest, root)
            (root / "PUBLIC_DOCROOT_CONFIRMED").write_text(str(root / "current") + "\n")
            self.assertEqual(gate.promote(digest, root), "PROMOTED")
            self.assertEqual((root / "current").resolve(), root / "releases" / digest)
            self.assertEqual(gate.promote(digest, root), "PROMOTED")
            with self.assertRaises(gate.Denied):
                gate.stage(data, "f" * 64, root)

    def test_traversal_and_link_archives_never_escape(self):
        for name, kind in (
            ("../outside.txt", "regular"),
            ("./../../outside", "regular"),
            (".htaccess", "regular"),
            ("./public/app.php", "regular"),
            ("./_next/static/escape.js", "symlink"),
            ("./.env", "regular"),
        ):
            data = archive(
                ("./index.html", b"<html>" + b"x" * 600, "regular"),
                ("./_next/static/safe.js", b"console.log('ok')", "regular"),
                (name, b"danger", kind),
            )
            with tempfile.TemporaryDirectory() as parent:
                root = Path(parent) / "finai-deploy"
                root.mkdir()
                with self.assertRaises((gate.Denied, OSError)):
                    gate.stage(data, hashlib.sha256(data).hexdigest(), root)
                self.assertFalse((Path(parent) / "outside.txt").exists())
                self.assertFalse((root / "current").exists())

    def test_bad_archive_and_symlinked_release(self):
        with tempfile.TemporaryDirectory() as parent:
            root = Path(parent) / "finai-deploy"
            root.mkdir()
            data = archive(("a.txt", b"only nonapp file", "regular"))
            digest = hashlib.sha256(data).hexdigest()
            with self.assertRaises(gate.Denied):
                gate.stage(data, digest, root)
            outside = Path(parent) / "outside"
            outside.mkdir()
            (root / "releases" / digest).symlink_to(outside, target_is_directory=True)
            with self.assertRaises(gate.Denied):
                gate.stage(valid_archive(), hashlib.sha256(valid_archive()).hexdigest(), root)


if __name__ == "__main__":
    unittest.main()
