#!/bin/bash
# VPS demo event scheduler — LIVE COPY of /opt/demo/create_demo_event.sh on
# vtn.data-joule.com. Keep this file in sync with the VPS; the dashboard wattage
# only moves when this script fires DR events. Install schedule via demo-events.cron.
#
# Depends on: /opt/demo/.env, /opt/demo/grid_signal.py
# State files live in a root-owned 0700 dir (NOT world-writable /tmp):
#   /var/lib/demo-scheduler/{grid_signal.json,grid_zero_count,demo_last_tier}
set -euo pipefail
umask 077
source /opt/demo/.env

: "${ADMIN_SECRET:?ADMIN_SECRET must be set in /opt/demo/.env}"
: "${INGEST_API_KEY:?INGEST_API_KEY must be set in /opt/demo/.env}"
: "${NOTIFY_URL:?NOTIFY_URL must be set in /opt/demo/.env}"

# ── 0. State dir ──────────────────────────────────────────────────────────────
# cron runs this as root, so predictable /tmp paths were a symlink-attack vector
# (a local user could pre-create/symlink /tmp/grid_signal.json etc. and redirect
# root's writes to an arbitrary file). /var/lib is root-only, so no untrusted user
# can plant a symlink here. `install -d` is idempotent and re-asserts mode 0700
# every run.
STATE_DIR=/var/lib/demo-scheduler
install -d -m 700 "$STATE_DIR"
GRID_SIGNAL_FILE="$STATE_DIR/grid_signal.json"
ZERO_COUNT_FILE="$STATE_DIR/grid_zero_count"
LAST_TIER_FILE="$STATE_DIR/demo_last_tier"

# ── 1. Fetch real grid signal ─────────────────────────────────────────────────
export EIA_API_KEY="${EIA_API_KEY:-}"
python3 /opt/demo/grid_signal.py > "$GRID_SIGNAL_FILE" 2>>/var/log/demo-events.log
TIER=$(python3 -c "import json; print(json.load(open('$GRID_SIGNAL_FILE'))['tier'])" 2>/dev/null || echo 0)

# ── 2. Synthetic fallback logic ───────────────────────────────────────────────
# Fire a synthetic demo event after this many consecutive all-calm cycles (cron
# runs every 5 min). Lower = livelier demo: 2 → one calm display cycle then an
# event (~every 10 min), so visitors reliably see the Pi actually curtail.
# Raise it for a quieter, more "realistic" demo.
SYNTH_THRESHOLD=2
ZERO_COUNT=$(cat "$ZERO_COUNT_FILE" 2>/dev/null || echo 0)

if [ "$TIER" -eq 0 ]; then
  ZERO_COUNT=$(( ZERO_COUNT + 1 ))
  echo "$ZERO_COUNT" > "$ZERO_COUNT_FILE"

  if [ "$ZERO_COUNT" -lt "$SYNTH_THRESHOLD" ]; then
    # Grids calm — update grid signal display only, no VTN event
    START_TS=$(date +%s)
    curl -sf -X POST "$NOTIFY_URL" \
      -H "Authorization: Bearer $INGEST_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"tier\":0,\"start_ts\":${START_TS},\"grid_signal\":$(cat "$GRID_SIGNAL_FILE")}" || true
    echo "[$(date -u)] Grid calm (${ZERO_COUNT}/$((SYNTH_THRESHOLD-1))) — signal updated, no event"
    exit 0
  fi

  # 30 min of tier-0 across all grids → synthetic fallback
  LAST_SYN=$(cat "$LAST_TIER_FILE" 2>/dev/null || echo 3)
  TIER=$(( LAST_SYN == 2 ? 3 : 2 ))
  echo "$TIER" > "$LAST_TIER_FILE"
  GRID_SIGNAL=$(python3 -c "
import json
d = json.load(open('$GRID_SIGNAL_FILE'))
d['is_synthetic'] = True
d['tier'] = $TIER
d['triggered_by_locale'] = None
d['triggered_by_source'] = 'synthetic'
print(json.dumps(d))
")
  echo 0 > "$ZERO_COUNT_FILE"
  echo "[$(date -u)] Synthetic fallback activated (tier ${TIER})"
else
  echo 0 > "$ZERO_COUNT_FILE"
  GRID_SIGNAL=$(cat "$GRID_SIGNAL_FILE")
  TRIGGERED_BY=$(python3 -c "
import json
d = json.load(open('$GRID_SIGNAL_FILE'))
print(d.get('triggered_by_source') or 'unknown')
" 2>/dev/null || echo unknown)
  echo "[$(date -u)] Real grid signal: tier ${TIER} triggered by ${TRIGGERED_BY}"
fi

# ── 3. Duration by tier ───────────────────────────────────────────────────────
case "$TIER" in
  1) DURATION_SEC=240 ;;
  3) DURATION_SEC=300 ;;
  *) DURATION_SEC=180 ;;
esac

# ── 4. VTN token ─────────────────────────────────────────────────────────────
START=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
START_TS=$(date +%s)
EVENT_NAME="grid-tier${TIER}-${START_TS}"

TOKEN=$(curl -sf -X POST http://localhost:8080/openadr3/3.1.0/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=admin_client&client_secret=${ADMIN_SECRET}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# ── 5. Create VTN event ───────────────────────────────────────────────────────
curl -sf -X POST http://localhost:8080/openadr3/3.1.0/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"programID\":\"1\",\"eventName\":\"${EVENT_NAME}\",\"intervals\":[{\"id\":0,\"intervalPeriod\":{\"start\":\"${START}\",\"duration\":\"PT${DURATION_SEC}S\",\"randomizeStart\":\"PT0S\"},\"payloads\":[{\"type\":\"SIMPLE\",\"values\":[${TIER}]}]}]}"

# ── 6. Notify Vercel (event + grid signal) ────────────────────────────────────
GRID_SIGNAL_ESCAPED=$(echo "$GRID_SIGNAL" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)))")

curl -sf -X POST "$NOTIFY_URL" \
  -H "Authorization: Bearer $INGEST_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"tier\":${TIER},\"duration_seconds\":${DURATION_SEC},\"event_name\":\"${EVENT_NAME}\",\"start_ts\":${START_TS},\"grid_signal\":${GRID_SIGNAL_ESCAPED}}"

echo "[$(date -u)] Created ${EVENT_NAME} (tier ${TIER}, ${DURATION_SEC}s)"
