#!/usr/bin/env python3
"""Synthetic, isolated checks of FinAI read-only API host probe."""
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest import mock

SCRIPT = Path(__file__).resolve().parents[1] / "ops" / "finai-api-host-readonly.py"
spec = importlib.util.spec_from_file_location("finai_api_host_readonly", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class FinaiApiHostReadOnlyTests(unittest.TestCase):
    def test_public_docroot_must_not_contain_laravel_source_or_secrets(self):
        with tempfile.TemporaryDirectory() as parent:
            docroot = Path(parent) / "api.e-integrator.si"
            docroot.mkdir()
            (docroot / "index.php").write_text("<?php /* synthetic stub */")
            self.assertTrue(module.public_boundary_ok(docroot))
            for name in sorted(module.FORBIDDEN):
                bad = docroot / name
                bad.mkdir() if "." not in name else bad.write_text("synthetic")
                self.assertFalse(module.public_boundary_ok(docroot), name)
                if bad.is_dir():
                    bad.rmdir()
                else:
                    bad.unlink()

            for name in (".env.local", ".ENV.testing"):
                (docroot / name).write_text("synthetic")
                self.assertFalse(module.public_boundary_ok(docroot), name)
                (docroot / name).unlink()

    def test_symlink_and_group_writable_public_boundary_are_rejected(self):
        with tempfile.TemporaryDirectory() as parent:
            root = Path(parent)
            docroot = root / "public"
            docroot.mkdir()
            self.assertTrue(module.directory_ok(docroot, docroot.stat().st_uid))
            docroot.chmod(0o770)
            self.assertFalse(module.directory_ok(docroot, docroot.stat().st_uid))
            docroot.chmod(0o750)
            linked = root / "linked"
            linked.symlink_to(docroot, target_is_directory=True)
            self.assertFalse(module.public_boundary_ok(linked))
            self.assertFalse(module.directory_ok(linked, docroot.stat().st_uid))

            linked_parent = root / "alias"
            linked_parent.symlink_to(docroot, target_is_directory=True)
            child = docroot / "child"
            child.mkdir()
            self.assertFalse(module.directory_ok(linked_parent / "child", child.stat().st_uid))

    def test_private_release_directory_needs_owner_only_permissions(self):
        with tempfile.TemporaryDirectory() as parent:
            root = Path(parent)
            private = root / "private"
            self.assertEqual(module.private_directory_status(private, root.stat().st_uid), "NOT_PRESENT")
            private.mkdir(mode=0o700)
            self.assertEqual(module.private_directory_status(private, root.stat().st_uid), "PRESENT_PRIVATE")
            private.chmod(0o750)
            self.assertEqual(module.private_directory_status(private, root.stat().st_uid), "NO_GO")
            private.chmod(0o700)
            alias = root / "alias"
            alias.symlink_to(private, target_is_directory=True)
            self.assertEqual(module.private_directory_status(alias, root.stat().st_uid), "NO_GO")

    def test_php_probe_requires_supported_version_and_all_extensions(self):
        def output(version, missing=()):
            lines = [str(version)]
            lines += [f"{ext}:{int(ext not in missing)}" for ext in module.PHP_EXTENSIONS]
            return mock.Mock(returncode=0, stdout="\n".join(lines))

        with mock.patch.object(module.subprocess, "run", return_value=output(80428)):
            self.assertEqual(module.php_cli_diagnostic(), ("PASS_CLI_ONLY", ()))
        with mock.patch.object(module.subprocess, "run", return_value=output(80428, {"pdo_mysql", "xml"})):
            self.assertEqual(module.php_cli_diagnostic(), ("INCOMPATIBLE_CLI_ONLY", ("pdo_mysql", "xml")))
        for version in (80399, 90000):
            with mock.patch.object(module.subprocess, "run", return_value=output(version)):
                self.assertEqual(module.php_cli_diagnostic()[0], "INCOMPATIBLE_CLI_ONLY")
        with mock.patch.object(module.subprocess, "run", return_value=mock.Mock(returncode=0, stdout="malformed")):
            self.assertEqual(module.php_cli_diagnostic(), ("UNAVAILABLE", ()))

    def test_php_diagnostic_only_reports_interpreter_not_web(self):
        self.assertIn(module.php_cli_status(), {
            "PASS_CLI_ONLY", "INCOMPATIBLE_CLI_ONLY", "UNAVAILABLE"
        })

    def test_wrong_effective_identity_never_inspects_paths_or_executes_php(self):
        with mock.patch.object(module.os, "getuid", return_value=module.UID), \
             mock.patch.object(module.os, "geteuid", return_value=0), \
             mock.patch.object(module.pwd, "getpwuid", return_value=mock.Mock(pw_name="einteg86")), \
             mock.patch.object(module, "directory_ok") as directory_ok, \
             mock.patch.object(module, "php_cli_diagnostic") as php, \
             mock.patch("sys.stdout", new_callable=io.StringIO) as stdout:
            module.main()
        self.assertIn("FINAI_API_ISOLATED_IDENTITY=NO_GO", stdout.getvalue())
        self.assertIn("FINAI_API_DEPLOY_AUTHORIZED=NO", stdout.getvalue())
        directory_ok.assert_not_called()
        php.assert_not_called()


if __name__ == "__main__":
    unittest.main()
