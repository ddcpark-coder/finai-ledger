#!/usr/bin/env python3
"""FinAI isolated-account SSH forced command gate. NO arbitrary shell.

Install ONLY under a dedicated OS/cPanel account that does not host Laškoteka
or other projects. Existing shared laskot48 keys remain unchanged.

Accepted SSH_ORIGINAL_COMMAND:
  finai:status:v1
  finai:stage:v1:<64-hex-sha256-of-tar-gz>
  finai:promote:v2:<expected-current-digest-or-none>:<new-staged-digest>
  finai:unpublish:v1:<64-hex-sha256-of-current-release>
No other commands, paths, arguments, shell, SFTP or port forwarding.
"""
from contextlib import contextmanager
import fcntl
import hashlib
import os
from pathlib import Path, PurePosixPath
import pwd
import re
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
PROMOTE = "finai:promote:v2:"
UNPUBLISH = "finai:unpublish:v1:"
LIVE_MARKER = "FINAI_LIVE_PROMOTION_APPROVED=YES"
TARGET_USER = "einteg86"
TARGET_UID = 1256
TARGET_HOME = Path("/home/einteg86")
CAGEFS_TOKEN = Path("/var/.cagefs/.cagefs.token")


class Denied(Exception):
    pass


def parse(command):
    if command == STATUS:
        return "status", None
    if command.startswith(PROMOTE):
        parts = command[len(PROMOTE):].split(":")
        if (len(parts) == 2 and (parts[0] == "none" or DIGEST.fullmatch(parts[0]))
                and DIGEST.fullmatch(parts[1])):
            return "promote", (parts[0], parts[1])
        raise Denied("malformed conditional promotion")
    for prefix, action in ((STAGE, "stage"), (UNPUBLISH, "unpublish")):
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


def deny_walk(error):
    raise Denied("release directory cannot be inspected") from error


def verify_release_tree(root, digest, release):
    """Verify every static file against the preserved SHA256-pinned tar.

    Merely retaining a local manifest would NOT bind release contents to the
    original CI artifact; this check uses the immutable tar digest as the root
    of trust. The release must be inside one of the two FinAI release trees.
    """
    if not DIGEST.fullmatch(digest):
        raise Denied("invalid release digest")
    archive = secure_path(root / "archives") / (digest + ".tar.gz")
    if release.parent not in (root / "releases", root / "public-releases"):
        raise Denied("release is outside FinAI release trees")
    secure_path(release.parent)
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
            source = tar.extractfile(member)
            if source is None:
                raise Denied("invalid original release member")
            with source, target.open("rb") as live:
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
    for directory, subdirs, files in os.walk(release, followlinks=False, onerror=deny_walk):
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


def verify_staged_release(root, digest):
    return verify_release_tree(root, digest, root / "releases" / digest)


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
        # Preserve original CI digest-pinned compressed bytes OUTSIDE the
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


def prepare_public_root(root):
    """Allow traversal to public files without exposing private release trees."""
    private_modes = {
        "finai-isolated-ssh-gate.py": (stat.S_ISREG, 0o700),
        "archives": (stat.S_ISDIR, 0o700),
        "releases": (stat.S_ISDIR, 0o700),
        ".gate-backups": (stat.S_ISDIR, 0o700),
        ".finai-gate.lock": (stat.S_ISREG, 0o600),
        "ALLOW_PRODUCTION": (stat.S_ISREG, 0o600),
        "PUBLIC_DOCROOT_CONFIRMED": (stat.S_ISREG, 0o600),
        "public-releases": (stat.S_ISDIR, 0o711),
    }
    meta = root.lstat()
    if (not stat.S_ISDIR(meta.st_mode) or meta.st_uid != os.getuid() or
            stat.S_IMODE(meta.st_mode) not in (0o700, 0o711)):
        raise Denied("unsafe private deployment root")
    for item in root.iterdir():
        if item.name == "current":
            if not item.is_symlink():
                raise Denied("current is not a symlink")
            continue
        if item.name not in private_modes:
            raise Denied("unexpected deployment root content")
        kind, mode = private_modes[item.name]
        entry = item.lstat()
        if not kind(entry.st_mode) or entry.st_uid != os.getuid() or stat.S_IMODE(entry.st_mode) != mode:
            raise Denied("unsafe private deployment content")
    return stat.S_IMODE(meta.st_mode)


def verify_public_modes(release):
    """Only the static mirror is traversable/readable to the web server."""
    for directory, subdirs, files in os.walk(release, followlinks=False, onerror=deny_walk):
        folder = Path(directory)
        meta = folder.lstat()
        if not stat.S_ISDIR(meta.st_mode) or meta.st_uid != os.getuid() or stat.S_IMODE(meta.st_mode) != 0o511:
            raise Denied("unsafe public release directory")
        for name in subdirs:
            item = (folder / name).lstat()
            if not stat.S_ISDIR(item.st_mode) or item.st_uid != os.getuid() or stat.S_IMODE(item.st_mode) != 0o511:
                raise Denied("unsafe public release subdirectory")
        for name in files:
            item = (folder / name).lstat()
            if not stat.S_ISREG(item.st_mode) or item.st_uid != os.getuid() or stat.S_IMODE(item.st_mode) != 0o444:
                raise Denied("unsafe public release file")


def materialize_public_release(root, digest):
    """Make a static-only mirror of an already verified private release."""
    public = secure_path(root / "public-releases")
    public.mkdir(mode=0o711, exist_ok=True)
    meta = public.lstat()
    if meta.st_uid != os.getuid() or stat.S_IMODE(meta.st_mode) != 0o711:
        raise Denied("unsafe public releases directory")
    destination = public / digest
    if destination.exists() or destination.is_symlink():
        verify_release_tree(root, digest, destination)
        verify_public_modes(destination)
        return destination
    temp = Path(tempfile.mkdtemp(prefix=".finai-public-", dir=public))
    try:
        extract_verified_archive(root / "archives" / (digest + ".tar.gz"), temp)
        for directory, subdirs, files in os.walk(temp, topdown=False, followlinks=False):
            folder = Path(directory)
            for name in files:
                (folder / name).chmod(0o444)
            for name in subdirs:
                (folder / name).chmod(0o511)
        temp.chmod(0o511)
        verify_release_tree(root, digest, temp)
        verify_public_modes(temp)
        temp.rename(destination)
        return destination
    finally:
        if temp.is_symlink():
            temp.unlink()
        elif temp.exists():
            if not temp.is_dir():
                raise Denied("public staging path changed")
            for directory, subdirs, _ in os.walk(temp, topdown=True, followlinks=False):
                folder = Path(directory)
                if not stat.S_ISDIR(folder.lstat().st_mode):
                    raise Denied("public staging directory changed")
                folder.chmod(0o700)
                for name in list(subdirs):
                    child = folder / name
                    if stat.S_ISLNK(child.lstat().st_mode):
                        child.unlink()
                        subdirs.remove(name)
                    elif stat.S_ISDIR(child.lstat().st_mode):
                        child.chmod(0o700)
                    else:
                        raise Denied("public staging subdirectory changed")
            shutil.rmtree(temp)


def private_marker_matches(path, expected):
    if path.is_symlink() or not path.is_file():
        return False
    meta = path.lstat()
    if meta.st_uid != os.getuid() or stat.S_IMODE(meta.st_mode) != 0o600:
        return False
    return path.read_text(encoding="utf8").strip() == expected


def promote(digest, root):
    """No promotion unless previously approved and public document root confirmed."""
    if not DIGEST.fullmatch(digest):
        raise Denied("invalid deploy digest")
    releases = secure_path(root / "releases")
    private_target = secure_path(releases / digest)
    if not private_target.is_dir() or not (private_target / "index.html").is_file():
        raise Denied("requested release is not staged")
    # A release directory that existed once is not automatically immutable.
    # Verify every file against the digest-pinned original tar before switch.
    verify_staged_release(root, digest)
    if not private_marker_matches(root / "ALLOW_PRODUCTION", LIVE_MARKER):
        raise Denied("production is not explicitly enabled")
    configured = root / "PUBLIC_DOCROOT_CONFIRMED"
    if not private_marker_matches(configured, str(root / "current")):
        raise Denied("public app document root has not been confirmed")
    current = root / "current"
    if current.is_symlink():
        if active_release(root) == "unexpected":
            raise Denied("current symlink points outside FinAI public releases")
    elif current.exists():
        raise Denied("current production target is not an expected symlink")
    temp = root / (".next-current-" + digest)
    if temp.exists() or temp.is_symlink():
        raise Denied("stale or modified release switch path")
    previous_mode = prepare_public_root(root)
    target = materialize_public_release(root, digest)
    try:
        if previous_mode == 0o700:
            root.chmod(0o711)
        temp.symlink_to(target, target_is_directory=True)
        os.replace(temp, current)
    except BaseException:
        if previous_mode == 0o700:
            root.chmod(0o700)
        raise
    finally:
        if temp.is_symlink():
            temp.unlink()
    return "PROMOTED"


def unpublish(digest, root):
    """Restore an initially empty current pointer, without touching the docroot.

    Only remove the exact release this deployment just activated. This is not
    a substitute for restoring a separately changed cPanel document root.
    The caller serializes this operation with all stage/promote operations.
    """
    if not DIGEST.fullmatch(digest):
        raise Denied("invalid deploy digest")
    current = root / "current"
    if not current.is_symlink():
        if current.exists():
            raise Denied("current production target is not a symlink")
        return "UNPUBLISHED_ALREADY_ABSENT"
    expected = root / "public-releases" / digest
    # promote() itself creates this exact absolute link. Do not follow or
    # remove an unexpected link that might have been changed independently.
    if os.readlink(current) != str(expected):
        raise Denied("current release changed since deployment")
    current.unlink()
    # No release remains active: restore traversal of the private root to
    # its pre-publication owner-only mode. Private archives stay untouched.
    root.chmod(0o700)
    return "UNPUBLISHED"


@contextmanager
def mutation_lock(root):
    """Serialize cooperating gate writers, including conditional rollback."""
    lock_path = root / ".finai-gate.lock"
    descriptor = os.open(lock_path, os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    try:
        meta = os.fstat(descriptor)
        if (not stat.S_ISREG(meta.st_mode) or meta.st_uid != os.getuid() or
                meta.st_mode & (stat.S_IWGRP | stat.S_IWOTH)):
            raise Denied("unsafe deployment lock")
        fcntl.flock(descriptor, fcntl.LOCK_EX)
        yield
    finally:
        os.close(descriptor)


def active_release(root):
    """Return none only for an actually absent current pointer."""
    current = root / "current"
    if current.is_symlink():
        try:
            raw = os.readlink(current)
            target = Path(raw)
            releases = root / "public-releases"
            if not target.is_absolute() or target.parent != releases or not DIGEST.fullmatch(target.name):
                return "unexpected"
            base_meta = releases.lstat()
            if (not stat.S_ISDIR(base_meta.st_mode) or base_meta.st_uid != os.getuid() or
                    stat.S_IMODE(base_meta.st_mode) != 0o711):
                return "unexpected"
            target_meta = target.lstat()
        except OSError:
            return "unexpected"
        if (stat.S_ISDIR(target_meta.st_mode) and target_meta.st_uid == os.getuid() and
                stat.S_IMODE(target_meta.st_mode) == 0o511 and raw == str(target)):
            return target.name
        return "unexpected"
    return "unexpected" if current.exists() else "none"


def conditional_promote(expected, digest, root):
    """Switch only if the caller's observed release is still current.

    The caller must hold mutation_lock throughout this check and the switch.
    """
    if active_release(root) != expected:
        raise Denied("current release changed since status check")
    return promote(digest, root)


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


def require_target_identity(user, uid, home):
    if user.pw_name != TARGET_USER or uid != TARGET_UID or home != TARGET_HOME:
        raise Denied("FinAI deployment target identity does not match")


def require_cagefs(token):
    """Require the CloudLinux per-user filesystem for this Hiper M gate.

    The token identifies the current session, not every hosting permission.
    Other isolation and restore requirements still apply independently.
    """
    if not token.exists():
        raise Denied("current SSH session is not inside CageFS")


def main():
    user = pwd.getpwuid(os.getuid())
    home = Path(user.pw_dir)
    os.umask(0o022)
    try:
        shared_uid = pwd.getpwnam("laskot48").pw_uid
    except KeyError:
        shared_uid = None
    require_target_identity(user, os.getuid(), home)
    require_dedicated_identity(user, os.getuid(), home, shared_uid)
    require_cagefs(CAGEFS_TOKEN)
    if Path(os.environ.get("HOME", "")).resolve() != home.resolve():
        raise Denied("unexpected HOME")
    root = home / "finai-deploy"
    if not root.is_dir() or root.is_symlink() or root.stat().st_uid != os.getuid() or (
        root.stat().st_mode & (stat.S_IWGRP | stat.S_IWOTH)
    ):
        raise Denied("private FinAI deployment root is not installed")
    operation, argument = parse(os.environ.get("SSH_ORIGINAL_COMMAND", ""))
    if operation == "status":
        active = active_release(root)
        print("FINAI_ISOLATED_SSH_STATUS=v1")
        print("FINAI_ISOLATION=CAGEFS")
        print("production_active=" + active)
        print("production_approved=" + ("yes" if (root / "ALLOW_PRODUCTION").is_file() else "no"))
        return 0
    if operation == "promote":
        expected, digest = argument
    else:
        digest = argument
    if operation == "stage":
        data = sys.stdin.buffer.read(MAX_ARCHIVE + 1)
        if len(data) > MAX_ARCHIVE:
            raise Denied("upload exceeds capped size")
    with mutation_lock(root):
        if operation == "stage":
            result = stage(data, digest, root)
        elif operation == "promote":
            result = conditional_promote(expected, digest, root)
        else:
            result = unpublish(digest, root)
    print("FINAI_ISOLATED_DEPLOY=" + result)
    print("release_sha256=" + digest)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (Denied, OSError, tarfile.TarError, ValueError):
        print("FINAI_DEPLOY_DENIED", file=sys.stderr)
        sys.exit(64)
