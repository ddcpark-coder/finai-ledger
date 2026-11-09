#!/usr/bin/env python3
"""No-host-write tests for FinAI shared-account preflight."""
import importlib.util
import os
from pathlib import Path
import tempfile
import unittest

FILE = (Path(__file__).resolve().parents[1] /
        "ops" / "finai-shared-account-readonly-preflight.py")
spec = importlib.util.spec_from_file_location("finai_shared_preflight", FILE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SharedPreflightTests(unittest.TestCase):
    def test_never_approves_shared_account_writes(self):
        calls = []
        def fake_check(path, uid):
            calls.append((path, uid))
            return "PRESENT_EXPECTED_OWNER"

        report = module.report_shared_account(
            os.getuid(), "laskot48", classifier=fake_check)
        self.assertEqual(report["mode"], "READ_ONLY")
        self.assertEqual(report["finai_ssh_write"], "BLOCKED")
        self.assertEqual(report["production_deploy"], "BLOCKED")
        self.assertEqual(report["result"], "NO_GO_SHARED_ACCOUNT_WRITE")
        self.assertEqual(len(calls), 2)

    def test_different_account_does_not_inspect_shared_host(self):
        def forbidden(*_):
            raise AssertionError("unexpected path inspection")
        report = module.report_shared_account(
            os.getuid(), "github-runner", classifier=forbidden)
        self.assertEqual(report["account"], "not_shared_account")
        self.assertEqual(report["finai_ssh_write"], "BLOCKED")
        self.assertEqual(report["finai_app"], "NOT_CHECKED_DIFFERENT_ACCOUNT")

    def test_mock_finai_directory_and_symlink_ancestor(self):
        with tempfile.TemporaryDirectory(prefix="finai-path-qa-") as td:
            base = Path(td)
            app = base / "finai"
            app.mkdir()
            self.assertEqual(module.classify_components(app, os.getuid()),
                             "PRESENT_EXPECTED_OWNER")
            self.assertEqual(module.classify_components(app / "missing", os.getuid()),
                             "MISSING")
            escape = base / "link-to-another-project"
            escape.symlink_to(app, target_is_directory=True)
            self.assertEqual(module.classify_components(escape / "subdir", os.getuid()),
                             "SYMLINK_REJECTED")

    def test_same_unix_identity_can_write_both_separately_permissioned_dirs(self):
        """Synthetic demonstration: chmod cannot isolate *one SSH key* by directory.

        All filesystem writes are confined to a random GitHub-runner temp dir;
        no Hiper M, Laškoteka or STNG paths are accessed.
        """
        with tempfile.TemporaryDirectory(prefix="finai-uid-fixture-") as td:
            base = Path(td)
            finai = base / "finai"
            other = base / "other-project-synthetic"
            finai.mkdir(mode=0o700)
            other.mkdir(mode=0o700)
            for folder in (finai, other):
                folder.chmod(0o700)
                (folder / "readme.txt").write_text("synthetic", encoding="utf-8")
                (folder / "readme.txt").chmod(0o600)

            # Both paths are owned by the same OS UID, so path chmod does not
            # constrain *another process with that same identity*.
            self.assertEqual(finai.stat().st_uid, other.stat().st_uid)
            with (finai / "readme.txt").open("a", encoding="utf-8") as f:
                f.write("-f")
            with (other / "readme.txt").open("a", encoding="utf-8") as f:
                f.write("-o")
            self.assertTrue((finai / "readme.txt").read_text().endswith("-f"))
            self.assertTrue((other / "readme.txt").read_text().endswith("-o"))


if __name__ == "__main__":
    unittest.main()
