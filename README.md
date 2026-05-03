# data-joule-web

The public website and live telemetry dashboard for [data-joule.com](https://data-joule.com) — a grid-interactive AI compute demo built on OpenADR 3.0.

[![Live](https://img.shields.io/badge/Live-data--joule.com-orange?style=flat-square)](https://data-joule.com)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)

---

## What It Is

This Next.js app serves two things:

1. **Marketing site (`/`)** — explains the FlexCompute Edge project: the problem (AI loads and grid constraints), the mechanism (OpenADR 3.0 signal chain), the response ladder (4 curtailment tiers), and the live system status.

2. **Live dashboard (`/demo`)** — polls real telemetry from a Raspberry Pi 5 in Montréal every 5 seconds. Shows current wattage, DR tier, LLM inference status, and a 30-minute wattage sparkline.

The dashboard data is real. The wattage you see is measured by a Zigbee smart plug on the Pi's USB-C power feed.

---

## Architecture

```
pi-compute (telemetry_pusher.py)
  └── HTTPS POST every 5s → /api/ingest (Bearer auth)
        └── Upstash Redis
              ├── telemetry:latest     (current state)
              └── telemetry:history    (rolling 360 entries = 30 min)
                    └── GET /api/state (public, no-cache)
                          └── Browser polls every 5s → renders dashboard
```

The Pi is egress-only — no public IP, no port forwarding. All data flows outbound from the Pi to Vercel; the browser never talks to the Pi directly.

---

## Local Development

### Prerequisites

- Node.js 20+
- An Upstash Redis database (free tier at [upstash.com](https://upstash.com))
- An `INGEST_API_KEY` value (any random string for local dev)

### Setup

```bash
git clone https://github.com/JefBronze/data-joule-web
cd data-joule-web
npm install
cp .env.local.example .env.local   # fill in Upstash credentials
npm run dev
# → http://localhost:3000
```

### Environment Variables

| Variable | Source | Purpose |
|----------|--------|---------|
| `KV_REST_API_URL` | Upstash Redis dashboard → REST API | Redis connection URL |
| `KV_REST_API_TOKEN` | Upstash Redis dashboard → REST API | Redis auth token |
| `INGEST_API_KEY` | Self-generated (`openssl rand -hex 32`) | Bearer token pi-compute sends to `/api/ingest` |

All three are required for live telemetry. The static sections of the site render without them.

In **Vercel production**, set these under Settings → Environment Variables (Production + Preview only — the live `INGEST_API_KEY` must match `/home/jeferson/flexcompute/.env` on pi-compute).

---

## API Routes

### `POST /api/ingest`

Receives telemetry from pi-compute. Requires `Authorization: Bearer <INGEST_API_KEY>`.

**Body:**
```json
{ "dr_tier": 0, "wattage_w": 3.3, "llm_status": "active", "openadr_status": "ready", "timestamp": 1746230400 }
```

Stores `telemetry:latest` and appends to `telemetry:history` (max 360 entries) in Redis.

### `GET /api/state`

Public. Returns current state + last 60 history entries. `Cache-Control: no-store`.

---

## Deployment

Push to `main` → Vercel deploys automatically. No manual steps required.

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16.2.4 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Data store | Upstash Redis (serverless) |
| Deployment | Vercel |
| Fonts | Chakra Petch (display), DM Sans (body), IBM Plex Mono (data) |

---

## Related

- [`flexcompute-edge`](https://github.com/JefBronze/flexcompute-edge) — VEN daemon, control agent, hardware setup
- [data-joule.com/method](https://data-joule.com/method) — how the full signal chain works

## Security

See [SECURITY.md](SECURITY.md). The `/api/ingest` endpoint is in scope for vulnerability reports.
