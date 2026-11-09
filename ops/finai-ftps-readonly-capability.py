#!/usr/bin/env python3
"""FinAI: strictly read-only FTPS capability probe for a potential jailed account.

Does not create FTP users, upload/download/list files, write to Hiper M,
alter SSH/cPanel settings, or authorize production use. A successful probe
is NOT proof of OS isolation or permission to deploy on shared laskot48.
"""
from __future__ import annotations

import argparse
import ftplib
import os
import re
import ssl
import sys

HOST = "ftp.laskoteka.si"
USER_RE = re.compile(r"^finai[-a-z0-9_.]{1,50}@e-integrator\.si$")
MAX_PATH = 300


class Denied(Exception):
    pass


def validate_settings(host: str, user: str, port: int, approved: str) -> None:
    if approved != "YES":
        raise Denied("manual read-only probe approval missing")
    if host != HOST:
        raise Denied("host is not the pinned Hiper M address")
    if not USER_RE.fullmatch(user or "") or user.startswith("laskot48"):
        raise Denied("not a dedicated FinAI FTP account")
    if port != 21:
        raise Denied("only explicit FTPS on port 21 is supported")


def _pwd(client) -> str:
    value = client.pwd()
    if not isinstance(value, str) or len(value) > MAX_PATH or not value.startswith("/"):
        raise Denied("unexpected FTP PWD")
    return value


def read_only_jail_probe(client) -> None:
    """All remote interactions are PWD and CWD, never writes or file listing.

    A successful result is only preliminary evidence; provider-side
    ChrootEveryone/DefaultRoot and actual scoped home must be verified.
    """
    client.cwd("/")
    if _pwd(client) != "/":
        raise Denied("virtual FTP root does not appear isolated")

    for candidate in ("..", "../..", "/../..", "/etc", "/home"):
        try:
            client.cwd(candidate)
        except ftplib.error_perm:
            pass
        else:
            if _pwd(client) != "/":
                raise Denied("FTP directory traversal may escape jail")
        finally:
            client.cwd("/")
    if _pwd(client) != "/":
        raise Denied("FTP location changed unexpectedly")


def remote_probe(env=os.environ, factory=ftplib.FTP_TLS) -> None:
    host = env.get("FINAI_FTPS_HOST", "")
    user = env.get("FINAI_FTPS_USERNAME", "")
    password = env.get("FINAI_FTPS_PASSWORD", "")
    approved = env.get("FINAI_FTPS_READONLY_PROBE_ENABLED", "")
    port = int(env.get("FINAI_FTPS_PORT", "21"))
    validate_settings(host, user, port, approved)
    if not password:
        raise Denied("missing secret in protected GitHub environment")

    context = ssl.create_default_context()
    connection = factory(context=context, timeout=12)
    try:
        connection.connect(host, port)
        connection.auth()
        connection.login(user, password)
        connection.prot_p()
        read_only_jail_probe(connection)
    finally:
        # Even if probing fails, no transfer/deletion/modification command runs.
        try:
            connection.quit()
        except (OSError, EOFError, ftplib.Error):
            try:
                connection.close()
            except (OSError, AttributeError):
                pass


def main() -> int:
    parser = argparse.ArgumentParser(description="FinAI FTPS read-only readiness")
    parser.add_argument("--remote-readonly", action="store_true")
    args = parser.parse_args()
    if not args.remote_readonly:
        print("FINAI_FTPS_PROBE=OFFLINE_NO_NETWORK")
        print("FINAI_REMOTE_UPLOAD=DISABLED")
        return 0
    try:
        remote_probe()
    except (Denied, OSError, ValueError, ssl.SSLError, ftplib.Error):
        print("FINAI_FTPS_READONLY_PROBE=DENIED", file=sys.stderr)
        return 64
    print("FINAI_FTPS_READONLY_PROBE=PASS_PRELIMINARY_ONLY")
    print("FINAI_PROVIDER_ISOLATION_VERIFICATION=REQUIRED")
    print("FINAI_REMOTE_UPLOAD=DISABLED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
