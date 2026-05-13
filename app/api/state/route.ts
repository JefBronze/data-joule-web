import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

type TelemetryEntry = {
  dr_tier: number
  wattage_w: number
  llm_status: string
  openadr_status: string
  timestamp: number
  inference_tok_s?: number
  inference_status?: string
}

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  analytics: false,
  prefix: 'rl:state',
})

const ratelimitGlobal = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, '1 m'),
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

  const fiveDaysAgo = Math.floor(Date.now() / 1000) - 5 * 24 * 3600

  const [latest, history, hourlyRaw, demoEvent, nextEventTs, gridSignal] = await Promise.all([
    redis.get<TelemetryEntry>('telemetry:latest'),
    redis.lrange<TelemetryEntry>('telemetry:history', 0, 359),
    redis.hgetall('telemetry:hourly') as Promise<Record<string, string> | null>,
    redis.get<{ tier: number; end_ts: number; event_name: string }>('demo:event'),
    redis.get<number>('demo:next_event_ts'),
    redis.get('demo:grid_signal'),
  ])

  const hourly = Object.entries(hourlyRaw ?? {})
    .map(([ts, w]) => ({ timestamp: Number(ts), wattage_w: Number(w) }))
    .filter(e => e.timestamp >= fiveDaysAgo)
    .sort((a, b) => a.timestamp - b.timestamp)

  return NextResponse.json(
    {
      latest: latest ?? null,
      history: [...history].reverse(),
      hourly,
      demoEvent: demoEvent ?? null,
      nextEventTs: nextEventTs ?? null,
      gridSignal: gridSignal ?? null,
    },
    { headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=20' } }
  )
}
