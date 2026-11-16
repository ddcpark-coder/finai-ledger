#!/usr/bin/env python3
"""FinAI isolated-account SSH forced command gate. NO arbitrary shell.

Install ONLY under a dedicated OS/cPanel account that does not host Laškoteka
or other projects. Existing shared laskot48 keys remain unchanged.

Accepted SSH_ORIGINAL_COMMAND:
  finai:status:v1
  finai:stage:v1:<64-hex-sha256-of-tar-gz>
  finai:promote:v1:<64-hex-sha256-of-staged-tar-gz>
No other commands, paths, arguments, shell, SFTP or port forwarding.
"""
import hashlib
import os
from pathlib import Path, PurePosixPath
import pwd
import re
import stat
import stat
import shutil
import sys
import tarfile
import tempfile

DIGEST = re.compile(r"^[0-9a-f]{64}$")
MAX_ARCHIVE = 100 * 1024 * 1024
MAX_EXPANDED = 300 * 1024 * 1024
MAX_FILES = 10000
MAX_SINGLE_FILE = 50 * 1024 * 1024
STATUS = "finai:status:v1"
STAGE = "finai:stage:v1:"
PROMOTE = "finai:promote:v1:"
LIVE_MARKER = "FINAI_LIVE_PROMOTION_APPROVED=YES"


class Denied(Exception):
    pass


def parse(command):
    if command == STATUS:
        return "status", None
    for prefix, action in ((STAGE, "stage"), (PROMOTE, "promote")):
        if command.startswith(prefix):
            digest = command[len(prefix):]
            if DIGEST.fullmatch(digest):
                return action, digest
    raise Denied("unknown or malformed operation")


def secure_path(directory):
    """Avoid escaping a dedicated account through symlinked target trees."""
    if directory.is_symlink():
        raise Denied("symlinked deployment path")
    if directory.exists() and not directory.is_dir():
        raise Denied("deployment path is not a directory")
    return directory


def validate_name(raw):
    if not isinstance(raw, str) or not raw or raw.startswith("/"):
        raise Denied("absolute or empty file path")
    if "\x00" in raw or "\\" in raw:
        raise Denied("malformed tar path")
    parts = [p for p in PurePosixPath(raw).parts if p != "."]
    if not parts or any(p in ("..", "") for p in parts):
        raise Denied("tar path traversal")
    if any(len(part) > 180 for part in parts):
        raise Denied("oversized tar path component")
    if any(part.startswith(".") for part in parts):
        raise Denied("hidden files or server configuration are forbidden")
    if any(part.lower().endswith((".php", ".phtml", ".cgi", ".pl", ".py", ".sh", ".env", ".htaccess", ".htpasswd")) for part in parts):
        raise Denied("executable or secret-bearing archive member forbidden")
    return Path(*parts)


def extract_verified_archive(archive_path, directory):
    """Only regular files and directories, strict bounds, no symlinks/hardlinks."""
    count = 0
    expanded = 0
    has_index = False
    has_assets = False
    seen = set()
    with tarfile.open(archive_path, "r:gz") as tar:
        for member in tar:
            # GNU tar -C out . includes a harmless top-level './' directory.
            # Never let a root *file* or any traversal pass validation.
            if member.isdir() and member.name in {".", "./"}:
                continue
            name = validate_name(member.name)
            rel = name.as_posix()
            if member.isdir():
                (directory / name).mkdir(parents=True, exist_ok=True)
                continue
            if not member.isfile():
                raise Denied("archive contains nonregular file or link")
            count += 1
            expanded += member.size
            if count > MAX_FILES or expanded > MAX_EXPANDED or member.size > MAX_SINGLE_FILE:
                raise Denied("archive exceeds size/file bounds")
            if rel in seen:
                raise Denied("duplicate archive member")
            seen.add(rel)
            path = directory / name
            path.parent.mkdir(parents=True, exist_ok=True)
            if path.exists():
                raise Denied("archive file collides with existing entry")
            reader = tar.extractfile(member)
            if reader is None:
                raise Denied("invalid archive file")
            with path.open("xb") as target:
                remaining = member.size
                while remaining:
                    block = reader.read(min(1024 * 1024, remaining))
                    if not block:
                        raise Denied("truncated archived file")
                    target.write(block)
                    remaining -= len(block)
                target.flush()
            path.chmod(0o600)
            if rel == "index.html" and member.size > 500:
                has_index = True
            if rel.startswith("_next/") and rel.endswith((".js", ".css")):
                has_assets = True
    if not has_index or not has_assets:
        raise Denied("missing static frontend entrypoint or assets")



def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while True:
            block = stream.read(1024 * 1024)
            if not block:
                break
            digest.update(block)
    return digest.hexdigest()


def verify_staged_release(root, digest):
    """Verify all static files against the preserved SHA256-pinned original tar.

    Merely retaining a local manifest would NOT bind release contents to the
    original CI artifact; this check uses the immutable tar digest as the root
    of trust. No writes or traversals outside the private FinAI release tree.
    """
    if not DIGEST.fullmatch(digest):
        raise Denied("invalid release digest")
    archive = root / "archives" / (digest + ".tar.gz")
    release = root / "releases" / digest
    if (archive.is_symlink() or not archive.is_file() or
            release.is_symlink() or not release.is_dir() or
            sha256_file(archive) != digest):
        raise Denied("original pinned release archive missing or changed")
    expected = set()
    total = count = 0
    has_index = has_assets = False
    with tarfile.open(archive, "r:gz") as tar:
        for member in tar:
            if member.isdir() and member.name in {".", "./"}:
                continue
            relative = validate_name(member.name)
            target = release / relative
            # Every component must be a real directory, never a symlink.
            parent = target.parent
            while parent != release:
                meta = parent.lstat()
                if not stat.S_ISDIR(meta.st_mode):
                    raise Denied("release path contains non-directory or symlink")
                parent = parent.parent
            if member.isdir():
                if not stat.S_ISDIR(target.lstat().st_mode):
                    raise Denied("staged directory was modified")
                continue
            if not member.isfile():
                raise Denied("original archive contains link or special file")
            rel = relative.as_posix()
            if rel in expected:
                raise Denied("duplicate original archive member")
            expected.add(rel)
            count += 1
            total += member.size
            if (count > MAX_FILES or total > MAX_EXPANDED or
                    member.size > MAX_SINGLE_FILE):
                raise Denied("original archive exceeds release bounds")
            if not stat.S_ISREG(target.lstat().st_mode):
                raise Denied("staged release member is not a regular file")
            if target.stat().st_size != member.size:
                raise Denied("staged release file length differs")
            with tar.extractfile(member) as source, target.open("rb") as live:
                if source is None:
                    raise Denied("invalid original release member")
                while True:
                    original = source.read(1024 * 1024)
                    actual = live.read(1024 * 1024)
                    if original != actual:
                        raise Denied("staged asset differs from pinned release")
                    if not original:
                        break
            if rel == "index.html" and member.size > 500:
                has_index = True
            if rel.startswith("_next/") and rel.endswith((".js", ".css")):
                has_assets = True
    if not has_index or not has_assets:
        raise Denied("missing original frontend entrypoint or static assets")
    actual = set()
    for directory, subdirs, files in os.walk(release, followlinks=False):
        folder = Path(directory)
        for name in subdirs:
            if not stat.S_ISDIR((folder / name).lstat().st_mode):
                raise Denied("staged release contains linked directory")
        for name in files:
            file = folder / name
            if not stat.S_ISREG(file.lstat().st_mode):
                raise Denied("staged release contains nonregular member")
            actual.add(file.relative_to(release).as_posix())
    if actual != expected:
        raise Denied("staged release has added, removed or modified assets")
    return True


def stage(archive_bytes, digest, root):
    """Accept exact SHA256-pinned CI artifact; write ONLY inside FinAI root."""
    if not DIGEST.fullmatch(digest) or len(archive_bytes) > MAX_ARCHIVE:
        raise Denied("invalid staged archive")
    if hashlib.sha256(archive_bytes).hexdigest() != digest:
        raise Denied("upload sha256 mismatch")
    root = secure_path(root)
    releases = secure_path(root / "releases")
    releases.mkdir(mode=0o700, parents=True, exist_ok=True)
    archives = secure_path(root / "archives")
    archives.mkdir(mode=0o700, parents=True, exist_ok=True)
    pinned_archive = archives / (digest + ".tar.gz")
    destination = releases / digest
    if destination.exists() or destination.is_symlink():
        verify_staged_release(root, digest)
        return "STAGED_ALREADY_PRESENT"
    staging = Path(tempfile.mkdtemp(prefix=".finai-stage-", dir=root))
    try:
        archive = staging / "input.tar.gz"
        with archive.open("xb") as writer:
            writer.write(archive_bytes)
        output = staging / "out"
        output.mkdir(mode=0o700)
        extract_verified_archive(archive, output)
        # Keep original *CI-signed-by-digest* compressed bytes OUTSIDE the
        # docroot. Promotion must compare actual files against these bytes.
        if pinned_archive.is_symlink():
            raise Denied("pinned archive location is linked")
        if pinned_archive.exists():
            if not pinned_archive.is_file() or sha256_file(pinned_archive) != digest:
                raise Denied("pinned archive location was modified")
        else:
            archive.rename(pinned_archive)
            pinned_archive.chmod(0o600)
        output.rename(destination)
        verify_staged_release(root, digest)
        return "STAGED"
    finally:
        shutil.rmtree(staging, ignore_errors=True)


def promote(digest, root):
    """No promotion unless previously approved and public document root confirmed."""
    if not DIGEST.fullmatch(digest):
        raise Denied("invalid deploy digest")
    releases = secure_path(root / "releases")
    target = secure_path(releases / digest)
    if not target.is_dir() or not (target / "index.html").is_file():
        raise Denied("requested release is not staged")
    # A release directory that existed once is not automatically immutable.
    # Verify every file against the digest-pinned original tar before switch.
    verify_staged_release(root, digest)
    if not (root / "ALLOW_PRODUCTION").is_file() or (
        root / "ALLOW_PRODUCTION"
    ).read_text(encoding="utf8").strip() != LIVE_MARKER:
        raise Denied("production is not explicitly enabled")
    configured = root / "PUBLIC_DOCROOT_CONFIRMED"
    if not configured.is_file() or configured.read_text(encoding="utf8").strip() != str(root / "current"):
        raise Denied("public app document root has not been confirmed")
    current = root / "current"
    if current.exists() and not current.is_symlink():
        raise Denied("current production target is not an expected symlink")
    if current.is_symlink():
        effective = current.resolve()
        if effective.parent != releases or not DIGEST.fullmatch(effective.name):
            raise Denied("current symlink points outside FinAI releases")
    temp = root / (".next-current-" + digest)
    if temp.exists() or temp.is_symlink():
        raise Denied("stale or modified release switch path")
    temp.symlink_to(target, target_is_directory=True)
    try:
        os.replace(temp, current)
    finally:
        if temp.is_symlink():
            temp.unlink()
    return "PROMOTED"


def require_dedicated_identity(user, uid, home, shared_uid=None):
    """Reject OS aliases of a shared account before ANY staging operations.

    This is necessary but NOT sufficient proof of independent cPanel isolation.
    No protected project file, permission or credential is inspected.
    """
    if uid == 0 or user.pw_name in {"root", "laskot48"}:
        raise Denied("dedicated FinAI nonroot UID required")
    if shared_uid is not None and uid == shared_uid:
        raise Denied("FinAI system UID aliases shared laskot48")
    if not home.is_absolute() or home == Path("/") or home.is_symlink():
        raise Denied("unsafe independent account home")
    if not home.is_dir() or home.stat().st_uid != uid:
        raise Denied("home directory must belong to independent FinAI UID")
    if home.stat().st_mode & (stat.S_IWOTH | stat.S_IWGRP):
        raise Denied("independent FinAI home is group/other writable")


def main():
    user = pwd.getpwuid(os.getuid())
    home = Path(user.pw_dir)
    os.umask(0o022)
    try:
        shared_uid = pwd.getpwnam("laskot48").pw_uid
    except KeyError:
        shared_uid = None
    require_dedicated_identity(user, os.getuid(), home, shared_uid)
    if Path(os.environ.get("HOME", "")).resolve() != home.resolve():
        raise Denied("unexpected HOME")
    root = home / "finai-deploy"
    if not root.is_dir() or root.is_symlink() or root.stat().st_uid != os.getuid() or (
        root.stat().st_mode & (stat.S_IWGRP | stat.S_IWOTH)
    ):
        raise Denied("private FinAI deployment root is not installed")
    operation, digest = parse(os.environ.get("SSH_ORIGINAL_COMMAND", ""))
    if operation == "status":
        current = root / "current"
        if current.is_symlink():
            target = current.resolve()
            active = target.name if target.parent == root / "releases" and DIGEST.fullmatch(target.name) else "unexpected"
        else:
            active = "none"
        print("FINAI_ISOLATED_SSH_STATUS=v1")
        print("production_active=" + active)
        print("production_approved=" + ("yes" if (root / "ALLOW_PRODUCTION").is_file() else "no"))
        return 0
    if operation == "stage":
        data = sys.stdin.buffer.read(MAX_ARCHIVE + 1)
        if len(data) > MAX_ARCHIVE:
            raise Denied("upload exceeds capped size")
        result = stage(data, digest, root)
    else:
        result = promote(digest, root)
    print("FINAI_ISOLATED_DEPLOY=" + result)
    print("release_sha256=" + digest)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (Denied, OSError, tarfile.TarError, ValueError):
        print("FINAI_DEPLOY_DENIED", file=sys.stderr)
        sys.exit(64)
