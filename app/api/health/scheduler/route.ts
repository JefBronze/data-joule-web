import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'
import { sendAlert } from '@/app/lib/alerts'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Path name is legacy (an external uptime monitor already points at /api/health/scheduler).
// This route now watches the VPS bridge-snapshot heartbeat: each bridge (hq, ons, nyiso)
// writes a `grid:current:{source}` snapshot every ~5-min poll cycle. Each snapshot carries
// a server-stamped `posted_at` (unix seconds). If the newest snapshot is older than 20 min
// (≈ 4 missed cycles), the VPS bridge layer is down → alert.
// It does NOT alert on event absence — calm grids are normal.
const STALE_SECONDS = 20 * 60 // 20 min ≈ 4 missed 5-min bridge cycles
const COOLDOWN_KEY = 'alert:bridges:cooldown'
const COOLDOWN_SECONDS = 3600 // don't re-page more than once an hour while down

export async function GET(request: NextRequest) {
  // Shared-secret guard so randoms can't trigger alert spam. Accepts either
  // HEARTBEAT_SECRET (?key= or Bearer, for external monitors) or CRON_SECRET
  // (Bearer, the token Vercel Cron auto-sends). Fails closed: this route claims
  // cooldown keys and dispatches alerts, so a missing env config must not leave
  // it publicly callable.
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

  const [hq, ons, nyiso] = await Promise.all([
    redis.get<{ posted_at?: number }>('grid:current:hq'),
    redis.get<{ posted_at?: number }>('grid:current:ons'),
    redis.get<{ posted_at?: number }>('grid:current:nyiso'),
  ])
  const postedAts = [hq?.posted_at, ons?.posted_at, nyiso?.posted_at]
    .filter((t): t is number => typeof t === 'number')
  const newest = postedAts.length ? Math.max(...postedAts) : 0
  const nowSec = Math.floor(Date.now() / 1000)
  const ageSec = newest ? nowSec - newest : Infinity
  const stale = ageSec > STALE_SECONDS

  if (!stale) {
    // Clear any cooldown so the next outage alerts immediately.
    await redis.del(COOLDOWN_KEY)
    return NextResponse.json(
      { ok: true, newest_posted_at: newest || null, age_seconds: newest ? ageSec : null, stale: false },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  // Stale. Log + page (cooldown-gated), then report 503.
  // Atomic claim: SET ... EX ... NX returns null when the key already exists, so
  // only the first invocation in a cooldown window sends the alert — no TOCTOU
  // double-paging when checks (cron + external monitor, or overlapping calls) race.
  const claimedCooldown = await redis.set(COOLDOWN_KEY, Date.now(), { ex: COOLDOWN_SECONDS, nx: true })
  let alerted: unknown = 'suppressed (cooldown)'
  if (claimedCooldown) {
    alerted = await sendAlert(
      `🔴 data-joule grid bridges SILENT — newest snapshot is ${newest ? Math.round(ageSec / 60) + ' min' : 'unknown age'} old (>20 min). The VPS bridge layer (ons/hq/nyiso) may be down; dashboard grid cards will be frozen. Check the bridge systemd units on the VPS.`
    )
  } else {
    console.error('[ALERT] bridges still silent (alert suppressed by cooldown)')
  }

  return NextResponse.json(
    { ok: false, newest_posted_at: newest || null, age_seconds: newest ? ageSec : null, stale: true, alerted },
    { status: 503, headers: { 'Cache-Control': 'no-store' } }
  )
}
