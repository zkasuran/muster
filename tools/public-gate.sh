#!/usr/bin/env bash
# Flip the repo public and verify as a stranger. Every URL the submission cites must answer to an
# anonymous fetch: the paid endpoints answer 402 by design, everything else must be 200.
set -uo pipefail
REPO=zkasuran/muster
BASE=https://muster.zkasuran.dev
if [ "${1:-}" = "--flip" ]; then
  gh api -X PATCH "repos/$REPO" -F private=false >/dev/null && echo "  flipped: $(gh api repos/$REPO --jq '"private=\(.private)"')"
fi
fail=0
check() { local url=$1 want=$2; local code; code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 -A 'Mozilla/5.0 (anonymous judge)' "$url"); if [ "$code" = "$want" ]; then printf "  ok   %s %s\n" "$code" "$url"; else printf "  FAIL %s (want %s) %s\n" "$code" "$want" "$url"; fail=$((fail+1)); fi; }
echo "=== repository, anonymously ==="
check "https://github.com/$REPO" 200
check "https://raw.githubusercontent.com/$REPO/main/README.md" 200
check "https://raw.githubusercontent.com/$REPO/main/LICENSE" 200
check "https://raw.githubusercontent.com/$REPO/main/docs/decisions/18-the-intersection-is-one-agent.md" 200
check "https://raw.githubusercontent.com/$REPO/main/docs/AGENT-ADVANTAGE-REPORT.md" 200
echo "=== every route ==="
for p in / /shelf/rebalancing /shelf/grid-trading /shelf/yield /shelf/health-factor /agent/900000001 /agent/6428 /agent/1 "/compare?ids=900000001,322885" "/search?q=yield" /status /report /hire/rebalancing /hire/grid-trading /hire/yield /hire/health-factor; do check "$BASE$p" 200; done
for s in rebalancing grid-trading yield health-factor; do check "$BASE/api/agent/$s" 402; check "$BASE/api/agent/$s?preview=1" 200; done
echo "=== every https URL in README.md ==="
grep -oE 'https://[^ )`>"]+' README.md | sort -u | while read -r u; do
  case "$u" in *api/agent/*) want=402;; *) want=200;; esac
  check "$u" "$want"
done
echo "=== private paths must not be reachable ==="
for p in .hq/MEMORY.md submit/SUBMIT-registration.html CONTENT-muster.html; do check "https://raw.githubusercontent.com/$REPO/main/$p" 404; done
echo; [ $fail -eq 0 ] && echo "PUBLIC GATE PASSES" || echo "$fail FAILURE(S)"
exit $fail
