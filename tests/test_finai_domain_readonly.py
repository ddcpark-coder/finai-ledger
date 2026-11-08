#!/usr/bin/env python3
"""Unit tests for the FinAI-only output filter, no live cPanel access."""
import base64
import importlib.util
from pathlib import Path
from unittest import TestCase, main, mock

P = Path(__file__).resolve().parents[1] / "ops" / "finai-domain-readonly.py"
spec = importlib.util.spec_from_file_location("finai_domain_reader", P)
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)


class TestNoLeakage(TestCase):
    def test_whitelist_only_and_decode(self):
        ip = base64.b64encode(b"212.44.112.125").decode()
        secret = base64.b64encode(b"SUPERSECRET_DKIM_TOKEN").decode()
        records = [
            {"name": "e-integrator.si.", "type": "A", "data_b64": [ip], "ttl": 3600},
            {"name": "app.e-integrator.si.", "type": "CNAME",
             "data_b64": [base64.b64encode(b"host.vercel-dns.com.").decode()]},
            {"name": "api.e-integrator.si.", "type": "AAAA", "address": "2001:db8::1"},
            {"name": "app.e-integrator.si.", "type": "TXT", "data_b64": [secret]},
            {"name": "_domainkey.e-integrator.si.", "type": "CNAME", "cname": "private.example."},
            {"name": "othersite.example.", "type": "A", "address": "192.0.2.4"},
            {"name": "e-integrator.si.", "type": "MX", "value": "mail.private.example."},
        ]
        all_records, filtered = reader.normalized_zone({"payload": records})
        self.assertEqual(len(all_records), len(records))
        self.assertEqual(len(filtered), 3)
        txt = repr(filtered)
        self.assertNotIn("SUPERSECRET", txt)
        self.assertNotIn("mail.private", txt)
        self.assertNotIn("othersite", txt)
        self.assertIn("212.44.112.125", txt)

    def test_malformed_values_never_reflected(self):
        records = [{"name": "app.e-integrator.si.", "type": "A", "address": "bad\ntoken"},
                   {"name": "api.e-integrator.si.", "type": "A", "address": "127.0.0.1;rm -rf /"}]
        _, filtered = reader.normalized_zone(records)
        self.assertTrue(all(v == "unavailable" for _, _, v, _ in filtered))

    def test_domain_roots_are_scoped(self):
        self.assertEqual(reader.domain_docroot(
            {"documentroot": "/home/laskot48/e-integrator.si"}), "/home/laskot48/e-integrator.si")
        self.assertEqual(reader.domain_docroot(
            {"documentroot": "/home/anotheruser/site"}), "unexpected_path_hidden")
        self.assertEqual(reader.domain_docroot(
            {"documentroot": "site\r\nOTHER=secret"}), "unavailable")

    def test_fixed_binary_and_command_path(self):
        fake_response = mock.Mock(returncode=0, stdout=b'{"result":{"status":1,"data":[]}}')
        with mock.patch.object(reader.os.path, "isfile", return_value=True), \
             mock.patch.object(reader.os, "access", return_value=True), \
             mock.patch.object(reader.subprocess, "run", return_value=fake_response) as run:
            self.assertEqual(reader.call("DNS", "parse_zone", "zone=e-integrator.si"), [])
            args, kwargs = run.call_args
            self.assertEqual(args[0], [
                "/usr/local/cpanel/bin/uapi", "--user=laskot48", "--output=json",
                "DNS", "parse_zone", "zone=e-integrator.si"
            ])
            self.assertIs(kwargs["shell"], False)
            self.assertIs(kwargs["stderr"], reader.subprocess.DEVNULL)

    def test_unknown_schema_not_a_false_negative(self):
        records, relevant = reader.normalized_zone({"unrecognized": [{"name": "app.e-integrator.si.", "type": "A"}]})
        self.assertEqual(records, [])
        self.assertEqual(relevant, [])


if __name__ == "__main__":
    main()
