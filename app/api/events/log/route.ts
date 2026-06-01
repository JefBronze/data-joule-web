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
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const reports = (await Promise.all(keys.map(k => redis.get(k)))).filter(Boolean) as Array<{
    event_name?: string
    kwh_scaled?: string | null
    completed_at: number
  }>

  // Each event is stored under two keys — legacy `event:report:{name}` and
  // participant-namespaced `event:report:{pid}:{name}` — so the scan returns
  // every event twice. Collapse by event_name, preferring a copy that carries
  // kwh_scaled (a half-applied backfill can leave one copy null). Without this,
  // the table double-lists and the CRE PoR workflow double-counts the reserve.
  const byName = new Map<string, (typeof reports)[number]>()
  let noNameIdx = 0
  for (const r of reports) {
    const key = r.event_name ?? `__noname_${noNameIdx++}`
    const existing = byName.get(key)
    if (!existing || (existing.kwh_scaled == null && r.kwh_scaled != null)) {
      byName.set(key, r)
    }
  }

  const valid = [...byName.values()].sort((a, b) => b.completed_at - a.completed_at)

  return NextResponse.json(valid, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
