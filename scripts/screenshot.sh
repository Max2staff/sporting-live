#!/usr/bin/env bash
# Screenshot a 390px di una rotta del sito locale, con intro/girone/tema preimpostati.
# Uso: scripts/screenshot.sh OUT_DIR ROTTA [GIRONE] [TEMA]
#   es.  scripts/screenshot.sh /tmp/shots partite serie-b scuro
#        INTRO=no scripts/screenshot.sh /tmp/shots intro        (mostra l'introduzione)
set -euo pipefail
OUT=$1; ROTTA=$2; GIRONE=${3:-tutti}; TEMA=${4:-scuro}; INTRO=${INTRO:-ok}
RADICE=$(cd "$(dirname "$0")/.." && pwd)
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d); ln -s "$RADICE/site" "$TMP/site"
cat > "$TMP/apri.html" <<HTML
<!doctype html><script>localStorage.setItem('sl.intro','$INTRO');localStorage.setItem('sl.girone','$GIRONE');localStorage.setItem('sl.tema','$TEMA');location.replace('/site/#/$ROTTA')</script>
HTML
printf '<!doctype html><body style="margin:0;background:#888"><iframe src="http://localhost:8089/apri.html" style="width:390px;height:844px;border:0"></iframe>' > "$TMP/cornice.html"
python3 -m http.server -d "$TMP" 8089 >/dev/null 2>&1 & PID=$!
sleep 1
mkdir -p "$OUT"; NOME=$(echo "$ROTTA" | tr '/' '_')
"$CH" --headless=new --disable-gpu --hide-scrollbars --window-size=500,860 --virtual-time-budget=6000 --screenshot="$OUT/${NOME}-${GIRONE}-${TEMA}.png" "file://$TMP/cornice.html" 2>/dev/null || true
kill $PID 2>/dev/null || true; rm -rf "$TMP"
echo "$OUT/${NOME}-${GIRONE}-${TEMA}.png"
