#!/usr/bin/env python3
"""Read-only unauthenticated FTPS TLS handshake for the FinAI FTP endpoint.

Hard-coded to the cPanel-provided FTP endpoint. No password, LOGIN, PWD/CWD,
listing, upload, delete, mkdir, FTP account modification, or deployment.
Successful TLS verification is NOT proof of FTP user isolation.
"""
from __future__ import annotations

import argparse
import ftplib
import ssl
import sys

HOST = "ftp.laskoteka.si"
PORT = 21


class Denied(Exception):
    pass


def check_control_tls(*, factory=ftplib.FTP_TLS, ssl_socket_type=ssl.SSLSocket) -> None:
    context = ssl.create_default_context()
    # cPanel may display a hostname different from the certificate name.
    # We must not disable hostname verification to make such a setup appear safe.
    if not context.check_hostname or context.verify_mode != ssl.CERT_REQUIRED:
        raise Denied("TLS verification is not enforced")
    client = factory(context=context, timeout=12)
    try:
        client.connect(HOST, PORT)
        client.auth()
        if not isinstance(client.sock, ssl_socket_type):
            raise Denied("control channel is not TLS")
        if not client.sock.getpeercert():
            raise Denied("verified peer certificate is unavailable")
    finally:
        # Closing the connection does not mutate remote site content or accounts.
        # Do not send LOGIN, PBSZ/PROT, CWD, RETR, STOR, DELE or other FTP commands.
        client.close()


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="FinAI TLS-only FTP server health check")
    parser.add_argument("--remote-tls-only", action="store_true")
    args = parser.parse_args(argv)
    if not args.remote_tls_only:
        print("FINAI_FTPS_TLS_PREFLIGHT=NO_NETWORK")
        print("FINAI_REMOTE_WRITES=DISABLED")
        return 0
    try:
        check_control_tls()
    except (OSError, EOFError, ftplib.Error, ssl.SSLError, Denied):
        print("FINAI_FTPS_CONTROL_TLS=FAILED", file=sys.stderr)
        print("FINAI_REMOTE_WRITES=DISABLED", file=sys.stderr)
        return 64
    print("FINAI_FTPS_CONTROL_TLS=PASS")
    print("FINAI_FTPS_AUTHENTICATION=NOT_ATTEMPTED")
    print("FINAI_FTPS_USER_JAIL=NOT_VERIFIED")
    print("FINAI_REMOTE_WRITES=DISABLED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
