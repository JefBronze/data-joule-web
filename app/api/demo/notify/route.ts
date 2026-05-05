import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const CADENCE_SECONDS = 1200  // 20 min between events

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? ''
  if (!process.env.INGEST_API_KEY || auth !== `Bearer ${process.env.INGEST_API_KEY}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }

  const tier = Number(body.tier)
  const duration_seconds = Number(body.duration_seconds)
  const event_name = String(body.event_name ?? '')
  const start_ts = Number(body.start_ts)

  if (![1, 2, 3, 4].includes(tier) || duration_seconds < 30 || duration_seconds > 3600 || !start_ts) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 422 })
  }

  const end_ts = start_ts + duration_seconds
  const next_event_ts = start_ts + CADENCE_SECONDS

  await redis.pipeline()
    .set('demo:event', { tier, end_ts, event_name }, { ex: duration_seconds + 120 })
    .set('demo:next_event_ts', next_event_ts, { ex: 3600 })
    .exec()

  return NextResponse.json({ ok: true })
}
