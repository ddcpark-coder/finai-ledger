#!/usr/bin/env python3
"""FinAI NEXT16: strictly read-only, local filesystem isolation preflight.

Run ONLY under the new dedicated FinAI OS/cPanel account, never as laskot48.
No writes, chmod, key edits, remote calls, database connections or protected
project inspection. A successful local scan IS NOT deploy authorization.
"""
import argparse
import os
import pwd
import re
import stat
from pathlib import Path

SHA256 = re.compile(r"^[0-9a-f]{64}$")


def inspect(user_name: str, uid: int, home: Path, app_root: Path,
            public_docroot: Path, shared_uid: int | None = None) -> list[str]:
    problems: list[str] = []
    if uid == 0 or user_name in {"root", "laskot48"}:
        return ["Dedicated non-root FinAI account required"]
    if shared_uid is not None and uid == shared_uid:
        return ["FinAI shares a system UID with laskot48"]
    if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]{1,30}", user_name):
        return ["Unexpected hosting system account identifier"]

    if not home.is_absolute() or home == Path("/") or ".." in home.parts:
        return ["Unsafe OS account home"]
    if not home.exists() or home.is_symlink() or not home.is_dir():
        return ["Dedicated OS home missing, linked or not a directory"]
    if home.stat().st_uid != uid:
        problems.append("OS home is not owned by dedicated FinAI UID")

    for name, candidate in (("app", app_root), ("public", public_docroot)):
        if not candidate.is_absolute() or ".." in candidate.parts:
            problems.append(f"{name}: unsafe absolute path")
            continue
        if candidate == home or home not in candidate.parents:
            problems.append(f"{name}: target must be inside dedicated account home")
            continue
        # Inspect the exact path components with lstat, never follow a symlink
        # into another project, even for a quick "test".
        relative = candidate.relative_to(home)
        current = home
        for part in relative.parts:
            current = current / part
            try:
                meta = current.lstat()
            except FileNotFoundError:
                problems.append(f"{name}: component missing in dedicated home")
                break
            if stat.S_ISLNK(meta.st_mode):
                problems.append(f"{name}: symlinked component rejected")
                break
            if not stat.S_ISDIR(meta.st_mode):
                problems.append(f"{name}: non-directory component rejected")
                break
            if meta.st_uid != uid:
                problems.append(f"{name}: component not owned by FinAI UID")
                break
            if meta.st_mode & (stat.S_IWGRP | stat.S_IWOTH):
                problems.append(f"{name}: group/other writable directory")
                break
    # Only inspect dedicated FinAI's own current release; no foreign paths.
    if not problems:
        current = app_root / "current"
        if current.is_symlink():
            try:
                target = Path(os.readlink(current))
            except OSError:
                problems.append("FinAI current release symlink is unreadable")
            else:
                base = app_root / "public-releases"
                if not target.is_absolute() or target.parent != base or not SHA256.fullmatch(target.name):
                    problems.append("FinAI current release points outside hashed public mirrors")
                else:
                    # Validate components before resolving anything: a forged
                    # link must never traverse into another project.
                    for entry in (base, target):
                        try:
                            meta = entry.lstat()
                        except OSError:
                            problems.append("FinAI public release component missing")
                            break
                        if (not stat.S_ISDIR(meta.st_mode) or meta.st_uid != uid or
                                meta.st_mode & (stat.S_IWGRP | stat.S_IWOTH)):
                            problems.append("FinAI public release component is unsafe")
                            break
        elif current.exists():
            problems.append("FinAI current release is not an expected symlink")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description="Read-only FinAI local path gate")
    parser.add_argument("--app-root", required=True)
    parser.add_argument("--public-docroot", required=True)
    args = parser.parse_args()
    info = pwd.getpwuid(os.getuid())
    home = Path(info.pw_dir)
    try:
        shared_uid = pwd.getpwnam("laskot48").pw_uid
    except KeyError:
        shared_uid = None
    problems = inspect(info.pw_name, os.getuid(), home, Path(args.app_root),
                       Path(args.public_docroot), shared_uid)
    if problems:
        for problem in problems:
            print("FINAI_LOCAL_ISOLATION_STOP=" + problem)
    else:
        print("FINAI_LOCAL_FILESYSTEM_CHECK=PASS")
    # Never emit 'approved' or enable deployment based on filesystem checks.
    print("FINAI_DATABASE_SCOPE=NOT_VERIFIED_BY_THIS_TOOL")
    print("FINAI_TLS_AND_RESTORE=NOT_VERIFIED_BY_THIS_TOOL")
    print("FINAI_DEPLOY_AUTHORIZED=NO")
    return 65 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
