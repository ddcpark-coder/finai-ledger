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


def write_private(path, value):
    path.write_text(value)
    path.chmod(0o600)


def valid_archive():
    return archive(
        ("./index.html", b"<html>" + b"x" * 600 + b"</html>", "regular"),
        ("./_next/static/chunk.js", b"console.log('FinAI offline QA');", "regular"),
    )


class GateTests(unittest.TestCase):
    def test_current_session_must_have_cagefs_token(self):
        with tempfile.TemporaryDirectory(prefix="finai-cagefs-qa-") as directory:
            token = Path(directory) / ".cagefs.token"
            with self.assertRaises(gate.Denied):
                gate.require_cagefs(token)
            token.touch()
            gate.require_cagefs(token)

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
        self.assertEqual(gate.parse("finai:promote:v2:none:" + good),
                         ("promote", ("none", good)))
        self.assertEqual(gate.parse("finai:promote:v2:" + good + ":" + good),
                         ("promote", (good, good)))
        self.assertEqual(gate.parse("finai:unpublish:v1:" + good), ("unpublish", good))
        for bad in ("id", "bash -c id", "finai:status:v1;id",
                    "finai:stage:v1:" + good + " extra",
                    "finai:promote:v1:" + good,
                    "finai:promote:v2:../../etc/passwd:" + good, "", "finai:deploy:all"):
            with self.assertRaises(gate.Denied):
                gate.parse(bad)

    def test_only_exact_finai_target_identity_is_accepted(self):
        gate.require_target_identity(SimpleNamespace(pw_name="einteg86"), 1256,
                                     Path("/home/einteg86"))
        for name, uid, home in (("laskot48", 1256, "/home/einteg86"),
                                ("einteg86", 9, "/home/einteg86"),
                                ("einteg86", 1256, "/home/other")):
            with self.assertRaises(gate.Denied):
                gate.require_target_identity(SimpleNamespace(pw_name=name), uid,
                                             Path(home))

    def test_first_publish_recovery_removes_only_the_expected_current_pointer(self):
        data = valid_archive()
        digest = hashlib.sha256(data).hexdigest()
        with tempfile.TemporaryDirectory() as parent:
            root = Path(parent) / "finai-deploy"
            root.mkdir(mode=0o700)
            gate.stage(data, digest, root)
            write_private(root / "ALLOW_PRODUCTION", gate.LIVE_MARKER + "\n")
            write_private(root / "PUBLIC_DOCROOT_CONFIRMED", str(root / "current") + "\n")
            self.assertEqual(gate.active_release(root), "none")
            with self.assertRaises(gate.Denied):
                gate.conditional_promote("f" * 64, digest, root)
            gate.conditional_promote("none", digest, root)
            self.assertEqual(gate.active_release(root), digest)
            with self.assertRaises(gate.Denied):
                gate.conditional_promote("none", digest, root)
            with self.assertRaises(gate.Denied):
                gate.unpublish("f" * 64, root)
            self.assertEqual(gate.active_release(root), digest)
            self.assertEqual(gate.unpublish(digest, root), "UNPUBLISHED")
            self.assertEqual(gate.active_release(root), "none")
            self.assertEqual(root.stat().st_mode & 0o777, 0o700)
            self.assertTrue((root / "releases" / digest / "index.html").exists())
            self.assertEqual(gate.unpublish(digest, root), "UNPUBLISHED_ALREADY_ABSENT")
            (root / "current").mkdir()
            self.assertEqual(gate.active_release(root), "unexpected")
            with self.assertRaises(gate.Denied):
                gate.unpublish(digest, root)

    def test_sha_pinned_staging_and_explicit_promotion(self):
        data = valid_archive()
        digest = hashlib.sha256(data).hexdigest()
        with tempfile.TemporaryDirectory() as parent:
            root = Path(parent) / "finai-deploy"
            root.mkdir(mode=0o700)
            self.assertEqual(gate.stage(data, digest, root), "STAGED")
            self.assertEqual(gate.stage(data, digest, root), "STAGED_ALREADY_PRESENT")
            self.assertTrue((root / "releases" / digest / "index.html").exists())
            self.assertFalse((root / "current").exists())
            with self.assertRaises(gate.Denied):
                gate.promote(digest, root)
            write_private(root / "ALLOW_PRODUCTION", gate.LIVE_MARKER + "\n")
            with self.assertRaises(gate.Denied):
                gate.promote(digest, root)
            write_private(root / "PUBLIC_DOCROOT_CONFIRMED", str(root / "current") + "\n")
            self.assertEqual(gate.promote(digest, root), "PROMOTED")
            self.assertEqual((root / "current").resolve(), root / "public-releases" / digest)
            self.assertEqual(gate.promote(digest, root), "PROMOTED")
            with self.assertRaises(gate.Denied):
                gate.stage(data, "f" * 64, root)

    def test_public_static_mirror_keeps_private_release_and_archive_closed(self):
        data = valid_archive()
        digest = hashlib.sha256(data).hexdigest()
        with tempfile.TemporaryDirectory() as parent:
            root = Path(parent) / "finai-deploy"
            root.mkdir(mode=0o700)
            gate.stage(data, digest, root)
            self.assertEqual(root.stat().st_mode & 0o777, 0o700)
            self.assertFalse((root / "public-releases").exists())
            write_private(root / "ALLOW_PRODUCTION", gate.LIVE_MARKER + "\n")
            write_private(root / "PUBLIC_DOCROOT_CONFIRMED", str(root / "current") + "\n")
            gate.conditional_promote("none", digest, root)
            public = root / "public-releases" / digest
            self.assertEqual((root / "current").resolve(), public)
            self.assertEqual(root.stat().st_mode & 0o777, 0o711)
            self.assertEqual((root / "archives").stat().st_mode & 0o777, 0o700)
            self.assertEqual((root / "releases").stat().st_mode & 0o777, 0o700)
            self.assertEqual(public.stat().st_mode & 0o777, 0o511)
            self.assertEqual((public / "index.html").stat().st_mode & 0o777, 0o444)
            self.assertEqual((public / "index.html").read_bytes(),
                             (root / "releases" / digest / "index.html").read_bytes())
            self.assertEqual(gate.unpublish(digest, root), "UNPUBLISHED")
            self.assertEqual(gate.active_release(root), "none")

    def test_insecure_or_tampered_public_copy_cannot_replace_active_release(self):
        old = valid_archive()
        new = archive(("index.html", b"<html>" + b"y" * 600, "regular"),
                      ("_next/static/new.js", b"synthetic", "regular"))
        old_digest, new_digest = (hashlib.sha256(value).hexdigest() for value in (old, new))
        with tempfile.TemporaryDirectory() as parent:
            root = Path(parent) / "finai-deploy"
            root.mkdir(mode=0o700)
            gate.stage(old, old_digest, root)
            gate.stage(new, new_digest, root)
            write_private(root / "ALLOW_PRODUCTION", gate.LIVE_MARKER + "\n")
            write_private(root / "PUBLIC_DOCROOT_CONFIRMED", str(root / "current") + "\n")
            gate.conditional_promote("none", old_digest, root)
            public = gate.materialize_public_release(root, new_digest)
            target = public / "index.html"
            target.chmod(0o600)
            target.write_bytes(b'tampered')
            target.chmod(0o444)
            with self.assertRaises(gate.Denied):
                gate.conditional_promote(old_digest, new_digest, root)
            self.assertEqual(gate.active_release(root), old_digest)

    def test_unknown_private_content_prevents_public_traversal(self):
        data = valid_archive()
        digest = hashlib.sha256(data).hexdigest()
        with tempfile.TemporaryDirectory() as parent:
            root = Path(parent) / "finai-deploy"
            root.mkdir(mode=0o700)
            gate.stage(data, digest, root)
            write_private(root / "ALLOW_PRODUCTION", gate.LIVE_MARKER + "\n")
            write_private(root / "PUBLIC_DOCROOT_CONFIRMED", str(root / "current") + "\n")
            (root / "unexpected").write_text('synthetic')
            with self.assertRaises(gate.Denied):
                gate.conditional_promote("none", digest, root)
            self.assertEqual(root.stat().st_mode & 0o777, 0o700)
            self.assertFalse((root / "current").exists())

    def test_unreadable_public_tree_is_not_accepted(self):
        with tempfile.TemporaryDirectory() as parent:
            release = Path(parent) / "synthetic-release"
            release.mkdir(mode=0o700)
            release.chmod(0o000)
            try:
                with self.assertRaises(gate.Denied):
                    gate.verify_public_modes(release)
            finally:
                release.chmod(0o700)

    def test_realistic_tar_root_directory_is_allowed_but_root_file_is_not(self):
        data = archive(
            ("./", b"", "directory"),
            ("./index.html", b"<html>" + b"x" * 600, "regular"),
            ("./_next/static/file.js", b"synthetic source", "regular"),
        )
        digest = hashlib.sha256(data).hexdigest()
        with tempfile.TemporaryDirectory() as parent:
            root = Path(parent) / "finai-deploy"
            root.mkdir(mode=0o700)
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
            root.mkdir(mode=0o700)
            with self.assertRaises(gate.Denied):
                gate.stage(forged_root, hashlib.sha256(forged_root).hexdigest(), root)

    def test_cannot_promote_or_restage_tampered_staged_assets(self):
        data = valid_archive()
        digest = hashlib.sha256(data).hexdigest()
        for tamper in ("rewrite", "extra", "remove", "symlink"):
            with tempfile.TemporaryDirectory() as parent:
                root = Path(parent) / "finai-deploy"
                root.mkdir(mode=0o700)
                self.assertEqual(gate.stage(data, digest, root), "STAGED")
                write_private(root / "ALLOW_PRODUCTION", gate.LIVE_MARKER + "\n")
                write_private(root / "PUBLIC_DOCROOT_CONFIRMED",
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
                root.mkdir(mode=0o700)
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
                write_private(root / "ALLOW_PRODUCTION", gate.LIVE_MARKER + "\n")
                write_private(root / "PUBLIC_DOCROOT_CONFIRMED",
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
                root.mkdir(mode=0o700)
                with self.assertRaises((gate.Denied, OSError)):
                    gate.stage(data, hashlib.sha256(data).hexdigest(), root)
                self.assertFalse((Path(parent) / "outside.txt").exists())
                self.assertFalse((root / "current").exists())

    def test_bad_archive_and_symlinked_release(self):
        with tempfile.TemporaryDirectory() as parent:
            root = Path(parent) / "finai-deploy"
            root.mkdir(mode=0o700)
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
