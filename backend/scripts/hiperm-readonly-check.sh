#!/usr/bin/env bash
# FinAI BACKEND-03 — read-only cPanel audit. Never reads secrets or changes files.
set -u
label() { printf '\n## %s\n' "$1"; }
fact() { printf '%-29s %s\n' "$1:" "$2"; }
has() { command -v "$1" >/dev/null 2>&1; }
version_first() {
  if has "$1"; then
    local output
    output=$("$1" --version 2>/dev/null | head -n 1 || true)
    if [ -z "$output" ]; then output="Found; version not available"; fi
    fact "$1" "$output"
  else
    fact "$1" "NOT FOUND in PATH"
  fi
}

printf 'FinAI Hiper M read-only environment audit\n'
printf 'No writes, network requests, DB connections, or credentials read.\n'
printf 'Date UTC: '
date -u '+%Y-%m-%d %H:%M:%S' 2>/dev/null || printf 'unavailable\n'
fact 'Operating system' "$(uname -s 2>/dev/null || printf unknown)"
fact 'Architecture' "$(uname -m 2>/dev/null || printf unknown)"

label 'PHP CLI (may differ from per-domain PHP-FPM)'
if has php; then
  php -r '
  printf("PHP CLI: %s\n", PHP_VERSION);
  printf("SAPI: %s\n", PHP_SAPI);
  printf("PHP binary: %s\n", PHP_BINARY);
  printf("memory_limit: %s\n", ini_get("memory_limit"));
  printf("max_execution_time: %s\n", ini_get("max_execution_time"));
  printf("upload_max_filesize: %s\n", ini_get("upload_max_filesize"));
  printf("post_max_size: %s\n", ini_get("post_max_size"));
  printf("PDO drivers: %s\n", implode(",", PDO::getAvailableDrivers()));
  foreach (["pdo_mysql","mbstring","curl","intl","dom","xml","zip","openssl","fileinfo"] as $ext) {
      printf("%-14s %s\n", $ext, extension_loaded($ext) ? "ENABLED" : "NOT AVAILABLE");
  }
  ' 2>&1 || printf 'PHP CLI details unavailable\n'
else
  fact 'PHP CLI' 'NOT FOUND in PATH'
fi

label 'Available PHP 8.4 binaries (no changes)'
for binary in /opt/cpanel/ea-php84/root/usr/bin/php /opt/alt/php84/usr/bin/php /usr/local/bin/php84; do
  if [ -x "$binary" ]; then
    "$binary" -r 'printf("PHP binary available: %s (%s)\n", PHP_BINARY, PHP_VERSION);' 2>/dev/null || true
  fi
done

label 'Tooling'
if has composer; then
  composer --version 2>/dev/null | head -n 1 || printf 'Composer present, version unavailable\n'
else
  fact 'Composer' 'NOT FOUND in PATH (may be installed elsewhere)'
fi
version_first git
version_first node
version_first npm
version_first openssl
version_first mysql
version_first mariadb
if has crontab; then
  fact 'Cron command' 'Present (jobs not inspected)'
else
  fact 'Cron command' 'Not found in PATH; check cPanel Cron Jobs'
fi

label 'Resource limits (read-only)'
fact 'Open files limit' "$(ulimit -n 2>/dev/null || printf unknown)"
if has df; then
  df -Pk . 2>/dev/null | awk 'NR==2 {printf "Current filesystem free space: %.1f GiB\n", $4 / 1024 / 1024}'
fi

label 'Important limitations'
printf '%s\n' \
  'MySQL/MariaDB command reports CLIENT version, NOT server version.' \
  'Verify server version in cPanel/phpMyAdmin without changing data.' \
  'Terminal execution does not prove external SSH login is enabled.' \
  'Verify PHP for the future FinAI domain in MultiPHP Manager/Select PHP Version.' \
  'Verify FinAI domain, SSL, document root, backup/restore and DB separately.' \
  'Never share passwords, .env, API keys, session cookies, or 2FA codes.' \
  'END — no migration or deployment performed.'
