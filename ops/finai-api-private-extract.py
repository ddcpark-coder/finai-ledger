#!/usr/bin/env python3
"""Extract a verified FinAI Laravel release privately; never publish or migrate."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import socket
import stat
import tarfile
import urllib.request

HOME = Path('/home/einteg86')
PARENT = HOME / 'finai-laravel-private'
UID, GID = 1256, 1259
COMMIT = re.compile(r'^[0-9a-f]{40}$')
SHA = re.compile(r'^[0-9a-f]{64}$')
VERIFIER_URL = ('https://raw.githubusercontent.com/ddcpark-coder/finai-ledger/'
                'bc2777637e8a44bcf2cac51bb670127ac4df36e4/ops/finai-laravel-release.py')
VERIFIER_SHA = '7a2e132edc3deda75b183847778ec121b7dad38b7a6b9067fc0e74c175b59648'
MAX_ARCHIVE = 15_000_000
MAX_MANIFEST = 5_000_000
MAX_RELEASE_BYTES = 250_000_000


class Denied(Exception):
    pass


def digest(data):
    return hashlib.sha256(data).hexdigest()


def preflight_host():
    if (os.getuid() != UID or os.geteuid() != UID or os.getegid() != GID
            or os.getgroups() != [GID] or os.environ.get('HOME') != str(HOME)
            or socket.gethostname().split('.', 1)[0] != 'lcp-86'):
        raise Denied('unexpected system identity')
    try:
        with open('/proc/self/status', encoding='ascii') as stream:
            values = {line.split(':', 1)[0]: line.split(':', 1)[1].strip()
                      for line in stream if line.startswith(('CapEff:', 'CapPrm:'))}
        if (int(values['CapEff'], 16) != 0 or int(values['CapPrm'], 16) != 0
                or os.access('/home/laskot48/public_html', os.W_OK, effective_ids=True)
                or os.access('/home/laskot48/apps/stng-production', os.W_OK, effective_ids=True)):
            raise Denied('unexpected effective privileges')
    except (OSError, KeyError, ValueError):
        raise Denied('unable to verify effective privileges') from None


def open_private_dir(path, uid):
    if path.resolve(strict=True) != path.absolute():
        raise Denied('redirected private directory')
    before = path.lstat()
    if not stat.S_ISDIR(before.st_mode) or before.st_uid != uid or before.st_mode & 0o077:
        raise Denied('unsafe private directory')
    if any(k.startswith('system.posix_acl') for k in os.listxattr(path, follow_symlinks=False)):
        raise Denied('unreviewed private directory ACL')
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    after = os.fstat(fd)
    if ((after.st_dev, after.st_ino) != (before.st_dev, before.st_ino)
            or after.st_uid != uid or after.st_mode & 0o077):
        os.close(fd)
        raise Denied('private directory changed')
    return fd


def read_regular(dir_fd, name, uid, limit):
    fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=dir_fd)
    with os.fdopen(fd, 'rb') as stream:
        info = os.fstat(stream.fileno())
        if (not stat.S_ISREG(info.st_mode) or info.st_uid != uid or info.st_nlink != 1
                or info.st_mode & (stat.S_IWGRP | stat.S_IWOTH) or info.st_size > limit):
            raise Denied('unsafe staged file')
        data = stream.read(limit + 1)
        if len(data) > limit:
            raise Denied('staged file too large')
        return data


def load_verifier():
    try:
        with urllib.request.urlopen(VERIFIER_URL, timeout=15) as response:
            source = response.read(30_001)
    except (OSError, ValueError):
        raise Denied('unable to obtain pinned verifier') from None
    if len(source) > 30_000 or digest(source) != VERIFIER_SHA:
        raise Denied('verifier checksum mismatch')
    namespace = {'__name__': 'finai_release_verifier'}
    exec(compile(source, 'finai-laravel-release.py', 'exec'), namespace)
    return namespace['verify']


def path_parts(name):
    raw = name.rstrip('/')
    parts = raw.split('/')
    if (not raw or name.startswith('/') or '\\' in name or '\x00' in name
            or any(part in ('', '.', '..') for part in parts)
            or tuple(parts) != PurePosixPath(raw).parts):
        raise Denied('unsafe release path')
    return parts


def extract_release(parent, uid, commit, archive_sha, manifest_sha, verify):
    if not COMMIT.fullmatch(commit) or not SHA.fullmatch(archive_sha) or not SHA.fullmatch(manifest_sha):
        raise Denied('invalid release identifiers')
    directory = open_private_dir(parent, uid)
    created = None
    target = parent / ('release-' + commit + '-' + archive_sha[:12])
    try:
        prefix = 'finai-api-' + commit[:12]
        archive = read_regular(directory, prefix + '-package.tar.gz', uid, MAX_ARCHIVE)
        manifest_data = read_regular(directory, prefix + '-manifest.json', uid, MAX_MANIFEST)
        if digest(archive) != archive_sha or digest(manifest_data) != manifest_sha:
            raise Denied('staged checksums differ')
        manifest = json.loads(manifest_data)
        if (not isinstance(manifest, dict) or manifest.get('commit') != commit
                or manifest.get('archive_sha256') != archive_sha):
            raise Denied('unexpected release manifest')
        # The verifier reads the staged archive by a pinned descriptor and checks
        # every file, forbidden path, marker, commit, and digest before writing.
        archive_fd = os.open(prefix + '-package.tar.gz', os.O_RDONLY | os.O_NOFOLLOW,
                             dir_fd=directory)
        try:
            verify(Path('/proc/self/fd/' + str(archive_fd)), manifest, expected_commit=commit)
        finally:
            os.close(archive_fd)
        expected = {item['path']: item for item in manifest['files']}
        total = sum(item['size'] for item in expected.values())
        if total < 1 or total > MAX_RELEASE_BYTES or shutil.disk_usage(parent).free < total * 2:
            raise Denied('insufficient or unexpected release size')
        # mkdir is exclusive: existing releases and symlinks are never replaced.
        os.mkdir(target.name, 0o700, dir_fd=directory)
        info = os.lstat(target)
        created = (info.st_dev, info.st_ino)
        seen = set()
        with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as tar:
            for member in tar:
                parts = path_parts(member.name)
                name = '/'.join(parts)
                if name in seen or not (member.isfile() or member.isdir()):
                    raise Denied('unexpected release entry')
                seen.add(name)
                dest = target.joinpath(*parts)
                if member.isdir():
                    dest.mkdir(mode=0o700, parents=True, exist_ok=True)
                    continue
                row = expected.get(name)
                if row is None or member.size != row['size']:
                    raise Denied('unexpected release file')
                dest.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
                source = tar.extractfile(member)
                if source is None:
                    raise Denied('unreadable release file')
                fd = os.open(dest, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
                h = hashlib.sha256()
                with source, os.fdopen(fd, 'wb') as output:
                    for chunk in iter(lambda: source.read(1024 * 1024), b''):
                        h.update(chunk)
                        output.write(chunk)
                if h.hexdigest() != row['sha256']:
                    raise Denied('extracted file checksum mismatch')
                read_fd = os.open(dest, os.O_RDONLY | os.O_NOFOLLOW)
                written_hash = hashlib.sha256()
                with os.fdopen(read_fd, 'rb') as written:
                    info = os.fstat(written.fileno())
                    if not stat.S_ISREG(info.st_mode) or info.st_uid != uid or info.st_nlink != 1:
                        raise Denied('extracted file changed')
                    for chunk in iter(lambda: written.read(1024 * 1024), b''):
                        written_hash.update(chunk)
                if written_hash.hexdigest() != row['sha256']:
                    raise Denied('staged file failed verification')
        if {name for name in seen if name in expected} != set(expected):
            raise Denied('missing release file')
        os.fsync(directory)
        return target
    except BaseException:
        if created is not None:
            info = os.lstat(target)
            if stat.S_ISDIR(info.st_mode) and (info.st_dev, info.st_ino) == created:
                shutil.rmtree(target)
        raise
    finally:
        os.close(directory)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--commit', required=True)
    parser.add_argument('--archive-sha256', required=True)
    parser.add_argument('--manifest-sha256', required=True)
    args = parser.parse_args()
    try:
        preflight_host()
        verifier = load_verifier()
        preflight_host()
        target = extract_release(PARENT, UID, args.commit, args.archive_sha256,
                                 args.manifest_sha256, verifier)
    except Exception:
        raise SystemExit('FINAI_PRIVATE_EXTRACT=DENIED') from None
    print('FINAI_PRIVATE_EXTRACT=PASS')
    print('FINAI_PRIVATE_RELEASE=' + str(target))
    print('FINAI_API_DEPLOY_AUTHORIZED=NO')


if __name__ == '__main__':
    main()
