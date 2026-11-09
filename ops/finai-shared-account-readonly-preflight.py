#!/usr/bin/env python3
"""Read-only FinAI path / Unix-account readiness report on a shared Hiper M host.

NO writes, no SSH or cPanel changes, no DB connections, no shell execution,
no reading file contents, no inspection of Laškoteka or STNG paths.

Important: paths under the SAME OS UID do NOT establish a write boundary.
This tool must NEVER authorize shared-account deployment.
"""
from __future__ import annotations

import os
import pwd
import stat
from pathlib import Path

SHARED_USER = "laskot48"
SHARED_HOME = Path("/home/laskot48")
FINAI_APP = SHARED_HOME / "apps" / "finai-ledger"
FINAI_CANDIDATE_SITE = SHARED_HOME / "e-integrator.si"
LABELS = (
    ("finai_app", FINAI_APP),
    ("finai_candidate_webroot", FINAI_CANDIDATE_SITE),
)
MAX_LEVELS = 12


def classify_components(path: Path, expected_uid: int) -> str:
    """lstat only parent components of the supplied FINAI path, never follow links."""
    if not path.is_absolute():
        return "INVALID_NOT_ABSOLUTE"
    parts = path.parts
    if len(parts) > MAX_LEVELS:
        return "INVALID_DEPTH"
    current = Path(parts[0])
    for part in parts[1:]:
        current = current / part
        try:
            item = os.lstat(current)
        except FileNotFoundError:
            return "MISSING"
        except PermissionError:
            return "INACCESSIBLE"
        if stat.S_ISLNK(item.st_mode):
            return "SYMLINK_REJECTED"
        if not stat.S_ISDIR(item.st_mode):
            return "NOT_DIRECTORY"
        # /home is commonly owned by root, while user paths must
        # be owned by the account being inspected.
        if current == SHARED_HOME or SHARED_HOME in current.parents:
            if item.st_uid != expected_uid:
                return "UNEXPECTED_OWNER"
    return "PRESENT_EXPECTED_OWNER"


def report_shared_account(
    uid: int,
    username: str,
    *,
    labels=LABELS,
    classifier=classify_components,
) -> dict[str, str]:
    """Pure report constructor. No branch allows shared-account writes."""
    result = {
        "version": "FINAI_SHARED_ACCOUNT_PREFLIGHT_V1",
        "mode": "READ_ONLY",
        "account": "expected" if username == SHARED_USER else "not_shared_account",
        "uid_boundary": "UNPROVEN_SHARED_UID",
        "production_deploy": "BLOCKED",
        "finai_ssh_write": "BLOCKED",
        "shared_ssh_key_changes": "FORBIDDEN",
        "result": "NO_GO_SHARED_ACCOUNT_WRITE",
    }
    for label, target in labels:
        result[label] = (
            classifier(target, uid)
            if username == SHARED_USER
            else "NOT_CHECKED_DIFFERENT_ACCOUNT"
        )
    return result


def main() -> int:
    user = pwd.getpwuid(os.getuid())
    checks = report_shared_account(os.getuid(), user.pw_name)
    # Fixed labels only; never print directory contents, secret paths or env.
    for key, value in checks.items():
        print(f"{key}={value}")
    return 0  # A non-error report is NOT approval for writes.


if __name__ == "__main__":
    raise SystemExit(main())
