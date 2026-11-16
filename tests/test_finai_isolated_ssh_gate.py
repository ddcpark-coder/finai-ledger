#!/usr/bin/env python3
"""Tests for dedicated FinAI-only SSH forced-command gate. No server access."""
import hashlib
import importlib.util
import io
import os
from types import SimpleNamespace
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
            if kind == "directory":
                info.type = tarfile.DIRTYPE
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
    def test_dedicated_os_uid_must_not_alias_shared_account(self):
        with tempfile.TemporaryDirectory(prefix="finai-identity-qa-") as temp:
            home = Path(temp)
            uid = os.getuid()
            independent = SimpleNamespace(pw_name="finai09")
            # A dedicated account name alone cannot satisfy the safety gate.
            gate.require_dedicated_identity(independent, uid, home)
            with self.assertRaises(gate.Denied):
                gate.require_dedicated_identity(independent, uid, home, shared_uid=uid)
            with self.assertRaises(gate.Denied):
                gate.require_dedicated_identity(
                    SimpleNamespace(pw_name="laskot48"), uid, home)
            with self.assertRaises(gate.Denied):
                gate.require_dedicated_identity(independent, 0, home)
            home.chmod(0o777)
            try:
                with self.assertRaises(gate.Denied):
                    gate.require_dedicated_identity(independent, uid, home)
            finally:
                home.chmod(0o700)
            external = home / "external"
            external.mkdir()
            (home / "alias").symlink_to(external, target_is_directory=True)
            with self.assertRaises(gate.Denied):
                gate.require_dedicated_identity(independent, uid, home / "alias")

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

    def test_realistic_tar_root_directory_is_allowed_but_root_file_is_not(self):
        data = archive(
            ("./", b"", "directory"),
            ("./index.html", b"<html>" + b"x" * 600, "regular"),
            ("./_next/static/file.js", b"synthetic source", "regular"),
        )
        digest = hashlib.sha256(data).hexdigest()
        with tempfile.TemporaryDirectory() as parent:
            root = Path(parent) / "finai-deploy"
            root.mkdir()
            self.assertEqual(gate.stage(data, digest, root), "STAGED")
            self.assertTrue((root / "archives" / (digest + ".tar.gz")).is_file())
            self.assertTrue(gate.verify_staged_release(root, digest))
            self.assertEqual(gate.stage(data, digest, root), "STAGED_ALREADY_PRESENT")
        forged_root = archive(
            ("./", b"not a directory", "regular"),
            ("./index.html", b"<html>" + b"x" * 600, "regular"),
            ("./_next/static/file.js", b"synthetic source", "regular"),
        )
        with tempfile.TemporaryDirectory() as parent:
            root = Path(parent) / "finai-deploy"
            root.mkdir()
            with self.assertRaises(gate.Denied):
                gate.stage(forged_root, hashlib.sha256(forged_root).hexdigest(), root)

    def test_cannot_promote_or_restage_tampered_staged_assets(self):
        data = valid_archive()
        digest = hashlib.sha256(data).hexdigest()
        for tamper in ("rewrite", "extra", "remove", "symlink"):
            with tempfile.TemporaryDirectory() as parent:
                root = Path(parent) / "finai-deploy"
                root.mkdir()
                self.assertEqual(gate.stage(data, digest, root), "STAGED")
                (root / "ALLOW_PRODUCTION").write_text(gate.LIVE_MARKER + "\n")
                (root / "PUBLIC_DOCROOT_CONFIRMED").write_text(
                    str(root / "current") + "\n")
                release = root / "releases" / digest
                if tamper == "rewrite":
                    (release / "_next/static/chunk.js").write_text("tampered")
                elif tamper == "extra":
                    (release / "unplanned.html").write_text("foreign")
                elif tamper == "remove":
                    (release / "_next/static/chunk.js").unlink()
                else:
                    foreign = Path(parent) / "outside.js"
                    foreign.write_text("foreign")
                    (release / "_next/static/chunk.js").unlink()
                    (release / "_next/static/chunk.js").symlink_to(foreign)
                with self.assertRaises((gate.Denied, OSError)):
                    gate.verify_staged_release(root, digest)
                with self.assertRaises((gate.Denied, OSError)):
                    gate.stage(data, digest, root)
                with self.assertRaises((gate.Denied, OSError)):
                    gate.promote(digest, root)
                self.assertFalse((root / "current").exists())

    def test_pinned_original_tar_is_required_outside_web_docroot(self):
        data = valid_archive()
        digest = hashlib.sha256(data).hexdigest()
        for attack in ("remove-archive", "replace-archive", "symlink-archive"):
            with tempfile.TemporaryDirectory() as parent:
                root = Path(parent) / "finai-deploy"
                root.mkdir()
                self.assertEqual(gate.stage(data, digest, root), "STAGED")
                original = root / "archives" / (digest + ".tar.gz")
                self.assertTrue(original.is_file())
                original.unlink()
                if attack == "replace-archive":
                    original.write_bytes(b"bad-data")
                elif attack == "symlink-archive":
                    foreign = Path(parent) / "elsewhere"
                    foreign.write_bytes(data)
                    original.symlink_to(foreign)
                (root / "ALLOW_PRODUCTION").write_text(gate.LIVE_MARKER + "\n")
                (root / "PUBLIC_DOCROOT_CONFIRMED").write_text(
                    str(root / "current") + "\n")
                with self.assertRaises((gate.Denied, OSError)):
                    gate.promote(digest, root)
                with self.assertRaises((gate.Denied, OSError)):
                    gate.stage(data, digest, root)
                self.assertFalse((root / "current").exists())

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
            invalid = archive(("a.txt", b"only nonapp file", "regular"))
            with self.assertRaises(gate.Denied):
                gate.stage(invalid, hashlib.sha256(invalid).hexdigest(), root)
            outside = Path(parent) / "outside"
            outside.mkdir()
            good = valid_archive()
            digest = hashlib.sha256(good).hexdigest()
            (root / "releases" / digest).symlink_to(outside, target_is_directory=True)
            with self.assertRaises(gate.Denied):
                gate.stage(good, digest, root)


if __name__ == "__main__":
    unittest.main()
