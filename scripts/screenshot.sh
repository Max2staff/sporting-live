#!/usr/bin/env bash
# Screenshot a 390px di una rotta del sito locale, con intro/girone/tema preimpostati.
# Uso: scripts/screenshot.sh OUT_DIR ROTTA [GIRONE] [TEMA]
#   LARGHEZZA=320 imposta la larghezza dell'iframe (default 390)
#   es.  scripts/screenshot.sh /tmp/shots partite serie-b scuro
#        INTRO=no scripts/screenshot.sh /tmp/shots intro        (mostra l'introduzione)
set -euo pipefail
OUT=$1; ROTTA=$2; GIRONE=${3:-tutti}; TEMA=${4:-scuro}; INTRO=${INTRO:-ok}; LARGHEZZA=${LARGHEZZA:-390}
RADICE=$(cd "$(dirname "$0")/.." && pwd)
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d); ln -s "$RADICE/site" "$TMP/site"
cat > "$TMP/apri.html" <<HTML
<!doctype html><script>localStorage.setItem('sl.intro','$INTRO');localStorage.setItem('sl.girone','$GIRONE');localStorage.setItem('sl.tema','$TEMA');location.replace('/site/#/$ROTTA')</script>
HTML
printf '<!doctype html><body style="margin:0;background:#888"><iframe src="http://localhost:8089/apri.html" style="width:%spx;height:844px;border:0"></iframe>' "$LARGHEZZA" > "$TMP/cornice.html"
OLD=$(lsof -ti tcp:8089 || true)
if [ -n "$OLD" ]; then
  if ps -o command= -p $OLD | grep -q "http.server"; then kill $OLD; sleep 0.5; else echo "porta 8089 occupata da un altro processo" >&2; exit 1; fi
fi
python3 -m http.server -d "$TMP" 8089 >/dev/null 2>&1 & PID=$!
trap 'kill $PID 2>/dev/null || true; rm -rf "$TMP"' EXIT
for i in $(seq 1 50); do curl -s -o /dev/null http://localhost:8089/apri.html && break; sleep 0.1; done
mkdir -p "$OUT"; NOME=$(echo "$ROTTA" | tr '/' '_')
"$CH" --headless=new --disable-gpu --hide-scrollbars --window-size=$((LARGHEZZA>500?LARGHEZZA+20:500)),860 --virtual-time-budget=9000 --screenshot="$OUT/${NOME}-${GIRONE}-${TEMA}.png" "http://localhost:8089/cornice.html" 2>/dev/null || true
echo "$OUT/${NOME}-${GIRONE}-${TEMA}.png"
