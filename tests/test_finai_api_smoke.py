#!/usr/bin/env python3
"""Synthetic tests for the fixed-origin, anonymous API smoke probe."""
import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest import mock
from urllib.error import HTTPError

SCRIPT = Path(__file__).resolve().parents[1] / "ops" / "finai-api-smoke.py"
spec = importlib.util.spec_from_file_location("finai_api_smoke", SCRIPT)
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)

COMMIT = "a" * 40


class ApiSmokeTests(unittest.TestCase):
    def responses(self):
        return {
            "/up": (200, b"ok"),
            "/finai-api-build.json": (200, json.dumps({
                "application": "finai-ledger-api", "commit": COMMIT,
            }).encode()),
            "/api/readiness": (200, b'{"status":"database-reachable"}'),
            "/api/me": (401, b'{"message":"Unauthenticated."}'),
        }

    def run_probe(self, responses):
        visited = []
        def fetch(path):
            visited.append(path)
            return responses[path]
        return smoke.check(fetch, COMMIT), visited

    def test_all_checks_pass_only_for_expected_release_and_anonymous_denial(self):
        result, visited = self.run_probe(self.responses())
        self.assertEqual(list(result.values()), ["PASS"] * 4)
        self.assertEqual(visited, list(smoke.PATHS))

    def test_wrong_or_unavailable_release_stops_before_database_requests(self):
        for marker in (b'{"application":"finai-ledger-api","commit":"wrong"}',
                       b"<html>verification</html>", None):
            with self.subTest(marker=marker):
                data = self.responses()
                data["/finai-api-build.json"] = (200, marker)
                result, visited = self.run_probe(data)
                self.assertEqual(result["FINAI_API_RELEASE"], "FAIL")
                self.assertEqual(result["FINAI_API_DATABASE_READINESS"], "SKIPPED")
                self.assertEqual(visited, list(smoke.PATHS[:2]))

    def test_health_redirect_or_failure_stops_all_later_checks(self):
        for response in ((302, b""), (404, b"not found"), (None, None), (200, None)):
            data = self.responses()
            data["/up"] = response
            result, visited = self.run_probe(data)
            self.assertEqual(result["FINAI_API_UP"], "FAIL")
            self.assertEqual(visited, ["/up"])

    def test_readiness_and_unauthorized_checks_fail_closed(self):
        data = self.responses()
        data["/api/readiness"] = (503, b'{"status":"unavailable"}')
        result, visited = self.run_probe(data)
        self.assertEqual(result["FINAI_API_DATABASE_READINESS"], "FAIL")
        self.assertEqual(result["FINAI_API_UNAUTHORIZED"], "SKIPPED")
        self.assertEqual(visited, list(smoke.PATHS[:3]))
        data = self.responses()
        data["/api/me"] = (200, b"sensitive content must never be printed")
        result, _ = self.run_probe(data)
        self.assertEqual(result["FINAI_API_UNAUTHORIZED"], "FAIL")
        self.assertNotIn("sensitive", str(result))

    def test_fetch_uses_fixed_https_endpoint_without_redirects_or_credentials(self):
        response = mock.MagicMock()
        response.__enter__.return_value = response
        response.status = 200
        response.read.return_value = b"ok"
        opener = mock.Mock()
        opener.open.return_value = response
        with mock.patch.object(smoke, "build_opener", return_value=opener) as factory:
            self.assertEqual(smoke.fetch("/up"), (200, b"ok"))
        self.assertIsInstance(factory.call_args.args[0], smoke.NoRedirect)
        request = opener.open.call_args.args[0]
        self.assertEqual(request.full_url, "https://api.e-integrator.si/up")
        self.assertEqual(request.get_method(), "GET")
        self.assertIsNone(request.get_header("Authorization"))
        self.assertIsNone(request.get_header("Cookie"))
        self.assertIsNone(smoke.NoRedirect().redirect_request(None, None, 302, "", {}, "https://other.example"))
        with self.assertRaises(ValueError):
            smoke.fetch("/other")

    def test_http_error_status_is_returned_without_printing_body(self):
        opener = mock.Mock()
        opener.open.side_effect = HTTPError("https://api.e-integrator.si/api/me", 401, "denied", {}, io.BytesIO(b"private"))
        with mock.patch.object(smoke, "build_opener", return_value=opener):
            self.assertEqual(smoke.fetch("/api/me"), (401, b"private"))

    def test_exact_commit_is_required(self):
        for invalid in ("", "A" * 40, "a" * 39, "a" * 41):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                smoke.check(lambda _: (200, b""), invalid)


if __name__ == "__main__":
    unittest.main()
