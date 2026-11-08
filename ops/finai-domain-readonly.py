#!/usr/bin/env python3
"""FinAI-only read-only cPanel domain/zone audit.

Invoked only by the fixed FinAI SSH forced-command gate. All UAPI calls have
literal module/function/arguments; no user-supplied command, path or hostname.
Output intentionally excludes all TXT, MX, NS, SOA, DKIM, mail and token data.
"""
import base64
import json
import os
import re
import subprocess
import sys

UAPI = "/usr/local/cpanel/bin/uapi"
USER = "laskot48"
ZONE = "e-integrator.si"
HOSTS = (ZONE, "www." + ZONE, "app." + ZONE, "api." + ZONE)
DOCROOT_DOMAINS = (ZONE, "app." + ZONE, "api." + ZONE)
SAFE_TYPES = frozenset(("A", "AAAA", "CNAME"))
MAX_OUTPUT = 2 * 1024 * 1024
CONTROL = re.compile(r"[\x00-\x1f\x7f]")
DNS_NAME = re.compile(r"^[a-z0-9._-]{1,253}$", re.I)
VALUE = re.compile(r"^[a-z0-9._:\-]{1,253}$", re.I)


def clean(s, limit=255):
    if not isinstance(s, (str, int)):
        return None
    text = str(s).strip()
    if not text or len(text) > limit or CONTROL.search(text):
        return None
    return text


def call(module, function, *fixed):
    """Return UAPI's data or None; never forward stderr or raw JSON."""
    if not os.path.isfile(UAPI) or not os.access(UAPI, os.X_OK):
        return None
    args = [UAPI, "--user=" + USER, "--output=json", module, function, *fixed]
    try:
        result = subprocess.run(
            args, shell=False, timeout=20, check=False,
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            env={"PATH": "/usr/local/cpanel/bin:/usr/bin:/bin",
                 "HOME": "/home/laskot48", "LANG": "C"},
        )
        if result.returncode or len(result.stdout) > MAX_OUTPUT:
            return None
        parsed = json.loads(result.stdout)
        body = parsed.get("result", parsed)
        if not isinstance(body, dict) or body.get("status") not in (1, True):
            return None
        return body.get("data")
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return None


def domain_docroot(data):
    """Extract exactly a document root, no unrelated cPanel metadata."""
    if isinstance(data, list) and len(data) == 1:
        data = data[0]
    if not isinstance(data, dict):
        return "unavailable"
    value = data.get("documentroot", data.get("document_root"))
    if not isinstance(value, str):
        return "unavailable"
    if CONTROL.search(value) or len(value) > 350:
        return "unavailable"
    if value != "/home/laskot48" and not value.startswith("/home/laskot48/"):
        return "unexpected_path_hidden"
    return value


def walk_records(node, depth=0):
    """Accept cPanel's known nested response variations, with strict depth bound."""
    if depth > 7:
        return
    if isinstance(node, dict):
        if isinstance(node.get("name"), str) and (
            isinstance(node.get("type"), str)
            or isinstance(node.get("record_type"), str)
        ):
            yield node
            return
        for key in ("records", "record", "payload", "zone", "data", "result", "items"):
            if key in node:
                yield from walk_records(node[key], depth + 1)
    elif isinstance(node, list):
        for item in node[:1200]:
            yield from walk_records(item, depth + 1)


def dns_value(record):
    """Accept public address/CNAME only. Never return raw zone lines or TXT data."""
    for key in ("address", "cname", "value"):
        value = clean(record.get(key), 253)
        if value and VALUE.fullmatch(value):
            return value
    raw = record.get("data_b64")
    if isinstance(raw, str):
        raw = [raw]
    if isinstance(raw, list) and len(raw) == 1 and isinstance(raw[0], str):
        try:
            v = base64.b64decode(raw[0], validate=True).decode("ascii").strip()
            if clean(v, 253) and VALUE.fullmatch(v):
                return v
        except (ValueError, UnicodeError):
            pass
    raw = record.get("data")
    if isinstance(raw, str) and clean(raw, 253) and VALUE.fullmatch(raw):
        return raw
    return "unavailable"


def normalized_zone(data):
    records = list(walk_records(data))
    out = []
    for record in records:
        name = clean(record.get("name"), 253)
        kind = clean(record.get("type", record.get("record_type")), 12)
        if not name or not kind:
            continue
        name = name.rstrip(".").lower()
        kind = kind.upper()
        if name not in HOSTS or kind not in SAFE_TYPES or not DNS_NAME.fullmatch(name):
            continue
        ttl = record.get("ttl")
        ttl = str(ttl) if isinstance(ttl, int) and 0 <= ttl <= 864000 else "unknown"
        out.append((name, kind, dns_value(record), ttl))
    return records, sorted(set(out))


def main():
    # Do not run as arbitrary account or from the wrong privileged context.
    if os.getuid() == 0 or os.environ.get("USER") not in (None, USER):
        print("STOP: unexpected cPanel account", file=sys.stderr)
        return 65
    print("finai_domains_audit=v1")
    print("scope=e-integrator.si_only")
    print("operation=domains")
    for host in DOCROOT_DOMAINS:
        data = call("DomainInfo", "single_domain_data", "domain=" + host)
        print("domain=" + host)
        print("document_root=" + (domain_docroot(data) if data is not None else "unavailable"))
    data = call("DNS", "parse_zone", "zone=" + ZONE)
    if data is None:
        print("dns_zone_status=unavailable")
        print("result=partial_read_only_audit")
        return 69
    records, selected = normalized_zone(data)
    if not records:
        print("dns_zone_status=unknown_schema")
        print("result=partial_read_only_audit")
        return 69
    print("dns_zone_status=read")
    print("dns_safe_record_count=" + str(len(selected)))
    for host, kind, value, ttl in selected:
        print("dns_record=" + host + "|" + kind + "|" + value + "|" + ttl)
    print("result=read_only_domain_audit_complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
