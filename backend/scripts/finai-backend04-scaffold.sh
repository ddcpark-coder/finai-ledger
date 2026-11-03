#!/usr/bin/env bash
# BACKEND-04: prepare an EMPTY FinAI-only directory tree.
# Never run this inside the Laškoteka application. No DB, DNS, cron or code deployment.
set -euo pipefail

usage() {
  printf 'Usage: %s --dry-run | --apply\n' "${0##*/}" >&2
  exit 2
}
[[ $# -eq 1 ]] || usage
[[ "$1" == "--dry-run" || "$1" == "--apply" ]] || usage

if [[ -z "${HOME:-}" || "$HOME" != /* || "$HOME" == "/" || ! -d "$HOME" ]]; then
  printf 'ERROR: a valid absolute HOME is required.\n' >&2
  exit 1
fi

home="$(cd "$HOME" && pwd -P)"
if [[ -L "$home/apps" ]]; then
  printf 'ERROR: ~/apps is a symlink. Refusing ambiguous destination.\n' >&2
  exit 1
fi

root="$home/apps/finai-ledger"
if [[ -e "$root" || -L "$root" ]]; then
  printf 'ERROR: target already exists: %s. This tool only initializes a fresh tree.\n' "$root" >&2
  exit 1
fi

printf 'FinAI deployment root: %s\n' "$root"
printf 'Directories to create (FinAI only):\n'
paths=(
  "releases"
  "shared/storage/app/private"
  "shared/storage/framework/cache/data"
  "shared/storage/framework/sessions"
  "shared/storage/framework/views"
  "shared/storage/logs"
  "shared/bootstrap-cache"
)
for relative in "${paths[@]}"; do printf '  %s/%s\n' "$root" "$relative"; done

if [[ "$1" == "--dry-run" ]]; then
  printf 'DRY RUN: no files, databases, domains, jobs or permissions changed.\n'
  exit 0
fi

umask 077
for relative in "${paths[@]}"; do
  mkdir -p -- "$root/$relative"
done
# The new tree is private to the cPanel account; no existing directories are chmod'ed.
chmod 700 "$root" "$root/shared"
printf 'CREATED: empty FinAI directory tree only.\n'
printf 'NOT CREATED: .env, database, API domain, current symlink, migrations or cron.\n'
printf 'STOP: continue only after separate database/domain/restore gate approval.\n'
