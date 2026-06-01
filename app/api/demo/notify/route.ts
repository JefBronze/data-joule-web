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
  const source      = typeof body.source === 'string' && /^(grid|hilo|ons|nyiso)$/.test(body.source)
    ? body.source : undefined

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
    if (JSON.stringify(grid_signal).length > 2048) {
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
    const [latest, existingEvent] = await Promise.all([
      redis.get<{ wattage_w?: number }>('telemetry:latest'),
      redis.get<{ source?: string; end_ts: number }>('demo:event'),
    ])
    const baseline_w = latest?.wattage_w ?? 13.5
    const nowSec = Math.floor(Date.now() / 1000)
    const SOURCE_PRIORITY: Record<string, number> = { ons: 2, hilo: 1, grid: 0 }
    const incomingPrio = SOURCE_PRIORITY[source ?? ''] ?? -1
    const existingPrio = SOURCE_PRIORITY[existingEvent?.source ?? ''] ?? -1
    const existingExpired = !existingEvent || existingEvent.end_ts <= nowSec
    const eventPayload = {
      tier, end_ts: start_ts + duration_s, event_name, start_ts, baseline_w,
      ...(source ? { source } : {}),
    }
    if (source) {
      pipeline.set(`demo:event:${source}`, eventPayload, { ex: duration_s * 2 + 300 })
    }
    if (existingExpired || incomingPrio >= existingPrio) {
      pipeline.set('demo:event', eventPayload, { ex: duration_s * 2 + 300 })
    }
  }

  // When the bridge explicitly closes an event (tier=0), write the event report
  // immediately. This is resilient to Pi control-agent failures where the Pi's
  // telemetry never reflects dr_tier≥1, which would otherwise block the ingest
  // trigger from ever firing.
  if (tier === 0) {
    let activeEvent = source
      ? await redis.get<{ tier: number; end_ts: number; event_name: string; start_ts: number; baseline_w: number }>(`demo:event:${source}`)
      : null
    if (!activeEvent) {
      activeEvent = await redis.get<{ tier: number; end_ts: number; event_name: string; start_ts: number; baseline_w: number }>('demo:event')
    }
    if (activeEvent && /^(grid|hilo|ons|nyiso)-tier[1-4]-\d{10}$/.test(activeEvent.event_name)) {
      const { start_ts: evStart, end_ts: evEnd, event_name: evName, tier: evTier, baseline_w } = activeEvent
      const rawHistory = await redis.lrange<Record<string, unknown>>('telemetry:history', 0, -1)
      const history = rawHistory.map(h =>
        (typeof h === 'string' ? JSON.parse(h) : h) as { timestamp: number; wattage_w: number }
      )
      const eventEntries = history.filter(h => h.timestamp >= evStart && h.timestamp <= evEnd)
      const avgCurtailed = eventEntries.length > 0
        ? eventEntries.reduce((s, h) => s + h.wattage_w, 0) / eventEntries.length
        : baseline_w
      const durationS = evEnd - evStart
      const kwhReduced = Math.max(0, (baseline_w - avgCurtailed) * durationS / 3_600_000)
      const effectiveSource = source ?? (activeEvent as Record<string, unknown>).source as string | undefined
      // Canonical scaled value — single source of truth for both the Functions
      // DON (source.js → BigInt) and the CRE PoR workflow (compute.ts → BigInt).
      // Computed once here, persisted as a string, never recomputed from kwh_reduced
      // by consumers. Mirrors /api/ingest — this tier=0 close path must persist it
      // too, or events written here land with kwh_scaled=null and drop out of the
      // PoR attestation.
      const kwhScaled = Math.floor(kwhReduced * 1e9).toString()
      const report = {
        event_name: evName, tier: evTier, start_ts: evStart, end_ts: evEnd,
        baseline_w, avg_curtailed_w: avgCurtailed,
        duration_s: durationS, kwh_reduced: kwhReduced,
        kwh_scaled: kwhScaled,
        completed_at: Math.floor(Date.now() / 1000),
        participant_id: 'pi-compute',
        ...(effectiveSource ? { source: effectiveSource } : {}),
      }
      await Promise.all([
        redis.set(`event:report:pi-compute:${evName}`, report, { ex: 86400 * 30 }),
        redis.set(`event:report:${evName}`, report, { ex: 86400 * 30 }),
      ])
    }
  }

  await pipeline.exec()

  return NextResponse.json({ ok: true, event: tier >= 1 })
}
