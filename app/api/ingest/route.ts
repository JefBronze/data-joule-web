import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  analytics: false,
  prefix: 'rl:ingest',
})

const ratelimitGlobal = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, '1 m'),
  analytics: false,
  prefix: 'rl:ingest:global',
})

const MAX_HISTORY = 360
const MAX_BODY_BYTES = 1024

const VALID_LLM_STATUS = new Set(['active', 'degraded', 'offline', 'paused'])
const VALID_OPENADR_STATUS = new Set(['ready', 'offline', 'error', 'pending'])

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const auth = request.headers.get('authorization') ?? ''
  if (!process.env.INGEST_API_KEY || auth !== `Bearer ${process.env.INGEST_API_KEY}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 2. Rate limit — per-IP (30/min) + global ceiling (120/min across all IPs)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const [perIp, global] = await Promise.all([
    ratelimit.limit(ip),
    ratelimitGlobal.limit('global'),
  ])
  if (!perIp.success || !global.success) {
    return NextResponse.json({ error: 'rate limit exceeded' }, { status: 429 })
  }

  // 3. Payload size cap
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'payload too large' }, { status: 413 })
  }

  // 4. Parse JSON
  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }

  // 5. Validate fields
  const dr_tier = Number(payload.dr_tier ?? -1)
  const wattage_w = Number(payload.wattage_w ?? -1)
  const llm_status = String(payload.llm_status ?? '')
  const openadr_status = String(payload.openadr_status ?? '')
  const timestamp = Number(payload.timestamp ?? 0)
  const nowSec = Math.floor(Date.now() / 1000)

  if (!Number.isInteger(dr_tier) || dr_tier < 0 || dr_tier > 4) {
    return NextResponse.json({ error: 'invalid dr_tier' }, { status: 422 })
  }
  if (!isFinite(wattage_w) || wattage_w < 0 || wattage_w > 100) {
    return NextResponse.json({ error: 'invalid wattage_w' }, { status: 422 })
  }
  if (!VALID_LLM_STATUS.has(llm_status)) {
    return NextResponse.json({ error: 'invalid llm_status' }, { status: 422 })
  }
  if (!VALID_OPENADR_STATUS.has(openadr_status)) {
    return NextResponse.json({ error: 'invalid openadr_status' }, { status: 422 })
  }
  if (!Number.isInteger(timestamp) || Math.abs(timestamp - nowSec) > 300) {
    return NextResponse.json({ error: 'invalid timestamp' }, { status: 422 })
  }

  const inference_tok_s = payload.inference_tok_s != null ? Number(payload.inference_tok_s) : undefined
  const inference_status = payload.inference_status != null ? String(payload.inference_status) : undefined

  const entry = { dr_tier, wattage_w, llm_status, openadr_status, timestamp,
    ...(inference_tok_s != null && isFinite(inference_tok_s) ? { inference_tok_s } : {}),
    ...(inference_status ? { inference_status } : {}),
  }
  const hourTs = Math.floor(timestamp / 3600) * 3600

  // Detect tier drop (≥1 → 0): write event completion report for Chainlink oracle
  const prevEntry = await redis.get<{ dr_tier: number }>('telemetry:latest')
  if (prevEntry && prevEntry.dr_tier >= 1 && dr_tier === 0) {
    const activeEvent = await redis.get<{
      tier: number; end_ts: number; event_name: string; start_ts: number; baseline_w: number
    }>('demo:event')
    if (activeEvent && /^grid-tier[1-4]-\d{10}$/.test(activeEvent.event_name)) {
      const { start_ts: evStart, end_ts: evEnd, event_name, tier: evTier, baseline_w } = activeEvent
      // start_ts fallback: parse from event_name (format: "grid-tierN-TIMESTAMP")
      const resolvedStart = evStart ?? parseInt(event_name.split('-').pop() ?? '0', 10)

      const rawHistory = await redis.lrange<Record<string, unknown>>('telemetry:history', 0, -1)
      const history = rawHistory.map(h => (typeof h === 'string' ? JSON.parse(h) : h) as { timestamp: number; wattage_w: number })
      const eventEntries = history.filter(h => h.timestamp >= resolvedStart && h.timestamp <= evEnd)
      const avgCurtailed = eventEntries.length > 0
        ? eventEntries.reduce((s, h) => s + h.wattage_w, 0) / eventEntries.length
        : wattage_w
      const durationS = evEnd - resolvedStart
      const kwhReduced = Math.max(0, (baseline_w - avgCurtailed) * durationS / 3_600_000)

      await redis.set(`event:report:${event_name}`, {
        event_name, tier: evTier, start_ts: resolvedStart, end_ts: evEnd,
        baseline_w, avg_curtailed_w: avgCurtailed,
        duration_s: durationS, kwh_reduced: kwhReduced,
        completed_at: Math.floor(Date.now() / 1000),
      }, { ex: 86400 * 30 })
    }
  }

  const pipe = redis.pipeline()
  pipe.set('telemetry:latest', entry)
  pipe.lpush('telemetry:history', entry)
  pipe.ltrim('telemetry:history', 0, MAX_HISTORY - 1)
  pipe.hset('telemetry:hourly', { [String(hourTs)]: String(wattage_w) })
  await pipe.exec()

  return NextResponse.json({ ok: true })
}
