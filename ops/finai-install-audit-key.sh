#!/usr/bin/env bash
# One-time FinAI-only authorized_keys installer. Explicit --apply required.
# Does not grant shell access or OS isolation on a shared cPanel account.
set -euo pipefail
umask 077
export PATH=/usr/bin:/bin

mode="${1:---inspect}"
case "$mode" in --inspect|--apply) ;; *) printf 'Usage: %s [--inspect|--apply]\n' "${0##*/}" >&2; exit 2 ;; esac
if (( $# > 1 )); then echo 'STOP: unexpected arguments' >&2; exit 2; fi

root='/home/laskot48/apps/finai-ledger'
destination="$root/shared/ops"
installed_gate="$destination/finai-ssh-gate.sh"
ssh_dir='/home/laskot48/.ssh'
authorized="$ssh_dir/authorized_keys"
source_dir="$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
source_gate="$source_dir/ops/finai-ssh-gate.sh"

if [[ "$(id -un)" != 'laskot48' ]]; then echo 'STOP: unexpected user'; exit 10; fi
if [[ ! -d "$root/shared" || -L "$root/shared" || ! -d "$root/releases" || -L "$root/releases" ]]; then echo 'STOP: FinAI layout invalid'; exit 11; fi
if [[ ! -d "$ssh_dir" || -L "$ssh_dir" || ! -f "$authorized" || -L "$authorized" ]]; then echo 'STOP: SSH key store missing or symbolic link'; exit 12; fi
if [[ "$(stat -c '%a' -- "$ssh_dir")" != '700' || "$(stat -c '%a' -- "$authorized")" != '600' ]]; then echo 'STOP: SSH permissions are not 700/600'; exit 13; fi
for cmd in ssh-keygen flock mktemp install cmp; do command -v "$cmd" >/dev/null 2>&1 || { echo "STOP: missing command $cmd"; exit 14; }; done
if [[ ! -f "$source_gate" || -L "$source_gate" ]]; then echo 'STOP: reviewed gate source missing'; exit 15; fi
bash -n "$source_gate"
if [[ -L "$destination" || -L "$installed_gate" ]]; then
  echo 'STOP: FinAI ops directory or gate is a symbolic link'
  exit 16
fi
if [[ -e "$installed_gate" && ! -f "$installed_gate" ]]; then
  echo 'STOP: existing FinAI gate is not a regular file'
  exit 16
fi
if [[ -e "$installed_gate" ]] && ! cmp -s -- "$source_gate" "$installed_gate"; then
  echo 'STOP: installed gate differs from source; manual review required'
  exit 16
fi

echo 'FINAI_SSH_INSTALL_PREFLIGHT=PASS'
echo "MODE=$mode"
echo 'existing_authorized_keys=preserved'
echo 'existing_other_keys=untouched'
if [[ "$mode" == '--inspect' ]]; then
  echo 'No modifications performed'
  exit 0
fi

# Read only the new public key from stdin (private keys/passwords are rejected).
echo 'Paste the NEW dedicated FinAI PUBLIC ssh-ed25519 key and press Enter:'
IFS= read -r public_line
if [[ "$public_line" != ssh-ed25519\ * ]]; then echo 'STOP: requires an ssh-ed25519 public key'; exit 20; fi
read -r key_type key_data _ <<<"$public_line"
if [[ "$key_type" != 'ssh-ed25519' || ! "$key_data" =~ ^[A-Za-z0-9+/=]{32,256}$ ]]; then
  echo 'STOP: malformed public key'
  exit 21
fi
public_file="$(mktemp "$ssh_dir/.finai-pub.XXXXXXXX")"
tmp_authorized=''
trap 'rm -f -- "$public_file" ${tmp_authorized:+"$tmp_authorized"}' EXIT
printf 'ssh-ed25519 %s finai-github-audit\n' "$key_data" > "$public_file"
ssh-keygen -lf "$public_file" -E sha256 >/dev/null || { echo 'STOP: invalid OpenSSH Ed25519 public key'; exit 22; }
if awk -v key="$key_data" 'index($0, key) > 0 { duplicate=1 } END { exit(duplicate ? 0 : 1) }' "$authorized"; then
  echo 'STOP: this key already exists; refusing possible unrestricted duplicate'
  exit 23
fi

# Lock then check again; never remove or rewrite existing authorized entries.
exec 9> "$ssh_dir/.finai-authkeys.lock"
flock -x 9
if awk -v key="$key_data" 'index($0, key) > 0 { duplicate=1 } END { exit(duplicate ? 0 : 1) }' "$authorized"; then
  echo 'STOP: key was added concurrently'
  exit 24
fi
if [[ -L "$authorized" ]]; then echo 'STOP: SSH authorization path changed'; exit 25; fi
install -d -m 700 -- "$destination"
if [[ ! -e "$installed_gate" ]]; then install -m 700 -- "$source_gate" "$installed_gate"; fi

backup="$(mktemp "$ssh_dir/authorized_keys.finai-backup.XXXXXXXX")"
cp -p -- "$authorized" "$backup"
chmod 600 "$backup"
tmp_authorized="$(mktemp "$ssh_dir/.authorized_keys.finai.XXXXXXXX")"
cat -- "$authorized" > "$tmp_authorized"
printf '\nrestrict,command="%s" ssh-ed25519 %s finai-github-audit\n' "$installed_gate" "$key_data" >> "$tmp_authorized"
chmod 600 "$tmp_authorized"
mv -- "$tmp_authorized" "$authorized"
tmp_authorized=''
echo 'FINAI_SSH_KEY_INSTALLED=YES'
echo 'access=forced-command-read-only'
echo 'backup_created=YES'
echo 'existing_authorized_entries=preserved'
echo 'NOT OS isolation: full autonomy needs a separate FinAI hosting account.'
