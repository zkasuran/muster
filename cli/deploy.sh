#!/usr/bin/env bash
# Build and ship Muster to the origin. Idempotent, and safe to run while the site is live:
# the app is replaced then restarted, and Caddy falls through to the static export during
# the restart so the public URL never returns an error.
#
# The origin is deliberately a variable. This host is a stopgap and the lane carries an open
# item to move to a dedicated server before judging ends. Nothing here is host-specific.
set -euo pipefail

ORIGIN="${MUSTER_ORIGIN:-root@213.163.199.69}"
HOST="${MUSTER_HOST:-muster.zkasuran.dev}"
REMOTE_DIR="${MUSTER_REMOTE_DIR:-/opt/muster}"

cd "$(dirname "$0")/.."

echo "==> check"
npm run typecheck
echo "==> build"
npx next build

echo "==> bundle"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp -a .next/standalone/. "$STAGE/"
mkdir -p "$STAGE/.next/static"
cp -a .next/static/. "$STAGE/.next/static/"
[ -d public ] && cp -a public "$STAGE/"
echo "    $(du -sh "$STAGE" | cut -f1)"

echo "==> ship"
rsync -az --delete -e "ssh -o BatchMode=yes" "$STAGE/" "$ORIGIN:$REMOTE_DIR/"
ssh -o BatchMode=yes "$ORIGIN" "systemctl restart muster-web && sleep 3 && systemctl is-active muster-web"

echo "==> refresh the static fallback from the live app"
# Every path the submission can cite, rendered flat, so the fallback is the real site
# rather than a placeholder. Run after the app is confirmed healthy.
ssh -o BatchMode=yes "$ORIGIN" "bash -s" <<'REMOTE'
set -euo pipefail
command -v wget >/dev/null || { DEBIAN_FRONTEND=noninteractive apt-get install -y wget >/dev/null 2>&1; }
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
wget --quiet --mirror --page-requisites --adjust-extension --convert-links \
     --no-host-directories --directory-prefix="$TMP" \
     --header 'X-Static-Export: 1' http://127.0.0.1:3000/ || true
if [ -f "$TMP/index.html" ]; then
  rsync -a --delete "$TMP/" /var/www/muster-static/
  echo "    static export refreshed, $(find /var/www/muster-static -type f | wc -l) files"
else
  echo "    WARNING: crawl produced no index.html, leaving the previous export in place"
fi
REMOTE

echo "==> gate: anonymous fetch must be 200"
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 "https://$HOST/")
echo "    https://$HOST/ -> $code"
[ "$code" = "200" ] || { echo "    FAILED"; exit 1; }

echo "==> gate: certificate must outlast judging"
python3 - "$HOST" <<'PY'
import ssl, socket, sys, datetime
host = sys.argv[1]
with ssl.create_default_context().wrap_socket(
    socket.create_connection((host, 443), timeout=15), server_hostname=host) as s:
    na = datetime.datetime.strptime(s.getpeercert()['notAfter'], '%b %d %H:%M:%S %Y %Z')
end = datetime.datetime(2026, 9, 23)
print(f"    notAfter {na:%Y-%m-%d}, {(na - end).days} days past the end of judging")
sys.exit(0 if na > end else 1)
PY

echo "==> done"
