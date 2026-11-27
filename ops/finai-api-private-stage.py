#!/usr/bin/env python3
"""Stage one verified Laravel artifact in the dedicated FinAI private directory.

This does not extract a release, change a document root, connect to a database,
or deploy an application. The short-lived artifact URL is read without echo.
"""
import argparse
import getpass
import hashlib
import io
import json
import os
from pathlib import Path
import re
import secrets
import socket
import stat
import sys
import tarfile
import urllib.parse
import urllib.request
import warnings
import zipfile

HOME = Path('/home/einteg86')
DESTINATION = HOME / 'finai-laravel-private'
UID = 1256
GID = 1259
COMMIT = re.compile(r'^[0-9a-f]{40}$')
SHA256 = re.compile(r'^[0-9a-f]{64}$')
ARTIFACT_HOST = re.compile(r'^sdmntpr[a-z0-9-]*\.oaiusercontent\.com$')
ZIP_NAMES = {'finai-laravel-private.tar.gz', 'finai-laravel-private.sha256',
             'finai-laravel-manifest.json'}
MAX_ZIP = 16_000_000
MAX_ARCHIVE = 15_000_000
MAX_MANIFEST = 5_000_000


class Denied(Exception):
    pass


def digest(data):
    return hashlib.sha256(data).hexdigest()


def check_digests(commit, zip_sha, archive_sha, manifest_sha):
    if not COMMIT.fullmatch(commit):
        raise Denied('expected a full source commit')
    if any(not SHA256.fullmatch(value) for value in (zip_sha, archive_sha, manifest_sha)):
        raise Denied('expected full SHA-256 digests')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise Denied('artifact redirect denied')


def download_private_artifact(url):
    parsed = urllib.parse.urlsplit(url)
    if (parsed.scheme != 'https' or not parsed.hostname
            or not ARTIFACT_HOST.fullmatch(parsed.hostname)
            or parsed.username is not None or parsed.password is not None
            or parsed.port not in (None, 443) or parsed.fragment):
        raise Denied('unexpected private artifact source')
    request = urllib.request.Request(url, headers={'User-Agent': 'FinAI-private-stage/1'})
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=45) as response:
            data = response.read(MAX_ZIP + 1)
    except (OSError, ValueError) as exc:
        # Exceptions may contain a signed URL; never include their text.
        raise Denied('private artifact download failed') from None
    if len(data) > MAX_ZIP:
        raise Denied('private artifact exceeds size limit')
    return data


def verified_bundle(data, commit, zip_sha, archive_sha, manifest_sha):
    check_digests(commit, zip_sha, archive_sha, manifest_sha)
    if len(data) > MAX_ZIP or digest(data) != zip_sha:
        raise Denied('artifact ZIP digest mismatch')
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as bundle:
            entries = bundle.infolist()
            if len(entries) != len(ZIP_NAMES) or {item.filename for item in entries} != ZIP_NAMES:
                raise Denied('unexpected artifact ZIP entries')
            for item in entries:
                maximum = (MAX_ARCHIVE if item.filename.endswith('.tar.gz')
                           else MAX_MANIFEST if item.filename.endswith('.json') else 1024)
                mode = item.external_attr >> 16
                if item.is_dir() or stat.S_ISLNK(mode) or item.file_size > maximum:
                    raise Denied('unsafe artifact ZIP entry')
            archive = bundle.read('finai-laravel-private.tar.gz')
            manifest_data = bundle.read('finai-laravel-manifest.json')
            listed_digest = bundle.read('finai-laravel-private.sha256').decode('ascii').split()
        if digest(archive) != archive_sha or digest(manifest_data) != manifest_sha:
            raise Denied('artifact member digest mismatch')
        if listed_digest != [archive_sha, 'finai-laravel-private.tar.gz']:
            raise Denied('artifact checksum file mismatch')
        manifest = json.loads(manifest_data)
        if (not isinstance(manifest, dict)
                or manifest.get('application') != 'finai-laravel-private'
                or manifest.get('commit') != commit
                or manifest.get('archive_sha256') != archive_sha):
            raise Denied('artifact manifest identity mismatch')
        with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as tar:
            markers = [entry for entry in tar if entry.name == 'public/finai-api-build.json']
            if len(markers) != 1 or not markers[0].isfile() or markers[0].size > 4096:
                raise Denied('invalid API release marker')
            marker_file = tar.extractfile(markers[0])
            if marker_file is None:
                raise Denied('unreadable API release marker')
            marker = json.loads(marker_file.read())
            if marker != {'application': 'finai-ledger-api', 'commit': commit}:
                raise Denied('API release marker mismatch')
    except (OSError, ValueError, KeyError, UnicodeError, zipfile.BadZipFile,
            tarfile.TarError) as exc:
        raise Denied('invalid private artifact') from None
    return archive, manifest_data


def host_preflight():
    if (os.getuid() != UID or os.geteuid() != UID or os.getegid() != GID
            or os.getgroups() != [GID] or os.environ.get('HOME') != str(HOME)
            or socket.gethostname().split('.', 1)[0] != 'lcp-86'):
        raise Denied('unexpected system identity')
    try:
        with open('/proc/self/status', encoding='ascii') as stream:
            caps = {line.split(':', 1)[0]: line.split(':', 1)[1].strip()
                    for line in stream if line.startswith(('CapEff:', 'CapPrm:'))}
        if (int(caps['CapEff'], 16) != 0 or int(caps['CapPrm'], 16) != 0
                or os.access('/home/laskot48/public_html', os.W_OK, effective_ids=True)
                or os.access('/home/laskot48/apps/stng-production', os.W_OK, effective_ids=True)):
            raise Denied('unexpected effective privileges')
    except (OSError, KeyError, ValueError):
        raise Denied('unable to verify effective privileges') from None


def open_private_directory(path, expected_uid):
    if path.resolve(strict=True) != path.absolute():
        raise Denied('private directory has a redirected path')
    before = path.lstat()
    if (not stat.S_ISDIR(before.st_mode) or before.st_uid != expected_uid
            or before.st_mode & 0o077):
        raise Denied('private directory ownership or permissions are unsafe')
    if any(name.startswith('system.posix_acl') for name in os.listxattr(path, follow_symlinks=False)):
        raise Denied('private directory has an unreviewed POSIX ACL')
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    after = os.fstat(fd)
    if ((after.st_dev, after.st_ino) != (before.st_dev, before.st_ino)
            or after.st_uid != expected_uid or after.st_mode & 0o077):
        os.close(fd)
        raise Denied('private directory changed during preflight')
    return fd


def unlink_if_owned(dir_fd, name, identity):
    try:
        info = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
        if stat.S_ISREG(info.st_mode) and (info.st_dev, info.st_ino) == identity:
            os.unlink(name, dir_fd=dir_fd)
    except FileNotFoundError:
        pass


def stage_verified(path, expected_uid, commit, archive, manifest):
    if not COMMIT.fullmatch(commit):
        raise Denied('invalid commit')
    directory = open_private_directory(path, expected_uid)
    created = []
    temporary = []
    prefix = 'finai-api-' + commit[:12]
    try:
        for name in (prefix + '-package.tar.gz', prefix + '-manifest.json'):
            try:
                os.stat(name, dir_fd=directory, follow_symlinks=False)
            except FileNotFoundError:
                continue
            raise Denied('target already exists')
        for name, data in ((prefix + '-package.tar.gz', archive),
                           (prefix + '-manifest.json', manifest)):
            temp_name = '.finai-stage-' + secrets.token_hex(16)
            fd = os.open(temp_name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                         0o600, dir_fd=directory)
            info = os.fstat(fd)
            identity = (info.st_dev, info.st_ino)
            temporary.append((temp_name, identity))
            with os.fdopen(fd, 'wb') as output:
                output.write(data)
                output.flush()
                os.fsync(output.fileno())
            check_fd = os.open(temp_name, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=directory)
            with os.fdopen(check_fd, 'rb') as written:
                if digest(written.read()) != digest(data):
                    raise Denied('private staging write did not verify')
            os.link(temp_name, name, src_dir_fd=directory, dst_dir_fd=directory,
                    follow_symlinks=False)
            created.append((name, identity))
        os.fsync(directory)
        return [name for name, _ in created]
    except BaseException:
        for name, identity in reversed(created):
            unlink_if_owned(directory, name, identity)
        raise
    finally:
        for name, identity in reversed(temporary):
            unlink_if_owned(directory, name, identity)
        os.close(directory)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--commit', required=True)
    parser.add_argument('--zip-sha256', required=True)
    parser.add_argument('--archive-sha256', required=True)
    parser.add_argument('--manifest-sha256', required=True)
    args = parser.parse_args()
    try:
        check_digests(args.commit, args.zip_sha256, args.archive_sha256, args.manifest_sha256)
        host_preflight()
        # The temporary bearer URL must never appear in command arguments or logs.
        if not sys.stdin.isatty():
            raise Denied('a private terminal is required')
        with warnings.catch_warnings():
            warnings.simplefilter('error', getpass.GetPassWarning)
            url = getpass.getpass('Private artifact link (input hidden): ')
        blob = download_private_artifact(url)
        archive, manifest = verified_bundle(blob, args.commit, args.zip_sha256,
                                            args.archive_sha256, args.manifest_sha256)
        del url, blob
        host_preflight()
        names = stage_verified(DESTINATION, UID, args.commit, archive, manifest)
    except (Denied, OSError, ValueError, EOFError, KeyboardInterrupt, getpass.GetPassWarning):
        raise SystemExit('FINAI_PRIVATE_STAGE=DENIED') from None
    print('FINAI_PRIVATE_STAGE=PASS')
    for name in names:
        print('FINAI_PRIVATE_FILE=' + name)
    print('FINAI_API_DEPLOY_AUTHORIZED=NO')


if __name__ == '__main__':
    main()
