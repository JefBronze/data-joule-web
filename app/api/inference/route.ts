import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: false,
  prefix: 'rl:inference',
})

// USDC on Base mainnet (6 decimals). Price in micro-units per tier.
const USDC_BASE = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const BASE_CHAIN_ID = 8453
const TIER_PRICE: Record<number, number> = { 0: 1000, 1: 5000, 2: 15000, 3: 50000 }

function buildChallenge(tier: number, priceUsdc: number) {
  return {
    scheme: 'exact',
    network: 'base',
    chainId: BASE_CHAIN_ID,
    asset: USDC_BASE,
    payTo: process.env.INFERENCE_TREASURY_ADDRESS!,
    maxAmountRequired: String(priceUsdc),
    resource: 'https://data-joule.com/api/inference',
    description: `AI inference on Data-Joule node — grid tier ${tier}`,
    maxTimeoutSeconds: 300,
    extra: { gridTier: tier, priceUsd: priceUsdc / 1_000_000 },
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const { success } = await ratelimit.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'rate limit exceeded' }, { status: 429 })
  }

  const latest = await redis.get<{ dr_tier: number }>('telemetry:latest')
  const tier = Math.min(latest?.dr_tier ?? 0, 3)
  const priceUsdc = TIER_PRICE[tier]

  // ── 402 challenge ──────────────────────────────────────────────────────────
  const paymentHeader = request.headers.get('x-payment')
  if (!paymentHeader) {
    const challenge = buildChallenge(tier, priceUsdc)
    return NextResponse.json(
      { error: 'Payment required', x402: challenge },
      { status: 402, headers: { 'X-Payment-Required': JSON.stringify(challenge) } }
    )
  }

  // ── Validate payment header ────────────────────────────────────────────────
  let payment: Record<string, unknown>
  try {
    payment = JSON.parse(paymentHeader)
  } catch {
    return NextResponse.json({ error: 'invalid X-Payment header' }, { status: 400 })
  }

  const txHash = payment.tx_hash
  if (typeof txHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return NextResponse.json({ error: 'invalid or missing tx_hash in payment' }, { status: 402 })
  }

  // ── Parse prompt ───────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }

  const prompt = String(body.prompt ?? '').trim()
  if (!prompt || prompt.length > 2000) {
    return NextResponse.json({ error: 'prompt required (max 2000 chars)' }, { status: 422 })
  }

  // ── Log to Redis ───────────────────────────────────────────────────────────
  const ts = Math.floor(Date.now() / 1000)
  await redis.lpush('inference:log', { ts, tx_hash: txHash, tier, price_usdc: priceUsdc, ip })
  await redis.ltrim('inference:log', 0, 999)

  // ── Forward to llama-server ────────────────────────────────────────────────
  const llamaUrl = process.env.LLAMA_SERVER_URL
  if (!llamaUrl) {
    return NextResponse.json({ error: 'inference backend unavailable' }, { status: 503 })
  }

  try {
    const llamaRes = await fetch(`${llamaUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.LLAMA_API_KEY ? { Authorization: `Bearer ${process.env.LLAMA_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: 'local',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
        stream: false,
      }),
      signal: AbortSignal.timeout(45_000),
    })

    if (!llamaRes.ok) {
      return NextResponse.json({ error: 'inference backend error' }, { status: 502 })
    }

    const data = await llamaRes.json()
    return NextResponse.json({
      response: data,
      paid: { tx_hash: txHash, usdc: priceUsdc / 1_000_000, tier },
    })
  } catch {
    return NextResponse.json({ error: 'inference timeout or unavailable' }, { status: 503 })
  }
}
