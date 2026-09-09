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
# The real type gate, against tsconfig.check.json. next build's own check is disabled in
# next.config.ts because Next rewrites tsconfig.json and cannot exclude scratch scripts.
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
# The one document the app reads at request time. Rendered by /report, produced by
# tools/advantage-report.ts against the live chain, never hand edited.
if [ -f docs/research/agent-advantage-report.json ]; then
  mkdir -p "$STAGE/docs/research" && cp docs/research/agent-advantage-report.json "$STAGE/docs/research/"
fi
echo "    $(du -sh "$STAGE" | cut -f1)"

echo "==> ship"
rsync -az --delete -e "ssh -o BatchMode=yes" "$STAGE/" "$ORIGIN:$REMOTE_DIR/"
ssh -o BatchMode=yes "$ORIGIN" "systemctl restart muster-web && sleep 3 && systemctl is-active muster-web"

echo "==> refresh the static fallback from the live app, detached"
# Every path the submission can cite, rendered flat, so the fallback is the real site rather
# than a placeholder. The crawl covers every agent page and takes longer than an SSH session
# reliably lasts, and a dropped session once left an orphaned crawl and an unrefreshed export.
# So it runs under setsid on the origin and logs to /var/log/muster-static-refresh.log.
scp -q -o BatchMode=yes deploy/refresh-static.sh "$ORIGIN:/root/refresh-static.sh"
ssh -o BatchMode=yes "$ORIGIN" "chmod +x /root/refresh-static.sh; pkill -x wget >/dev/null 2>&1; setsid nohup /root/refresh-static.sh >> /var/log/muster-static-refresh.log 2>&1 < /dev/null & disown; echo '    started, tail /var/log/muster-static-refresh.log on the origin for the result'"

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
