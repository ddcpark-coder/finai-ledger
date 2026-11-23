#!/usr/bin/env python3
"""NEXT36: public FinAI deployment visibility and GitHub flag report.

Read-only. Only HTTPS GET to two fixed e-integrator.si endpoints.
No remote auth, local file reads, SSH, DNS changes, databases or writes.
This report DOES NOT approve deployment; it makes skipped jobs actionable.
"""
import argparse
import json
import os
import re
import ssl
import sys
import urllib.error
import urllib.request

APP_MARKER_URL = "https://app.e-integrator.si/finai-build.json"
API_HEALTH_URL = "https://api.e-integrator.si/up"
COMMIT = re.compile(r"^[0-9a-f]{40}$")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return None


def retrieve(url, timeout=8):
    """No redirect following: the original host must answer directly."""
    if url not in (APP_MARKER_URL, API_HEALTH_URL):
        raise ValueError("FinAI endpoint is not allowlisted")
    opener = urllib.request.build_opener(
        urllib.request.HTTPSHandler(context=ssl.create_default_context()),
        NoRedirect(),
    )
    request = urllib.request.Request(url, headers={
        "Accept": "application/json" if url == APP_MARKER_URL else "text/plain",
        "Cache-Control": "no-cache",
        "Accept-Encoding": "identity",
    })
    try:
        with opener.open(request, timeout=timeout) as response:
            if response.status != 200:
                return response.status, b""
            return response.status, response.read(4097)
    except urllib.error.HTTPError as error:
        return error.code, b""
    except (urllib.error.URLError, TimeoutError, OSError):
        return None, b""


def interpret(expected, flags, fetch=retrieve):
    """Pure report logic apart from the injectable fixed-endpoint fetcher."""
    if not COMMIT.fullmatch(expected):
        raise ValueError("Expected commit must be a full 40-character Git SHA")

    def enabled(name, literal):
        return "YES" if flags.get(name) == literal else "NO"

    report = {
        "expected_commit": expected,
        "stage_switch": enabled("FINAI_STAGE_ENABLED", "true"),
        "server_ready_switch": enabled("FINAI_DEPLOY05_SERVER_READY", "YES"),
        "production_switch": enabled("FINAI_PRODUCTION_ENABLED", "true"),
        "docroot_verified_switch": enabled("FINAI_APP_DOCROOT_CONFIRMED", "true"),
        "auto_publish_switch": enabled("FINAI_AUTO_PUBLISH_ENABLED", "true"),
        "first_restore_switch": enabled("FINAI_FIRST_PUBLISH_RESTORE_READY", "YES"),
        "ssh_user_is_dedicated": enabled("FINAI_DEPLOY_SSH_USER", "einteg86"),
        "app_marker": "UNREACHABLE",
        "app_commit": "UNVERIFIED",
        "api_up": "UNREACHABLE",
        "deploy_authorized": "NO",
    }
    try:
        status, body = fetch(APP_MARKER_URL)
        if status == 200 and len(body) <= 4096:
            try:
                marker = json.loads(body)
                valid = (
                    isinstance(marker, dict) and
                    set(marker) == {"application", "commit"} and
                    marker["application"] == "finai-ledger" and
                    isinstance(marker["commit"], str) and
                    bool(COMMIT.fullmatch(marker["commit"]))
                )
            except (ValueError, UnicodeDecodeError, TypeError):
                valid = False
            if valid:
                report["app_commit"] = marker["commit"]
                report["app_marker"] = "MATCH" if marker["commit"] == expected else "STALE"
            else:
                report["app_marker"] = "INVALID"
        elif status is not None:
            report["app_marker"] = f"HTTP_{status}"
    except (OSError, ValueError, TimeoutError, urllib.error.URLError):
        pass

    try:
        status, _ = fetch(API_HEALTH_URL)
        if status == 200:
            report["api_up"] = "HTTP_200_UNAUTHENTICATED"
        elif status is not None:
            report["api_up"] = f"HTTP_{status}"
    except (OSError, ValueError, TimeoutError, urllib.error.URLError):
        pass
    return report


def summary(report):
    """Markdown to render in GitHub job summary, no credentials or host paths."""
    labels = (
        ("Current SHA expected by CI", "expected_commit"),
        ("Live app marker", "app_marker"),
        ("Live app SHA", "app_commit"),
        ("Laravel public health endpoint", "api_up"),
        ("Stage enabled", "stage_switch"),
        ("Dedicated server readiness enabled", "server_ready_switch"),
        ("SSH user is dedicated FinAI account", "ssh_user_is_dedicated"),
        ("Production enabled", "production_switch"),
        ("Document root mapping approved", "docroot_verified_switch"),
        ("Automatic publish enabled", "auto_publish_switch"),
        ("First publish restore gate enabled", "first_restore_switch"),
        ("Deployment authorised by this check", "deploy_authorized"),
    )
    lines = [
        "### FinAI release readiness - read-only",
        "",
        "| Requirement | Observed |",
        "|---|---|",
        *[f"| {label} | {report[key]} |" for label, key in labels],
        "",
        "Status YES denotes only the presence of the named GitHub variable, "
        "not a validation of filesystem ownership, key permissions, backup "
        "restore, release integrity on the server, or the actual docroot mapping.",
        "A public API health response is only an unauthenticated reachability signal.",
        "Never turn on stage/publish flags based on this report alone.",
        "A skipped stage/publish job is not a successful deployment.",
        "",
    ]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--commit", required=True)
    args = parser.parse_args()
    names = (
        "FINAI_STAGE_ENABLED", "FINAI_DEPLOY05_SERVER_READY",
        "FINAI_PRODUCTION_ENABLED", "FINAI_APP_DOCROOT_CONFIRMED",
        "FINAI_AUTO_PUBLISH_ENABLED", "FINAI_FIRST_PUBLISH_RESTORE_READY",
        "FINAI_DEPLOY_SSH_USER",
    )
    report = interpret(args.commit, {name: os.environ.get(name) for name in names})
    output = summary(report)
    print(output)
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as stream:
            stream.write(output + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
