#!/usr/bin/env python3
"""SITE-EI-02 read-only cPanel UAPI diagnostic. No changes; no secret-bearing output.

Run as laskot48 only, from an immutable GitHub SHA. This diagnostic intentionally
does not print raw UAPI JSON, stdout, stderr, errors, DNS zone, other domains,
TXT/MX/NS/CAA records, tokens, configuration or email addresses.
"""
import json
import os
import pwd
import re
import subprocess

UAPI = "/usr/local/cpanel/bin/uapi"
ACCOUNT = "laskot48"
ZONE = "e-integrator.si"
HOSTS = (ZONE, "app." + ZONE, "api." + ZONE)
ALLOWED = set((ZONE, "www." + ZONE, *HOSTS))
PUBLIC = {"A", "AAAA", "CNAME"}
CLEAN = re.compile(r"^[a-zA-Z0-9._:-]{1,253}$")


def api_result(module, function, argument, environment):
    cmd = [UAPI, "--user=" + ACCOUNT, "--output=json",
           module, function, argument]
    try:
        result = subprocess.run(
            cmd, shell=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            timeout=18, check=False, env=environment,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return ("execution_error_" + type(exc).__name__, None)
    if result.returncode != 0:
        return ("nonzero_exit_" + str(result.returncode), None)
    if len(result.stdout) > 2_000_000:
        return ("response_too_large", None)
    try:
        obj = json.loads(result.stdout)
    except (ValueError, UnicodeError):
        return ("invalid_json", None)
    if not isinstance(obj, dict):
        return ("unexpected_envelope", None)
    env = obj.get("result", obj)
    if not isinstance(env, dict):
        return ("unexpected_result_type", None)
    status = env.get("status")
    if status not in (1, True):
        # Never output raw error/message data from cPanel.
        return ("api_status_" + str(status)[:12], None)
    return ("ok", env.get("data"))


def safe_root(data):
    if isinstance(data, list) and len(data) == 1:
        data = data[0]
    if not isinstance(data, dict):
        return "unsupported_data_type"
    value = data.get("documentroot", data.get("document_root"))
    if not isinstance(value, str):
        return "missing"
    if "\n" in value or "\r" in value or len(value) > 320:
        return "hidden"
    if value == "/home/laskot48" or value.startswith("/home/laskot48/"):
        return value
    return "outside_finai_account_hidden"


def recurse_records(obj, depth=0):
    if depth > 8:
        return
    if isinstance(obj, list):
        for item in obj[:2000]:
            yield from recurse_records(item, depth + 1)
    elif isinstance(obj, dict):
        if "name" in obj and ("type" in obj or "record_type" in obj):
            yield obj
            return
        for key in ("data", "records", "record", "zone", "payload", "result", "items"):
            if key in obj:
                yield from recurse_records(obj[key], depth + 1)


def safe_summary(data):
    records = list(recurse_records(data))
    matching = 0
    for row in records:
        name = row.get("name")
        typ = row.get("type", row.get("record_type"))
        if not isinstance(name, str) or not isinstance(typ, str):
            continue
        if name.rstrip(".").lower() in ALLOWED and typ.upper() in PUBLIC:
            matching += 1
    return f"records_parsed={len(records)} safe_finai_record_count={matching}"


def main():
    if pwd.getpwuid(os.getuid()).pw_name != ACCOUNT:
        print("STOP: wrong account")
        return 65
    print("FINAI_UAPI_PROBE=v1")
    print("scope=e-integrator.si")
    print("read_only=yes")
    print("binary_present=" + ("yes" if os.path.isfile(UAPI) else "no"))
    print("binary_executable=" + ("yes" if os.access(UAPI, os.X_OK) else "no"))
    inherited = dict(os.environ)
    minimal = {
        "PATH": "/usr/local/cpanel/bin:/usr/bin:/bin",
        "HOME": "/home/laskot48",
        "LANG": "C"
    }
    for label, environment in (("inherited", inherited), ("minimal", minimal)):
        for host in HOSTS:
            status, data = api_result("DomainInfo", "single_domain_data",
                                      "domain=" + host, environment)
            print(f"mode={label} endpoint=DomainInfo target={host} status={status}")
            if status == "ok":
                print(f"docroot={host}|{safe_root(data)}")
        status, data = api_result("DNS", "parse_zone", "zone=" + ZONE, environment)
        print(f"mode={label} endpoint=DNS.parse_zone target={ZONE} status={status}")
        if status == "ok":
            print(safe_summary(data))
    print("FINAI_UAPI_PROBE_DONE")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
