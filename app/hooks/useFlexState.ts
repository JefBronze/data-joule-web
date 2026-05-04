'use client'

import { useEffect, useState, useCallback } from 'react'

export type TelemetryEntry = {
  dr_tier: number
  wattage_w: number
  llm_status: string
  openadr_status: string
  timestamp: number
}

type ApiResponse = {
  latest: TelemetryEntry | null
  history: TelemetryEntry[]
}

export type ConnectionStatus = 'ok' | 'stale' | 'error'

const POLL_INTERVAL = 5000
const STALE_THRESHOLD = 15000
const ERROR_THRESHOLD = 3

export function useFlexState() {
  const [data, setData] = useState<TelemetryEntry | null>(null)
  const [history, setHistory] = useState<TelemetryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => Date.now())
  const [lastSuccessTime, setLastSuccessTime] = useState<number | null>(null)
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' })
      if (!res.ok) throw new Error('not ok')
      const json: ApiResponse = await res.json()
      setData(json.latest)
      setHistory(json.history)
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
    consecutiveErrors >= ERROR_THRESHOLD ? 'error' :
    lastSuccessTime !== null && now - lastSuccessTime > STALE_THRESHOLD ? 'stale' :
    'ok'

  return { data, history, loading, now, connectionStatus }
}
