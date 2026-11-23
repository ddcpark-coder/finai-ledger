#!/usr/bin/env python3
"""NEXT36: one-shot read-only status check on the dedicated FinAI cPanel account.

No writes, SSH, DB queries, UAPI changes, foreign-account inspections or secrets.
A PASS is only local filesystem evidence, never approval of backup/ACL/deploy.
"""
import hashlib
import os
from pathlib import Path
import pwd
import re
import stat
import sys

TARGET_HOME = Path("/home/einteg86")
TARGET_UID = 1256
TARGET_USER = "einteg86"
CAGEFS_TOKEN = Path("/var/.cagefs/.cagefs.token")
EXPECTED_GATE_SHA256 = "1fab189318a6d3769d60a6878e4d6262c27787685709b9d76e9966b35dc2434d"
REWRITE = "RewriteRule ^(.*)$ _finai_current/$1 [L]"
BEGIN = "# BEGIN FinAI guarded static release"
END = "# END FinAI guarded static release"
DIGEST = re.compile(r"^[0-9a-f]{64}$")


def mode(path):
    """lstat only; do not traverse symlinks to inspect foreign file trees."""
    try:
        return path.lstat()
    except OSError:
        return None


def safe_directory(path, uid, allowed):
    meta = mode(path)
    return bool(meta and stat.S_ISDIR(meta.st_mode) and meta.st_uid == uid and
                stat.S_IMODE(meta.st_mode) in allowed)


def safe_file(path, uid, allowed):
    meta = mode(path)
    return bool(meta and stat.S_ISREG(meta.st_mode) and meta.st_uid == uid and
                stat.S_IMODE(meta.st_mode) in allowed and meta.st_nlink == 1)


def link_is(path, expected, uid):
    meta = mode(path)
    if not meta or not stat.S_ISLNK(meta.st_mode) or meta.st_uid != uid:
        return False
    try:
        return os.readlink(path) == str(expected)
    except OSError:
        return False


def inspect_tree(home, uid):
    """Inspect only the known dedicated app and release paths."""
    state = {
        "home": "STOP",
        "app_docroot": "STOP",
        "release_root": "STOP",
        "gate": "STOP",
        "apache_rewrite": "STOP",
        "docroot_pointer": "STOP",
        "release_pointer": "STOP",
        "release_digest": "UNVERIFIED",
        "webserver_mapping": "NOT_VERIFIED_BY_THIS_TOOL",
        "backup_restore": "NOT_VERIFIED_BY_THIS_TOOL",
        "database_isolation": "NOT_VERIFIED_BY_THIS_TOOL",
        "deploy_authorized": "NO",
    }
    if not safe_directory(home, uid, {0o711}):
        return state
    state["home"] = "PASS"
    app = home / "app.e-integrator.si"
    root = home / "finai-deploy"
    if safe_directory(app, uid, {0o750}):
        state["app_docroot"] = "PASS"
    if safe_directory(root, uid, {0o700, 0o711}):
        state["release_root"] = "PASS"
    if state["app_docroot"] != "PASS" or state["release_root"] != "PASS":
        return state
    gate = root / "finai-isolated-ssh-gate.py"
    if safe_file(gate, uid, {0o700}):
        try:
            digest = hashlib.sha256(gate.read_bytes()).hexdigest()
            if digest == EXPECTED_GATE_SHA256:
                state["gate"] = "PASS_PINNED"
            else:
                state["gate"] = "UNRECOGNIZED_SHA256"
        except OSError:
            pass

    config = app / ".htaccess"
    if safe_file(config, uid, {0o644}):
        try:
            data = config.read_bytes()
            if len(data) <= 65536:
                content = data.decode("utf-8")
                if (content.count(BEGIN) == 1 and content.count(END) == 1 and
                        content.count(REWRITE) == 1):
                    state["apache_rewrite"] = "PASS"
        except (OSError, UnicodeDecodeError):
            pass

    if link_is(app / "_finai_current", root / "current", uid):
        state["docroot_pointer"] = "PASS"

    public_root = root / "public-releases"
    current = root / "current"
    if safe_directory(public_root, uid, {0o711}):
        meta = mode(current)
        if meta and stat.S_ISLNK(meta.st_mode) and meta.st_uid == uid:
            try:
                raw = os.readlink(current)
                target = Path(raw)
                if (target.is_absolute() and target.parent == public_root and
                        DIGEST.fullmatch(target.name) and
                        safe_directory(target, uid, {0o511})):
                    state["release_pointer"] = "PASS"
                    state["release_digest"] = target.name
            except OSError:
                pass
    return state


def main():
    user = pwd.getpwuid(os.getuid())
    if (os.getuid() != TARGET_UID or user.pw_name != TARGET_USER or
            user.pw_dir != str(TARGET_HOME) or
            os.environ.get("HOME") != str(TARGET_HOME)):
        print("FINAI_DOCROOT_INSPECT=STOP_WRONG_DEDICATED_ACCOUNT")
        return 65
    if not CAGEFS_TOKEN.exists():
        print("FINAI_DOCROOT_INSPECT=STOP_CAGEFS_SESSION_UNVERIFIED")
        return 65
    state = inspect_tree(TARGET_HOME, TARGET_UID)
    for key, value in state.items():
        print("FINAI_" + key.upper() + "=" + value)
    passed = all(state[key].startswith("PASS") for key in (
        "home", "app_docroot", "release_root", "gate", "apache_rewrite",
        "docroot_pointer", "release_pointer"))
    print("FINAI_DOCROOT_INSPECT=" + ("PASS_READONLY_ONLY" if passed else "STOP_REVIEW_REQUIRED"))
    print("FINAI_STAGE_AND_PROMOTE_AUTHORIZED=NO")
    return 0 if passed else 65


if __name__ == "__main__":
    sys.exit(main())
