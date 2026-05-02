'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

type TelemetryEntry = {
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

const TIER_CONFIG: Record<number, { label: string; desc: string; color: string; bg: string }> = {
  0: { label: 'TIER 0', desc: 'BASELINE', color: '#4ade80', bg: 'rgba(74,222,128,0.08)' },
  1: { label: 'TIER 1', desc: 'THROTTLED', color: '#facc15', bg: 'rgba(250,204,21,0.08)' },
  2: { label: 'TIER 2', desc: 'POWER-SAVE', color: '#fb923c', bg: 'rgba(251,146,60,0.08)' },
  3: { label: 'TIER 3', desc: 'SUSPENDED', color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
  4: { label: 'TIER 4', desc: 'HALT', color: '#991b1b', bg: 'rgba(153,27,27,0.12)' },
}

function secondsAgo(ts: number, now: number) {
  const diff = Math.floor(now / 1000) - ts
  if (diff < 60) return `${diff}s ago`
  return `${Math.floor(diff / 60)}m ago`
}

function SparkChart({ data, height = 100 }: { data: number[]; height?: number }) {
  if (data.length < 2) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-neutral-600 text-sm">
        Collecting data…
      </div>
    )
  }
  const W = 400
  const H = height
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const xs = data.map((_, i) => (i / (data.length - 1)) * W)
  const ys = data.map(v => H - ((v - min) / range) * (H - 12) - 6)
  const linePts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const areaPts = `0,${H} ${linePts} ${W},${H}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="watt-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill="url(#watt-grad)" />
      <polyline
        points={linePts}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function DemoPage() {
  const [data, setData] = useState<TelemetryEntry | null>(null)
  const [history, setHistory] = useState<TelemetryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => Date.now())

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' })
      if (!res.ok) return
      const json: ApiResponse = await res.json()
      setData(json.latest)
      setHistory(json.history)
    } catch {
      // network errors are non-fatal
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      fetchData()
    }, 0)
    const poll = setInterval(fetchData, 5000)
    const tickTimer = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      clearTimeout(initialLoad)
      clearInterval(poll)
      clearInterval(tickTimer)
    }
  }, [fetchData])

  const tier = data?.dr_tier ?? 0
  const tierCfg = TIER_CONFIG[tier] ?? TIER_CONFIG[0]
  const wattages = history.map(h => h.wattage_w)
  const maxW = wattages.length ? Math.max(...wattages).toFixed(1) : '—'
  const avgW = wattages.length
    ? (wattages.reduce((a, b) => a + b, 0) / wattages.length).toFixed(1)
    : '—'

  return (
    <div className="min-h-screen bg-[#09090f] text-neutral-100 font-sans">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-mono text-sm text-neutral-400 hover:text-neutral-200 transition-colors">
          ← data-joule.com
        </Link>
        <span className="text-xs text-neutral-600 font-mono uppercase tracking-widest">Live Demo</span>
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: data ? '#4ade80' : '#6b7280' }}
          />
          <span className="text-xs text-neutral-500 font-mono">
            {data ? `LIVE · ${secondsAgo(data.timestamp, now)}` : 'WAITING'}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100">FlexCompute Edge</h1>
          <p className="text-neutral-500 text-sm mt-1 font-mono">
            pi-compute · Montréal, QC · OpenADR 3.0 VEN
          </p>
        </div>

        {/* Primary metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Wattage */}
          <div
            className="rounded-lg border p-5"
            style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}
          >
            <div className="text-xs text-amber-600 uppercase tracking-widest mb-2 font-mono">Current Load</div>
            {loading ? (
              <div className="h-12 w-24 bg-neutral-800 rounded animate-pulse" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold font-mono text-amber-400">
                  {data ? data.wattage_w.toFixed(1) : '—'}
                </span>
                <span className="text-xl text-amber-600 font-mono">W</span>
              </div>
            )}
          </div>

          {/* DR Tier */}
          <div
            className="rounded-lg border p-5"
            style={{ borderColor: tierCfg.color + '44', background: tierCfg.bg }}
          >
            <div className="text-xs text-neutral-500 uppercase tracking-widest mb-2 font-mono">DR Tier</div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold font-mono" style={{ color: tierCfg.color }}>
                {tier}
              </span>
              <div>
                <div className="text-sm font-mono font-semibold" style={{ color: tierCfg.color }}>
                  {tierCfg.label}
                </div>
                <div className="text-xs text-neutral-500 font-mono">{tierCfg.desc}</div>
              </div>
            </div>
          </div>

          {/* LLM Status */}
          <div className="rounded-lg border border-neutral-800 p-5 bg-neutral-900">
            <div className="text-xs text-neutral-500 uppercase tracking-widest mb-2 font-mono">Inference</div>
            <div className="mb-3">
              <span
                className="text-lg font-mono font-bold"
                style={{
                  color:
                    data?.llm_status === 'active' ? '#4ade80' :
                    data?.llm_status === 'degraded' ? '#facc15' : '#f87171'
                }}
              >
                ● {(data?.llm_status ?? 'offline').toUpperCase()}
              </span>
            </div>
            <div className="text-xs text-neutral-500 font-mono">
              VEN: <span className={data?.openadr_status === 'ready' ? 'text-cyan-400' : 'text-neutral-500'}>
                {(data?.openadr_status ?? 'offline').toUpperCase()}
              </span>
            </div>
            <div className="text-xs text-neutral-500 font-mono mt-1">
              Model: Llama-3.2-3B Q4_K_M
            </div>
          </div>
        </div>

        {/* 30-minute wattage chart */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-neutral-500 uppercase tracking-widest font-mono">
              Wattage · Last 5 min
            </span>
            <div className="flex gap-4 text-xs font-mono">
              <span className="text-neutral-500">
                MAX <span className="text-amber-400">{maxW} W</span>
              </span>
              <span className="text-neutral-500">
                AVG <span className="text-amber-400">{avgW} W</span>
              </span>
            </div>
          </div>
          <SparkChart data={wattages} height={100} />
          <div className="flex justify-between text-xs text-neutral-700 font-mono mt-2">
            <span>5 min ago</span>
            <span>now</span>
          </div>
        </div>

        {/* Recent readings */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
          <div className="text-xs text-neutral-500 uppercase tracking-widest font-mono mb-4">
            Recent Readings
          </div>
          {history.length === 0 ? (
            <div className="text-neutral-600 text-sm font-mono">No history yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-neutral-600 border-b border-neutral-800">
                    <th className="text-left py-2 pr-4">Time</th>
                    <th className="text-right py-2 pr-4">Wattage</th>
                    <th className="text-right py-2 pr-4">Tier</th>
                    <th className="text-right py-2">LLM</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().slice(0, 12).map((entry, i) => (
                    <tr key={i} className="border-b border-neutral-800/50">
                      <td className="py-1.5 pr-4 text-neutral-400">{secondsAgo(entry.timestamp, now)}</td>
                      <td className="py-1.5 pr-4 text-right text-amber-400">
                        {entry.wattage_w.toFixed(1)} W
                      </td>
                      <td
                        className="py-1.5 pr-4 text-right font-semibold"
                        style={{ color: TIER_CONFIG[entry.dr_tier]?.color ?? '#9ca3af' }}
                      >
                        {entry.dr_tier}
                      </td>
                      <td
                        className="py-1.5 text-right"
                        style={{
                          color:
                            entry.llm_status === 'active' ? '#4ade80' :
                            entry.llm_status === 'degraded' ? '#facc15' : '#f87171'
                        }}
                      >
                        {entry.llm_status.toUpperCase()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-neutral-700 font-mono">
          Polling every 5 seconds · Hardware in Montréal, QC · OpenADR 3.0
        </div>
      </main>
    </div>
  )
}
