#!/bin/bash
# Re-render the static fallback from the live app. Runs detached on the origin, because the
# crawl covers every agent page and outlives any SSH session that starts it. Caddy serves the
# result from /var/www/muster-static when the app is down, at the same paths, with a real 200.
set -uo pipefail
TMP=$(mktemp -d); trap "rm -rf $TMP" EXIT
wget --quiet --mirror --page-requisites --adjust-extension --convert-links \
     --no-host-directories --directory-prefix="$TMP" \
     --header "X-Static-Export: 1" http://127.0.0.1:3000/ || true
if [ -f "$TMP/index.html" ]; then
  rsync -a --delete "$TMP/" /var/www/muster-static/
  echo "$(date -u +%FT%TZ) static export refreshed, $(find /var/www/muster-static -type f | wc -l) files"
else
  echo "$(date -u +%FT%TZ) WARNING: crawl produced no index.html, previous export left in place"
fi
