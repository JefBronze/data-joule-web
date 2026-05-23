import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// EV charger event report endpoint — consumed by Chainlink oracle for curtailment settlement.
// Report written by ocpp_central.py via the /api/ingest pipeline or directly after curtailment.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventName: string }> }
) {
  const { eventName } = await params

  if (!eventName || !/^(grid|hilo)-tier[1-4]-\d{10}$/.test(eventName)) {
    return NextResponse.json({ error: 'invalid event name' }, { status: 400 })
  }

  const report = await redis.get(`event:report:charger:${eventName}`)
  if (!report) {
    return NextResponse.json({ error: 'Charger event report not found' }, { status: 404 })
  }

  return NextResponse.json(report, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
