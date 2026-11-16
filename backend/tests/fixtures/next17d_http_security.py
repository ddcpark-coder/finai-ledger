#!/usr/bin/env python3
"""Real HTTP loopback-only QA: Laravel cookie CSRF + 2 independent sessions
+ Fortify owner TOTP + revoked tenant. CI synthetic data only, no remote access.
"""
import base64
import hashlib
import hmac
import http.cookiejar
import json
import os
from pathlib import Path
import struct
import time
from urllib.error import HTTPError
from urllib.parse import unquote
from urllib.request import HTTPCookieProcessor, Request, build_opener

assert os.environ.get("GITHUB_ACTIONS") == "true"
assert os.environ.get("CI") == "true"
root = Path(os.environ["RUNNER_TEMP"]).resolve(strict=True)
assert root.is_dir() and not root.is_symlink()
base = "http://127.0.0.1:8765"
doc = "/api/companies/1/demo/sync-receipts/SYNTH-DOB-2026-0048"
phrase = "synthetic-ci-login-not-real-2026"


class Browser:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.opener = build_opener(HTTPCookieProcessor(self.jar))

    def request(self, method, path, payload=None, token=True):
        # Sanctum recognizes first-party SPA sessions by Origin/Referer;
        # real browsers send these headers, unlike a bare urllib request.
        headers = {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": base,
            "Referer": base + "/",
        }
        if payload is not None:
            headers["Content-Type"] = "application/json"
        if token:
            cookie = next((c.value for c in self.jar if c.name == "XSRF-TOKEN"), None)
            if cookie:
                headers["X-XSRF-TOKEN"] = unquote(cookie)
        request = Request(base + path, method=method, headers=headers,
                          data=json.dumps(payload).encode() if payload is not None else None)
        try:
            with self.opener.open(request, timeout=12) as response:
                raw = response.read(280000)
                return response.status, json.loads(raw) if raw.strip() else {}
        except HTTPError as failure:
            # Never log response bodies: they may contain local session metadata.
            failure.read(280000)
            return failure.code, {}

    def csrf(self):
        status, _ = self.request("GET", "/sanctum/csrf-cookie", token=False)
        assert status in (200, 204), f"CSRF bootstrap status {status}"
        assert any(cookie.name == "XSRF-TOKEN" for cookie in self.jar)


def checked(browser, method, path, expected, payload=None, token=True):
    status, data = browser.request(method, path, payload, token=token)
    assert status == expected, f"{method} {path.split('?')[0]}: expected {expected}, got {status}"
    return data


def totp(secret):
    raw = base64.b32decode(secret.strip().upper() + "=" * ((-len(secret.strip())) % 8))
    counter = struct.pack(">Q", int(time.time() // 30))
    digest = hmac.new(raw, counter, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    value = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return f"{value % 1000000:06d}"


def main():
    writer, owner = Browser(), Browser()
    envelope = {
        "format": "finai-mobile-synthetic-vault-v1",
        "companyId": 1, "documentId": "SYNTH-DOB-2026-0048",
        "version": 1, "iterations": 250000,
        "salt": "AQIDBAUGBwgJCgsMDQ4PEA==",
        "iv": "AQIDBAUGBwgJCgsM",
        "ciphertext": base64.b64encode(b"encrypted-test" * 16).decode(),
    }
    record = {
        "client_event_id": "1069a8cb-93c6-4a6f-8a8c-5fb138f7a801",
        "expected_version": 0, "envelope": envelope,
    }

    checked(writer, "GET", "/api/me", 401)
    writer.csrf()
    checked(writer, "POST", "/login", 419, {
        "email": "writer@example.test", "password": phrase,
    }, token=False)
    checked(writer, "POST", "/login", 200, {
        "email": "writer@example.test", "password": phrase,
    })
    assert checked(writer, "GET", "/api/me", 200)["data"]["email"] == "writer@example.test"
    checked(writer, "POST", doc, 419, record, token=False)
    uploaded = checked(writer, "POST", doc, 200, record)
    assert uploaded["data"]["version"] == 1
    assert uploaded["data"]["real_sync_enabled"] is False
    assert checked(writer, "POST", doc, 200, record)["data"]["already_received"] is True
    assert checked(writer, "GET", doc + "/latest", 200)["data"]["version"] == 1
    print("PASS: real cookie session, missing/valid CSRF, synthetic upload and dedupe")

    checked(owner, "GET", doc + "/latest", 401)
    owner.csrf()
    challenge = checked(owner, "POST", "/login", 200, {
        "email": "owner@example.test", "password": phrase,
    })
    assert challenge.get("two_factor") is True
    checked(owner, "GET", "/api/me", 401)
    checked(owner, "POST", "/two-factor-challenge", 422, {"code": "000000"})
    secret = (root / ".finai-next17d-totp-synthetic").read_text().strip()
    checked(owner, "POST", "/two-factor-challenge", 204, {"code": totp(secret)})
    assert checked(owner, "GET", "/api/me", 200)["data"]["email"] == "owner@example.test"
    # Even the owner of the same company cannot read the OTHER member's proof.
    own = checked(owner, "GET", doc + "/latest", 200)["data"]
    assert own["version"] == 0 and own["envelope"] is None
    print("PASS: independent mobile session and Fortify 2FA challenge")

    # Revoke the tenant membership outside the two existing sessions,
    # through a CI-guarded SQLite fixture process. Never use web endpoints.
    import subprocess
    env = os.environ.copy()
    subprocess.run(["php", "tests/fixtures/Next17dHttpSeed.php", "revoke-owner"],
                   env=env, check=True, capture_output=True)
    checked(owner, "GET", doc + "/latest", 403)
    checked(owner, "POST", doc, 403, {**record,
        "client_event_id": "1069a8cb-93c6-4a6f-8a8c-5fb138f7a802"})
    checked(writer, "GET", doc, 200)
    print("PASS: tenant revocation enforced on existing session without affecting others")

    owner.csrf()
    checked(owner, "POST", "/logout", 204, {})
    checked(owner, "GET", "/api/me", 401)
    writer.csrf()
    checked(writer, "POST", "/logout", 204, {})
    checked(writer, "GET", "/api/me", 401)
    checked(writer, "POST", doc, 401, record)
    print("PASS: session logout denies further synthetic API writes")


if __name__ == "__main__":
    main()
