import { describe, expect, test } from 'vitest'
import { evaluateNodeHealth, TELEMETRY_STALE_SECONDS, VEN_GRACE_SECONDS } from './nodeHealth'
import type { TelemetryEntry } from './telemetry'

const NOW = 1_781_115_000

function entry(overrides: Partial<TelemetryEntry> = {}): TelemetryEntry {
  return {
    dr_tier: 0,
    wattage_w: 8.2,
    llm_status: 'active',
    openadr_status: 'ready',
    timestamp: NOW - 10,
    ...overrides,
  }
}

describe('evaluateNodeHealth', () => {
  test('healthy node: fresh telemetry, VEN ready', () => {
    const r = evaluateNodeHealth(entry(), null, NOW)
    expect(r.telemetryStale).toBe(false)
    expect(r.venOffline).toBe(false)
    expect(r.pageTelemetry).toBe(false)
    expect(r.pageVen).toBe(false)
  })

  test('missing telemetry:latest pages for dead pi-compute', () => {
    const r = evaluateNodeHealth(null, null, NOW)
    expect(r.telemetryStale).toBe(true)
    expect(r.pageTelemetry).toBe(true)
  })

  test('telemetry older than threshold pages for dead pi-compute', () => {
    const r = evaluateNodeHealth(entry({ timestamp: NOW - TELEMETRY_STALE_SECONDS - 1 }), null, NOW)
    expect(r.telemetryStale).toBe(true)
    expect(r.pageTelemetry).toBe(true)
  })

  test('stale telemetry suppresses the VEN page (VEN status is stale data)', () => {
    const r = evaluateNodeHealth(
      entry({ timestamp: NOW - TELEMETRY_STALE_SECONDS - 1, openadr_status: 'offline' }),
      NOW - VEN_GRACE_SECONDS - 1000,
      NOW
    )
    expect(r.pageTelemetry).toBe(true)
    expect(r.venOffline).toBe(false)
    expect(r.pageVen).toBe(false)
  })

  test('first observation of VEN offline starts tracking but does not page', () => {
    const r = evaluateNodeHealth(entry({ openadr_status: 'offline', wattage_w: 0 }), null, NOW)
    expect(r.venOffline).toBe(true)
    expect(r.pageVen).toBe(false)
    expect(r.pageTelemetry).toBe(false)
  })

  test('VEN offline within grace window does not page', () => {
    const r = evaluateNodeHealth(
      entry({ openadr_status: 'offline', wattage_w: 0 }),
      NOW - VEN_GRACE_SECONDS + 60,
      NOW
    )
    expect(r.venOffline).toBe(true)
    expect(r.pageVen).toBe(false)
  })

  test('VEN offline past grace window pages', () => {
    const r = evaluateNodeHealth(
      entry({ openadr_status: 'offline', wattage_w: 0 }),
      NOW - VEN_GRACE_SECONDS - 1,
      NOW
    )
    expect(r.venOffline).toBe(true)
    expect(r.pageVen).toBe(true)
  })

  test('VEN status "error" counts as offline', () => {
    const r = evaluateNodeHealth(
      entry({ openadr_status: 'error' }),
      NOW - VEN_GRACE_SECONDS - 1,
      NOW
    )
    expect(r.venOffline).toBe(true)
    expect(r.pageVen).toBe(true)
  })

  test('VEN recovery: ready again after an offline stretch', () => {
    const r = evaluateNodeHealth(entry(), NOW - VEN_GRACE_SECONDS - 5000, NOW)
    expect(r.venOffline).toBe(false)
    expect(r.pageVen).toBe(false)
  })

  test('transient "pending" VEN status is not treated as offline', () => {
    const r = evaluateNodeHealth(entry({ openadr_status: 'pending' }), null, NOW)
    expect(r.venOffline).toBe(false)
    expect(r.pageVen).toBe(false)
  })
})
