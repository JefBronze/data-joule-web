'use client'

import Link from 'next/link'
import { useFlexState } from '@/app/hooks/useFlexState'
import { TIER_CONFIG, secondsAgo } from '@/app/lib/telemetry'

const BASELINE_W = 3

function SparkChart({ data }: { data: number[] }) {
  if (data.length < 2) {
    return (
      <div className="h-28 md:h-40 flex items-center justify-center text-neutral-600 text-sm font-mono">
        Collecting data…
      </div>
    )
  }
  const W = 400
  const H = 120
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const pad = 6
  const toY = (v: number) => H - ((v - min) / range) * (H - pad * 2) - pad
  const xs = data.map((_, i) => (i / (data.length - 1)) * W)
  const ys = data.map(v => toY(v))
  const linePts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const areaPts = `0,${H} ${linePts} ${W},${H}`

  const baselineY = toY(BASELINE_W)
  const showBaseline = BASELINE_W >= min && BASELINE_W <= max

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-28 md:h-40"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="watt-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </linearGradient>
      </defs>
      {showBaseline && (
        <line
          x1="0"
          y1={baselineY.toFixed(1)}
          x2={W}
          y2={baselineY.toFixed(1)}
          stroke="#374151"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
      )}
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
  const { data, history, hourly, loading, now, connectionStatus } = useFlexState()

  const tier = data?.dr_tier ?? 0
  const tierCfg = TIER_CONFIG[tier] ?? TIER_CONFIG[0]
  const chartData = hourly.length >= 2 ? hourly : history
  const wattages = chartData.map(h => h.wattage_w)
  const maxW = wattages.length ? Math.max(...wattages).toFixed(1) : '—'
  const avgW = wattages.length
    ? (wattages.reduce((a, b) => a + b, 0) / wattages.length).toFixed(1)
    : '—'

  const xLabels = hourly.length >= 2
    ? (() => {
        const first = hourly[0].timestamp
        const last = hourly[hourly.length - 1].timestamp
        const range = last - first || 1
        return [0, 0.2, 0.4, 0.6, 0.8, 1].map(p => {
          const d = new Date((first + p * range) * 1000)
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        })
      })()
    : ['–5m', '–4m', '–3m', '–2m', '–1m', 'now']

  return (
    <div className="min-h-screen bg-(--background) text-neutral-100 font-sans">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="font-mono text-sm text-neutral-400 hover:text-neutral-200 transition-colors shrink-0">
          ← data-joule.com
        </Link>
        <div className="flex items-center gap-3">
          {connectionStatus === 'stale' && (
            <span className="text-xs font-mono text-yellow-400 border border-yellow-900 bg-yellow-950/30 px-2 py-0.5 rounded-full">
              Data may be stale
            </span>
          )}
          {connectionStatus === 'error' && (
            <span className="text-xs font-mono text-red-400 border border-red-900 bg-red-950/30 px-2 py-0.5 rounded-full">
              Connection lost
            </span>
          )}
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: connectionStatus === 'error' ? '#f87171' : data ? '#4ade80' : '#6b7280' }}
            />
            <span className="text-xs text-neutral-500 font-mono hidden sm:inline">
              {data ? `LIVE · ${secondsAgo(data.timestamp, now)}` : 'WAITING'}
            </span>
          </div>
        </div>
        <span className="text-xs text-neutral-600 font-mono uppercase tracking-widest shrink-0">Live Demo</span>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100">FlexCompute Edge</h1>
          <p className="text-neutral-500 text-sm mt-1 font-mono">
            mtl-edge-01 · Montréal, QC · OpenADR 3.0 VEN
          </p>
        </div>

        {/* Primary metrics */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[0, 1, 2].map(i => (
              <div key={i} className="rounded-lg border border-neutral-800 p-5 animate-pulse">
                <div className="h-3 w-24 bg-neutral-800 rounded mb-4" />
                <div className="h-12 w-32 bg-neutral-800 rounded mb-3" />
                <div className="h-3 w-16 bg-neutral-800 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Wattage */}
            <div
              className="rounded-lg border p-5"
              style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}
            >
              <div className="text-xs text-amber-600 uppercase tracking-widest mb-2 font-mono">Current Load</div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold font-mono text-amber-400">
                  {data ? data.wattage_w.toFixed(1) : '—'}
                </span>
                <span className="text-xl text-amber-600 font-mono">W</span>
              </div>
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

            {/* Inference */}
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
        )}

        {/* Wattage chart */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-neutral-500 uppercase tracking-widest font-mono">
              {hourly.length >= 2 ? `Wattage · Last 5 Days (${hourly.length}h)` : 'Wattage · Last 5 min'}
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
          <SparkChart data={wattages} />
          <div className="flex justify-between text-xs text-neutral-700 font-mono mt-2">
            {xLabels.map((label, i) => <span key={i}>{label}</span>)}
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
                    <th className="text-left py-2 pr-4 sticky left-0 bg-neutral-900">Time</th>
                    <th className="text-right py-2 pr-4">Wattage</th>
                    <th className="text-right py-2 pr-4">Tier</th>
                    <th className="text-right py-2 pr-4">LLM</th>
                    <th className="text-right py-2 hidden md:table-cell">VEN</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().slice(0, 12).map((entry, i) => (
                    <tr key={i} className="border-b border-neutral-800/50">
                      <td className="py-1.5 pr-4 text-neutral-400 sticky left-0 bg-neutral-900">
                        {secondsAgo(entry.timestamp, now)}
                      </td>
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
                        className="py-1.5 pr-4 text-right"
                        style={{
                          color:
                            entry.llm_status === 'active' ? '#4ade80' :
                            entry.llm_status === 'degraded' ? '#facc15' : '#f87171'
                        }}
                      >
                        {entry.llm_status.toUpperCase()}
                      </td>
                      <td
                        className="py-1.5 text-right hidden md:table-cell"
                        style={{ color: entry.openadr_status === 'ready' ? '#22d3ee' : '#6b7280' }}
                      >
                        {entry.openadr_status.toUpperCase()}
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
