#!/usr/bin/env bash
# FinAI SSH forced-command gate v1 (read-only). Install outside Git checkout.
# This is NOT an OS-level security boundary on a shared cPanel account.
set -euo pipefail
umask 077
export PATH=/usr/bin:/bin
unset BASH_ENV ENV CDPATH GIT_CONFIG_GLOBAL GIT_CONFIG_SYSTEM

# No arguments, no arbitrary shell, no interpreter or user-defined paths.
case "${SSH_ORIGINAL_COMMAND-}" in
  'finai:audit:v1') operation=audit ;;
  'finai:status:v1') operation=status ;;
  *) printf '%s\n' 'DENIED: unsupported FinAI operation' >&2; exit 64 ;;
esac

if [[ "$(id -un)" != 'laskot48' ]]; then
  printf '%s\n' 'DENIED: unexpected operating-system account' >&2
  exit 65
fi

readonly root='/home/laskot48/apps/finai-ledger'
readonly sha='20013672a44a5c7dd426adb71e3dff07cbb4852b'
readonly release="$root/releases/$sha"
readonly backend="$release/backend"

# Reject path substitution; fail rather than read an unexpected directory.
if [[ ! -d "$root" || -L "$root" || ! -d "$release" || -L "$release" || ! -d "$backend" || -L "$backend" ]]; then
  printf '%s\n' 'STOP: FinAI path missing or replaced' >&2
  exit 66
fi
if [[ "$(readlink -f -- "$release")" != "$release" || "$(readlink -f -- "$backend")" != "$backend" ]]; then
  printf '%s\n' 'STOP: FinAI path resolved unexpectedly' >&2
  exit 67
fi

printf 'finai_gateway=v1\noperation=%s\n' "$operation"
if [[ "$operation" == 'status' ]]; then
  if [[ -f "$backend/artisan" ]]; then echo 'laravel=present'; else echo 'laravel=missing'; fi
  if [[ -f "$backend/vendor/autoload.php" ]]; then echo 'dependencies=present'; else echo 'dependencies=missing'; fi
  if [[ -f "$root/shared/.env" ]]; then echo 'shared_env=present'; else echo 'shared_env=missing'; fi
  if [[ -L "$root/current" ]]; then echo 'current_symlink=present'; else echo 'current_symlink=missing'; fi
  exit 0
fi

if [[ ! -d "$root/shared" || -L "$root/shared" || ! -d "$root/releases" || -L "$root/releases" ]]; then
  echo 'STOP: shared or releases directory is missing or symbolic link' >&2
  exit 68
fi
printf 'approved_release=%s\n' "$sha"
for p in "$backend/artisan" "$backend/vendor/autoload.php" "$root/shared/storage" "$root/shared/.env"; do
  case "$p" in
    "$backend/artisan") label=artisan ;;
    "$backend/vendor/autoload.php") label=composer_autoload ;;
    "$root/shared/storage") label=shared_storage ;;
    "$root/shared/.env") label=shared_env ;;
  esac
  if [[ -e "$p" ]]; then printf '%s=present\n' "$label"; else printf '%s=missing\n' "$label"; fi
done
printf '%s\n' 'result=read_only_audit_complete'
