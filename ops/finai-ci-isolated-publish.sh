#!/usr/bin/env bash
# Called only by the gated FinAI main-branch release workflow.
set -euo pipefail

[[ "${RELEASE_SHA256:-}" =~ ^[0-9a-f]{64}$ ]] ||
  { echo 'STOP: invalid new release digest' >&2; exit 65; }
[[ "${GITHUB_SHA:-}" =~ ^[0-9a-f]{40}$ && -d "${RUNNER_TEMP:-}" ]] ||
  { echo 'STOP: missing commit or runner directory' >&2; exit 65; }

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

# Smoke only the dedicated app endpoint and require this exact built commit.
smoke_file="$RUNNER_TEMP/finai-live-build.json"
if ! (http_code="$(curl --fail --silent --show-error --max-time 25 \
      --proto '=https' --output "$smoke_file" --write-out '%{http_code}' \
      'https://app.e-integrator.si/finai-build.json')" &&
      [[ "$http_code" == 200 ]] &&
      python3 - "$smoke_file" "$GITHUB_SHA" <<'PY'
import json, sys
from pathlib import Path
try:
    payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    assert payload == {"application": "finai-ledger", "commit": sys.argv[2]}
except (ValueError, OSError, AssertionError):
    raise SystemExit(1)
PY
); then
  echo 'FINAI_LIVE_SMOKE=FAIL' >&2
  fail_with_rollback 69
fi
echo 'FINAI_LIVE_SMOKE=PASS'
echo 'FINAI_HIPERM_PUBLISH=PASS'
