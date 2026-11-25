#!/usr/bin/env python3
"""Synthetic, isolated checks of FinAI read-only API host probe."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

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

    def test_php_diagnostic_only_reports_interpreter_not_web(self):
        self.assertIn(module.php_cli_status(), {
            "PASS_CLI_ONLY", "INCOMPATIBLE_CLI_ONLY", "UNAVAILABLE"
        })


if __name__ == "__main__":
    unittest.main()
