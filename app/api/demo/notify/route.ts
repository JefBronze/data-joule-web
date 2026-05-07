import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const CADENCE_SECONDS = 300  // 5-min cron cadence

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

  const tier        = Number(body.tier)
  const duration_s  = Number(body.duration_seconds ?? 0)
  const event_name  = String(body.event_name ?? '')
  const start_ts    = Number(body.start_ts)
  const grid_signal = body.grid_signal ?? null

  if (!Number.isInteger(tier) || tier < 0 || tier > 4) {
    return NextResponse.json({ error: 'invalid tier' }, { status: 422 })
  }
  if (!start_ts) {
    return NextResponse.json({ error: 'missing start_ts' }, { status: 422 })
  }

  const pipeline = redis.pipeline()

  // Always update grid signal display and next-check timestamp
  if (grid_signal !== null) {
    pipeline.set('demo:grid_signal', grid_signal, { ex: tier > 0 ? 1800 : 600 })
  }
  pipeline.set('demo:next_event_ts', start_ts + CADENCE_SECONDS, { ex: 600 })

  if (tier >= 1) {
    if (duration_s < 30 || duration_s > 3600 || !event_name) {
      return NextResponse.json({ error: 'invalid event payload' }, { status: 422 })
    }
    pipeline.set('demo:event', { tier, end_ts: start_ts + duration_s, event_name }, { ex: duration_s + 120 })
  }

  await pipeline.exec()

  return NextResponse.json({ ok: true, event: tier >= 1 })
}
