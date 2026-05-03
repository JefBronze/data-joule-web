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

  // 2. Rate limit — 30 req/min per IP (Pi pushes every 5s = 12/min; 2.5x headroom)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const { success } = await ratelimit.limit(ip)
  if (!success) {
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

  const entry = { dr_tier, wattage_w, llm_status, openadr_status, timestamp }

  const pipe = redis.pipeline()
  pipe.set('telemetry:latest', entry)
  pipe.lpush('telemetry:history', entry)
  pipe.ltrim('telemetry:history', 0, MAX_HISTORY - 1)
  await pipe.exec()

  return NextResponse.json({ ok: true })
}
