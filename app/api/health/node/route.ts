import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'
import { sendAlert } from '@/app/lib/alerts'
import { evaluateNodeHealth } from '@/app/lib/nodeHealth'
import type { TelemetryEntry } from '@/app/lib/telemetry'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Watches the edge node itself, complementing /api/health/scheduler (VPS bridges):
//  - telemetry:latest silent > 10 min → pi-compute (or its pusher) is down
//  - openadr_status offline/error sustained > 15 min → pi-ven / VEN / plug feed is down
// The VEN check needs persistence because zigbee2mqtt restarts and pi-ven reboots
// legitimately blip the feed; health:ven:offline_since tracks the first sighting.
const VEN_OFFLINE_SINCE_KEY = 'health:ven:offline_since'
const TELEMETRY_COOLDOWN_KEY = 'alert:node:telemetry:cooldown'
const VEN_COOLDOWN_KEY = 'alert:node:ven:cooldown'
const COOLDOWN_SECONDS = 3600 // don't re-page more than once an hour while down

export async function GET(request: NextRequest) {
  // Same shared-secret guard as /api/health/scheduler: HEARTBEAT_SECRET (?key= or
  // Bearer) for external monitors, CRON_SECRET (Bearer) for Vercel Cron.
  // Fails closed: this route mutates Redis state and dispatches alerts, so a
  // missing env config must not leave it publicly callable.
  const heartbeatSecret = process.env.HEARTBEAT_SECRET
  const cronSecret = process.env.CRON_SECRET
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const queryKey = request.nextUrl.searchParams.get('key') ?? ''
  const authorized =
    (!!heartbeatSecret && (bearer === heartbeatSecret || queryKey === heartbeatSecret)) ||
    (!!cronSecret && bearer === cronSecret)
  if (!authorized) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const [latest, offlineSince] = await Promise.all([
    redis.get<TelemetryEntry>('telemetry:latest'),
    redis.get<number>(VEN_OFFLINE_SINCE_KEY),
  ])
  const nowSec = Math.floor(Date.now() / 1000)
  const health = evaluateNodeHealth(latest ?? null, offlineSince ?? null, nowSec)

  // Maintain tracking/cooldown state before paging so a crash mid-route can't
  // lose the offline-since marker.
  const stateOps: Promise<unknown>[] = []
  if (health.venOffline && offlineSince == null) {
    // NX: if a concurrent check already claimed it, keep the earlier timestamp.
    stateOps.push(redis.set(VEN_OFFLINE_SINCE_KEY, nowSec, { nx: true }))
  } else if (!health.venOffline && !health.telemetryStale) {
    // VEN verifiably back: stop tracking and re-arm the alert.
    stateOps.push(redis.del(VEN_OFFLINE_SINCE_KEY), redis.del(VEN_COOLDOWN_KEY))
  }
  if (!health.telemetryStale) {
    stateOps.push(redis.del(TELEMETRY_COOLDOWN_KEY))
  }
  await Promise.all(stateOps)

  const alerted: Record<string, unknown> = {}
  if (health.pageTelemetry) {
    // Atomic claim (SET NX EX): only the first check in a cooldown window pages.
    const claimed = await redis.set(TELEMETRY_COOLDOWN_KEY, Date.now(), { ex: COOLDOWN_SECONDS, nx: true })
    if (claimed) {
      alerted.telemetry = await sendAlert(
        `🔴 data-joule node telemetry SILENT — telemetry:latest is ${
          health.telemetryAgeSec != null ? Math.round(health.telemetryAgeSec / 60) + ' min old' : 'missing'
        } (>10 min). pi-compute or its telemetry pusher is down; the dashboard is frozen. Check flexcompute services on pi-compute.`
      )
    } else {
      console.error('[ALERT] node telemetry still silent (alert suppressed by cooldown)')
      alerted.telemetry = 'suppressed (cooldown)'
    }
  }
  if (health.pageVen) {
    const claimed = await redis.set(VEN_COOLDOWN_KEY, Date.now(), { ex: COOLDOWN_SECONDS, nx: true })
    if (claimed) {
      const offlineMin = offlineSince != null ? Math.round((nowSec - offlineSince) / 60) : null
      alerted.ven = await sendAlert(
        `🔴 data-joule VEN OFFLINE for ${offlineMin ?? '?'} min — the node reports openadr_status '${latest?.openadr_status}' and 0 W. pi-ven (MQTT broker / zigbee2mqtt / VEN) or the smart plug feed is down. Check pi-ven power and Tailscale, then mosquitto + zigbee2mqtt.`
      )
    } else {
      console.error('[ALERT] VEN still offline (alert suppressed by cooldown)')
      alerted.ven = 'suppressed (cooldown)'
    }
  }

  const ok = !health.pageTelemetry && !health.pageVen
  return NextResponse.json(
    {
      ok,
      telemetry_age_seconds: health.telemetryAgeSec,
      telemetry_stale: health.telemetryStale,
      ven_offline: health.venOffline,
      ven_offline_since: health.venOffline ? (offlineSince ?? nowSec) : null,
      ...(Object.keys(alerted).length ? { alerted } : {}),
    },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  )
}
