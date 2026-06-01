/**
 * One-time idempotent backfill: add `kwh_scaled` to every `event:report:*`
 * record in Redis that doesn't already have it.
 *
 * BLOCKS Step 2 of the PoR rollout — joule-credits/source.js must NOT be
 * updated to read BigInt(report.kwh_scaled) until this script reports
 * "Missing: 0", otherwise BigInt(undefined) throws TypeError inside the
 * Functions sandbox (silent failure, hard to diagnose).
 *
 * Run with:
 *   npx tsx scripts/backfill-kwh-scaled.ts
 *
 * Environment required:
 *   KV_REST_API_URL
 *   KV_REST_API_TOKEN
 *
 * Safe to rerun — only writes keys missing or empty `kwh_scaled`.
 */

import { Redis } from '@upstash/redis'

if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  console.error('ERROR: KV_REST_API_URL and KV_REST_API_TOKEN must be set')
  process.exit(1)
}

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

type EventReport = {
  event_name: string
  kwh_reduced: number
  kwh_scaled?: string
  [k: string]: unknown
}

async function scanAll(pattern: string): Promise<string[]> {
  const keys: string[] = []
  let cursor = 0
  do {
    const [nextCursor, batch] = await redis.scan(cursor, { match: pattern, count: 100 })
    cursor = Number(nextCursor)
    keys.push(...(batch as string[]))
  } while (cursor !== 0)
  return keys
}

function isValidScaled(value: unknown): value is string {
  return typeof value === 'string' && /^\d+$/.test(value) && value !== '0'
}

async function backfillKey(key: string): Promise<'ok' | 'updated' | 'skipped-no-kwh' | 'skipped-no-record'> {
  const record = await redis.get<EventReport>(key)
  if (!record || typeof record !== 'object') {
    return 'skipped-no-record'
  }
  if (isValidScaled(record.kwh_scaled)) {
    return 'ok'
  }
  if (typeof record.kwh_reduced !== 'number' || record.kwh_reduced <= 0) {
    return 'skipped-no-kwh'
  }
  const kwhScaled = Math.floor(record.kwh_reduced * 1e9).toString()
  await redis.set(key, { ...record, kwh_scaled: kwhScaled })
  return 'updated'
}

async function main() {
  console.log('Scanning event:report:* keys...')
  const keys = await scanAll('event:report:*')
  console.log(`Found ${keys.length} keys to inspect\n`)

  const counts = { ok: 0, updated: 0, 'skipped-no-kwh': 0, 'skipped-no-record': 0 }
  for (const key of keys) {
    const result = await backfillKey(key)
    counts[result]++
    if (result === 'updated') {
      console.log(`  updated  ${key}`)
    } else if (result === 'skipped-no-kwh') {
      console.warn(`  SKIPPED  ${key} (missing/invalid kwh_reduced)`)
    }
  }

  console.log('\nVerification pass — re-scanning for any keys still missing kwh_scaled...')
  const stillMissing: string[] = []
  const verifyKeys = await scanAll('event:report:*')
  for (const key of verifyKeys) {
    const record = await redis.get<EventReport>(key)
    // Only positive-reduction events must carry kwh_scaled. Zero-curtailment
    // events (kwh_reduced <= 0) legitimately have none — they mint nothing and
    // are excluded from the reserve sum — so they are not "missing".
    if (
      record && typeof record === 'object' &&
      typeof record.kwh_reduced === 'number' && record.kwh_reduced > 0 &&
      !isValidScaled(record.kwh_scaled)
    ) {
      stillMissing.push(key)
    }
  }

  console.log('\n=== Backfill summary ===')
  console.log(`Total keys scanned:   ${keys.length}`)
  console.log(`Already had value:    ${counts.ok}`)
  console.log(`Updated (newly set):  ${counts.updated}`)
  console.log(`Skipped (no kwh):     ${counts['skipped-no-kwh']}`)
  console.log(`Skipped (no record):  ${counts['skipped-no-record']}`)
  console.log(`Missing after pass:   ${stillMissing.length}`)

  if (stillMissing.length > 0) {
    console.error('\nFAILED — keys still missing kwh_scaled (gating Step 2):')
    for (const k of stillMissing) console.error(`  ${k}`)
    process.exit(1)
  }

  console.log('\n✓ Backfill complete — safe to proceed to joule-credits Step 2 (source.js update)')
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
