#!/usr/bin/env bash
# Called only by the gated FinAI main-branch release workflow.
set -euo pipefail

[[ "${RELEASE_SHA256:-}" =~ ^[0-9a-f]{64}$ ]] ||
  { echo 'STOP: invalid new release digest' >&2; exit 65; }
[[ "${GITHUB_SHA:-}" =~ ^[0-9a-f]{40}$ && -d "${RUNNER_TEMP:-}" ]] ||
  { echo 'STOP: missing commit or runner directory' >&2; exit 65; }
attempts="${FINAI_PUBLISH_MAX_ATTEMPTS:-20}"
[[ "$attempts" =~ ^[0-9]{1,2}$ ]] && (( attempts >= 1 && attempts <= 40 )) ||
  { echo 'STOP: invalid web propagation limit' >&2; exit 65; }

fetch_marker() {
  curl --silent --show-error --connect-timeout 5 --max-time 10 \
    --header 'Cache-Control: no-cache' --header 'Accept-Encoding: identity' \
    --proto '=https' --output "$1" --write-out '%{http_code}' \
    'https://app.e-integrator.si/finai-build.json'
}

valid_marker() {
  python3 - "$1" "${2:-}" <<'PY'
import json, re, sys
from pathlib import Path
try:
    value = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    assert set(value) == {'application', 'commit'}
    assert value['application'] == 'finai-ledger'
    assert re.fullmatch(r'[0-9a-f]{40}', value['commit'])
    assert not sys.argv[2] or value['commit'] == sys.argv[2]
except (OSError, ValueError, TypeError, AssertionError):
    raise SystemExit(1)
PY
}

wait_for_marker() {
  local expected="$1" previous_file="$2" out="$RUNNER_TEMP/finai-probe-build.json" code i
  for ((i=1; i<=attempts; i++)); do
    if code="$(fetch_marker "$out")"; then
      if [[ "$expected" == none && ( "$code" == 403 || "$code" == 404 ) ]]; then
        return 0
      elif [[ "$code" == 200 ]]; then
        if [[ "$expected" == previous ]] && cmp -s "$previous_file" "$out"; then
          return 0
        elif [[ "$expected" == "$GITHUB_SHA" ]] && valid_marker "$out" "$GITHUB_SHA"; then
          return 0
        fi
      fi
    fi
    if (( i < attempts )); then sleep 0.5; fi
  done
  return 1
}

status() {
  bash ops/finai-ci-isolated-ssh.sh status | sed -n 's/^production_active=//p'
}
previous="$(status)"
[[ "$previous" == none || "$previous" =~ ^[0-9a-f]{64}$ ]] ||
  { echo 'STOP: invalid previous FinAI release' >&2; exit 65; }
if [[ "$previous" == none &&
      ( "${IS_AUTOMATIC:-}" == true || "${FIRST_PUBLISH_RESTORE_READY:-}" != YES ) ]]; then
  echo 'STOP: initial app publish requires verified dedicated app restore point and manual release' >&2
  exit 65
fi
previous_marker="$RUNNER_TEMP/finai-previous-build.json"
if [[ "$previous" != none ]]; then
  if ! previous_code="$(fetch_marker "$previous_marker")" ||
     [[ "$previous_code" != 200 ]] || ! valid_marker "$previous_marker"; then
    echo 'STOP: existing live FinAI build cannot be confirmed' >&2
    exit 67
  fi
fi

# A transport error can occur after the remote switch. Observe the actual
# pointer before recovering, and never overwrite an unexpected third release.
rollback() {
  local active restored
  echo 'FINAI_ROLLBACK=ATTEMPT' >&2
  if ! active="$(status)"; then
    return 1
  fi
  if [[ "$active" == "$previous" ]]; then
    : # No switch happened, or a concurrent recovery already completed.
  elif [[ "$active" != "$RELEASE_SHA256" ]]; then
    echo 'FINAI_ROLLBACK=UNEXPECTED_ACTIVE_RELEASE' >&2
    return 1
  elif [[ "$previous" == none ]]; then
    bash ops/finai-ci-isolated-ssh.sh unpublish "$RELEASE_SHA256" || return 1
  else
    bash ops/finai-ci-isolated-ssh.sh promote "$previous" "$RELEASE_SHA256" || return 1
  fi
  if ! restored="$(status)" || [[ "$restored" != "$previous" ]]; then
    return 1
  fi
  if [[ "$previous" == none ]]; then
    wait_for_marker none "$previous_marker" || return 1
  else
    wait_for_marker previous "$previous_marker" || return 1
  fi
  echo 'FINAI_ROLLBACK=PASS'
}

fail_with_rollback() {
  local code="$1"
  if ! rollback; then
    echo 'FINAI_ROLLBACK=FAILED_MANUAL_RECOVERY_REQUIRED' >&2
    exit 70
  fi
  exit "$code"
}

if ! bash ops/finai-ci-isolated-ssh.sh promote "$RELEASE_SHA256" "$previous"; then
  echo 'FINAI_PROMOTION=FAIL_OR_UNKNOWN' >&2
  fail_with_rollback 68
fi

# The server can briefly serve the previous symlink target. Wait for the exact
# new build, and verify the previous HTTP state as well if rollback is needed.
if ! wait_for_marker "$GITHUB_SHA" "$previous_marker"; then
  echo 'FINAI_LIVE_SMOKE=FAIL' >&2
  fail_with_rollback 69
fi
echo 'FINAI_LIVE_SMOKE=PASS'
echo 'FINAI_HIPERM_PUBLISH=PASS'
