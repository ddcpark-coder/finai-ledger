#!/usr/bin/env python3
"""FinAI offline staging release plan: verify archive against SHA256 file manifest.

No FTP/SSH/cPanel/database access and no network imports. Never deploys.
Can later be consumed by a separately authorized, isolated transport.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import sys
import tarfile

MAX_ARCHIVE_BYTES = 100 * 1024 * 1024
MAX_EXPANDED_BYTES = 300 * 1024 * 1024
MAX_SINGLE_FILE = 50 * 1024 * 1024
MAX_FILES = 10_000
SHA256 = re.compile(r"^[0-9a-f]{64}$")
FORBIDDEN_SUFFIXES = (
    ".php", ".phtml", ".phar", ".py", ".sh", ".pl", ".cgi",
    ".env", ".pem", ".key", ".sqlite", ".db",
)
FORBIDDEN_NAMES = {
    ".htaccess", ".htpasswd", ".env", "web.config",
    "authorized_keys", "id_rsa", "id_ed25519",
}


class InvalidPlan(Exception):
    pass


def sha_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as reader:
        for data in iter(lambda: reader.read(1024 * 1024), b""):
            digest.update(data)
    return digest.hexdigest()


def validate_relative(raw: str, *, directory: bool = False) -> str:
    if not isinstance(raw, str) or not raw or raw.startswith("/") or "\\" in raw or "\x00" in raw:
        raise InvalidPlan("invalid archive path")
    # GNU tar uses './' at the start. Do not allow internal dot segments.
    while raw.startswith("./"):
        raw = raw[2:]
    if directory:
        raw = raw.rstrip("/")
        if not raw:
            return ""
    if not raw or len(raw) > 600 or raw.endswith("/"):
        raise InvalidPlan("empty, trailing or oversized path")
    parts = raw.split("/")
    if any(
        not part or part in (".", "..") or part.startswith(".")
        or len(part) > 180
        for part in parts
    ):
        raise InvalidPlan("traversal, hidden or oversized path component")
    if any(part.lower() in FORBIDDEN_NAMES or part.lower().endswith(FORBIDDEN_SUFFIXES)
           for part in parts):
        raise InvalidPlan("script, server configuration or secret in archive")
    posix = PurePosixPath(*parts).as_posix()
    if posix != raw:
        raise InvalidPlan("noncanonical archive path")
    return posix


def _check_manifest(raw: object) -> dict[str, dict]:
    if not isinstance(raw, dict) or raw.get("format") != "finai-static-manifest-v1":
        raise InvalidPlan("unknown manifest format")
    rows = raw.get("files")
    if not isinstance(rows, list) or not rows or len(rows) > MAX_FILES:
        raise InvalidPlan("missing or excessive manifest files")
    if type(raw.get("file_count")) is not int or raw["file_count"] != len(rows):
        raise InvalidPlan("manifest count mismatch")
    files = {}
    total = 0
    seen_ci = set()
    for row in rows:
        if not isinstance(row, dict) or set(row) != {"path", "size", "sha256"}:
            raise InvalidPlan("malformed manifest row")
        path = validate_relative(row["path"])
        size = row["size"]
        digest = row["sha256"]
        if type(size) is not int or not 0 <= size <= MAX_SINGLE_FILE or not isinstance(digest, str) or not SHA256.fullmatch(digest):
            raise InvalidPlan("invalid manifest size or SHA256")
        if path.casefold() in seen_ci:
            raise InvalidPlan("duplicate or case-colliding manifest path")
        seen_ci.add(path.casefold())
        files[path] = row
        total += size
        if total > MAX_EXPANDED_BYTES:
            raise InvalidPlan("manifest exceeds expanded limit")
    if type(raw.get("total_bytes")) is not int or raw["total_bytes"] != total:
        raise InvalidPlan("manifest total mismatch")
    if "index.html" not in files or files["index.html"]["size"] < 100:
        raise InvalidPlan("missing main HTML")
    if not any(p.startswith("_next/") and p.endswith((".js", ".css")) for p in files):
        raise InvalidPlan("missing framework assets")
    return files


def make_plan(archive_path: Path, manifest_path: Path) -> dict:
    """Verify *every archive file* against a local per-file manifest; no writes."""
    if not archive_path.is_file() or archive_path.is_symlink():
        raise InvalidPlan("missing or symlinked archive")
    if not manifest_path.is_file() or manifest_path.is_symlink():
        raise InvalidPlan("missing or symlinked manifest")
    if archive_path.stat().st_size > MAX_ARCHIVE_BYTES:
        raise InvalidPlan("oversized compressed archive")
    with manifest_path.open("r", encoding="utf-8") as reader:
        declared = _check_manifest(json.load(reader))
    found = set()
    seen_ci = set()
    expanded = 0
    count = 0
    with tarfile.open(archive_path, mode="r:gz") as archive:
        for member in archive:
            if member.isdir():
                validate_relative(member.name, directory=True)
                continue
            if not member.isfile() or member.issym() or member.islnk():
                raise InvalidPlan("archive contains symlink or special member")
            rel = validate_relative(member.name)
            if rel.casefold() in seen_ci or rel not in declared:
                raise InvalidPlan("duplicate or undeclared archive member")
            seen_ci.add(rel.casefold())
            count += 1
            expanded += member.size
            if (
                count > MAX_FILES or expanded > MAX_EXPANDED_BYTES
                or member.size > MAX_SINGLE_FILE
                or member.size != declared[rel]["size"]
            ):
                raise InvalidPlan("archive member size/count mismatch")
            src = archive.extractfile(member)
            if src is None:
                raise InvalidPlan("archive member unavailable")
            digest = hashlib.sha256()
            remaining = member.size
            while remaining:
                data = src.read(min(1024 * 1024, remaining))
                if not data:
                    raise InvalidPlan("archive member truncated")
                digest.update(data)
                remaining -= len(data)
            if digest.hexdigest() != declared[rel]["sha256"]:
                raise InvalidPlan("archive member checksum mismatch")
            found.add(rel)
    if found != set(declared) or expanded != sum(x["size"] for x in declared.values()):
        raise InvalidPlan("archive/manifest file inventory mismatch")
    release_sha = sha_file(archive_path)
    return {
        "format": "finai-offline-staging-plan-v1",
        "transport": "NOT_CONFIGURED",
        "host_writes": "DISABLED",
        "release_sha256": release_sha,
        "virtual_ftp_stage": "releases/" + release_sha,
        "file_count": count,
        "total_bytes": expanded,
        "files": [
            {
                "path": path,
                "relative_stage_path": "releases/" + release_sha + "/" + path,
                "size": row["size"],
                "sha256": row["sha256"],
            }
            for path, row in sorted(declared.items())
        ],
    }


def main() -> int:
    p = argparse.ArgumentParser(description="FinAI offline FTPS staging planner")
    p.add_argument("--archive", type=Path, required=True)
    p.add_argument("--manifest", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    args = p.parse_args()
    try:
        if args.output.is_symlink() or args.output.exists():
            raise InvalidPlan("output must be a new regular file")
        result = make_plan(args.archive, args.manifest)
        with args.output.open("x", encoding="utf-8") as writer:
            json.dump(result, writer, sort_keys=True, separators=(",", ":"))
            writer.write("\n")
        print("FINAI_OFFLINE_STAGE_PLAN=PASS")
        print("FINAI_REMOTE_WRITE=DISABLED")
        print("release_sha256=" + result["release_sha256"])
        print("file_count=" + str(result["file_count"]))
        return 0
    except (InvalidPlan, OSError, ValueError, tarfile.TarError):
        print("FINAI_OFFLINE_STAGE_PLAN=DENIED", file=sys.stderr)
        return 64


if __name__ == "__main__":
    sys.exit(main())
