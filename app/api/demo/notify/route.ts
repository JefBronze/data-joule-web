import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const CADENCE_SECONDS = 300
const MAX_BODY_BYTES = 2048

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? ''
  if (!process.env.INGEST_API_KEY || auth !== `Bearer ${process.env.INGEST_API_KEY}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Payload size cap
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'payload too large' }, { status: 413 })
  }

  let body: Record<string, unknown>
  try {
    const raw = await request.text()
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'payload too large' }, { status: 413 })
    }
    body = JSON.parse(raw)
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

  // grid_signal must be a plain object under 512 bytes when present
  if (grid_signal !== null) {
    if (typeof grid_signal !== 'object' || Array.isArray(grid_signal)) {
      return NextResponse.json({ error: 'invalid grid_signal' }, { status: 422 })
    }
    if (JSON.stringify(grid_signal).length > 512) {
      return NextResponse.json({ error: 'grid_signal too large' }, { status: 422 })
    }
  }

  const pipeline = redis.pipeline()

  if (grid_signal !== null) {
    pipeline.set('demo:grid_signal', grid_signal, { ex: tier > 0 ? 1800 : 600 })
  }
  pipeline.set('demo:next_event_ts', start_ts + CADENCE_SECONDS, { ex: 600 })

  if (tier >= 1) {
    if (duration_s < 30 || duration_s > 3600 || !event_name) {
      return NextResponse.json({ error: 'invalid event payload' }, { status: 422 })
    }
    const latest = await redis.get<{ wattage_w?: number }>('telemetry:latest')
    const baseline_w = latest?.wattage_w ?? 13.5
    pipeline.set('demo:event', {
      tier, end_ts: start_ts + duration_s, event_name, start_ts, baseline_w,
    }, { ex: duration_s + 120 })
  }

  await pipeline.exec()

  return NextResponse.json({ ok: true, event: tier >= 1 })
}
