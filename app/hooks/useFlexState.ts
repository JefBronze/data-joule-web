'use client'

import { useEffect, useState, useCallback } from 'react'
import type { TelemetryEntry } from '@/app/lib/telemetry'

export type { TelemetryEntry } from '@/app/lib/telemetry'

type HourlyEntry = { timestamp: number; wattage_w: number }

export type DemoEvent = { tier: number; end_ts: number; event_name: string }

type GridSource = {
  demand_mw: number
  demand_pct: number
  tier: number
  updated: string
  // HQ-specific
  capacity_mw?: number
  peak_event_active?: boolean
  peak_event_name?: string | null
  // ISNE/CAISO/NYISO-specific
  ref_peak_mw?: number
}

type GridLocale = {
  tier: number
  triggered_by: string | null
  hq?: GridSource | null
  isne?: GridSource | null
  caiso?: GridSource | null
  nyiso?: GridSource | null
  ons?: GridSource | null
}

export type GridSignal = {
  tier: number
  triggered_by_locale: 'fr' | 'en' | 'pt' | null
  triggered_by_source: string | null
  is_synthetic: boolean
  fetched_at: number
  fr: GridLocale | null
  en: GridLocale | null
  pt: GridLocale | null
}

export type { HourlyEntry, GridSource, GridLocale }

type ApiResponse = {
  latest: TelemetryEntry | null
  history: TelemetryEntry[]
  hourly: HourlyEntry[]
  demoEvent: DemoEvent | null
  nextEventTs: number | null
  gridSignal: GridSignal | null
}

export type ConnectionStatus = 'ok' | 'stale' | 'error'

const POLL_INTERVAL    = 5000
const STALE_THRESHOLD  = 15000
const ERROR_THRESHOLD  = 3

export function useFlexState() {
  const [data,        setData]        = useState<TelemetryEntry | null>(null)
  const [history,     setHistory]     = useState<TelemetryEntry[]>([])
  const [hourly,      setHourly]      = useState<HourlyEntry[]>([])
  const [demoEvent,   setDemoEvent]   = useState<DemoEvent | null>(null)
  const [nextEventTs, setNextEventTs] = useState<number | null>(null)
  const [gridSignal,  setGridSignal]  = useState<GridSignal | null>(null)
  const [loading,           setLoading]           = useState(true)
  const [now,               setNow]               = useState(() => Date.now())
  const [lastSuccessTime,   setLastSuccessTime]   = useState<number | null>(null)
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' })
      if (!res.ok) throw new Error('not ok')
      const json: ApiResponse = await res.json()
      setData(json.latest)
      setHistory(json.history)
      setHourly(json.hourly ?? [])
      setDemoEvent(json.demoEvent ?? null)
      setNextEventTs(json.nextEventTs ?? null)
      setGridSignal(json.gridSignal ?? null)
      setLastSuccessTime(Date.now())
      setConsecutiveErrors(0)
    } catch {
      setConsecutiveErrors(n => n + 1)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initialLoad = setTimeout(fetchData, 0)
    const poll = setInterval(fetchData, POLL_INTERVAL)
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      clearTimeout(initialLoad)
      clearInterval(poll)
      clearInterval(tick)
    }
  }, [fetchData])

  const connectionStatus: ConnectionStatus =
    consecutiveErrors >= ERROR_THRESHOLD   ? 'error' :
    lastSuccessTime !== null && now - lastSuccessTime > STALE_THRESHOLD ? 'stale' :
    'ok'

  return { data, history, hourly, demoEvent, nextEventTs, gridSignal, loading, now, connectionStatus }
}
