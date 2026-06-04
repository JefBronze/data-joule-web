import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'
import { sendAlert } from '@/app/lib/alerts'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// `demo:next_event_ts` is written by /api/demo/notify on every scheduler run with
// a 600s TTL. Healthy scheduler runs every 5 min, so the key never expires. If it
// is absent, the VPS scheduler hasn't checked in for ~10 min → it is down.
const HEARTBEAT_KEY = 'demo:next_event_ts'
const COOLDOWN_KEY = 'alert:scheduler:cooldown'
const COOLDOWN_SECONDS = 3600 // don't re-page more than once an hour while down

export async function GET(request: NextRequest) {
  // Optional shared-secret guard so randoms can't trigger alert spam.
  // Accepts either HEARTBEAT_SECRET (?key= or Bearer, for external monitors) or
  // CRON_SECRET (Bearer, the token Vercel Cron auto-sends). If neither env var is
  // configured, the route is open (read-only status).
  const heartbeatSecret = process.env.HEARTBEAT_SECRET
  const cronSecret = process.env.CRON_SECRET
  if (heartbeatSecret || cronSecret) {
    const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    const queryKey = request.nextUrl.searchParams.get('key') ?? ''
    const authorized =
      (!!heartbeatSecret && (bearer === heartbeatSecret || queryKey === heartbeatSecret)) ||
      (!!cronSecret && bearer === cronSecret)
    if (!authorized) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const nextEventTs = await redis.get<number>(HEARTBEAT_KEY)
  const healthy = nextEventTs != null

  if (healthy) {
    // Clear any cooldown so the next outage alerts immediately.
    await redis.del(COOLDOWN_KEY)
    return NextResponse.json(
      { ok: true, scheduler: 'up', nextEventTs },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  // Down. Log + page (cooldown-gated), then report 503.
  const inCooldown = await redis.get(COOLDOWN_KEY)
  let alerted: unknown = 'suppressed (cooldown)'
  if (!inCooldown) {
    await redis.set(COOLDOWN_KEY, Date.now(), { ex: COOLDOWN_SECONDS })
    alerted = await sendAlert(
      '🔴 data-joule scheduler DOWN — demo:next_event_ts missing for >10 min. ' +
        'The VPS create_demo_event.sh cron has stopped firing; dashboard wattage ' +
        'will be frozen at baseline. Check /var/log/demo-events.log on the VPS.'
    )
  } else {
    console.error('[ALERT] scheduler still down (alert suppressed by cooldown)')
  }

  return NextResponse.json(
    { ok: false, scheduler: 'down', alerted },
    { status: 503, headers: { 'Cache-Control': 'no-store' } }
  )
}
