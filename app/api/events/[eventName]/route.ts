import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventName: string }> }
) {
  const { eventName } = await params

  if (!eventName || !/^(grid|hilo|ons)-tier[1-4]-\d{10}$/.test(eventName)) {
    return NextResponse.json({ error: 'invalid event name' }, { status: 400 })
  }

  const report = await redis.get(`event:report:${eventName}`)
  if (!report) {
    return NextResponse.json({ error: 'Event report not found' }, { status: 404 })
  }

  return NextResponse.json(report, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
