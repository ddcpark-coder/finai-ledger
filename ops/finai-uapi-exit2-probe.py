#!/usr/bin/env python3
"""FinAI / e-integrator.si: read-only cPanel UAPI exit-2 diagnosis.

This script calls only DomainInfo::single_domain_data, DomainInfo::list_domains,
and DNS::parse_zone, all read-only. It prints *no cPanel response body*,
credentials, DNS zone records, email addresses, or raw stderr.
"""
import json
import os
import pwd
import re
import subprocess
import sys

USER = "laskot48"
UAPI = "/usr/local/cpanel/bin/uapi"
ZONE = "e-integrator.si"


def classify(stderr):
    """Whitelist predefined diagnoses; never print untrusted stderr."""
    t = stderr.decode("utf-8", "replace").lower()[:8192]
    keys = (
        ("privilege_or_root", ("only root", "must be root", "root privileges", "not running as root")),
        ("permission_denied", ("permission denied", "operation not permitted", "access denied")),
        ("invalid_user", ("unknown user", "invalid user", "no such user", "user does not exist")),
        ("cli_usage", ("unknown option", "unrecognized option", "invalid option", "usage:", "unrecognized arguments")),
        ("not_available", ("not found", "not installed", "unsupported", "unknown module", "unknown function")),
        ("runtime_environment", ("could not load", "can't locate", "module not found", "can't find", "unable to load")),
        ("api_authentication", ("not authenticated", "authentication failed", "login required")),
    )
    for label, needles in keys:
        if any(needle in t for needle in needles):
            return label
    return "unclassified"


def run(label, command):
    try:
        result = subprocess.run(
            command, shell=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            timeout=15, check=False, env=os.environ.copy(),
        )
    except (OSError, subprocess.TimeoutExpired) as err:
        print(f"{label}: transport={type(err).__name__}")
        return
    note = "not_json"
    if result.returncode == 0 and len(result.stdout) <= 1_000_000:
        try:
            envelope = json.loads(result.stdout)
            if isinstance(envelope, dict) and isinstance(envelope.get("result"), dict):
                status = envelope["result"].get("status")
                note = "uapi_status_" + ("ok" if status in (1, True) else "not_ok")
            else:
                note = "unexpected_json_shape"
        except (ValueError, UnicodeError):
            note = "non_json_output"
    elif len(result.stdout) > 1_000_000:
        note = "oversized_response_hidden"
    # Only allow integer return status and fixed output classifications; suppress
    # all actual UAPI stdout and stderr, which can contain private account data.
    print(f"{label}: exit={result.returncode}, output={note}, error_class={classify(result.stderr)}")


def main():
    if pwd.getpwuid(os.getuid()).pw_name != USER or os.getuid() == 0:
        print("STOP: unexpected account")
        return 65
    print("FINAI_UAPI_EXIT2_PROBE=v2")
    print("scope=e-integrator.si")
    print("read_only=yes")
    print("uapi_binary=" + ("present" if os.path.isfile(UAPI) else "absent"))
    if not (os.path.isfile(UAPI) and os.access(UAPI, os.X_OK)):
        return 69

    forms = (
        ("no_user_json", ("--output=json",)),
        ("explicit_user_json", ("--user=" + USER, "--output=json")),
        ("no_user_jsonpretty", ("--output=jsonpretty",)),
        ("explicit_user_jsonpretty", ("--user=" + USER, "--output=jsonpretty")),
    )
    for name, flags in forms:
        run(name + "_list_domains", (UAPI, *flags, "DomainInfo", "list_domains"))
    for name, flags in forms[:2]:
        run(name + "_single_domain", (UAPI, *flags, "DomainInfo",
                                     "single_domain_data", "domain=" + ZONE))
        run(name + "_dns_parse_zone", (UAPI, *flags, "DNS", "parse_zone", "zone=" + ZONE))
    print("FINAI_UAPI_EXIT2_PROBE_DONE")
    return 0


if __name__ == "__main__":
    sys.exit(main())
