#!/usr/bin/env bash
# FinAI / e-integrator.si: exact-target single-file landing deployment.
# No SSH gate changes, DNS, databases, app configuration, .htaccess or Laškoteka files.
# --inspect: strictly read-only. --apply: write only e-integrator.si/index.html if absent.
set -euo pipefail
umask 077
export PATH=/usr/bin:/bin:/usr/local/bin
unset BASH_ENV ENV CDPATH

mode="${1:---inspect}"
if [[ $# -gt 1 || ( "$mode" != '--inspect' && "$mode" != '--apply' ) ]]; then
  printf 'Usage: %s [--inspect|--apply]\n' "${0##*/}" >&2
  exit 2
fi

readonly owner='laskot48'
readonly site='/home/laskot48/e-integrator.si'
readonly finai_shared='/home/laskot48/apps/finai-ledger/shared'
readonly source_root="$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
readonly source_file="$source_root/website/landing/index.html"

stop() { printf 'STOP: %s\n' "$1" >&2; exit 1; }
[[ "$(id -un)" == "$owner" ]] || stop 'Unexpected hosting user'
[[ -d "$site" && ! -L "$site" ]] || stop 'Expected separate domain root is missing or symlinked'
[[ "$(readlink -f -- "$site")" == "$site" ]] || stop 'Document root resolved unexpectedly'
[[ "$(stat -c '%U' -- "$site")" == "$owner" ]] || stop 'Document root owner mismatch'
[[ -d "$finai_shared" && ! -L "$finai_shared" ]] || stop 'FinAI private shared directory invalid'
[[ -f "$source_file" && ! -L "$source_file" ]] || stop 'Reviewed HTML source missing or symlinked'
[[ "$(stat -c '%s' -- "$source_file")" -gt 2500 ]] || stop 'HTML source unexpectedly short'
grep -Fq '<title>e-integrator | Poslovanje povezano v celoto</title>' "$source_file" || stop 'Unexpected HTML title'
grep -Fq '<meta name="robots" content="noindex,nofollow,noarchive">' "$source_file" || stop 'Prelaunch noindex guard missing'
for name in index.php index.htm index.shtml default.html default.php; do
  [[ ! -e "$site/$name" && ! -L "$site/$name" ]] || stop "Existing $name; refusing to alter existing application"
done
[[ ! -L "$site/index.html" ]] || stop 'Existing index.html is symbolic link'

source_sha="$(sha256sum -- "$source_file" | cut -d' ' -f1)"
if [[ -e "$site/index.html" ]]; then
  existing_sha="$(sha256sum -- "$site/index.html" | cut -d' ' -f1)"
  [[ "$existing_sha" == "$source_sha" ]] || stop 'Existing index.html differs; manual review required before overwrite'
  already='yes'
else
  already='no'
fi

printf 'FINAI_LANDING_PREFLIGHT=PASS\nmode=%s\ndomain=e-integrator.si\n' "$mode"
printf 'target=%s\nexisting_identical=%s\n' "$site/index.html" "$already"
[[ "$mode" == '--inspect' ]] && { echo 'writes=no'; exit 0; }
if [[ "$already" == 'yes' ]]; then
  printf 'FINAI_LANDING_DEPLOY=ALREADY_INSTALLED\nsha256=%s\n' "$source_sha"
  exit 0
fi
[[ -w "$site" ]] || stop 'Document root is not writable'

# Lock lives inside private FinAI storage, never in public HTML.
lock_dir="$finai_shared/site-landing"
[[ ! -L "$lock_dir" ]] || stop 'FinAI site lock directory is symbolic link'
install -d -m 700 -- "$lock_dir"
exec 9> "$lock_dir/deploy.lock"
flock -x 9 || stop 'Unable to acquire deploy lock'
[[ ! -e "$site/index.html" && ! -L "$site/index.html" ]] || stop 'Index appeared after preflight; no overwrite'
tmpfile="$(mktemp "$site/.finai-index.XXXXXXXX")"
trap 'if [[ -n "$tmpfile" ]]; then rm -f -- "$tmpfile"; fi' EXIT
install -m 644 -- "$source_file" "$tmpfile"
[[ "$(sha256sum -- "$tmpfile" | cut -d' ' -f1)" == "$source_sha" ]] || stop 'Copy checksum mismatch'
mv -n -- "$tmpfile" "$site/index.html"
tmpfile=''
[[ "$(sha256sum -- "$site/index.html" | cut -d' ' -f1)" == "$source_sha" ]] || stop 'Installed file checksum mismatch'
chmod 644 -- "$site/index.html"
printf 'FINAI_LANDING_DEPLOY=PASS\ntarget=%s\nsha256=%s\n' "$site/index.html" "$source_sha"
echo 'Verify HTTPS from a separate browser. No other project files were touched.'
