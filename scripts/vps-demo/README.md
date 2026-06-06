# VPS demo event scheduler

Drives the DR events that move the dashboard wattage. Runs on the VPS
(`vtn.data-joule.com`), **not** on Vercel. The website is only a read-only mirror
of Redis `telemetry:latest`; if this scheduler stops, the wattage flatlines at
baseline even though the Pi/VTN/ingest are all healthy (this happened
2026-05-25 → 2026-06-03, a 9-day silent outage).

## Files

| Repo file | Deploys to | Purpose |
|---|---|---|
| `create_demo_event.sh` | `/opt/demo/create_demo_event.sh` | Every 5 min: read grid signal, create VTN event (or synthetic fallback after 30 min calm), notify Vercel. State in `/var/lib/demo-scheduler` (0700, root-owned; self-created via `install -d`) |
| `demo-events.cron` | `/etc/cron.d/demo-events` | The schedule (runs as `root`) |
| `env.example` | `/opt/demo/.env` | Secrets/config sourced by the script |
| `grid_signal.py` | `/opt/demo/grid_signal.py` | Fetches 5 grid sources (HQ, ISO-NE, CAISO, NYISO, ONS) concurrently; outputs locale-grouped `{"tier", "triggered_by_source", ...}` JSON. Stdlib only, always exits 0. Optional `EIA_API_KEY` for the US sources. |

## Deploy / re-sync

```bash
scp create_demo_event.sh grid_signal.py root@vtn.data-joule.com:/opt/demo/
scp demo-events.cron     root@vtn.data-joule.com:/etc/cron.d/demo-events
ssh root@vtn.data-joule.com 'chmod 644 /etc/cron.d/demo-events && systemctl restart cron'
```

## Verify it's alive

```bash
tail -f /var/log/demo-events.log        # a fresh line every 5 min
```
Externally, `GET https://data-joule.com/api/state` should return a non-null
`nextEventTs` that keeps advancing (the `demo:next_event_ts` Redis key has a
600 s TTL, so its absence == scheduler down — basis for the heartbeat alert).

> **Keep this in sync with the VPS.** The drift between this directory and the
> live `/opt/demo/` files is what made the 2026-06-03 outage slow to diagnose.
