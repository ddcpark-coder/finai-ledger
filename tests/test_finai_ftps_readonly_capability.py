#!/usr/bin/env python3
"""Synthetic tests for FinAI FTPS read-only probe. No network or hosting writes."""
import ftplib
import importlib.util
from pathlib import Path
import unittest

path = Path(__file__).resolve().parents[1] / "ops" / "finai-ftps-readonly-capability.py"
spec = importlib.util.spec_from_file_location("ftps_probe", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class FTPFake:
    def __init__(self, *, escape=False, context=None, timeout=None):
        self.at = "/"
        self.escape = escape
        self.commands = []
        self.timeout = timeout
        self.context = context

    def connect(self, host, port):
        self.commands.append(("connect", host, port))

    def auth(self):
        self.commands.append(("auth",))

    def login(self, user, password):
        self.commands.append(("login", user, "REDACTED"))

    def prot_p(self):
        self.commands.append(("prot_p",))

    def cwd(self, path):
        self.commands.append(("cwd", path))
        if path in ("/etc", "/home"):
            if self.escape:
                self.at = path
            else:
                raise ftplib.error_perm("550 denied")
        else:
            self.at = "/"

    def pwd(self):
        self.commands.append(("pwd",))
        return self.at

    def quit(self):
        self.commands.append(("quit",))

    def storbinary(self, *_args, **_kwargs):
        raise AssertionError("remote writes are forbidden")

    def delete(self, *_args, **_kwargs):
        raise AssertionError("remote deletes are forbidden")


class ProbeTests(unittest.TestCase):
    def settings(self):
        return dict(
            FINAI_FTPS_HOST=mod.HOST,
            FINAI_FTPS_USERNAME="finai-deploy@e-integrator.si",
            FINAI_FTPS_PASSWORD="fake_synthetic",
            FINAI_FTPS_PORT="21",
            FINAI_FTPS_READONLY_PROBE_ENABLED="YES",
        )

    def test_reject_unapproved_and_wrong_account(self):
        for host, user, port, approval in (
            (mod.HOST, "finai-deploy@e-integrator.si", 21, ""),
            (mod.HOST, "laskot48", 21, "YES"),
            (mod.HOST, "admin@e-integrator.si", 21, "YES"),
            ("laskoteka.si", "finai-deploy@e-integrator.si", 21, "YES"),
            (mod.HOST, "finai-deploy@e-integrator.si", 22, "YES"),
        ):
            with self.subTest(host=host, user=user, port=port):
                with self.assertRaises(mod.Denied):
                    mod.validate_settings(host, user, port, approval)

    def test_cwd_only_inside_mock_ftp_root(self):
        fake = FTPFake()
        mod.read_only_jail_probe(fake)
        self.assertEqual(fake.at, "/")
        self.assertFalse(any(cmd[0] in ("storbinary", "delete") for cmd in fake.commands))

    def test_refuse_escape_candidate(self):
        fake = FTPFake(escape=True)
        with self.assertRaises(mod.Denied):
            mod.read_only_jail_probe(fake)

    def test_full_remote_probe_uses_tls_and_no_writes(self):
        captured = []
        def factory(**kwargs):
            fake = FTPFake(**kwargs)
            captured.append(fake)
            return fake
        mod.remote_probe(self.settings(), factory=factory)
        cmds = captured[0].commands
        self.assertEqual(cmds[0], ("connect", mod.HOST, 21))
        self.assertIn(("auth",), cmds)
        self.assertIn(("prot_p",), cmds)
        self.assertIn(("quit",), cmds)
        self.assertFalse(any(cmd[0] in ("storbinary", "delete") for cmd in cmds))

    def test_reject_missing_secret_without_network(self):
        e = self.settings()
        e["FINAI_FTPS_PASSWORD"] = ""
        with self.assertRaises(mod.Denied):
            mod.remote_probe(e, factory=lambda **kw: self.fail("no connection allowed"))


if __name__ == "__main__":
    unittest.main()
