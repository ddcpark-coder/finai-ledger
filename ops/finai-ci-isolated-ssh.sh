#!/usr/bin/env bash
# CI-side FinAI-only SSH client for a DEDICATED cPanel account.
set -euo pipefail
umask 077
unset BASH_ENV ENV CDPATH
export PATH=/usr/bin:/bin

operation="${1:-}"
digest="${2:-}"
archive="${3:-}"
[[ "$operation" == stage || "$operation" == promote ]] ||
  { echo 'STOP: expected stage|promote' >&2; exit 64; }
[[ "$digest" =~ ^[0-9a-f]{64}$ ]] ||
  { echo 'STOP: expected exact SHA256' >&2; exit 64; }
[[ -n "${FINAI_DEPLOY_SSH_PRIVATE_KEY:-}" && -n "${FINAI_DEPLOY_SSH_KNOWN_HOSTS:-}" ]] ||
  { echo 'STOP: isolated deploy key/known hosts not configured' >&2; exit 64; }
[[ "${FINAI_DEPLOY_SSH_USER:-}" =~ ^[a-zA-Z][a-zA-Z0-9_-]{1,30}$ &&
   "$FINAI_DEPLOY_SSH_USER" != laskot48 ]] ||
  { echo 'STOP: dedicated FinAI OS account required' >&2; exit 65; }
[[ "${FINAI_DEPLOY_SSH_HOST:-}" =~ ^[a-zA-Z0-9.-]+$ ]] ||
  { echo 'STOP: invalid SSH host' >&2; exit 65; }
[[ "${FINAI_DEPLOY_SSH_PORT:-}" =~ ^[0-9]{1,5}$ ]] ||
  { echo 'STOP: invalid SSH port' >&2; exit 65; }
[[ -n "${RUNNER_TEMP:-}" && -d "$RUNNER_TEMP" ]] ||
  { echo 'STOP: dedicated GitHub runner required' >&2; exit 65; }

if [[ "$operation" == stage ]]; then
  [[ -f "$archive" && ! -L "$archive" ]] ||
    { echo 'STOP: release tar missing' >&2; exit 66; }
  actual="$(sha256sum "$archive" | awk '{print $1}')"
  [[ "$actual" == "$digest" ]] ||
    { echo 'STOP: release checksum mismatch' >&2; exit 66; }
fi

temp="$(mktemp -d "$RUNNER_TEMP/finai-isolated-ssh.XXXXXXXX")"
trap 'rm -rf -- "$temp"' EXIT
printf '%s\n' "$FINAI_DEPLOY_SSH_PRIVATE_KEY" | tr -d '\r' > "$temp/key"
printf '%s\n' "$FINAI_DEPLOY_SSH_KNOWN_HOSTS" | tr -d '\r' > "$temp/known_hosts"
chmod 600 "$temp/key" "$temp/known_hosts"
opts=(-F /dev/null -T -o BatchMode=yes -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$temp/known_hosts"
  -o ConnectTimeout=12 -o ConnectionAttempts=1
  -i "$temp/key" -p "$FINAI_DEPLOY_SSH_PORT")
remote="$FINAI_DEPLOY_SSH_USER@$FINAI_DEPLOY_SSH_HOST"

status="$(ssh "${opts[@]}" "$remote" "finai:status:v1")"
grep -Fxq 'FINAI_ISOLATED_SSH_STATUS=v1' <<<"$status" ||
  { echo 'STOP: not the isolated FinAI forced command gate' >&2; exit 67; }
echo 'FINAI_ISOLATED_STATUS=PASS'

if [[ "$operation" == stage ]]; then
  response="$(ssh "${opts[@]}" "$remote" "finai:stage:v1:$digest" < "$archive")"
  grep -Eq '^FINAI_ISOLATED_DEPLOY=STAGED(_ALREADY_PRESENT)?$' <<<"$response" ||
    { echo 'STOP: isolated staging not confirmed' >&2; exit 68; }
else
  response="$(ssh "${opts[@]}" "$remote" "finai:promote:v1:$digest")"
  grep -Fxq 'FINAI_ISOLATED_DEPLOY=PROMOTED' <<<"$response" ||
    { echo 'STOP: isolated production promotion not confirmed' >&2; exit 68; }
fi
grep -Fxq "release_sha256=$digest" <<<"$response" ||
  { echo 'STOP: unexpected release reported by host' >&2; exit 68; }

set +e
ssh "${opts[@]}" "$remote" 'id' >/dev/null 2>&1
denied=$?
set -e
[[ "$denied" == 64 ]] ||
  { echo 'STOP: SSH forced command protection drift' >&2; exit 68; }
echo 'FINAI_ISOLATED_DENY_CHECK=PASS'
echo "FINAI_DEPLOY_${operation^^}=PASS"
