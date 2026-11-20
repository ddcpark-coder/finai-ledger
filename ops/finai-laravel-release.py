#!/usr/bin/env python3
"""Package and verify a private Laravel build; never accesses a hosting server."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import tarfile

COMMIT = re.compile(r"^[0-9a-f]{40}$")
SHA = re.compile(r"^[0-9a-f]{64}$")
REQUIRED = {
    "artisan", "bootstrap/app.php", "composer.json", "composer.lock",
    "public/.htaccess", "public/index.php", "vendor/autoload.php",
}


class Denied(Exception):
    pass


def digest_file(path):
    h = hashlib.sha256()
    with path.open("rb") as data:
        for chunk in iter(lambda: data.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def validate_path(name):
    if not name or "\\" in name or "\x00" in name or name.startswith("/"):
        raise Denied("invalid path")
    parts = PurePosixPath(name).parts
    if not parts or any(part in {".", ".."} for part in parts):
        raise Denied("unsafe relative path")
    for part in parts:
        lower = part.lower()
        if lower == ".env" or lower.startswith(".env.") or lower == ".git":
            raise Denied("environment or git content cannot be packaged")
        if lower.endswith((".sqlite", ".sqlite3")):
            raise Denied("local database cannot be packaged")
    if len(parts) >= 3 and parts[:2] == ("bootstrap", "cache"):
        if parts[-1].lower().endswith(".php"):
            raise Denied("runtime cache must be generated only in the target environment")
    if parts[0] == "public" and len(parts) > 1:
        if any(part.startswith(".") for part in parts[1:]) and name != "public/.htaccess":
            raise Denied("hidden public content")
        if any(part.lower().endswith((".php", ".phtml", ".phar")) for part in parts[1:]):
            if name != "public/index.php":
                raise Denied("unexpected public PHP entry point")
        if any(part.lower() in {"vendor", "storage", "bootstrap", "config"} for part in parts[1:]):
            raise Denied("private application directory inside public root")
    return parts


def collect(root):
    if root.is_symlink() or not root.is_dir():
        raise Denied("build root must be a real directory")
    rows = []
    directories = []
    for current, names, files in os.walk(root, followlinks=False):
        names.sort()
        files.sort()
        current = Path(current)
        for name in names:
            path = current / name
            rel = path.relative_to(root).as_posix()
            validate_path(rel)
            if not stat.S_ISDIR(path.lstat().st_mode):
                raise Denied("linked or non-directory build path")
            directories.append(rel)
        for name in files:
            path = current / name
            rel = path.relative_to(root).as_posix()
            validate_path(rel)
            if not stat.S_ISREG(path.lstat().st_mode):
                raise Denied("linked or non-regular build file")
            rows.append({"path": rel, "size": path.stat().st_size, "sha256": digest_file(path)})
    if not REQUIRED.issubset({row["path"] for row in rows}):
        raise Denied("Laravel, public entry point, or Composer dependencies missing")
    return sorted(directories), sorted(rows, key=lambda row: row["path"])


def verify(archive, manifest):
    if not SHA.fullmatch(manifest.get("archive_sha256", "")) or digest_file(archive) != manifest["archive_sha256"]:
        raise Denied("archive digest mismatch")
    if not COMMIT.fullmatch(manifest.get("commit", "")):
        raise Denied("missing source commit")
    expected = {row["path"]: row for row in manifest["files"]}
    if len(expected) != len(manifest["files"]) or not REQUIRED.issubset(expected):
        raise Denied("invalid manifest")
    actual = set()
    seen = set()
    with tarfile.open(archive, "r:gz") as tar:
        for member in tar:
            name = member.name.rstrip("/")
            validate_path(name)
            if name in seen:
                raise Denied("duplicate archive entry")
            seen.add(name)
            if member.isdir():
                continue
            if not member.isfile() or name not in expected:
                raise Denied("unexpected archive entry")
            row = expected[name]
            if member.size != row["size"]:
                raise Denied("archive member length mismatch")
            data = tar.extractfile(member)
            if data is None:
                raise Denied("unreadable archive member")
            h = hashlib.sha256()
            with data:
                for chunk in iter(lambda: data.read(1024 * 1024), b""):
                    h.update(chunk)
            if h.hexdigest() != row["sha256"]:
                raise Denied("archive member digest mismatch")
            actual.add(name)
    if actual != set(expected):
        raise Denied("archive files differ from manifest")


def pack(root, archive, manifest_path, commit):
    if not COMMIT.fullmatch(commit):
        raise Denied("expected exact source commit")
    if archive.exists() or manifest_path.exists():
        raise Denied("refusing to overwrite an existing artifact")
    directories, files = collect(root)
    with tarfile.open(archive, "w:gz", format=tarfile.PAX_FORMAT) as tar:
        for name in directories + [row["path"] for row in files]:
            path = root / name
            info = tar.gettarinfo(str(path), arcname=name)
            info.uid = info.gid = 0
            info.uname = info.gname = ""
            info.mode = 0o755 if info.isdir() else 0o644
            if info.isfile():
                with path.open("rb") as stream:
                    tar.addfile(info, stream)
            else:
                tar.addfile(info)
    manifest = {"application": "finai-laravel-private", "commit": commit,
                "archive_sha256": digest_file(archive), "files": files}
    verify(archive, manifest)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, sort_keys=True) + "\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["pack", "verify"])
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--root", type=Path)
    parser.add_argument("--commit")
    args = parser.parse_args()
    try:
        if args.action == "pack":
            if args.root is None or args.commit is None:
                raise Denied("pack needs a build root and commit")
            pack(args.root, args.archive, args.manifest, args.commit)
        else:
            verify(args.archive, json.loads(args.manifest.read_text(encoding="utf-8")))
    except (Denied, OSError, ValueError, KeyError, tarfile.TarError) as exc:
        raise SystemExit("FINAI_LARAVEL_ARTIFACT_DENIED: " + str(exc))
    print("FINAI_LARAVEL_PRIVATE_ARTIFACT=PASS")


if __name__ == "__main__":
    main()
