#!/bin/bash
# VPS demo event scheduler
# Deploy to: /opt/demo/create_demo_event.sh
# Run as cron: */20 * * * * root /opt/demo/create_demo_event.sh >> /var/log/demo-events.log 2>&1
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/.env"

# Alternate between tier 2 (powersave governor) and tier 3 (SIGSTOP inference)
LAST=$(cat /tmp/demo_last_tier 2>/dev/null || echo 3)
TIER=$(( LAST == 2 ? 3 : 2 ))
echo "$TIER" > /tmp/demo_last_tier

START=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
START_TS=$(date +%s)
EVENT_NAME="demo-tier${TIER}-${START_TS}"

# Fetch admin token from VTN container (hits localhost, no TLS overhead)
# Adjust env var name if needed: docker exec openadr3-vtn env | grep SECRET
ADMIN_SECRET=$(docker exec openadr3-vtn printenv VTN_ADMIN_SECRET)
TOKEN=$(curl -sf -X POST http://localhost:8080/openadr3/3.1.0/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=admin_client&client_secret=${ADMIN_SECRET}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Create the VTN event
curl -sf -X POST http://localhost:8080/openadr3/3.1.0/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"programID\":\"1\",\"eventName\":\"${EVENT_NAME}\",\"intervals\":[{\"id\":0,\"intervalPeriod\":{\"start\":\"${START}\",\"duration\":\"PT${DURATION_SEC}S\",\"randomizeStart\":\"PT0S\"},\"payloads\":[{\"type\":\"SIMPLE\",\"values\":[${TIER}]}]}]}"

# Notify Vercel so the demo page can show the countdown
curl -sf -X POST "$NOTIFY_URL" \
  -H "Authorization: Bearer $INGEST_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"tier\":${TIER},\"duration_seconds\":${DURATION_SEC},\"event_name\":\"${EVENT_NAME}\",\"start_ts\":${START_TS}}"

echo "[$(date -u)] Created ${EVENT_NAME} (tier ${TIER}, ${DURATION_SEC}s)"
