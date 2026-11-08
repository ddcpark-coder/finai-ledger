#!/usr/bin/env bash
# FinAI-only upgrade of existing forced-command SSH gate; no changes to authorized_keys.
set -euo pipefail
umask 077
export PATH=/usr/bin:/bin:/usr/local/bin
unset BASH_ENV ENV CDPATH GIT_CONFIG_GLOBAL GIT_CONFIG_SYSTEM

mode="${1:---inspect}"
[[ "$#" -le 1 && ( "$mode" == '--inspect' || "$mode" == '--apply' ) ]] || { echo 'STOP: use --inspect or --apply' >&2; exit 2; }
readonly root='/home/laskot48/apps/finai-ledger'
readonly dest="$root/shared/ops"
readonly gate="$dest/finai-ssh-gate.sh"
readonly reader="$dest/finai-domain-readonly.py"
readonly auth='/home/laskot48/.ssh/authorized_keys'
readonly old_blob='9111306eed52565c6781beeb4e5c5148bcef53ed'
readonly new_blob='6b565e35673c234f16ff4590c16807340d7b5c57'
readonly source_root="$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
readonly new_gate="$source_root/ops/finai-ssh-gate.sh"
readonly new_reader="$source_root/ops/finai-domain-readonly.py"
stop() { echo "STOP: $*" >&2; exit 1; }

[[ "$(id -un)" == laskot48 ]] || stop 'unexpected cPanel account'
[[ -d "$root/shared" && ! -L "$root/shared" && -d "$dest" && ! -L "$dest" ]] || stop 'FinAI shared directory missing or symlinked'
[[ -f "$gate" && ! -L "$gate" && -f "$new_gate" && ! -L "$new_gate" && -f "$new_reader" && ! -L "$new_reader" ]] || stop 'reviewed source or installed gate missing/symlinked'
[[ "$(stat -c '%U' "$gate")" == laskot48 && "$(stat -c '%a' "$gate")" == 700 ]] || stop 'unexpected installed gate ownership/mode'
[[ -f "$auth" && ! -L "$auth" ]] || stop 'authorized_keys is missing or symlinked'
grep -Fq "restrict,command=\"$gate\" ssh-ed25519 " "$auth" || stop 'FinAI dedicated restricted key not installed'
for bin in /usr/bin/git /usr/bin/python3 /usr/bin/flock; do
  [[ -x "$bin" ]] || stop "missing prerequisite $bin"
done
[[ -x /usr/local/cpanel/bin/uapi ]] || stop 'cPanel UAPI unavailable; no upgrade'
bash -n "$new_gate"
/usr/bin/python3 -I -S -B -c 'import ast,pathlib,sys; ast.parse(pathlib.Path(sys.argv[1]).read_bytes())' "$new_reader"
[[ "$(/usr/bin/git hash-object --no-filters "$new_gate")" == "$new_blob" ]] || stop 'reviewed gate source hash mismatch'
installed_blob="$(/usr/bin/git hash-object --no-filters "$gate")"
case "$installed_blob" in
  "$old_blob") gate_state=v1 ;;
  "$new_blob") gate_state=v2 ;;
  *) stop 'installed gate differs from reviewed v1/v2' ;;
esac
if [[ -e "$reader" || -L "$reader" ]]; then
  [[ -f "$reader" && ! -L "$reader" ]] || stop 'installed reader is not regular file'
  cmp -s -- "$new_reader" "$reader" || stop 'installed reader differs from approved'
  reader_state=present
else
  reader_state=absent
fi

set +e
SSH_ORIGINAL_COMMAND='id' bash "$gate" >/dev/null 2>&1
deny_code=$?
set -e
[[ "$deny_code" -eq 64 ]] || stop 'existing forced-command deny failed'
SSH_ORIGINAL_COMMAND='finai:status:v1' bash "$gate" | grep -Fxq 'finai_gateway=v1' || stop 'existing FinAI status failed'

printf 'FINAI_CPANEL_GATE_PREFLIGHT=PASS\nmode=%s\ninstalled_gate=%s\nreader=%s\n' "$mode" "$gate_state" "$reader_state"
echo 'other_projects=untouched'
echo 'authorized_keys=untouched'
if [[ "$mode" == '--inspect' ]]; then
  echo 'writes=no'
  exit 0
fi
if [[ "$gate_state" == v2 && "$reader_state" == present ]]; then
  echo 'FINAI_CPANEL_GATE_UPGRADE=ALREADY_INSTALLED'
  exit 0
fi
[[ "$gate_state" == v1 && "$reader_state" == absent ]] || stop 'partial gate state needs manual review'
exec 9> "$dest/.finai-domain-upgrade.lock"
flock -x 9 || stop 'unable to acquire FinAI gate lock'
[[ "$(/usr/bin/git hash-object --no-filters "$gate")" == "$old_blob" ]] || stop 'gate changed during preflight'
[[ ! -e "$reader" && ! -L "$reader" ]] || stop 'reader appeared during preflight'

backup_dir="$(mktemp -d "$dest/.finai-gate-backup.XXXXXXXX")"
chmod 700 "$backup_dir"
cp -p -- "$gate" "$backup_dir/finai-ssh-gate-v1.sh"
new_gate_tmp="$(mktemp "$dest/.finai-gate-new.XXXXXXXX")"
new_reader_tmp="$(mktemp "$dest/.finai-reader-new.XXXXXXXX")"
rollback_needed=0
rollback() {
  if [[ "$rollback_needed" -eq 1 ]]; then
    rollback_tmp="$(mktemp "$dest/.finai-gate-rollback.XXXXXXXX")"
    install -m 700 "$backup_dir/finai-ssh-gate-v1.sh" "$rollback_tmp"
    mv -T -- "$rollback_tmp" "$gate"
    rm -f -- "$reader"
    echo 'FINAI_CPANEL_GATE_ROLLBACK=APPLIED' >&2
  fi
}
cleanup() {
  rollback
  rm -f -- "$new_gate_tmp" "$new_reader_tmp"
}
trap cleanup EXIT
install -m 700 -- "$new_gate" "$new_gate_tmp"
install -m 600 -- "$new_reader" "$new_reader_tmp"
cmp -s -- "$new_gate" "$new_gate_tmp" || stop 'gate staging copy mismatch'
cmp -s -- "$new_reader" "$new_reader_tmp" || stop 'reader staging copy mismatch'
rollback_needed=1
mv -T -- "$new_reader_tmp" "$reader"
mv -T -- "$new_gate_tmp" "$gate"
set +e
SSH_ORIGINAL_COMMAND='id' bash "$gate" >/dev/null 2>&1
new_deny_code=$?
set -e
[[ "$new_deny_code" -eq 64 ]] || stop 'updated SSH gate denied-command check failed'
SSH_ORIGINAL_COMMAND='finai:status:v1' bash "$gate" | grep -Fxq 'finai_gateway=v1' || stop 'updated status check failed'
rollback_needed=0
printf 'FINAI_CPANEL_GATE_UPGRADE=PASS\nbackup_created=yes\nauthorized_keys_modified=no\nnew_gate_blob=%s\n' "$new_blob"
echo 'Only FinAI read-only command finai:domains:v1 was added.'
