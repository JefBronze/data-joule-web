# Scheduler heartbeat alert

Watches the VPS DR-event scheduler from the outside and pages you when it stops,
so a dead `create_demo_event.sh` cron surfaces in minutes instead of the 9-day
silent outage of 2026-05-25 → 2026-06-03.

## How it works

- `/api/demo/notify` writes `demo:next_event_ts` to Redis on **every** scheduler
  run, with a **600 s TTL**. A healthy scheduler runs every 5 min, so the key is
  always present.
- `GET /api/health/scheduler` reads that key:
  - present → `200 {"scheduler":"up"}`
  - absent (no check-in for >10 min) → logs, fires alerts, returns `503`.
- Alerts fan out to every **configured** channel (`app/lib/alerts.ts`): always
  `console.error` (Vercel logs), plus Telegram and WhatsApp if their env vars are
  set. A 1-hour Redis cooldown (`alert:scheduler:cooldown`) prevents re-paging
  every tick while down; it auto-clears on recovery.

## Triggering the check

`vercel.json` registers a Vercel Cron at `*/10 * * * *`.

> ⚠️ **Plan caveat:** frequent crons require a **Vercel Pro** plan. On Hobby,
> crons run at most **once per day** — too coarse for a heartbeat. If you're on
> Hobby (or just want a watchdog independent of Vercel itself), point an external
> monitor at the route every 5 min instead — e.g. **cron-job.org** or
> **UptimeRobot** hitting:
>
> ```text
> https://data-joule.com/api/health/scheduler?key=YOUR_HEARTBEAT_SECRET
> ```
>
> Either trigger works; you don't need both.

## Environment variables (set in Vercel project settings)

| Var | Needed for | Notes |
|---|---|---|
| `HEARTBEAT_SECRET` | external monitor auth | sent as `?key=` or `Bearer`. Omit to leave the route open. |
| `CRON_SECRET` | Vercel Cron auth | Vercel auto-sends it as `Bearer`. Set it if using the `vercel.json` cron. |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | Telegram alerts | from @BotFather; chat_id is your user/group id. |
| `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` + `WHATSAPP_TO` | WhatsApp alerts | Meta WhatsApp Cloud API. See caveat below. |

Each alert channel is independent — set only the ones you want; unset channels
are skipped silently.

### WhatsApp caveat

`sendWhatsApp` uses the Meta Cloud API with a free-form text body. Meta only
delivers free-form text inside the 24-hour customer-service window; for
unsolicited alerts you typically need an **approved message template**. If your
alerts don't arrive, switch the body in `app/lib/alerts.ts` to a template send
(or tell me your provider — Twilio/CallMeBot are simpler for personal alerts and
I'll swap the implementation).

## Test it

```bash
# healthy (scheduler running):
curl -s "https://data-joule.com/api/health/scheduler?key=YOUR_HEARTBEAT_SECRET"
#   → {"ok":true,"scheduler":"up","nextEventTs":...}

# simulate down: delete the key in Redis, then call again within the hour:
#   → {"ok":false,"scheduler":"down","alerted":[...]} and a 503, plus a page.
```
