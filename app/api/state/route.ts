import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

// Cache at Vercel's CDN for 10s — all browser tabs share one Redis read per 10s
export const revalidate = 10

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
  const fiveDaysAgo = Math.floor(Date.now() / 1000) - 5 * 24 * 3600

  const [latest, history, hourlyRaw] = await Promise.all([
    redis.get<TelemetryEntry>('telemetry:latest'),
    redis.lrange<TelemetryEntry>('telemetry:history', 0, 59),
    redis.hgetall('telemetry:hourly') as Promise<Record<string, string> | null>,
  ])

  const hourly = Object.entries(hourlyRaw ?? {})
    .map(([ts, w]) => ({ timestamp: Number(ts), wattage_w: Number(w) }))
    .filter(e => e.timestamp >= fiveDaysAgo)
    .sort((a, b) => a.timestamp - b.timestamp)

  return NextResponse.json(
    { latest: latest ?? null, history: [...history].reverse(), hourly },
    { headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=20' } }
  )
}
