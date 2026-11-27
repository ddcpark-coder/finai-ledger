#!/usr/bin/env python3
"""One short-lived PHP capability probe on the dedicated FinAI API domain.

The probe has no request-controlled behavior, credentials, DB access or writes.
It returns only booleans and is removed by matching its inode and content.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import signal
import socket
import stat
import urllib.error
import urllib.request

HOME = Path('/home/einteg86')
DOCROOT = HOME / 'api.e-integrator.si'
PRIVATE = HOME / 'finai-laravel-private'
EXPECTED_IP = '212.44.101.133'
COMMIT = re.compile(r'^[0-9a-f]{40}$')
SHA = re.compile(r'^[0-9a-f]{64}$')
NONCE = re.compile(r'^[0-9a-f]{32}$')


class Denied(Exception):
    pass


def preflight_identity():
    if (os.getuid() != 1256 or os.geteuid() != 1256 or os.getegid() != 1259
            or os.getgroups() != [1259] or os.environ.get('HOME') != str(HOME)
            or socket.gethostname().split('.', 1)[0] != 'lcp-86'):
        raise Denied('unexpected system identity')
    try:
        with open('/proc/self/status', encoding='ascii') as stream:
            caps = {x.split(':', 1)[0]: x.split(':', 1)[1].strip() for x in stream
                    if x.startswith(('CapEff:', 'CapPrm:'))}
        if (int(caps['CapEff'], 16) or int(caps['CapPrm'], 16)
                or os.access('/home/laskot48/public_html', os.W_OK, effective_ids=True)
                or os.access('/home/laskot48/apps/stng-production', os.W_OK, effective_ids=True)):
            raise Denied('unexpected system privileges')
    except (OSError, ValueError, KeyError):
        raise Denied('unable to verify privileges') from None


def open_directory(path, uid, private=False):
    if path.resolve(strict=True) != path.absolute():
        raise Denied('redirected target path')
    before = path.lstat()
    if (not stat.S_ISDIR(before.st_mode) or before.st_uid != uid
            or before.st_mode & (0o077 if private else 0o022)):
        raise Denied('unsafe target permissions')
    if any(x.startswith('system.posix_acl') for x in os.listxattr(path, follow_symlinks=False)):
        raise Denied('unreviewed target ACL')
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    after = os.fstat(fd)
    if ((before.st_dev, before.st_ino) != (after.st_dev, after.st_ino)
            or after.st_uid != uid or after.st_mode & (0o077 if private else 0o022)):
        os.close(fd)
        raise Denied('target changed during verification')
    return fd


def verify_staged_release(commit, archive_sha, manifest_sha):
    if not COMMIT.fullmatch(commit) or not SHA.fullmatch(archive_sha) or not SHA.fullmatch(manifest_sha):
        raise Denied('invalid release identifiers')
    directory = open_directory(PRIVATE, 1256, private=True)
    try:
        prefix = 'finai-api-' + commit[:12]
        for name, expected, limit in ((prefix + '-package.tar.gz', archive_sha, 15_000_000),
                                      (prefix + '-manifest.json', manifest_sha, 5_000_000)):
            fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=directory)
            with os.fdopen(fd, 'rb') as stream:
                info = os.fstat(stream.fileno())
                if (not stat.S_ISREG(info.st_mode) or info.st_uid != 1256 or info.st_nlink != 1
                        or info.st_mode & 0o022 or info.st_size > limit):
                    raise Denied('unsafe staged file')
                if hashlib.sha256(stream.read(limit + 1)).hexdigest() != expected:
                    raise Denied('staged release digest mismatch')
    finally:
        os.close(directory)


def php_source(nonce):
    if not NONCE.fullmatch(nonce):
        raise Denied('invalid nonce')
    return ('''<?php
header('Content-Type: application/json');
header('Cache-Control: no-store, private');
$status = @file_get_contents('/proc/self/status');
$matched = is_string($status) && preg_match('/^Uid:\\s+\\d+\\s+(\\d+)/m', $status, $parts);
$extensions = ['ctype','curl','dom','fileinfo','mbstring','openssl','pdo_mysql','session','tokenizer','xml'];
$ok = true;
foreach ($extensions as $extension) { $ok = $ok && extension_loaded($extension); }
echo json_encode(['nonce' => '%s', 'php_ok' => PHP_VERSION_ID >= 80400 && PHP_VERSION_ID < 90000,
  'extensions_ok' => $ok, 'uid_ok' => $matched && (int)$parts[1] === 1256]);
''' % nonce).encode('ascii')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise Denied('redirect refused')


def request_probe(name, nonce):
    request = urllib.request.Request('https://api.e-integrator.si/' + name,
                                     headers={'Accept': 'application/json', 'Cache-Control': 'no-cache'})
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=15) as response:
            if response.status != 200:
                raise Denied('unexpected HTTP status')
            body = response.read(4097)
    except (OSError, ValueError):
        raise Denied('HTTPS probe failed') from None
    if len(body) > 4096:
        raise Denied('unexpected probe response')
    try:
        data = json.loads(body)
    except (ValueError, UnicodeError):
        raise Denied('unexpected probe response') from None
    if (not isinstance(data, dict) or set(data) != {'nonce', 'php_ok', 'extensions_ok', 'uid_ok'}
            or data['nonce'] != nonce
            or any(type(data[key]) is not bool for key in ('php_ok', 'extensions_ok', 'uid_ok'))):
        raise Denied('invalid probe response')
    return data


def probe_once(root, uid, nonce, requester):
    source = php_source(nonce)
    name = 'finai-php-check-' + nonce + '.php'
    directory = open_directory(root, uid)
    identity = None
    try:
        fd = os.open(name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o644,
                     dir_fd=directory)
        info = os.fstat(fd)
        identity = (info.st_dev, info.st_ino)
        with os.fdopen(fd, 'wb') as output:
            output.write(source)
            output.flush()
            os.fsync(output.fileno())
        return requester(name, nonce)
    finally:
        try:
            if identity is not None:
                fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=directory)
                with os.fdopen(fd, 'rb') as stream:
                    info = os.fstat(stream.fileno())
                    if (not stat.S_ISREG(info.st_mode) or (info.st_dev, info.st_ino) != identity
                            or hashlib.sha256(stream.read(4096)).digest() != hashlib.sha256(source).digest()):
                        raise Denied('probe changed before cleanup')
                os.unlink(name, dir_fd=directory)
                os.fsync(directory)
        finally:
            os.close(directory)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--commit', required=True)
    parser.add_argument('--archive-sha256', required=True)
    parser.add_argument('--manifest-sha256', required=True)
    args = parser.parse_args()
    def stop_probe(signum, frame):
        raise Denied('probe interrupted')
    signal.signal(signal.SIGTERM, stop_probe)
    signal.signal(signal.SIGHUP, stop_probe)
    try:
        preflight_identity()
        verify_staged_release(args.commit, args.archive_sha256, args.manifest_sha256)
        addresses = {row[4][0] for row in socket.getaddrinfo('api.e-integrator.si', 443,
                                                            type=socket.SOCK_STREAM)}
        if addresses != {EXPECTED_IP}:
            raise Denied('unexpected API DNS target')
        preflight_identity()
        result = probe_once(DOCROOT, 1256, secrets.token_hex(16), request_probe)
    except Denied as error:
        raise SystemExit('FINAI_WEB_PHP_PROBE=NO_GO: ' + str(error)) from None
    except Exception:
        raise SystemExit('FINAI_WEB_PHP_PROBE=NO_GO') from None
    print('FINAI_WEB_PHP_VERSION=' + ('PASS' if result['php_ok'] else 'NO_GO'))
    print('FINAI_WEB_PHP_EXTENSIONS=' + ('PASS' if result['extensions_ok'] else 'NO_GO'))
    print('FINAI_WEB_EFFECTIVE_UID=' + ('PASS' if result['uid_ok'] else 'NO_GO'))
    print('FINAI_WEB_PROBE_CLEANUP=PASS')
    print('FINAI_API_DEPLOY_AUTHORIZED=NO')


if __name__ == '__main__':
    main()
