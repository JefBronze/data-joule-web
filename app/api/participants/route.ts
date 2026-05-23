import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export const revalidate = 30

export async function GET() {
  // Scan telemetry:history for distinct participant_ids and their last seen state
  const [latest, history] = await Promise.all([
    redis.get<Record<string, unknown>>('telemetry:latest'),
    redis.lrange<Record<string, unknown>>('telemetry:history', 0, 99),
  ])

  const participantMap = new Map<string, { last_seen: number; wattage_w: number; dr_tier: number }>()

  const entries = [latest, ...history].filter(Boolean) as Record<string, unknown>[]
  for (const entry of entries) {
    const pid = typeof entry.participant_id === 'string' ? entry.participant_id : 'pi-compute'
    const ts = typeof entry.timestamp === 'number' ? entry.timestamp : 0
    if (!participantMap.has(pid) || ts > (participantMap.get(pid)?.last_seen ?? 0)) {
      participantMap.set(pid, {
        last_seen: ts,
        wattage_w: typeof entry.wattage_w === 'number' ? entry.wattage_w : 0,
        dr_tier: typeof entry.dr_tier === 'number' ? entry.dr_tier : 0,
      })
    }
  }

  const participants = Array.from(participantMap.entries()).map(([id, data]) => ({
    id,
    ...data,
  }))

  return NextResponse.json({ participants, count: participants.length })
}
