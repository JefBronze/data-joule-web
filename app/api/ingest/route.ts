import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const MAX_HISTORY = 360

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? ''
  if (!process.env.INGEST_API_KEY || auth !== `Bearer ${process.env.INGEST_API_KEY}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }

  const entry = {
    dr_tier: Number(payload.dr_tier ?? 0),
    wattage_w: Number(payload.wattage_w ?? 0),
    llm_status: String(payload.llm_status ?? 'unknown'),
    openadr_status: String(payload.openadr_status ?? 'offline'),
    timestamp: Number(payload.timestamp ?? Math.floor(Date.now() / 1000)),
  }

  const pipe = redis.pipeline()
  pipe.set('telemetry:latest', entry)
  pipe.lpush('telemetry:history', entry)
  pipe.ltrim('telemetry:history', 0, MAX_HISTORY - 1)
  await pipe.exec()

  return NextResponse.json({ ok: true })
}
