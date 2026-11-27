#!/usr/bin/env python3
"""Prepare a new private FinAI API configuration after a scoped DB check.

Run interactively as the dedicated cPanel user. No database mutations, public
files, credentials on the command line, or changes to existing files.
"""
import base64
import getpass
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import socket
import stat
import subprocess
import sys
import warnings


HOME = Path('/home/einteg86')
PRIVATE = HOME / 'finai-laravel-private'
DB = 'einteg86_finai_dev'
DB_USER = 'einteg86_fapi'
REQUIRED = {'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'INDEX', 'REFERENCES'}
PASSWORD = re.compile(r'^[A-Za-z0-9]{24,72}$')
ARCHIVE = 'finai-api-bc2777637e8a-package.tar.gz'
MANIFEST = 'finai-api-bc2777637e8a-manifest.json'
DIGESTS = {
    ARCHIVE: '583be9c0894c7dc94acb00448d7ffb199a17d09172507ee403333cbee949b712',
    MANIFEST: '3ae64242fbf562524705af9d65b4f14a3f96c4c7a2cf35f8287668280d274bb3',
}


class Denied(Exception):
    pass


def identity():
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
        raise Denied('cannot verify system privileges') from None


def open_private(path, uid):
    if path.resolve(strict=True) != path.absolute():
        raise Denied('redirected private directory')
    info = path.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != uid or info.st_mode & 0o077:
        raise Denied('unsafe private directory')
    if any(x.startswith('system.posix_acl') for x in os.listxattr(path, follow_symlinks=False)):
        raise Denied('unreviewed private ACL')
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    opened = os.fstat(fd)
    if ((info.st_dev, info.st_ino) != (opened.st_dev, opened.st_ino)
            or opened.st_uid != uid or opened.st_mode & 0o077):
        os.close(fd)
        raise Denied('private directory changed')
    return fd


def verify_artifact():
    directory = open_private(PRIVATE, 1256)
    try:
        for name, expected in DIGESTS.items():
            fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=directory)
            with os.fdopen(fd, 'rb') as source:
                info = os.fstat(source.fileno())
                if (not stat.S_ISREG(info.st_mode) or info.st_uid != 1256 or info.st_nlink != 1
                        or info.st_mode & 0o022 or info.st_size > 15_000_000):
                    raise Denied('unsafe staged artifact')
                if hashlib.sha256(source.read(15_000_001)).hexdigest() != expected:
                    raise Denied('staged artifact digest mismatch')
    finally:
        os.close(directory)


def check_grants(database, principal, grants):
    if database != DB or principal != DB_USER + '@localhost' or not isinstance(grants, list):
        raise Denied('unexpected database identity')
    seen_global = False
    seen_db = False
    for grant in grants:
        if not isinstance(grant, str):
            raise Denied('unrecognized database grant')
        match = re.fullmatch(r'GRANT (.+?) ON (\*\.\*|`[^`]+`\.\*) TO `'
                             + DB_USER + r'`@`localhost`(.*)', grant)
        if not match:
            raise Denied('unrecognized database grant')
        privileges = {x.strip().upper() for x in match.group(1).split(',')}
        scope = match.group(2)
        tail = match.group(3)
        if scope == '*.*':
            if (seen_global or privileges != {'USAGE'}
                    or not re.fullmatch(r"(?: IDENTIFIED BY PASSWORD '\*[0-9A-F]{40}')?", tail)):
                raise Denied('unexpected global privileges')
            seen_global = True
        elif scope[:-2].strip('`').replace('\\_', '_') == DB:
            if seen_db or privileges != REQUIRED or tail:
                raise Denied('unexpected database privileges')
            seen_db = True
        else:
            raise Denied('unexpected database scope')
    if not seen_global or not seen_db:
        raise Denied('missing database privileges')


# This child receives the credential only via stdin. Its output is captured and
# parsed in memory, never printed, because SHOW GRANTS may contain a hash.
PHP_DB_CHECK = r'''
$input = json_decode(stream_get_contents(STDIN), true, flags: JSON_THROW_ON_ERROR);
try {
    $pdo = new PDO('mysql:host=localhost;dbname=einteg86_finai_dev;charset=utf8mb4',
        'einteg86_fapi', $input['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $identity = $pdo->query('SELECT DATABASE(), CURRENT_USER()')->fetch(PDO::FETCH_NUM);
    $grants = $pdo->query('SHOW GRANTS')->fetchAll(PDO::FETCH_COLUMN);
    echo json_encode(['database'=>$identity[0], 'principal'=>$identity[1], 'grants'=>$grants], JSON_THROW_ON_ERROR);
} catch (Throwable $e) { exit(1); }
'''


def verify_database(password):
    try:
        result = subprocess.run(['php', '-r', PHP_DB_CHECK],
                                input=json.dumps({'password': password}), text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15,
                                check=True)
        data = json.loads(result.stdout)
        if set(data) != {'database', 'principal', 'grants'}:
            raise Denied('unexpected database response')
        check_grants(data['database'], data['principal'], data['grants'])
    except (OSError, ValueError, subprocess.SubprocessError, TypeError):
        raise Denied('database connection or identity check failed') from None


def config_text(password, app_key):
    if not PASSWORD.fullmatch(password) or not re.fullmatch(r'[A-Za-z0-9+/]{43}=', app_key):
        raise Denied('invalid private configuration input')
    return ('APP_NAME=FinAI\nAPP_ENV=production\nAPP_DEBUG=false\n'
            'APP_URL=https://api.e-integrator.si\nAPP_KEY=base64:' + app_key + '\n'
            'DB_CONNECTION=mysql\nDB_HOST=localhost\nDB_PORT=3306\nDB_DATABASE=' + DB + '\n'
            'DB_USERNAME=' + DB_USER + '\nDB_PASSWORD=' + password + '\n'
            'SESSION_DRIVER=file\nSESSION_ENCRYPT=true\nSESSION_SECURE_COOKIE=true\n'
            'SESSION_SAME_SITE=lax\nSESSION_DOMAIN=.e-integrator.si\n'
            'SANCTUM_STATEFUL_DOMAINS=app.e-integrator.si,api.e-integrator.si\n'
            'FINAI_ALLOWED_ORIGINS=https://app.e-integrator.si\n'
            'CACHE_STORE=file\nQUEUE_CONNECTION=sync\nLOG_CHANNEL=single\n'
            'FINAI_API_READINESS_ENABLED=true\nFINAI_AUTH_RELEASE_ENABLED=false\n').encode('ascii')


def write_new_config(private, uid, contents):
    parent = open_private(private, uid)
    directory = None
    created_dir = False
    created_file = None
    try:
        try:
            os.mkdir('shared', 0o700, dir_fd=parent)
            created_dir = True
        except FileExistsError:
            pass
        directory = open_private(private / 'shared', uid)
        fd = os.open('.env', os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                     0o600, dir_fd=directory)
        info = os.fstat(fd)
        created_file = (info.st_dev, info.st_ino)
        with os.fdopen(fd, 'wb') as output:
            output.write(contents)
            output.flush()
            os.fsync(output.fileno())
        os.fsync(directory)
    except Exception:
        if directory is not None and created_file is not None:
            try:
                item = os.stat('.env', dir_fd=directory, follow_symlinks=False)
                if (item.st_dev, item.st_ino) == created_file and stat.S_ISREG(item.st_mode):
                    os.unlink('.env', dir_fd=directory)
            except OSError:
                pass
        if created_dir:
            try:
                os.rmdir('shared', dir_fd=parent)
            except OSError:
                pass
        raise
    finally:
        if directory is not None:
            os.close(directory)
        os.close(parent)


def main():
    os.umask(0o077)
    try:
        identity()
        directory = open_private(PRIVATE, 1256)
        os.close(directory)
        verify_artifact()
        if not sys.stdin.isatty():
            raise Denied('a private terminal is required')
        with warnings.catch_warnings():
            warnings.simplefilter('error', getpass.GetPassWarning)
            password = getpass.getpass('FinAI database password (input hidden): ')
        if not PASSWORD.fullmatch(password):
            raise Denied('password must use 24–72 ASCII letters or digits')
        verify_database(password)
        identity()
        verify_artifact()
        key = base64.b64encode(secrets.token_bytes(32)).decode('ascii')
        write_new_config(PRIVATE, 1256, config_text(password, key))
    except Denied as error:
        raise SystemExit('FINAI_PRIVATE_CONFIG=NO_GO: ' + str(error)) from None
    except Exception:
        raise SystemExit('FINAI_PRIVATE_CONFIG=NO_GO') from None
    print('FINAI_DATABASE_SCOPE=PASS')
    print('FINAI_PRIVATE_CONFIG=CREATED')
    print('FINAI_API_DEPLOY_AUTHORIZED=NO')


if __name__ == '__main__':
    main()
