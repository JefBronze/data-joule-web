#!/usr/bin/env python3
import json, sys, time, urllib.request, urllib.parse, urllib.error
from datetime import datetime, timezone
from pathlib import Path

env = {}
for line in Path('/opt/demo/.env').read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip()

INGEST_API_KEY = env['INGEST_API_KEY']
ADMIN_SECRET = env['ADMIN_SECRET']
NOTIFY_URL = env['NOTIFY_URL']
DURATION_SEC = int(env['DURATION_SEC'])
VTN_BASE = 'http://localhost:8080/openadr3/3.1.0'

tier_file = Path('/tmp/demo_last_tier')
last = int(tier_file.read_text().strip()) if tier_file.exists() else 3
tier = (last % 3) + 1  # cycles 1 → 2 → 3 → 1 → 2 → 3 …
tier_file.write_text(str(tier))

start_ts = int(time.time())
start = datetime.fromtimestamp(start_ts, tz=timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
event_name = 'demo-tier%d-%d' % (tier, start_ts)

token_data = urllib.parse.urlencode({
    'grant_type': 'client_credentials',
    'client_id': 'admin_client',
    'client_secret': ADMIN_SECRET,
}).encode()
req = urllib.request.Request('%s/auth/token' % VTN_BASE, data=token_data,
    headers={'Content-Type': 'application/x-www-form-urlencoded'})
with urllib.request.urlopen(req) as r:
    token = json.loads(r.read())['access_token']

event = {
    'programID': '1',
    'eventName': event_name,
    'intervals': [{'id': 0, 'intervalPeriod': {
        'start': start,
        'duration': 'PT%dS' % DURATION_SEC,
        'randomizeStart': 'PT0S',
    }, 'payloads': [{'type': 'SIMPLE', 'values': [tier]}]}]
}
req = urllib.request.Request('%s/events' % VTN_BASE, data=json.dumps(event).encode(),
    headers={'Authorization': 'Bearer %s' % token, 'Content-Type': 'application/json'},
    method='POST')
try:
    with urllib.request.urlopen(req) as r:
        result = json.loads(r.read())
        print('[event created] id=%s tier=%d' % (result.get('id'), tier))
except urllib.error.HTTPError as e:
    print('[event error] %d: %s' % (e.code, e.read().decode()), file=sys.stderr)
    sys.exit(1)

notify = json.dumps({'tier': tier, 'duration_seconds': DURATION_SEC,
    'event_name': event_name, 'start_ts': start_ts}).encode()
req = urllib.request.Request(NOTIFY_URL, data=notify,
    headers={'Authorization': 'Bearer %s' % INGEST_API_KEY,
             'Content-Type': 'application/json'}, method='POST')
try:
    with urllib.request.urlopen(req) as r:
        print('[notified] %s' % r.read().decode())
except urllib.error.HTTPError as e:
    print('[notify error] %d: %s' % (e.code, e.read().decode()), file=sys.stderr)

print('[%s] Created %s (tier %d, %ds)' % (
    datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
    event_name, tier, DURATION_SEC))
