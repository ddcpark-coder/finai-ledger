#!/usr/bin/env bash
# Dedicated FinAI hosting account ONLY. Exactly one new restricted deploy key.
# The Laškoteka shared account laskot48 is explicitly denied.
set -euo pipefail
umask 077
export PATH=/usr/bin:/bin:/usr/local/bin
unset BASH_ENV ENV CDPATH GIT_CONFIG_GLOBAL GIT_CONFIG_SYSTEM

mode="${1:---inspect}"
[[ $# -le 1 && ( "$mode" == --inspect || "$mode" == --apply ) ]] ||
  { echo 'Usage: finai-isolated-install-key.sh --inspect|--apply' >&2; exit 2; }

user="$(id -un)"
[[ "$user" != root && "$user" != laskot48 ]] ||
  { echo 'STOP: isolated non-root FinAI account required' >&2; exit 65; }
home="$(getent passwd "$user" | awk -F: '{print $6}')"
[[ -n "$home" && "$home" == "$HOME" && -d "$home" && ! -L "$home" ]] ||
  { echo 'STOP: home account mismatch' >&2; exit 65; }

source_root="$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
source_gate="$source_root/ops/finai-isolated-ssh-gate.py"
destination="$HOME/finai-deploy"
gate="$destination/finai-isolated-ssh-gate.py"
ssh_dir="$HOME/.ssh"
authorized="$ssh_dir/authorized_keys"
[[ -f "$source_gate" && ! -L "$source_gate" ]] ||
  { echo 'STOP: reviewed FinAI source gate missing' >&2; exit 65; }
python3 -B -c 'import ast,sys;ast.parse(open(sys.argv[1],"rb").read())' "$source_gate"

for item in "$ssh_dir" "$authorized" "$destination" "$gate"; do
  [[ ! -L "$item" ]] || { echo 'STOP: symlinked key/deploy directory' >&2; exit 65; }
done
if [[ -e "$gate" ]] && ! cmp -s -- "$gate" "$source_gate"; then
  echo 'STOP: installed SSH gate differs from reviewed source' >&2
  exit 65
fi
if [[ -e "$authorized" ]]; then
  [[ -f "$authorized" ]] || { echo 'STOP: authorized_keys not regular' >&2; exit 65; }
fi
echo "FINAI_ISOLATED_KEY_PREFLIGHT=PASS"
echo "hosting_user=$user"
echo 'existing_keys=preserved'
echo 'public_production=disabled_by_default'
if [[ "$mode" == --inspect ]]; then
  echo 'writes=no'
  exit 0
fi

install -d -m 700 "$destination"
install -d -m 700 "$ssh_dir"
if [[ ! -e "$gate" ]]; then
  install -m 700 "$source_gate" "$gate"
fi
if [[ ! -e "$authorized" ]]; then
  install -m 600 /dev/null "$authorized"
fi
[[ "$(stat -c '%U' "$authorized")" == "$user" ]] ||
  { echo 'STOP: authorized key ownership mismatch' >&2; exit 65; }

echo 'Enter only the new dedicated ssh-ed25519 PUBLIC deploy key:'
IFS= read -r public_line
[[ "$public_line" == ssh-ed25519\ * ]] ||
  { echo 'STOP: public ssh-ed25519 key required' >&2; exit 65; }
read -r type material ignored <<<"$public_line"
[[ "$type" == ssh-ed25519 && "$material" =~ ^[A-Za-z0-9+/=]{32,256}$ ]] ||
  { echo 'STOP: invalid public key' >&2; exit 65; }

temp_pub="$(mktemp "$ssh_dir/.finai-deploy-pub.XXXXXXXX")"
temp_auth=''
trap 'rm -f -- "$temp_pub" ${temp_auth:+"$temp_auth"}' EXIT
printf '%s %s finai-dedicated-deploy\n' "$type" "$material" > "$temp_pub"
ssh-keygen -lf "$temp_pub" -E sha256 >/dev/null ||
  { echo 'STOP: invalid Ed25519 public key format' >&2; exit 65; }

exec 9> "$ssh_dir/.finai-isolated-auth-lock"
flock -x 9
if grep -Fq -- "$material" "$authorized"; then
  echo 'STOP: duplicate deploy key; existing access must not be expanded' >&2
  exit 65
fi
backup="$ssh_dir/authorized_keys.finai-$(date -u +%Y%m%dT%H%M%SZ).bak"
cp -p -- "$authorized" "$backup"
chmod 600 "$backup"
temp_auth="$(mktemp "$ssh_dir/.finai-isolated-authorized.XXXXXXXX")"
cat "$authorized" > "$temp_auth"
printf 'restrict,command="%s" ssh-ed25519 %s finai-dedicated-deploy\n' \
  "$gate" "$material" >> "$temp_auth"
chmod 600 "$temp_auth"
mv -T -- "$temp_auth" "$authorized"
temp_auth=''
echo 'FINAI_ISOLATED_DEPLOY_KEY_INSTALLED=PASS'
echo 'access=status_stage_promotion_only'
echo 'production_approval=not_created'
