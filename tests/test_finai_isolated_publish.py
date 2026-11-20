#!/usr/bin/env python3
"""Exercise release recovery with synthetic local helpers; no network or host."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

PUBLISH = Path(__file__).resolve().parents[1] / "ops" / "finai-ci-isolated-publish.sh"
NEW = "a" * 64
OLD = "b" * 64
FOREIGN = "c" * 64
COMMIT = "d" * 40

SSH_HELPER = r"""#!/usr/bin/env bash
set -eu
op="$1"
printf '%s\n' "$*" >> "$FINAI_TEST_LOG"
active="$(cat "$FINAI_TEST_STATE")"
case "$op" in
  status)
    printf 'production_active=%s\n' "$active" ;;
  promote)
    [[ "$active" == "$3" ]] || exit 64
    printf '%s\n' "$2" > "$FINAI_TEST_STATE"
    if [[ "$FINAI_TEST_PROMOTE_FAIL_ONCE" == yes && ! -e "$FINAI_TEST_ONCE" ]]; then
      touch "$FINAI_TEST_ONCE"
      exit 1
    fi ;;
  unpublish)
    [[ "$active" == "$2" ]] || exit 64
    printf 'none\n' > "$FINAI_TEST_STATE" ;;
  *) exit 64 ;;
esac
"""

CURL_HELPER = r"""#!/usr/bin/env bash
set -eu
case "$FINAI_TEST_SMOKE" in
  fail) exit 22 ;;
  changed) printf '%s\n' "$FINAI_TEST_FOREIGN" > "$FINAI_TEST_STATE"; exit 22 ;;
esac
while [[ "$#" -gt 0 ]]; do
  if [[ "$1" == --output ]]; then
    printf '{"application":"finai-ledger","commit":"%s"}\n' "$GITHUB_SHA" > "$2"
    break
  fi
  shift
done
printf '200'
"""


class PublishTests(unittest.TestCase):
    def run_publish(self, previous, smoke="fail", automatic="false", restore="YES",
                    fail_promote=False):
        with tempfile.TemporaryDirectory(prefix="finai-publish-qa-") as directory:
            root = Path(directory)
            (root / "ops").mkdir()
            (root / "bin").mkdir()
            helper = root / "ops" / "finai-ci-isolated-ssh.sh"
            helper.write_text(SSH_HELPER)
            curl = root / "bin" / "curl"
            curl.write_text(CURL_HELPER)
            curl.chmod(0o700)
            state = root / "state"
            state.write_text(previous + "\n")
            log = root / "log"
            env = dict(os.environ, PATH=str(root / "bin") + os.pathsep + os.environ["PATH"],
                       RELEASE_SHA256=NEW, GITHUB_SHA=COMMIT, RUNNER_TEMP=str(root),
                       IS_AUTOMATIC=automatic, FIRST_PUBLISH_RESTORE_READY=restore,
                       FINAI_TEST_STATE=str(state), FINAI_TEST_LOG=str(log),
                       FINAI_TEST_ONCE=str(root / "once"), FINAI_TEST_SMOKE=smoke,
                       FINAI_TEST_FOREIGN=FOREIGN,
                       FINAI_TEST_PROMOTE_FAIL_ONCE="yes" if fail_promote else "no")
            result = subprocess.run(["bash", str(PUBLISH)], cwd=root, env=env,
                                    text=True, capture_output=True, timeout=10)
            return result, state.read_text().strip(), log.read_text().splitlines()

    def test_first_failed_smoke_returns_to_no_active_release(self):
        result, state, log = self.run_publish("none")
        self.assertEqual(result.returncode, 69, result.stderr)
        self.assertEqual(state, "none")
        self.assertIn("FINAI_ROLLBACK=PASS", result.stdout)
        self.assertIn("unpublish " + NEW, log)

    def test_failed_smoke_restores_previous_release_conditionally(self):
        result, state, log = self.run_publish(OLD)
        self.assertEqual(result.returncode, 69, result.stderr)
        self.assertEqual(state, OLD)
        self.assertIn("promote " + OLD + " " + NEW, log)

    def test_promotion_transport_failure_after_switch_is_recovered(self):
        result, state, log = self.run_publish("none", fail_promote=True)
        self.assertEqual(result.returncode, 68, result.stderr)
        self.assertEqual(state, "none")
        self.assertIn("unpublish " + NEW, log)

    def test_unexpected_release_is_not_overwritten_by_recovery(self):
        result, state, log = self.run_publish(OLD, smoke="changed")
        self.assertEqual(result.returncode, 70, result.stderr)
        self.assertEqual(state, FOREIGN)
        self.assertFalse(any(line.startswith("unpublish ") for line in log))
        self.assertNotIn("promote " + OLD + " " + NEW, log)

    def test_success_and_first_publish_manual_guard(self):
        result, state, log = self.run_publish("none", smoke="pass")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(state, NEW)
        self.assertIn("FINAI_LIVE_SMOKE=PASS", result.stdout)
        result, state, log = self.run_publish("none", smoke="pass", automatic="true")
        self.assertEqual(result.returncode, 65, result.stderr)
        self.assertEqual(state, "none")
        self.assertFalse(any(line.startswith("promote ") for line in log))


if __name__ == "__main__":
    unittest.main()
