import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type TelemetryEntry = {
  dr_tier: number
  wattage_w: number
  llm_status: string
  openadr_status: string
  timestamp: number
}

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export async function GET() {
  const [latest, history] = await Promise.all([
    redis.get<TelemetryEntry>('telemetry:latest'),
    redis.lrange<TelemetryEntry>('telemetry:history', 0, 59),
  ])

  return NextResponse.json(
    {
      latest: latest ?? null,
      history: [...history].reverse(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
