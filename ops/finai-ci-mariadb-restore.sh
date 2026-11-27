#!/usr/bin/env bash
# Disposable GitHub Actions MariaDB backup/restore exercise; never a hosting tool.
set -euo pipefail

[[ "${GITHUB_ACTIONS:-}" == true && "${CI:-}" == true && "${APP_ENV:-}" == testing ]] || exit 65
[[ "${DB_HOST:-}" == 127.0.0.1 && "${DB_PORT:-}" == 3306 ]] || exit 65
[[ "${DB_DATABASE:-}" == finai_ci_disposable && "${DB_USERNAME:-}" == finai_ci_disposable ]] || exit 65
[[ "${FINAI_CI_MARIADB_CONTAINER:-}" =~ ^[0-9a-f]{64}$ ]] || exit 65
[[ -n "${RUNNER_TEMP:-}" && -d "$RUNNER_TEMP" && ! -L "$RUNNER_TEMP" ]] || exit 65

container_id="$FINAI_CI_MARIADB_CONTAINER"
[[ "$(docker inspect --format '{{.Config.Image}}' "$container_id")" == mariadb:10.11 ]] || exit 65
service_environment="$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$container_id")"
grep -Fxq 'MARIADB_DATABASE=finai_ci_disposable' <<<"$service_environment" || exit 65
unset service_environment

# All identities, contents, passwords, DB names and privileges in this script
# belong solely to the disposable service container created by this CI job.
php -r '
$db = new PDO("mysql:host=127.0.0.1;port=3306;dbname=finai_ci_disposable;charset=utf8mb4",
    "finai_ci_disposable", "synthetic-ci-only", [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$db->exec("INSERT INTO companies (id,name,country_code,active) VALUES
    (900001, '\''SYNTHETIC-RESTORE-A'\'', '\''SI'\'', 1),
    (900002, '\''SYNTHETIC-RESTORE-B'\'', '\''SI'\'', 1)");
$db->exec("INSERT INTO users (id,name,email,password,active) VALUES
    (900001, '\''SYNTHETIC-RESTORE-USER'\'', '\''restore@example.test'\'', '\''synthetic-only'\'', 1)");
$db->exec("INSERT INTO roles (id,`key`,name,`system`) VALUES
    (900001, '\''synthetic-restore'\'', '\''SYNTHETIC-RESTORE-ROLE'\'', 1)");
$db->exec("INSERT INTO company_user (id,company_id,user_id,role_id,status) VALUES
    (900001, 900001, 900001, 900001, '\''active'\'')");
'

scratch_dir="$(mktemp -d "$RUNNER_TEMP/finai-ci-restore-XXXXXXXX")"
dump_file="$scratch_dir/finai-ci-synthetic.sql"
docker exec "$container_id" mariadb-dump --host=127.0.0.1 --protocol=tcp \
  --user=finai_ci_disposable --password=synthetic-ci-only --single-transaction \
  --no-tablespaces --skip-add-drop-table --skip-add-locks --skip-comments --skip-dump-date \
  finai_ci_disposable > "$dump_file"
[[ -s "$dump_file" ]] || exit 65
sha256sum "$dump_file" > "$scratch_dir/finai-ci-synthetic.sha256"
sha256sum --check --status "$scratch_dir/finai-ci-synthetic.sha256" || exit 65

sql() {
  docker exec "$container_id" mariadb --user=root --password=synthetic-root-ci-only \
    --batch --skip-column-names --execute="$1"
}

# Change only the CI source after the snapshot, then restore to a new CI DB.
sql "INSERT INTO finai_ci_disposable.companies (id,name,country_code,active) VALUES (900003,'SYNTHETIC-AFTER-SNAPSHOT','SI',1)"
sql 'CREATE DATABASE finai_ci_restore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
docker exec -i "$container_id" mariadb --user=root --password=synthetic-root-ci-only \
  finai_ci_restore < "$dump_file"

source_migrations="$(sql 'SELECT COUNT(*) FROM finai_ci_disposable.migrations')"
restored_migrations="$(sql 'SELECT COUNT(*) FROM finai_ci_restore.migrations')"
[[ "$source_migrations" =~ ^[0-9]+$ && "$source_migrations" -ge 25 && "$restored_migrations" == "$source_migrations" ]] || exit 65
[[ "$(sql 'SELECT COUNT(*) FROM finai_ci_restore.companies WHERE id IN (900001,900002)')" == 2 ]] || exit 65
[[ "$(sql 'SELECT COUNT(*) FROM finai_ci_restore.companies WHERE id=900003')" == 0 ]] || exit 65
[[ "$(sql 'SELECT COUNT(*) FROM finai_ci_disposable.companies WHERE id=900003')" == 1 ]] || exit 65
[[ "$(sql "SELECT COUNT(*) FROM finai_ci_restore.company_user cu JOIN finai_ci_restore.companies c ON c.id=cu.company_id JOIN finai_ci_restore.users u ON u.id=cu.user_id JOIN finai_ci_restore.roles r ON r.id=cu.role_id WHERE cu.id=900001 AND c.name='SYNTHETIC-RESTORE-A' AND u.email='restore@example.test' AND r.\`key\`='synthetic-restore'")" == 1 ]] || exit 65

# Verify that restored foreign keys reject a missing company, not just that
# the import returned success. Capture the synthetic error without printing it.
if sql "INSERT INTO finai_ci_restore.company_user (company_id,user_id,role_id,status) VALUES (999999999,900001,900001,'active')" \
    >/dev/null 2>"$scratch_dir/expected-fk-error.txt"; then
  exit 65
fi
grep -Eq 'ERROR 1452' "$scratch_dir/expected-fk-error.txt" || exit 65
echo 'FINAI_CI_SYNTHETIC_MARIADB_SNAPSHOT_RESTORE=PASS'
