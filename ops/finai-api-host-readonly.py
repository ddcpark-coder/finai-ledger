#!/usr/bin/env python3
"""NEXT43: read-only Hiper M FinAI API hosting preflight.

No SSH changes, DB connections, migrations, downloads, or filesystem writes.
The CLI PHP interpreter may differ from the web handler: its version is advisory.
"""
import getpass
import os
from pathlib import Path
import stat
import subprocess

HOME = Path("/home/einteg86")
PUBLIC = HOME / "api.e-integrator.si"
UID = 1256
PRIVATE = HOME / "finai-api-deploy"

FORBIDDEN = frozenset({
    ".env", ".env.production", "artisan", "composer.json", "composer.lock",
    "vendor", "storage", "database", "bootstrap", "config", "routes", "app",
})


def directory_ok(path: Path, uid: int) -> bool:
    try:
        metadata = path.lstat()
    except OSError:
        return False
    return (stat.S_ISDIR(metadata.st_mode)
            and metadata.st_uid == uid
            and not bool(metadata.st_mode & (stat.S_IWGRP | stat.S_IWOTH)))


def public_boundary_ok(path: Path) -> bool:
    if not path.is_dir() or path.is_symlink():
        return False
    # Only inspect the expected FinAI public docroot; never read secret contents.
    return not any(os.path.lexists(path / name) for name in FORBIDDEN)


def php_cli_status() -> str:
    try:
        result = subprocess.run(
            ["php", "-r", "echo PHP_VERSION_ID, PHP_EOL, (int)extension_loaded('pdo_mysql'), PHP_EOL, (int)extension_loaded('mbstring');"],
            capture_output=True, text=True, timeout=8, check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return "UNAVAILABLE"
    parts = result.stdout.strip().splitlines()
    if result.returncode != 0 or len(parts) != 3:
        return "UNAVAILABLE"
    try:
        version, pdo, mb = map(int, parts)
    except ValueError:
        return "UNAVAILABLE"
    if version < 80400 or pdo != 1 or mb != 1:
        return "INCOMPATIBLE_CLI_ONLY"
    return "PASS_CLI_ONLY"


def main():
    isolated = (os.getuid() == UID and getpass.getuser() == "einteg86"
                and Path(os.environ.get("HOME", "")).as_posix() == HOME.as_posix())
    checks = {
        "FINAI_API_ISOLATED_IDENTITY": isolated,
        "FINAI_API_HOME": directory_ok(HOME, UID) if isolated else False,
        "FINAI_API_DOCROOT": directory_ok(PUBLIC, UID) if isolated else False,
        "FINAI_API_PUBLIC_BOUNDARY": public_boundary_ok(PUBLIC) if isolated else False,
    }
    for name, valid in checks.items():
        print(f"{name}={'PASS' if valid else 'NO_GO'}")
    print(f"FINAI_API_PHP_CLI={php_cli_status() if isolated else 'NOT_CHECKED'}")
    print(f"FINAI_API_PRIVATE_RELEASE_DIR={'PRESENT' if isolated and directory_ok(PRIVATE, UID) else 'NOT_VERIFIED'}")
    print("FINAI_API_PHP_WEB_HANDLER=NOT_VERIFIED")
    print("FINAI_API_WEBSERVER_MAPPING=NOT_VERIFIED")
    print("FINAI_API_DATABASE_ISOLATION=NOT_VERIFIED")
    print("FINAI_API_RESTORE_TEST=NOT_VERIFIED")
    print("FINAI_API_DEPLOY_AUTHORIZED=NO")
    print("FINAI_API_READONLY_PREFLIGHT=PASS" if all(checks.values())
          else "FINAI_API_READONLY_PREFLIGHT=NO_GO")


if __name__ == "__main__":
    main()
