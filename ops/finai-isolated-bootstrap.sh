#!/usr/bin/env bash
# One-time bootstrap only for the isolated FinAI cPanel account.
set -euo pipefail
umask 077
unset BASH_ENV ENV CDPATH
export PATH=/usr/bin:/bin:/usr/local/bin

finai_check_path() {
  local target="$1" expected_uid="$2" expected_mode="$3" actual uid gid mode
  if [[ ! -d "$target" || -L "$target" || "$(readlink -f -- "$target")" != "$target" ]]; then
    printf 'STOP_UNEXPECTED_FINAI_PATH=%s\n' "$target" >&2
    return 65
  fi
  actual="$(stat -c '%u:%g:%a' -- "$target")" || return 65
  IFS=: read -r uid gid mode <<<"$actual"
  if [[ "$uid" != "$expected_uid" || "$mode" != "$expected_mode" ]]; then
    printf 'STOP_FINAI_PATH_PERMISSION path=%s uid=%s gid=%s mode=%s expected_uid=%s expected_mode=%s\n' \
      "$target" "$uid" "$gid" "$mode" "$expected_uid" "$expected_mode" >&2
    return 65
  fi
}

finai_bootstrap() {
  [[ "$#" -eq 1 && "$1" == ssh-ed25519\ * ]] || { echo STOP_PUBLIC_KEY_REQUIRED >&2; return 65; }
  [[ "$(id -un)" == einteg86 && "$(id -u)" == 1256 && "$HOME" == /home/einteg86 ]] || { echo STOP_WRONG_ACCOUNT >&2; return 65; }
  [[ "$(hostname)" == lcp-86.controlpanel.si ]] || { echo STOP_WRONG_SERVER >&2; return 65; }
  [[ -e /var/.cagefs/.cagefs.token ]] || { echo STOP_CAGEFS_NOT_CONFIRMED >&2; return 65; }
  local shared_lookup
  set +e
  getent passwd laskot48 >/dev/null 2>&1
  shared_lookup=$?
  set -e
  [[ "$shared_lookup" -eq 2 ]] || { echo STOP_SHARED_ACCOUNT_VISIBLE_OR_LOOKUP_FAILED >&2; return 65; }
  finai_check_path "$HOME" 1256 711
  finai_check_path "$HOME/app.e-integrator.si" 1256 750
  finai_check_path "$HOME/api.e-integrator.si" 1256 750
  for tool in curl sha256sum python3 ssh-keygen; do
    command -v "$tool" >/dev/null || { echo STOP_MISSING_TOOL >&2; return 65; }
  done
  printf '%s\n' "$1" | ssh-keygen -lf - -E sha256 >/dev/null || { echo STOP_INVALID_PUBLIC_KEY >&2; return 65; }
  echo FINAI_TARGET_PATHS=PASS
  if command -v setfacl >/dev/null && command -v getfacl >/dev/null; then
    echo FINAI_ACL_TOOLS=AVAILABLE
  else
    echo FINAI_ACL_TOOLS=UNAVAILABLE
  fi
  local tmp base
  tmp="$(mktemp -d "$HOME/.finai-bootstrap.XXXXXXXX")"
  FINAI_BOOTSTRAP_TMP="$tmp"
  trap 'rm -rf -- "$FINAI_BOOTSTRAP_TMP"' EXIT
  mkdir "$tmp/ops"
  base='https://raw.githubusercontent.com/ddcpark-coder/finai-ledger/029ebbe20f6f6e793f09b3e99c6c9404f9c4d1da/ops'
  curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 --max-time 45 "$base/finai-isolated-ssh-gate.py" -o "$tmp/ops/finai-isolated-ssh-gate.py"
  curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 --max-time 45 "$base/finai-isolated-install-key.sh" -o "$tmp/ops/finai-isolated-install-key.sh"
  printf '%s  %s\n' '177f1df92655b284e972eb36b11d48c5b54c71714c0546f9950038f14cc066ce' "$tmp/ops/finai-isolated-ssh-gate.py" | sha256sum --check --status || { echo STOP_GATE_INTEGRITY >&2; return 65; }
  printf '%s  %s\n' '1253b66e7a71d576e3a1fcefda2ed023e383b1cb5b1d79c6e03bbe411e1b2c9c' "$tmp/ops/finai-isolated-install-key.sh" | sha256sum --check --status || { echo STOP_INSTALLER_INTEGRITY >&2; return 65; }
  printf '%s\n' "$1" | bash "$tmp/ops/finai-isolated-install-key.sh" --apply
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  finai_bootstrap "$@"
fi
