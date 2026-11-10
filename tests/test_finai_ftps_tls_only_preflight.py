#!/usr/bin/env python3
"""Synthetic tests for FinAI's unauthenticated FTPS TLS-only preflight."""
import importlib.util
import os
import ssl
from pathlib import Path
import subprocess
import sys
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "ops" / "finai-ftps-tls-only-preflight.py"
spec = importlib.util.spec_from_file_location("finai_tls_probe", SCRIPT)
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


class FakeVerifiedSocket:
    def __init__(self, certificate=True):
        self.certificate = certificate

    def getpeercert(self):
        return {"subject": ((("commonName", "ftp.laskoteka.si"),),)} if self.certificate else {}


class FakeClient:
    def __init__(self, context, timeout, *, cert=True, tls=True, connect_error=None, auth_error=None):
        self.context = context
        self.timeout = timeout
        self.cert = cert
        self.tls = tls
        self.connect_error = connect_error
        self.auth_error = auth_error
        self.actions = []
        self.sock = None

    def connect(self, host, port):
        self.actions.append(("connect", host, port))
        if self.connect_error:
            raise self.connect_error

    def auth(self):
        self.actions.append(("auth",))
        if self.auth_error:
            raise self.auth_error
        self.sock = FakeVerifiedSocket(self.cert) if self.tls else object()

    def close(self):
        self.actions.append(("close",))


class TLSPreflightTests(unittest.TestCase):
    def test_verified_tls_without_credentials_or_mutations(self):
        clients = []

        def factory(context, timeout):
            client = FakeClient(context, timeout)
            clients.append(client)
            return client

        probe.check_control_tls(factory=factory, ssl_socket_type=FakeVerifiedSocket)
        self.assertEqual(clients[0].actions, [
            ("connect", "ftp.laskoteka.si", 21),
            ("auth",),
            ("close",),
        ])
        self.assertTrue(clients[0].context.check_hostname)
        self.assertLessEqual(clients[0].timeout, 15)

    def test_reject_unprotected_socket_and_missing_certificate(self):
        for options in ({"tls": False}, {"cert": False}):
            with self.subTest(options=options):
                clients = []

                def factory(context, timeout):
                    client = FakeClient(context, timeout, **options)
                    clients.append(client)
                    return client

                with self.assertRaises(probe.Denied):
                    probe.check_control_tls(factory=factory, ssl_socket_type=FakeVerifiedSocket)
                self.assertEqual(clients[0].actions[-1], ("close",))

    def test_precise_fail_closed_network_diagnostics(self):
        scenarios = [
            ({"connect_error": TimeoutError("masked")}, "CONNECT_TIMEOUT"),
            ({"connect_error": ConnectionRefusedError("masked")}, "CONNECT_REFUSED"),
            ({"auth_error": TimeoutError("masked")}, "AUTH_TLS_TIMEOUT"),
            ({"auth_error": ssl.SSLCertVerificationError("masked")}, "TLS_CERTIFICATE_REJECTED"),
        ]
        for options, code in scenarios:
            with self.subTest(code=code):
                clients = []

                def factory(context, timeout):
                    client = FakeClient(context, timeout, **options)
                    clients.append(client)
                    return client

                with self.assertRaises(probe.Denied) as cm:
                    probe.check_control_tls(factory=factory, ssl_socket_type=FakeVerifiedSocket)
                self.assertEqual(str(cm.exception), code)
                self.assertEqual(clients[0].actions[-1], ("close",))

    def test_default_does_not_access_network(self):
        env = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}
        result = subprocess.run([sys.executable, "-B", str(SCRIPT)],
                                capture_output=True, text=True, env=env)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("FINAI_FTPS_TLS_PREFLIGHT=NO_NETWORK", result.stdout)
        self.assertIn("FINAI_REMOTE_WRITES=DISABLED", result.stdout)


if __name__ == "__main__":
    unittest.main()
