#!/usr/bin/env python3
"""Fail-closed verifier for the exported FinAI static website.

Only reads a supplied local build directory. The optional manifest is written
outside the build directory (e.g. the GitHub runner's temporary directory).
Never connects to Hiper M, cPanel, SSH, FTPS, databases or other projects.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import stat
import sys

MAX_FILES = 10_000
MAX_TOTAL = 300 * 1024 * 1024
MAX_ONE = 50 * 1024 * 1024
EXCLUDED_SUFFIXES = (".php", ".phtml", ".phar", ".py", ".sh", ".pl", ".cgi", ".env", ".pem", ".key", ".sqlite", ".db")
EXCLUDED_NAMES = {".htaccess", ".htpasswd", ".env", "web.config", "authorized_keys", "id_rsa", "id_ed25519"}


class InvalidRelease(Exception):
    pass


def valid_relative(name: str) -> None:
    if not name or name.startswith("/") or "\\" in name or "\x00" in name:
        raise InvalidRelease("invalid relative asset path")
    parts = PurePosixPath(name).parts
    if not parts or any(part in ("", ".", "..") or part.startswith(".") for part in parts):
        raise InvalidRelease("hidden or traversal path forbidden")
    if any(len(part) > 180 for part in parts):
        raise InvalidRelease("path component too long")
    if any(part.lower() in EXCLUDED_NAMES or part.lower().endswith(EXCLUDED_SUFFIXES) for part in parts):
        raise InvalidRelease("server configuration or executable in export")


def digest_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            block = f.read(1024 * 1024)
            if not block:
                break
            h.update(block)
    return h.hexdigest()


def scan(root: Path) -> dict:
    if root.is_symlink() or not root.is_dir():
        raise InvalidRelease("build directory missing or symlinked")
    resolved = root.resolve(strict=True)
    records = []
    total = 0
    seen = set()
    for base, dirs, files in os.walk(resolved, topdown=True, followlinks=False):
        dirs.sort()
        files.sort()
        directory = Path(base)
        for dirname in dirs:
            p = directory / dirname
            valid_relative(p.relative_to(resolved).as_posix())
            if p.is_symlink() or not stat.S_ISDIR(p.lstat().st_mode):
                raise InvalidRelease("symlinked or invalid directory")
        for filename in files:
            p = directory / filename
            relative = p.relative_to(resolved).as_posix()
            valid_relative(relative)
            if relative.casefold() in seen:
                raise InvalidRelease("case-insensitive collision")
            seen.add(relative.casefold())
            meta = p.lstat()
            if not stat.S_ISREG(meta.st_mode) or p.is_symlink():
                raise InvalidRelease("nonregular file or symbolic link")
            if meta.st_size > MAX_ONE:
                raise InvalidRelease("oversized asset")
            total += meta.st_size
            if total > MAX_TOTAL or len(records) >= MAX_FILES:
                raise InvalidRelease("static export too large")
            records.append({"path": relative, "size": meta.st_size, "sha256": digest_file(p)})
    records.sort(key=lambda item: item["path"])
    paths = {record["path"] for record in records}
    if "index.html" not in paths or not any(p.startswith("_next/") and p.endswith((".js", ".css")) for p in paths):
        raise InvalidRelease("missing index.html or framework assets")
    if next(x for x in records if x["path"] == "index.html")["size"] < 100:
        raise InvalidRelease("empty website entrypoint")
    return {"format": "finai-static-manifest-v1", "total_bytes": total, "file_count": len(records), "files": records}


def run() -> int:
    parser = argparse.ArgumentParser(description="FinAI static export verification; local only")
    parser.add_argument("--root", required=True, type=Path)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--write-manifest", type=Path)
    group.add_argument("--verify-manifest", type=Path)
    args = parser.parse_args()
    try:
        actual = scan(args.root)
        target = args.write_manifest or args.verify_manifest
        if target.is_symlink():
            raise InvalidRelease("manifest destination is symbolic link")
        if args.write_manifest:
            if target.parent.resolve() == args.root.resolve() or args.root.resolve() in target.parent.resolve().parents:
                raise InvalidRelease("manifest must be outside build directory")
            with target.open("x", encoding="utf-8") as out:
                json.dump(actual, out, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
                out.write("\n")
            print("FINAI_STATIC_MANIFEST=CREATED")
        else:
            with target.open("r", encoding="utf-8") as inp:
                expected = json.load(inp)
            if expected != actual:
                raise InvalidRelease("static export does not match signed-off manifest")
            print("FINAI_STATIC_MANIFEST=VERIFIED")
        print("FINAI_STATIC_EXPORT_INTEGRITY=PASS")
        print("file_count=" + str(actual["file_count"]))
        return 0
    except (InvalidRelease, ValueError, OSError, json.JSONDecodeError):
        print("FINAI_STATIC_EXPORT_INTEGRITY=DENIED", file=sys.stderr)
        return 64


if __name__ == "__main__":
    raise SystemExit(run())
