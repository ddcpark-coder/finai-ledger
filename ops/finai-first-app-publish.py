#!/usr/bin/env python3
"""One controlled first FinAI static release, with automatic rollback.

Only the existing FinAI app docroot and dedicated deployment root are used.
The existing cPanel-generated directives and .well-known directory remain in
place. This does not enable GitHub publication flags or install the API.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import pwd
import re
import signal
import socket
import stat
import sys
import tempfile
import urllib.error
import urllib.request

HOME = Path('/home/einteg86')
UID = 1256
GATE_SHA = '1fab189318a6d3769d60a6878e4d6262c27787685709b9d76e9966b35dc2434d'
RELEASE_SHA = '6e1c95c822b6996ae18a04d20e8ee1346bf4291cdfd534f0315c7c2a04818b1f'
SOURCE_COMMIT = '35264aaa8dd9ee97c5f07fc0429aca573e340b77'
ORIGINAL_HTACCESS_SHA = 'b96977b6605d97fa27788dcd4d5ebb968381c9e75d52d58c881510c5666fe28e'
BEGIN = b'# BEGIN FinAI guarded static release'
END = b'# END FinAI guarded static release'
RULES = b'''\n# BEGIN FinAI guarded static release
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteRule ^\\.well-known(/|$) - [L]
RewriteRule ^_finai_current(/|$) - [L]
RewriteRule ^(.*)$ _finai_current/$1 [L]
</IfModule>
# END FinAI guarded static release
'''


class Stop(Exception):
    pass


def require(condition, reason):
    if not condition:
        raise Stop(reason)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def check_directory(path, uid, mode):
    meta = path.lstat()
    require(stat.S_ISDIR(meta.st_mode) and meta.st_uid == uid and
            stat.S_IMODE(meta.st_mode) == mode and path.resolve() == path,
            'unexpected FinAI directory')


def check_file(path, uid, mode):
    meta = path.lstat()
    require(stat.S_ISREG(meta.st_mode) and meta.st_uid == uid and
            stat.S_IMODE(meta.st_mode) == mode and meta.st_nlink == 1,
            'unexpected FinAI file')
    return meta


def write_new(path, content, mode):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode)
    try:
        with os.fdopen(fd, 'wb') as target:
            os.fchmod(target.fileno(), mode)
            target.write(content)
            target.flush()
            os.fsync(target.fileno())
    except BaseException:
        if os.path.lexists(path):
            path.unlink()
        raise


def atomic_write(path, content, mode):
    fd, temp_name = tempfile.mkstemp(prefix='.finai-config-', dir=path.parent)
    temp = Path(temp_name)
    try:
        with os.fdopen(fd, 'wb') as target:
            os.fchmod(target.fileno(), mode)
            target.write(content)
            target.flush()
            os.fsync(target.fileno())
        os.replace(temp, path)
    finally:
        if os.path.lexists(temp):
            temp.unlink()


def get_https(url, limit):
    request = urllib.request.Request(url, headers={'Cache-Control': 'no-cache',
                                                   'Accept-Encoding': 'identity'})
    with urllib.request.urlopen(request, timeout=25) as response:
        require(response.status == 200 and response.geturl() == url, 'unexpected web response')
        result = response.read(limit + 1)
    require(len(result) <= limit, 'web response too large')
    return result


def check_live(release):
    base = 'https://app.e-integrator.si'
    marker = get_https(base + '/finai-build.json', 4096)
    require(marker == (release / 'finai-build.json').read_bytes(), 'live build marker differs')
    require(json.loads(marker) == {'application': 'finai-ledger', 'commit': SOURCE_COMMIT},
            'live build commit differs')
    html = get_https(base + '/', 2 * 1024 * 1024)
    require(sha(html) == sha((release / 'index.html').read_bytes()) and
            b'FinAI' in html, 'live HTML differs')
    match = re.search(rb'(?:src|href)="(/_next/[^"? ]+\.(?:js|css))', html)
    require(match is not None, 'static asset reference missing')
    asset_path = match.group(1).decode('ascii')
    require(re.fullmatch(r'/_next/[A-Za-z0-9_./-]+\.(?:js|css)', asset_path) is not None and
            '..' not in Path(asset_path).parts, 'unsafe asset path')
    asset = release / asset_path.lstrip('/')
    require(asset.is_file() and not asset.is_symlink(), 'staged asset missing')
    require(sha(get_https(base + asset_path, 10 * 1024 * 1024)) == sha(asset.read_bytes()),
            'live asset differs')


def check_unpublished():
    try:
        get_https('https://app.e-integrator.si/finai-build.json', 4096)
    except urllib.error.HTTPError as error:
        require(error.code in (403, 404), 'unexpected response after unpublish')
        return
    raise Stop('release still visible after unpublish')


def guarded_promote(gate, root):
    # The existing SSH gate sets umask 022 in main(), and its public mirror
    # intentionally requires a 0711 parent. This helper calls the same gate
    # functions directly, so preserve that creation contract temporarily.
    previous = os.umask(0o022)
    try:
        return gate.conditional_promote('none', RELEASE_SHA, root)
    finally:
        os.umask(previous)


def publish(home, uid, gate, expected_original_sha, live_check, unpublished_check):
    root = home / 'finai-deploy'
    app = home / 'app.e-integrator.si'
    config = app / '.htaccess'
    link = app / '_finai_current'
    backup_dir = root / '.gate-backups'
    public_marker = root / 'PUBLIC_DOCROOT_CONFIRMED'
    approve_marker = root / 'ALLOW_PRODUCTION'
    marker_contents = {
        public_marker: (str(root / 'current') + '\n').encode('ascii'),
        approve_marker: b'FINAI_LIVE_PROMOTION_APPROVED=YES\n',
    }
    check_directory(home, uid, 0o711)
    check_directory(root, uid, 0o700)
    check_directory(app, uid, 0o750)
    check_directory(backup_dir, uid, 0o700)
    config_meta = check_file(config, uid, 0o644)
    require(config_meta.st_gid == os.getgid(), 'unexpected app config group')
    original = config.read_bytes()
    require(sha(original) == expected_original_sha and BEGIN not in original and END not in original,
            'app configuration changed since review')
    require(not os.path.lexists(link) and not any(os.path.lexists(p) for p in marker_contents),
            'app link or publication markers already exist')
    require(gate.active_release(root) == 'none', 'a release is already active')
    require(gate.prepare_public_root(root) == 0o700, 'unsafe private release root')
    gate.verify_staged_release(root, RELEASE_SHA)
    backup = backup_dir / ('app-htaccess-' + expected_original_sha + '.bak')
    installed_link = False
    installed_config = False
    created_markers = []
    changed = original + (b'' if original.endswith(b'\n') else b'\n') + RULES
    with gate.mutation_lock(root):
        check_directory(root, uid, 0o700)
        check_directory(app, uid, 0o750)
        check_file(config, uid, 0o644)
        require(gate.active_release(root) == 'none' and not os.path.lexists(link),
                'release state changed')
        require(sha(config.read_bytes()) == expected_original_sha and
                not any(os.path.lexists(p) for p in marker_contents), 'configuration changed')
        gate.verify_staged_release(root, RELEASE_SHA)
        try:
            if os.path.lexists(backup):
                check_file(backup, uid, 0o600)
                require(sha(backup.read_bytes()) == expected_original_sha, 'backup differs')
            else:
                write_new(backup, original, 0o600)
            os.symlink(str(root / 'current'), str(link))
            installed_link = True
            atomic_write(config, changed, 0o644)
            installed_config = True
            for path, contents in marker_contents.items():
                write_new(path, contents, 0o600)
                created_markers.append(path)
            require(guarded_promote(gate, root) == 'PROMOTED',
                    'release promotion failed')
            require(gate.active_release(root) == RELEASE_SHA, 'active release differs')
            live_check(root / 'releases' / RELEASE_SHA)
            require(gate.unpublish(RELEASE_SHA, root) == 'UNPUBLISHED' and
                    gate.active_release(root) == 'none' and
                    stat.S_IMODE(root.lstat().st_mode) == 0o700,
                    'first-release rollback failed')
            unpublished_check()
            require(guarded_promote(gate, root) == 'PROMOTED' and
                    gate.active_release(root) == RELEASE_SHA, 'republishing after rollback failed')
            live_check(root / 'releases' / RELEASE_SHA)
        except BaseException as error:
            errors = []
            try:
                active = gate.active_release(root)
                if active == RELEASE_SHA:
                    gate.unpublish(RELEASE_SHA, root)
                elif active != 'none':
                    errors.append('unexpected active release')
            except BaseException:
                errors.append('could not unpublish release')
            if installed_config:
                try:
                    check_file(config, uid, 0o644)
                    require(sha(config.read_bytes()) == sha(changed), 'app config changed during rollback')
                    atomic_write(config, original, 0o644)
                except BaseException:
                    errors.append('could not restore app config')
            if installed_link:
                try:
                    require(link.is_symlink() and os.readlink(link) == str(root / 'current'),
                            'app link changed during rollback')
                    link.unlink()
                except BaseException:
                    errors.append('could not remove app link')
            for path in created_markers:
                try:
                    check_file(path, uid, 0o600)
                    require(path.read_bytes() == marker_contents[path], 'marker changed')
                    path.unlink()
                except BaseException:
                    errors.append('could not remove publication marker')
            if errors:
                raise Stop('rollback incomplete: ' + ', '.join(errors)) from error
            raise Stop('first publication rolled back: ' + str(error)) from error


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true', required=True)
    parser.parse_args()
    os.umask(0o077)
    sys.dont_write_bytecode = True
    user = pwd.getpwuid(os.getuid())
    require(os.getuid() == UID and user.pw_name == 'einteg86' and user.pw_dir == str(HOME) and
            os.environ.get('HOME') == str(HOME) and socket.gethostname() == 'lcp-86.controlpanel.si' and
            Path('/var/.cagefs/.cagefs.token').exists(), 'wrong account, host or CageFS')
    try:
        pwd.getpwnam('laskot48')
    except KeyError:
        pass
    else:
        raise Stop('shared account unexpectedly visible')
    gate_path = HOME / 'finai-deploy' / 'finai-isolated-ssh-gate.py'
    check_file(gate_path, UID, 0o700)
    require(sha(gate_path.read_bytes()) == GATE_SHA, 'installed gate differs')
    spec = importlib.util.spec_from_file_location('approved_finai_gate', gate_path)
    gate = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gate)
    def interrupted(_signum, _frame):
        raise Stop('operation interrupted')
    signal.signal(signal.SIGHUP, interrupted)
    signal.signal(signal.SIGTERM, interrupted)
    publish(HOME, UID, gate, ORIGINAL_HTACCESS_SHA, check_live, check_unpublished)
    print('FINAI_FIRST_PUBLISH=PASS')
    print('FINAI_ROLLBACK_TEST=PASS')
    print('FINAI_LIVE_RELEASE_SHA256=' + RELEASE_SHA)
    print('FINAI_LIVE_COMMIT=' + SOURCE_COMMIT)


if __name__ == '__main__':
    try:
        main()
    except (Stop, OSError, ValueError, json.JSONDecodeError) as error:
        print('FINAI_FIRST_PUBLISH=STOP ' + str(error), file=sys.stderr)
        raise SystemExit(65)
