import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const MAX_BODY_BYTES = 1024
// Snapshots are refreshed by the bridges every 300s; 30 min TTL gives
// 6 missed cycles of grace before a card falls back to "—".
const TTL_SECONDS = 1800

const ALLOWED_SOURCES = new Set(['hq', 'ons', 'nyiso'])

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? ''
  if (!process.env.INGEST_API_KEY || auth !== `Bearer ${process.env.INGEST_API_KEY}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

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

  const source = String(body.source ?? '')
  if (!ALLOWED_SOURCES.has(source)) {
    return NextResponse.json({ error: 'invalid source' }, { status: 422 })
  }

  const demand_mw = Number(body.demand_mw)
  const demand_pct = Number(body.demand_pct)
  const tier = Number(body.tier)
  if (!Number.isFinite(demand_mw) || demand_mw < 0) {
    return NextResponse.json({ error: 'invalid demand_mw' }, { status: 422 })
  }
  if (!Number.isFinite(demand_pct) || demand_pct < 0 || demand_pct > 200) {
    return NextResponse.json({ error: 'invalid demand_pct' }, { status: 422 })
  }
  if (!Number.isInteger(tier) || tier < 0 || tier > 4) {
    return NextResponse.json({ error: 'invalid tier' }, { status: 422 })
  }

  const snapshot: Record<string, unknown> = {
    source, demand_mw, demand_pct, tier,
    updated: typeof body.updated === 'string' ? body.updated : new Date().toISOString(),
  }
  if (typeof body.capacity_mw === 'number') snapshot.capacity_mw = body.capacity_mw
  if (typeof body.ref_peak_mw === 'number') snapshot.ref_peak_mw = body.ref_peak_mw
  if (typeof body.area === 'string') snapshot.area = body.area
  if (typeof body.peak_event_active === 'boolean') snapshot.peak_event_active = body.peak_event_active
  if (typeof body.peak_event_name === 'string') snapshot.peak_event_name = body.peak_event_name

  if (Array.isArray(body.regions)) {
    const valid = body.regions.length <= 6 && body.regions.every(r =>
      r && typeof r === 'object' &&
      typeof (r as Record<string, unknown>).code === 'string' &&
      /^[A-Z]{1,5}$/.test((r as Record<string, unknown>).code as string) &&
      Number.isFinite(Number((r as Record<string, unknown>).demand_mw)) &&
      Number.isFinite(Number((r as Record<string, unknown>).demand_pct)))
    if (!valid) {
      return NextResponse.json({ error: 'invalid regions' }, { status: 422 })
    }
    snapshot.regions = (body.regions as Record<string, unknown>[]).map(r => ({
      code: r.code, demand_mw: Number(r.demand_mw), demand_pct: Number(r.demand_pct),
    }))
  }

  snapshot.posted_at = Math.floor(Date.now() / 1000)

  await redis.set(`grid:current:${source}`, snapshot, { ex: TTL_SECONDS })

  return NextResponse.json({ ok: true })
}
