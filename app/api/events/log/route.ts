import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export async function GET() {
  // Scan all event report keys
  const keys: string[] = []
  let cursor = 0
  do {
    const [nextCursor, batch] = await redis.scan(cursor, { match: 'event:report:*', count: 100 })
    cursor = Number(nextCursor)
    keys.push(...(batch as string[]))
  } while (cursor !== 0)

  if (keys.length === 0) {
    return NextResponse.json([], {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
    })
  }

  const reports = await Promise.all(keys.map(k => redis.get(k)))
  const valid = reports
    .filter(Boolean)
    .sort((a: unknown, b: unknown) => {
      const ra = a as { completed_at: number }
      const rb = b as { completed_at: number }
      return rb.completed_at - ra.completed_at
    })

  return NextResponse.json(valid, {
    headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
  })
}
