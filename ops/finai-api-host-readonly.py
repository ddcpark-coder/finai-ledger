#!/usr/bin/env python3
"""NEXT43: read-only Hiper M FinAI API hosting preflight.

No SSH changes, DB connections, migrations, downloads, or filesystem writes.
The CLI PHP interpreter may differ from the web handler: its version is advisory.
"""
import getpass
import os
from pathlib import Path
import pwd
import socket
import stat
import subprocess

HOME = Path("/home/einteg86")
PUBLIC = HOME / "api.e-integrator.si"
UID = 1256
PRIVATE = HOME / "finai-api-deploy"
EXISTING_PRIVATE = HOME / "finai-laravel-private"
PHP_EXECUTABLES = {
    "DEFAULT": "php",
    "ALT84": "/opt/alt/php84/usr/bin/php",
    "EA84": "/opt/cpanel/ea-php84/root/usr/bin/php",
}
PHP_EXTENSIONS = (
    "ctype", "curl", "date", "dom", "fileinfo", "filter", "hash", "iconv",
    "json", "libxml", "mbstring", "openssl", "pcre", "pdo_mysql", "session",
    "tokenizer", "xml",
)

FORBIDDEN = frozenset({
    ".env", ".env.production", "artisan", "composer.json", "composer.lock",
    "vendor", "storage", "database", "bootstrap", "config", "routes", "app",
})


def directory_ok(path: Path, uid: int) -> bool:
    try:
        metadata = path.lstat()
        canonical = path.resolve(strict=True)
    except (OSError, RuntimeError):
        return False
    return (stat.S_ISDIR(metadata.st_mode)
            and metadata.st_uid == uid
            and not bool(metadata.st_mode & (stat.S_IWGRP | stat.S_IWOTH))
            and canonical == path.absolute())


def private_directory_status(path: Path, uid: int) -> str:
    try:
        metadata = path.lstat()
    except FileNotFoundError:
        return "NOT_PRESENT"
    except OSError:
        return "NO_GO"
    if not directory_ok(path, uid) or metadata.st_mode & 0o077:
        return "NO_GO"
    return "PRESENT_PRIVATE"


def public_boundary_ok(path: Path) -> bool:
    if not path.is_dir() or path.is_symlink():
        return False
    # Only inspect the expected FinAI public docroot; never read secret contents.
    try:
        with os.scandir(path) as entries:
            return not any(
                entry.name.lower() in FORBIDDEN
                or entry.name.lower().startswith(".env.")
                for entry in entries
            )
    except OSError:
        return False


def php_cli_diagnostic(binary: str = "php"):
    extension_list = ",".join("'" + name + "'" for name in PHP_EXTENSIONS)
    php_code = (
        "echo PHP_VERSION_ID, PHP_EOL; "
        "foreach ([" + extension_list + "] as $ext) { "
        "echo $ext, ':', (int) extension_loaded($ext), PHP_EOL; }"
    )
    try:
        result = subprocess.run(
            [binary, "-r", php_code],
            capture_output=True, text=True, timeout=8, check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return "UNAVAILABLE", ()
    parts = result.stdout.strip().splitlines()
    if result.returncode != 0 or len(parts) != len(PHP_EXTENSIONS) + 1:
        return "UNAVAILABLE", ()
    try:
        version = int(parts[0])
        values = dict(line.split(":", 1) for line in parts[1:])
    except ValueError:
        return "UNAVAILABLE", ()
    if set(values) != set(PHP_EXTENSIONS) or any(v not in {"0", "1"} for v in values.values()):
        return "UNAVAILABLE", ()
    missing = tuple(name for name in PHP_EXTENSIONS if values[name] == "0")
    if not 80400 <= version < 90000 or missing:
        return "INCOMPATIBLE_CLI_ONLY", missing
    return "PASS_CLI_ONLY", ()


def php_cli_status() -> str:
    return php_cli_diagnostic()[0]


def main():
    try:
        account_name = pwd.getpwuid(os.geteuid()).pw_name
    except KeyError:
        account_name = ""
    isolated = (os.getuid() == UID and os.geteuid() == UID
                and account_name == "einteg86" and getpass.getuser() == "einteg86"
                and Path(os.environ.get("HOME", "")).as_posix() == HOME.as_posix())
    hostname_ok = socket.gethostname().split(".", 1)[0] == "lcp-86"
    trusted_host = isolated and hostname_ok
    checks = {
        "FINAI_API_ISOLATED_IDENTITY": isolated,
        "FINAI_API_HOST_IDENTITY": hostname_ok if isolated else False,
        "FINAI_API_HOME": directory_ok(HOME, UID) if trusted_host else False,
        "FINAI_API_DOCROOT": directory_ok(PUBLIC, UID) if trusted_host else False,
        "FINAI_API_PUBLIC_BOUNDARY": public_boundary_ok(PUBLIC) if trusted_host else False,
    }
    for name, valid in checks.items():
        print(f"{name}={'PASS' if valid else 'NO_GO'}")
    for label, binary in PHP_EXECUTABLES.items():
        status, missing = php_cli_diagnostic(binary) if trusted_host else ("NOT_CHECKED", ())
        key = "FINAI_API_PHP_CLI" if label == "DEFAULT" else f"FINAI_API_PHP_CLI_{label}"
        print(f"{key}={status}")
        if missing:
            print(f"{key}_MISSING_EXTENSIONS={','.join(missing)}")
    for key, path in (("FINAI_API_PRIVATE_RELEASE_DIR", PRIVATE),
                      ("FINAI_API_EXISTING_PRIVATE_DIR", EXISTING_PRIVATE)):
        status = private_directory_status(path, UID) if trusted_host else "NOT_CHECKED"
        print(f"{key}={status}")
    print("FINAI_API_ACL_ISOLATION=NOT_VERIFIED")
    print("FINAI_API_PHP_WEB_HANDLER=NOT_VERIFIED")
    print("FINAI_API_WEBSERVER_MAPPING=NOT_VERIFIED")
    print("FINAI_API_DATABASE_ISOLATION=NOT_VERIFIED")
    print("FINAI_API_RESTORE_TEST=NOT_VERIFIED")
    print("FINAI_API_DEPLOY_AUTHORIZED=NO")
    print("FINAI_API_READONLY_PREFLIGHT=PASS" if all(checks.values())
          else "FINAI_API_READONLY_PREFLIGHT=NO_GO")


if __name__ == "__main__":
    main()
