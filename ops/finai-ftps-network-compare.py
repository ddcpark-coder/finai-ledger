#!/usr/bin/env python3
"""Read-only network diagnosis for two previously confirmed Hiper M FTP hostnames.

No FTP protocol commands, TLS secrets, logins, SSH, files, DNS edits,
control-panel changes or uploads. Only DNS resolution and TCP connect to 21.
Neither hostname success nor failure proves permissions or FTP isolation.
"""
import argparse
import errno
import socket
import time

HOSTS = ("ftp.laskoteka.si", "hcp-30.controlpanel.si")
PORT = 21
TIMEOUT = 4.0


def probe_host(host, *, resolve=socket.getaddrinfo, sock_factory=socket.socket):
    assert host in HOSTS, "Unexpected host is prohibited"
    report = {"host": host, "dns": "UNKNOWN", "ipv4": [], "ipv6": []}
    try:
        records = resolve(host, PORT, type=socket.SOCK_STREAM)
    except socket.gaierror:
        report["dns"] = "FAILED"
        return report
    report["dns"] = "OK"
    seen = set()
    for family, socktype, proto, canonname, address in records:
        if family not in (socket.AF_INET, socket.AF_INET6):
            continue
        family_label = "ipv4" if family == socket.AF_INET else "ipv6"
        ip = address[0]
        if (family, ip) in seen:
            continue
        seen.add((family, ip))
        if len(report[family_label]) >= 2:
            continue
        label = "UNTESTED"
        start = time.monotonic()
        with sock_factory(family, socket.SOCK_STREAM) as conn:
            conn.settimeout(TIMEOUT)
            try:
                conn.connect(address)
                label = "CONNECTED"
            except (socket.timeout, TimeoutError):
                label = "TIMEOUT"
            except ConnectionRefusedError:
                label = "REFUSED"
            except OSError as exc:
                if getattr(exc, "errno", None) in (errno.ENETUNREACH, errno.EHOSTUNREACH):
                    label = "UNREACHABLE"
                else:
                    label = "NETWORK_ERROR"
        elapsed = time.monotonic() - start
        report[family_label].append({"ip": ip, "result": label, "duration_seconds": round(elapsed, 2)})
    return report


def main():
    parser = argparse.ArgumentParser(description="FinAI read-only FTP host DNS/TCP diagnosis")
    parser.add_argument("--network", action="store_true", help="Only approved hostnames TCP/21")
    args = parser.parse_args()
    if not args.network:
        print("FINAI_FTPS_NETWORK_DIAGNOSTIC=OFFLINE")
        print("FINAI_FTPS_REMOTE_WRITES=DISABLED")
        return
    for host in HOSTS:
        result = probe_host(host)
        print("HOST=" + host)
        print("DNS=" + result["dns"])
        for family in ("ipv4", "ipv6"):
            if not result[family]:
                print(f"{family.upper()}=NO_ADDRESS_OR_UNAVAILABLE")
            for item in result[family]:
                print(f"{family.upper()}_ADDR={item['ip']} TCP21={item['result']} DURATION_S={item['duration_seconds']}")
    print("FINAI_FTPS_CREDENTIALS=NOT_USED")
    print("FINAI_FTPS_REMOTE_WRITES=DISABLED")


if __name__ == "__main__":
    main()
