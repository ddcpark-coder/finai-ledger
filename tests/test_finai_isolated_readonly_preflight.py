"""Synthetic CI tests of FinAI readonly filesystem preflight; never a host probe."""
import importlib.util
import os
from pathlib import Path
import tempfile
import unittest

MODULE = Path(__file__).resolve().parent.parent / "ops" / "finai-isolated-readonly-preflight.py"
spec = importlib.util.spec_from_file_location("finai_readonly_preflight", MODULE)
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class FinaiReadOnlyPreflightTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="finai-isolation-synthetic-")
        self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name) / "dedicated"
        self.app = self.home / "apps" / "finai-ledger"
        self.public = self.home / "public_html"
        self.app.mkdir(parents=True)
        self.public.mkdir()
        self.uid = os.getuid()

    def check(self, user="finai09", uid=None, app=None, public=None, shared=None):
        return audit.inspect(user, self.uid if uid is None else uid,
                             self.home, app or self.app, public or self.public, shared)

    def test_dedicated_owned_paths_are_eligible_for_readonly_facts_not_deploy(self):
        self.assertEqual(self.check(), [])
        releases = self.app / "releases"
        releases.mkdir()
        digest = "a" * 64
        (releases / digest).mkdir()
        (self.app / "current").symlink_to(releases / digest)
        self.assertEqual(self.check(), [])

    def test_shared_root_or_foreign_target_is_rejected(self):
        self.assertTrue(self.check(user="laskot48"))
        self.assertTrue(self.check(user="root"))
        self.assertTrue(self.check(uid=0))
        self.assertTrue(self.check(shared=self.uid))
        self.assertTrue(self.check(app=Path("/home/laskot48/apps/finai-ledger")))
        self.assertTrue(self.check(public=Path("/home/laskot48/public_html")))
        self.assertTrue(self.check(app=self.home))

    def test_symlinked_writable_and_escaped_paths_fail_closed(self):
        alias = self.home / "alias"
        alias.symlink_to(self.app, target_is_directory=True)
        self.assertTrue(self.check(app=alias))
        self.assertTrue(self.check(app=self.home / "apps" / ".." / "finai-ledger"))
        self.app.chmod(0o777)
        self.assertTrue(self.check())
        self.app.chmod(0o700)

    def test_current_release_must_resolve_only_to_hashed_finai_releases(self):
        elsewhere = self.home / "other"
        elsewhere.mkdir()
        (self.app / "current").symlink_to(elsewhere)
        self.assertTrue(self.check())
        (self.app / "current").unlink()
        (self.app / "current").mkdir()
        self.assertTrue(self.check())


if __name__ == "__main__":
    unittest.main()
