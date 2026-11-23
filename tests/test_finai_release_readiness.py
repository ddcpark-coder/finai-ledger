"""Targeted local-only tests for NEXT36 FinAI hosting readiness diagnostics."""
import hashlib
import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


BASE = Path(__file__).resolve().parents[1]


def module(filename, name):
    spec = importlib.util.spec_from_file_location(name, BASE / "ops" / filename)
    instance = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(instance)
    return instance


web = module("finai-release-readiness.py", "finai_release_readiness")
local = module("finai-dedicated-docroot-readonly.py", "finai_dedicated_docroot_readonly")
COMMIT = "f" * 40
OLD = "3" * 40


class PublicReadinessTests(unittest.TestCase):
    def test_current_marker_and_api_up_do_not_authorize_deployment(self):
        def fetch(url):
            if url == web.APP_MARKER_URL:
                return 200, ('{"application":"finai-ledger","commit":"' + COMMIT + '"}').encode()
            return 200, b"OK"

        report = web.interpret(COMMIT, {
            "FINAI_STAGE_ENABLED": "true",
            "FINAI_DEPLOY05_SERVER_READY": "YES",
            "FINAI_PRODUCTION_ENABLED": "true",
            "FINAI_APP_DOCROOT_CONFIRMED": "true",
            "FINAI_AUTO_PUBLISH_ENABLED": "true",
            "FINAI_FIRST_PUBLISH_RESTORE_READY": "YES",
            "FINAI_DEPLOY_SSH_USER": "einteg86",
        }, fetch=fetch)
        self.assertEqual(report["app_marker"], "MATCH")
        self.assertEqual(report["api_up"], "HTTP_200_UNAUTHENTICATED")
        self.assertEqual(report["stage_switch"], "YES")
        self.assertEqual(report["ssh_user_is_dedicated"], "YES")
        self.assertEqual(report["deploy_authorized"], "NO")
        self.assertIn("Never turn on stage/publish flags", web.summary(report))

    def test_outdated_marker_and_missing_api_are_reported_without_mutation(self):
        observed = []
        def fetch(url):
            observed.append(url)
            return ((200, ('{"application":"finai-ledger","commit":"' + OLD + '"}').encode())
                    if url == web.APP_MARKER_URL else (404, b""))

        report = web.interpret(COMMIT, {}, fetch=fetch)
        self.assertEqual(report["app_marker"], "STALE")
        self.assertEqual(report["app_commit"], OLD)
        self.assertEqual(report["api_up"], "HTTP_404")
        self.assertEqual(report["stage_switch"], "NO")
        self.assertEqual(report["server_ready_switch"], "NO")
        self.assertEqual(observed, [web.APP_MARKER_URL, web.API_HEALTH_URL])

    def test_redirect_and_invalid_data_are_not_accepted_as_live_release(self):
        for blob in (
            b'{"application":"wrong","commit":"' + COMMIT.encode() + b'"}',
            b'{"application":"finai-ledger","commit":"bad"}',
            b"<html>login</html>",
            b'{"application":"finai-ledger","commit":"' + COMMIT.encode() + b'","extra":1}',
        ):
            result = web.interpret(COMMIT, {}, fetch=lambda u: (200, blob))
            self.assertEqual(result["app_marker"], "INVALID")
        report = web.interpret(COMMIT, {}, fetch=lambda u: (302, b""))
        self.assertEqual(report["app_marker"], "HTTP_302")
        self.assertEqual(report["api_up"], "HTTP_302")
        with self.assertRaises(ValueError):
            web.retrieve("https://other.example.test")
        with self.assertRaises(ValueError):
            web.interpret("bad", {}, fetch=lambda _: (200, b""))

    def test_timeout_stays_non_authorizing(self):
        def fail(_url):
            raise TimeoutError("read-only endpoint unreachable")
        report = web.interpret(COMMIT, {}, fetch=fail)
        self.assertEqual(report["app_marker"], "UNREACHABLE")
        self.assertEqual(report["api_up"], "UNREACHABLE")
        self.assertEqual(report["deploy_authorized"], "NO")


class DedicatedLocalTreeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.home = Path(self.tmp.name) / "einteg86"
        self.uid = os.getuid()
        self.home.mkdir(mode=0o711)
        self.home.chmod(0o711)
        self.app = self.home / "app.e-integrator.si"
        self.app.mkdir(mode=0o750)
        self.app.chmod(0o750)
        self.root = self.home / "finai-deploy"
        self.root.mkdir(mode=0o711)
        self.root.chmod(0o711)
        self.gate = self.root / "finai-isolated-ssh-gate.py"
        self.gate.write_bytes(b"synthetic-known-gate\n")
        self.gate.chmod(0o700)
        self.expected = hashlib.sha256(self.gate.read_bytes()).hexdigest()
        self.hash_patch = patch.object(local, "EXPECTED_GATE_SHA256", self.expected)
        self.hash_patch.start()
        self.addCleanup(self.hash_patch.stop)
        self.app.joinpath(".htaccess").write_text(
            "# Synthetic cPanel directives\n" + local.BEGIN +
            "\nRewriteEngine On\n" + local.REWRITE + "\n" + local.END + "\n",
            encoding="utf-8",
        )
        (self.app / ".htaccess").chmod(0o644)
        self.public = self.root / "public-releases"
        self.public.mkdir(mode=0o711)
        self.public.chmod(0o711)
        self.digest = "a" * 64
        self.release = self.public / self.digest
        self.release.mkdir(mode=0o511)
        self.release.chmod(0o511)
        (self.root / "current").symlink_to(self.release)
        (self.app / "_finai_current").symlink_to(self.root / "current")

    def test_exact_dedicated_docroot_links_and_pinned_gate(self):
        result = local.inspect_tree(self.home, self.uid)
        for key in ("home", "app_docroot", "release_root", "apache_rewrite",
                    "docroot_pointer", "release_pointer"):
            self.assertEqual(result[key], "PASS", key)
        self.assertEqual(result["gate"], "PASS_PINNED")
        self.assertEqual(result["release_digest"], self.digest)
        self.assertEqual(result["deploy_authorized"], "NO")
        self.assertEqual(result["webserver_mapping"], "NOT_VERIFIED_BY_THIS_TOOL")
        self.assertEqual(result["backup_restore"], "NOT_VERIFIED_BY_THIS_TOOL")
        self.assertEqual(result["database_isolation"], "NOT_VERIFIED_BY_THIS_TOOL")

    def test_foreign_or_relative_links_are_rejected_without_following(self):
        (self.root / "current").unlink()
        (self.root / "current").symlink_to("/home/other-account/public_html")
        result = local.inspect_tree(self.home, self.uid)
        self.assertEqual(result["release_pointer"], "STOP")
        (self.app / "_finai_current").unlink()
        (self.app / "_finai_current").symlink_to("../../other-account")
        result = local.inspect_tree(self.home, self.uid)
        self.assertEqual(result["docroot_pointer"], "STOP")

    def test_changed_config_or_gate_blocks_local_ready_signal(self):
        (self.app / ".htaccess").write_text("# missing guarded rewrite\n")
        result = local.inspect_tree(self.home, self.uid)
        self.assertEqual(result["apache_rewrite"], "STOP")
        self.gate.write_bytes(b"unreviewed gate\n")
        result = local.inspect_tree(self.home, self.uid)
        self.assertEqual(result["gate"], "UNRECOGNIZED_SHA256")

    def test_invalid_home_identity_and_modes_are_rejected(self):
        self.assertEqual(local.inspect_tree(self.home, self.uid + 1)["home"], "STOP")
        self.root.chmod(0o777)
        self.assertEqual(local.inspect_tree(self.home, self.uid)["release_root"], "STOP")


if __name__ == "__main__":
    unittest.main()
