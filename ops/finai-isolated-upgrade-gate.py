#!/usr/bin/env python3
"""One-time FinAI gate upgrade; never changes authorized_keys or other sites."""
import argparse
import ast
from contextlib import contextmanager
import fcntl
import hashlib
import importlib.util
import os
from pathlib import Path
import pwd
import re
import socket
import stat
import sys
import tempfile
import urllib.request

HOME = Path('/home/einteg86')
UID = 1256
OLD_SHA256 = '177f1df92655b284e972eb36b11d48c5b54c71714c0546f9950038f14cc066ce'
NEW_SHA256 = '1fab189318a6d3769d60a6878e4d6262c27787685709b9d76e9966b35dc2434d'
STAGED_SHA256 = '6e1c95c822b6996ae18a04d20e8ee1346bf4291cdfd534f0315c7c2a04818b1f'
NEW_URL = ('https://raw.githubusercontent.com/ddcpark-coder/finai-ledger/'
           '641d7adbf2e945e283838585230625fe4112e791/ops/finai-isolated-ssh-gate.py')


class Stop(Exception):
    pass


def checked_path(path, uid, kind, modes):
    try:
        meta = path.lstat()
    except OSError as exc:
        raise Stop('required FinAI path unavailable') from exc
    if not kind(meta.st_mode) or meta.st_uid != uid or stat.S_IMODE(meta.st_mode) not in modes:
        raise Stop('unexpected owner, type or mode')
    return meta


def check_no_active_release(root):
    current = root / 'current'
    if current.is_symlink() or current.exists():
        raise Stop('an active or unexpected current release exists')
    for marker in ('ALLOW_PRODUCTION', 'PUBLIC_DOCROOT_CONFIRMED'):
        entry = root / marker
        if entry.is_symlink() or entry.exists():
            raise Stop('publication markers already exist')


def check_authorized_key(home, uid, material):
    if not re.fullmatch(r'[A-Za-z0-9+/=]{32,256}', material):
        raise Stop('invalid public-key material')
    ssh_dir = home / '.ssh'
    auth = ssh_dir / 'authorized_keys'
    checked_path(ssh_dir, uid, stat.S_ISDIR, {0o700})
    checked_path(auth, uid, stat.S_ISREG, {0o600})
    expected = f'restrict,command="{home}/finai-deploy/finai-isolated-ssh-gate.py" ssh-ed25519 {material} finai-dedicated-deploy'
    lines = auth.read_text(encoding='utf-8').splitlines()
    matches = [line for line in lines if material in line]
    if matches != [expected]:
        raise Stop('restricted FinAI key not uniquely present')


@contextmanager
def deployment_lock(root, uid):
    flags = os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW
    fd = os.open(root / '.finai-gate.lock', flags, 0o600)
    try:
        meta = os.fstat(fd)
        if not stat.S_ISREG(meta.st_mode) or meta.st_uid != uid or stat.S_IMODE(meta.st_mode) != 0o600:
            raise Stop('unsafe deployment lock')
        fcntl.flock(fd, fcntl.LOCK_EX)
        yield
    finally:
        os.close(fd)


def write_gate_temporary(root, data):
    fd, name = tempfile.mkstemp(prefix='.finai-gate-next-', dir=root)
    try:
        with os.fdopen(fd, 'wb') as stream:
            os.fchmod(stream.fileno(), 0o700)
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        return Path(name)
    except BaseException:
        if os.path.lexists(name):
            os.unlink(name)
        raise


def upgrade(home, uid, material, new_data, old_sha, new_sha, verify_stage):
    """Atomically replace only a known inactive gate; retain a private backup."""
    root = home / 'finai-deploy'
    gate = root / 'finai-isolated-ssh-gate.py'
    checked_path(home, uid, stat.S_ISDIR, {0o700, 0o711})
    checked_path(root, uid, stat.S_ISDIR, {0o700})
    checked_path(gate, uid, stat.S_ISREG, {0o700})
    check_no_active_release(root)
    check_authorized_key(home, uid, material)
    if hashlib.sha256(new_data).hexdigest() != new_sha:
        raise Stop('new gate checksum mismatch')
    ast.parse(new_data)
    old_data = gate.read_bytes()
    if hashlib.sha256(old_data).hexdigest() != old_sha:
        raise Stop('installed gate checksum differs')
    with deployment_lock(root, uid):
        check_no_active_release(root)
        check_authorized_key(home, uid, material)
        checked_path(gate, uid, stat.S_ISREG, {0o700})
        if hashlib.sha256(gate.read_bytes()).hexdigest() != old_sha:
            raise Stop('installed gate changed during upgrade')
        verify_stage()
        backups = root / '.gate-backups'
        if backups.is_symlink():
            raise Stop('linked backup directory')
        backups.mkdir(mode=0o700, exist_ok=True)
        checked_path(backups, uid, stat.S_ISDIR, {0o700})
        backup = backups / (old_sha + '.py')
        if backup.is_symlink():
            raise Stop('linked gateway backup')
        if backup.exists():
            checked_path(backup, uid, stat.S_ISREG, {0o700})
            if hashlib.sha256(backup.read_bytes()).hexdigest() != old_sha:
                raise Stop('existing gateway backup differs')
        else:
            fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o700)
            with os.fdopen(fd, 'wb') as stream:
                stream.write(old_data)
                stream.flush()
                os.fsync(stream.fileno())
        temporary = write_gate_temporary(root, new_data)
        switched = False
        try:
            checked_path(temporary, uid, stat.S_ISREG, {0o700})
            if hashlib.sha256(temporary.read_bytes()).hexdigest() != new_sha:
                raise Stop('new gate temporary file checksum mismatch')
            os.replace(temporary, gate)
            switched = True
            if hashlib.sha256(gate.read_bytes()).hexdigest() != new_sha:
                raise Stop('installed gate checksum mismatch')
        except Exception:
            if switched:
                restore = write_gate_temporary(root, old_data)
                try:
                    os.replace(restore, gate)
                finally:
                    if os.path.lexists(restore):
                        os.unlink(restore)
            raise
        finally:
            if os.path.lexists(temporary):
                os.unlink(temporary)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--public-key', required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    os.umask(0o077)
    parts = args.public_key.split()
    if len(parts) != 2 or parts[0] != 'ssh-ed25519':
        raise Stop('expected dedicated public key')
    user = pwd.getpwuid(os.getuid())
    if (os.getuid() != UID or user.pw_name != 'einteg86' or Path(user.pw_dir) != HOME or
            Path(os.environ.get('HOME', '')) != HOME or socket.gethostname() != 'lcp-86.controlpanel.si' or
            not Path('/var/.cagefs/.cagefs.token').exists()):
        raise Stop('dedicated FinAI identity or CageFS not confirmed')
    try:
        pwd.getpwnam('laskot48')
    except KeyError:
        pass
    else:
        raise Stop('shared account visible in this environment')
    root = HOME / 'finai-deploy'
    gate = root / 'finai-isolated-ssh-gate.py'
    checked_path(HOME, UID, stat.S_ISDIR, {0o711})
    checked_path(root, UID, stat.S_ISDIR, {0o700})
    checked_path(gate, UID, stat.S_ISREG, {0o700})
    check_no_active_release(root)
    check_authorized_key(HOME, UID, parts[1])
    if hashlib.sha256(gate.read_bytes()).hexdigest() != OLD_SHA256:
        raise Stop('installed gate checksum differs')
    sys.dont_write_bytecode = True
    spec = importlib.util.spec_from_file_location('verified_old_finai_gate', gate)
    old_gate = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(old_gate)
    def verify_stage():
        try:
            old_gate.verify_staged_release(root, STAGED_SHA256)
        except Exception as exc:
            raise Stop('staged release integrity check failed') from exc
    verify_stage()
    with urllib.request.urlopen(NEW_URL, timeout=30) as response:
        if not response.geturl().startswith('https://raw.githubusercontent.com/'):
            raise Stop('unexpected download origin')
        new_data = response.read(2 * 1024 * 1024 + 1)
    if len(new_data) > 2 * 1024 * 1024 or hashlib.sha256(new_data).hexdigest() != NEW_SHA256:
        raise Stop('reviewed new gate checksum mismatch')
    ast.parse(new_data)
    if not args.apply:
        print('FINAI_GATE_UPGRADE_PREFLIGHT=PASS')
        return
    upgrade(HOME, UID, parts[1], new_data, OLD_SHA256, NEW_SHA256,
            verify_stage)
    print('FINAI_GATE_UPGRADE=PASS')
    print('FINAI_PUBLICATION=DISABLED')


if __name__ == '__main__':
    try:
        main()
    except (Stop, OSError, ValueError, SyntaxError) as exc:
        print('FINAI_GATE_UPGRADE=STOP ' + str(exc))
        raise SystemExit(65)
