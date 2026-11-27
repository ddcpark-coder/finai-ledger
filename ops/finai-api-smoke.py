#!/usr/bin/env python3
"""Anonymous, read-only checks of the dedicated FinAI API over HTTPS.

This script sends no credentials and does not authorize a deployment. A
database-readiness success proves connectivity only, not privileges, isolation,
data protection, accounting correctness, or a successful restore.
"""
import argparse
from http.client import HTTPException
import json
import re
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

BASE_URL = "https://api.e-integrator.si"
PATHS = ("/up", "/finai-api-build.json", "/api/readiness", "/api/me")
COMMIT = re.compile(r"^[0-9a-f]{40}$")
MAX_BODY = 16384


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        return None


def fetch(path):
    """Fetch only a fixed public endpoint; reject redirects and never log bodies."""
    if path not in PATHS:
        raise ValueError("Unexpected API path")
    request = Request(BASE_URL + path, headers={
        "Accept": "application/json",
        "Cache-Control": "no-store",
        "User-Agent": "FinAI-API-Smoke/1.0",
    }, method="GET")
    try:
        with build_opener(NoRedirect()).open(request, timeout=10) as response:
            body = response.read(MAX_BODY + 1)
            return response.status, body if len(body) <= MAX_BODY else None
    except HTTPError as error:
        try:
            body = error.read(MAX_BODY + 1)
            return error.code, body if len(body) <= MAX_BODY else None
        except (OSError, HTTPException):
            return None, None
        finally:
            error.close()
    except (OSError, URLError, HTTPException, ValueError):
        return None, None


def exact_json(body, expected):
    if body is None:
        return False
    try:
        return json.loads(body.decode("utf-8")) == expected
    except (UnicodeError, ValueError):
        return False


def check(fetcher, commit):
    """Return non-sensitive statuses; stop before later checks after any failure."""
    if not COMMIT.fullmatch(commit):
        raise ValueError("Expected an exact 40-character Git SHA")
    results = {
        "FINAI_API_UP": "SKIPPED",
        "FINAI_API_RELEASE": "SKIPPED",
        "FINAI_API_DATABASE_READINESS": "SKIPPED",
        "FINAI_API_UNAUTHORIZED": "SKIPPED",
    }
    steps = (
        ("FINAI_API_UP", "/up", lambda status, body: status == 200 and body is not None),
        ("FINAI_API_RELEASE", "/finai-api-build.json", lambda status, body:
            status == 200 and exact_json(body, {"application": "finai-ledger-api", "commit": commit})),
        ("FINAI_API_DATABASE_READINESS", "/api/readiness", lambda status, body:
            status == 200 and exact_json(body, {"status": "database-reachable"})),
        ("FINAI_API_UNAUTHORIZED", "/api/me", lambda status, body: status == 401 and body is not None),
    )
    for name, path, valid in steps:
        status, body = fetcher(path)
        results[name] = "PASS" if valid(status, body) else "FAIL"
        if results[name] != "PASS":
            break
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--commit", required=True, help="Expected exact 40-character lowercase Git SHA")
    args = parser.parse_args()
    if not COMMIT.fullmatch(args.commit):
        parser.error("--commit must be an exact 40-character lowercase Git SHA")
    results = check(fetch, args.commit)
    for name, value in results.items():
        print(f"{name}={value}")
    ok = all(value == "PASS" for value in results.values())
    print(f"FINAI_API_SMOKE={'PASS' if ok else 'NO_GO'}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
