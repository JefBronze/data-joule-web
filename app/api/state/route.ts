import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

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

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  analytics: false,
  prefix: 'rl:state',
})

const ratelimitGlobal = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(300, '1 m'),
  analytics: false,
  prefix: 'rl:state:global',
})

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const [perIp, global] = await Promise.all([
    ratelimit.limit(ip),
    ratelimitGlobal.limit('global'),
  ])
  if (!perIp.success || !global.success) {
    return NextResponse.json({ error: 'rate limit exceeded' }, { status: 429 })
  }

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
