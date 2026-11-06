#!/usr/bin/env bash
# Read-only path check. Does not touch Hiper M until independently authorized.
# This does not verify web aliases, HTTP access, PHP user, security or symlink policy.
set -euo pipefail
if [[ $# != 2 ]]; then
  printf 'Usage: %s FINAI_ROOT DOCUMENT_ROOT\n' "${0##*/}" >&2
  exit 2
fi
root=$1
docroot=$2
if [[ "$root" != /* || "$docroot" != /* || ! -d "$root" || ! -d "$docroot" ]]; then
  printf 'STOP: both paths must be existing absolute directories.\n' >&2
  exit 1
fi
root=$(cd -P -- "$root" && pwd -P)
docroot=$(cd -P -- "$docroot" && pwd -P)
if [[ "$root" == / || ! -L "$root/current" || ! -d "$root/current/public" || ! -d "$root/shared" || -L "$root/shared" || ! -d "$root/releases" || -L "$root/releases" ]]; then
  printf 'STOP: expected a FinAI root with current symlink, public and shared.\n' >&2
  exit 1
fi
release=$(cd -P -- "$root/current" && pwd -P)
public=$(cd -P -- "$root/current/public" && pwd -P)
shared=$(cd -P -- "$root/shared" && pwd -P)
releases=$(cd -P -- "$root/releases" && pwd -P)
case "$release/" in "$releases/"*) ;; *) printf 'STOP: current is outside releases.\n' >&2; exit 1;; esac
if [[ "$public" != "$release/public" || "$docroot" != "$public" ]]; then
  printf 'STOP: document root is not the current release public directory.\n' >&2
  exit 1
fi
case "$shared/" in "$public/"*) printf 'STOP: shared is under public.\n' >&2; exit 1;; esac
printf 'PASS: filesystem paths only. HTTP aliases, permissions, isolation and SSL remain UNVERIFIED.\n'
