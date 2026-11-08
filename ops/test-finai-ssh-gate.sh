#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname -- "$0")/.."
bash -n ops/finai-ssh-gate.sh
bash -n ops/test-finai-ssh-gate.sh
bash -n ops/finai-install-audit-key.sh
bash -n ops/finai-upgrade-cpanel-gate.sh
python3 -B -m unittest discover -s tests -p 'test_finai_domain_readonly.py' -v
# Installer must reject unsupported modes without touching host SSH files.
set +e
installer_out=$(bash ops/finai-install-audit-key.sh --unexpected 2>&1)
installer_status=$?
set -e
[[ "$installer_status" == 2 ]] || { echo "FAIL: installer accepted unexpected mode"; exit 1; }
[[ "$installer_out" == Usage:* ]] || { echo "FAIL: installer usage check"; exit 1; }

assert_denied() {
  local operation=$1
  local output status
  set +e
  output=$(SSH_ORIGINAL_COMMAND="$operation" bash ops/finai-ssh-gate.sh 2>&1)
  status=$?
  set -e
  [[ "$status" == 64 ]] || { echo "FAIL: forbidden operation returned $status"; exit 1; }
  [[ "$output" == 'DENIED: unsupported FinAI operation' ]] || { echo 'FAIL: unexpected denial output'; exit 1; }
}

assert_denied ''
assert_denied 'ls /home/laskot48/public_html'
assert_denied 'finai:audit:v1; cat /home/laskot48/public_html/.env'
assert_denied 'finai:deploy:v1'
assert_denied 'bash -c id'
assert_denied 'finai:domains:v1;cat /home/laskot48/public_html/.env'
assert_denied 'finai:domains:v1 --other-domain=example.com'

# On GitHub Actions no process runs as laskot48, even allowed commands must fail closed.
if [[ "$(id -un)" != 'laskot48' ]]; then
  set +e
  output=$(SSH_ORIGINAL_COMMAND='finai:audit:v1' bash ops/finai-ssh-gate.sh 2>&1)
  status=$?
  set -e
  [[ "$status" == 65 ]] || { echo "FAIL: wrong account returned $status"; exit 1; }
  [[ "$output" == 'DENIED: unexpected operating-system account' ]] || { echo 'FAIL: unexpected operating-account output'; exit 1; }
  set +e
  domain_output=$(SSH_ORIGINAL_COMMAND='finai:domains:v1' bash ops/finai-ssh-gate.sh 2>&1)
  domain_status=$?
  set -e
  [[ "$domain_status" == 65 && "$domain_output" == 'DENIED: unexpected operating-system account' ]] || { echo 'FAIL: domain command not protected by account gate'; exit 1; }
  set +e
  upgrade_output=$(bash ops/finai-upgrade-cpanel-gate.sh --inspect 2>&1)
  upgrade_status=$?
  set -e
  [[ "$upgrade_status" == 1 && "$upgrade_output" == 'STOP: unexpected cPanel account' ]] || { echo 'FAIL: installer not protected by account gate'; exit 1; }
fi
printf 'PASS: syntax, installer mode check, seven forbidden commands and account gate\n'
