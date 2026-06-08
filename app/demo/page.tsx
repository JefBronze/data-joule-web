'use client'

import Link from 'next/link'
import { LocaleSwitcher } from '@/app/components/SiteNav'
import { QcFlag } from '@/app/components/QcFlag'
import { useFlexState } from '@/app/hooks/useFlexState'
import type { DemoEvent, GridSignal } from '@/app/hooks/useFlexState'
import { GridMonitorCard } from '@/app/demo/GridMonitorCard'
import { TIER_CONFIG } from '@/app/lib/telemetry'
import { useLocale, type Locale } from '@/app/lib/i18n'

const BASELINE_W = 4.8

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCountdown(secs: number): string {
  const s = Math.max(0, Math.floor(secs))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// Raspberry Pi mark — outline forced to slate-200 for dark theme; red/green leaves kept.
function RpiLogo({ title }: { title: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="11" height="14" viewBox="0 0 274.072 350"
      aria-label={title}
      role="img"
    >
      <title>{title}</title>
      <path fill="#e2e8f0" d="M74.19.005c-1.77.055-3.676.708-5.838 2.415C63.057.377 57.922-.332 53.33 3.826c-7.091-.919-9.395.978-11.141 3.194-1.557-.032-11.648-1.6-16.275 5.303-11.629-1.376-15.305 6.841-11.141 14.502-2.375 3.677-4.836 7.309.718 14.319-1.965 3.904-.747 8.139 3.882 13.265-1.222 5.488 1.18 9.36 5.486 12.378-.806 7.51 6.887 11.876 9.184 13.433.882 4.376 2.72 8.505 11.507 10.789 1.449 6.521 6.73 7.648 11.844 9.017-16.901 9.824-31.396 22.75-31.297 54.466l-2.476 4.417c-19.379 11.785-36.815 49.664-9.55 80.453 1.781 9.637 4.768 16.56 7.427 24.221 3.978 30.873 29.937 45.328 36.783 47.037C68.315 318.26 79 325.512 93.46 330.591c13.631 14.06 28.399 19.417 43.247 19.408.218 0 .439.003.657 0 14.849.009 29.616-5.349 43.248-19.408 14.459-5.079 25.146-12.331 35.179-19.974 6.847-1.709 32.806-16.164 36.783-47.037 2.659-7.661 5.646-14.584 7.427-24.221 27.265-30.791 9.83-68.672-9.551-80.458l-2.479-4.416c.098-31.713-14.396-44.64-31.297-54.466 5.113-1.369 10.395-2.495 11.843-9.017 8.786-2.284 10.626-6.413 11.507-10.789 2.297-1.556 9.99-5.922 9.185-13.433 4.306-3.018 6.708-6.89 5.485-12.378 4.629-5.125 5.848-9.36 3.883-13.265 5.555-7.006 3.09-10.639.719-14.316 4.161-7.662.488-15.878-11.145-14.502-4.627-6.903-14.715-5.335-16.275-5.303-1.746-2.215-4.049-4.113-11.139-3.194-4.593-4.157-9.727-3.448-15.023-1.406-6.289-4.962-10.45-.984-15.203.52-7.614-2.488-9.355.92-13.096 2.308-8.304-1.754-10.827 2.065-14.808 6.098l-4.63-.092c-12.524 7.381-18.746 22.41-20.952 30.135-2.207-7.727-8.414-22.756-20.936-30.135l-4.63.092c-3.986-4.032-6.509-7.852-14.813-6.098C92.907 3.858 91.17.45 83.552 2.938c-3.12-.987-5.989-3.039-9.368-2.934l.006.001z"/>
      <path fill="#BC1142" fillRule="evenodd" d="M177.65 253.658v-.391c-.119-20.27-18.029-36.609-40.01-36.5-21.979.101-39.709 16.621-39.59 36.891v.39c.11 20.271 18.03 36.61 40.01 36.5 21.981-.1 39.701-16.62 39.59-36.89zm-62.83-104.84c-16.489-10.811-40.26-3.83-53.079 15.57-12.83 19.41-9.86 43.9 6.64 54.7 16.49 10.811 40.25 3.84 53.08-15.57 12.82-19.411 9.85-43.9-6.641-54.7zm44.511-1.961c-16.49 10.811-19.47 35.301-6.64 54.702 12.819 19.41 36.59 26.379 53.08 15.58 16.489-10.811 19.459-35.301 6.64-54.702-12.83-19.41-36.591-26.379-53.08-15.58zM32.392 166.478c-29.54 16.87-24.41 54.411-8.471 67.23 14.49 6.431 26.28-72 8.471-67.23zm205.769-.98c-17.81-4.77-6.011 73.67 8.47 67.231 15.939-12.811 21.07-50.361-8.47-67.231zm-60.5-58.4c-11.32 1.9 54.25 59.16 55.26 46.38 1.04-33.32-24.53-51.57-55.26-46.38zm-84.9-.98c-30.729-5.19-56.289 13.069-55.26 46.39 1.01 12.769 66.58-44.49 55.26-46.39zm44.139-7.77c-18.34-.48-35.939 13.61-35.979 21.78-.05 9.931 14.5 20.101 36.11 20.351 22.06.16 36.14-8.131 36.21-18.381.079-11.61-20.07-23.931-36.341-23.75zm1.121 203.6c-15.891-.39-40.261 6.37-39.961 15.03-.25 5.91 19.131 22.959 38.9 22.109 19.09.33 38.811-16.699 38.55-24.23-.039-7.759-21.499-13.599-37.489-12.909zm-59.06-45.969c-13.061-15.16-30.029-24.201-41.02-17.51-7.351 5.59-8.69 24.619 1.77 43.319 15.51 22.29 37.34 24.521 46.33 19.101 9.5-7.101 4.311-31.201-7.08-44.91zm115.84-4.361c-12.32 14.43-19.17 40.75-10.189 49.22 8.59 6.59 31.649 5.67 48.689-17.97 12.37-15.88 8.221-42.39 1.16-49.431-10.5-8.119-25.561 2.271-39.66 18.181z" clipRule="evenodd"/>
      <path fill="#75A928" fillRule="evenodd" d="M49.247 32.48c25.851 8.78 49.17 20.491 68.71 36.6 22.939-10.85 7.12-38.21-4.07-49.07-.57 2.87-1.209 4.68-1.949 5.22-3.641-3.97-6.621-8.03-11.311-11.85-.02 2.24 1.11 4.68-1.68 6.46-2.52-3.44-5.92-6.51-10.44-9.11 2.181 3.81.38 4.96-.79 6.54-3.449-3-6.729-6.04-13.09-8.4 1.74 2.15 4.17 4.25 1.59 6.72-3.55-2.25-7.119-4.5-15.56-6.1 1.899 2.15 5.84 4.3 3.45 6.46-4.461-1.73-9.391-2.99-14.851-3.72 2.61 2.19 4.79 4.32 2.65 6.01-4.771-1.49-11.34-3.49-17.77-1.76l4.07 4.15c.45.56-9.52.43-16.09.53 2.4 3.39 4.84 6.65 6.27 12.47-.65.67-3.91.29-6.98 0 3.15 6.73 8.62 8.43 9.9 11.31-1.93 1.48-4.6 1.1-7.52.09 2.27 4.75 7.03 8 10.79 11.85-.95.681-2.61 1.091-6.54.62 3.47 3.74 7.67 7.17 12.64 10.25-.88 1.04-3.91.99-6.72 1.061 4.51 4.479 10.3 6.799 15.74 9.729-2.71 1.88-4.65 1.44-6.72 1.41 3.839 3.21 10.38 4.88 16.44 6.81-1.149 1.82-2.3 2.32-4.771 2.83 6.42 3.61 15.621 1.96 18.211 3.801-.62 1.81-2.391 2.989-4.51 3.979 10.34.61 38.609-.38 44.029-22.101C101.796 63.46 82.476 49.61 49.247 32.48zm176.309 0c-33.219 17.13-52.539 30.98-63.119 42.79 5.42 21.721 33.689 22.711 44.029 22.101-2.119-.99-3.889-2.17-4.51-3.979 2.59-1.841 11.791-.19 18.211-3.801-2.471-.51-3.621-1.01-4.771-2.83 6.061-1.93 12.602-3.6 16.441-6.81-2.07.03-4.01.47-6.721-1.41 5.439-2.931 11.23-5.25 15.74-9.729-2.811-.07-5.84-.021-6.721-1.061 4.971-3.08 9.17-6.51 12.641-10.25-3.93.471-5.59.061-6.539-.62 3.76-3.851 8.52-7.1 10.789-11.85-2.92 1.01-5.59 1.39-7.52-.09 1.279-2.88 6.75-4.58 9.9-11.31-3.07.29-6.33.67-6.98 0 1.43-5.82 3.879-9.09 6.279-12.47-6.58-.1-16.549.03-16.1-.53l4.07-4.16c-6.42-1.73-13 .28-17.77 1.77-2.141-1.69.039-3.83 2.648-6.01-5.459.73-10.389 1.98-14.85 3.71-2.379-2.15 1.551-4.3 3.451-6.45-8.441 1.6-12.012 3.85-15.561 6.1-2.58-2.47-.15-4.57 1.59-6.72-6.359 2.36-9.641 5.4-13.09 8.4-1.17-1.58-2.971-2.74-.791-6.54-4.52 2.6-7.92 5.67-10.43 9.1-2.799-1.78-1.67-4.21-1.68-6.45-4.699 3.82-7.68 7.88-11.32 11.85-.73-.54-1.379-2.35-1.949-5.22-11.189 10.86-27.01 38.221-4.061 49.07 19.524-16.11 42.844-27.821 68.694-36.601z" clipRule="evenodd"/>
    </svg>
  )
}

// ── Source label map ───────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, { key: keyof ReturnType<typeof useLocale>['t']['grid'] }> = {
  hq:          { key: 'source_hq' },
  hydroquebec: { key: 'source_hq' },
  isne:        { key: 'source_isne' },
  caiso:       { key: 'source_caiso' },
  nyiso:       { key: 'source_nyiso' },
  ons:         { key: 'source_ons' },
}


// ── Event banner ──────────────────────────────────────────────────────────────

function EventBanner({
  event, signal, now, locale, d, g, liveTier,
}: {
  event: DemoEvent
  signal: GridSignal | null
  now: number
  locale: Locale
  d: ReturnType<typeof useLocale>['t']['demo']
  g: ReturnType<typeof useLocale>['t']['grid']
  liveTier: number
}) {
  const nowSec  = Math.floor(now / 1000)
  const secsLeft = event.end_ts - nowSec
  if (secsLeft <= 0) return null

  const cfg    = TIER_CONFIG[event.tier] ?? TIER_CONFIG[0]
  const isSynthetic = signal?.is_synthetic ?? true
  // demo:event is set the instant the event is created, but the tier only reaches
  // the node via OpenADR VTN -> VEN -> control agent, which lags by seconds. Until
  // telemetry's dr_tier catches up, show the node as RESPONDING instead of claiming
  // the throttled state — otherwise the banner reads "TIER 3 / SUSPENDED" while the
  // node is still at baseline (e.g. 10.7 W mid-ramp).
  const applied = liveTier >= event.tier

  // Build trigger description
  let triggerLine: string | null = null
  if (!isSynthetic && signal?.triggered_by_source) {
    const srcKey = SOURCE_LABELS[signal.triggered_by_source]?.key
    const srcLabel = srcKey ? (g[srcKey] as string) : signal.triggered_by_source
    const demandPct = signal.demand_pct ?? null

    triggerLine = demandPct !== null
      ? `${g.triggered_by} ${srcLabel} · ${demandPct.toFixed(1)}% ${g.capacity}`
      : `${g.triggered_by} ${srcLabel}`
  }

  const headingText = isSynthetic ? g.demo_event : g.real_event

  return (
    <div
      className="rounded-lg border p-4 mb-6 font-mono"
      style={{ borderColor: cfg.color + '55', background: cfg.bg }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-widest" style={{ color: cfg.color }}>
              ● {headingText}
            </span>
            <span className="text-xs text-neutral-500">·</span>
            <span className="text-xs font-semibold" style={{ color: cfg.color }}>
              {cfg.label}
            </span>
          </div>
          {triggerLine && (
            <div className="text-xs text-neutral-400 mt-1">{triggerLine}</div>
          )}
          {event.source === 'ons' && signal?.demo_mode && (
            <div className="text-xs text-neutral-600 mt-1">
              {g.demo_threshold_note.replace('{pct}', String(signal.t1_pct ?? ''))}
            </div>
          )}
          {isSynthetic && (
            <div className="text-xs text-neutral-600 mt-1">{g.grid_low}</div>
          )}
          {applied ? (
            <div className="text-xs text-neutral-500 mt-1">{d.tier_desc?.[event.tier] ?? cfg.desc}</div>
          ) : (
            <div className="text-xs mt-1 animate-pulse" style={{ color: cfg.color }}>
              NODE RESPONDING · T{liveTier} → T{event.tier}
            </div>
          )}
        </div>
        <div className="text-center sm:text-right shrink-0 border-t border-neutral-800 pt-3 sm:border-0 sm:pt-0">
          <div className="text-xs text-neutral-500 uppercase tracking-widest">{d.ends_in}</div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: cfg.color }}>
            {fmtCountdown(secsLeft)}
          </div>
          <div className="text-xs text-neutral-600 mt-1">{d.ends_in_sub}</div>
        </div>
      </div>
    </div>
  )
}

// ── Spark chart ───────────────────────────────────────────────────────────────

function SparkChart({ data, collectingLabel }: { data: number[]; collectingLabel: string }) {
  if (data.length < 2) {
    return (
      <div className="h-28 md:h-40 flex items-center justify-center text-neutral-600 text-sm font-mono">
        {collectingLabel}
      </div>
    )
  }
  const W = 400
  const H = 120
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const domainPad = Math.max(range * 0.12, 0.4)
  const chartMin = Math.max(0, min - domainPad)
  const chartMax = max + domainPad
  const chartRange = chartMax - chartMin || 1
  const pad = 14
  const toY = (v: number) => H - ((v - chartMin) / chartRange) * (H - pad * 2) - pad
  const xs = data.map((_, i) => (i / (data.length - 1)) * W)
  const ys = data.map(v => toY(v))
  const clamp = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi)

  function smoothPath(): string {
    let d = `M ${xs[0].toFixed(1)},${ys[0].toFixed(1)}`
    for (let i = 1; i < xs.length; i++) {
      const x1 = xs[i - 1], y1 = ys[i - 1]
      const x2 = xs[i],     y2 = ys[i]
      const xPrev = xs[Math.max(0, i - 2)],         yPrev = ys[Math.max(0, i - 2)]
      const xNext = xs[Math.min(xs.length - 1, i + 1)], yNext = ys[Math.min(ys.length - 1, i + 1)]
      const cp1x = x1 + (x2 - xPrev) / 6
      const cp2x = x2 - (xNext - x1) / 6
      const minY = Math.min(y1, y2), maxY = Math.max(y1, y2)
      const cp1y = clamp(y1 + (y2 - yPrev) / 6, minY, maxY)
      const cp2y = clamp(y2 - (yNext - y1) / 6, minY, maxY)
      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`
    }
    return d
  }

  const linePath = smoothPath()
  const areaPath = `${linePath} L ${W},${H} L 0,${H} Z`
  const baselineY  = toY(BASELINE_W)
  const showBaseline = BASELINE_W >= chartMin && BASELINE_W <= chartMax

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28 md:h-40" preserveAspectRatio="none">
      <defs>
        <linearGradient id="watt-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </linearGradient>
      </defs>
      {showBaseline && (
        <line x1="0" y1={baselineY.toFixed(1)} x2={W} y2={baselineY.toFixed(1)}
          stroke="#374151" strokeWidth="1" strokeDasharray="4 3" />
      )}
      <path d={areaPath} fill="url(#watt-grad)" />
      <path d={linePath} fill="none" stroke="#f59e0b" strokeWidth="0.8"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const { t, locale } = useLocale()
  const d = t.demo
  const gridT = t.grid
  function timeAgo(ts: number): string {
    const diff = Math.floor(now / 1000) - ts
    if (diff < 60) return `${diff}${gridT.sec_ago}`
    return `${Math.floor(diff / 60)} ${gridT.min_ago}`
  }
  const g = t.grid
  const { data, history, hourly, demoEvent, lastEvent, gridSignal, gridCurrent, loading, now, connectionStatus } = useFlexState()

  const tier     = data?.dr_tier ?? 0
  const tierCfg  = TIER_CONFIG[tier] ?? TIER_CONFIG[0]
  const chartData = hourly.length >= 2 ? hourly : history
  const wattages  = chartData.map(h => h.wattage_w)
  const maxW = wattages.length ? Math.max(...wattages).toFixed(1) : '—'
  const avgW = wattages.length
    ? (wattages.reduce((a, b) => a + b, 0) / wattages.length).toFixed(1) : '—'

  const chartTimeLabel = hourly.length >= 2
    ? `Wattage · Last 5 Days (${hourly.length}h)`
    : history.length >= 2
      ? `Wattage · Last ${Math.round((history[history.length - 1].timestamp - history[0].timestamp) / 60)}m`
      : 'Wattage · Live'

  const xLabels = hourly.length >= 2
    ? (() => {
        const first = hourly[0].timestamp, last = hourly[hourly.length - 1].timestamp
        const range = last - first || 1
        return [0, 0.2, 0.4, 0.6, 0.8, 1].map(p => {
          const d = new Date((first + p * range) * 1000)
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        })
      })()
    : history.length >= 2
      ? (() => {
          const first = history[0].timestamp, last = history[history.length - 1].timestamp
          const range = last - first || 1
          return [0, 0.2, 0.4, 0.6, 0.8, 1].map(p => {
            const secsFromEnd = last - (first + p * range)
            if (secsFromEnd < 30) return 'now'
            return `–${Math.round(secsFromEnd / 60)}m`
          })
        })()
      : ['–5m', '–4m', '–3m', '–2m', '–1m', 'now']

  return (
    <div className="min-h-screen bg-(--background) text-neutral-100 font-sans">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="font-[family-name:var(--font-display)] font-bold text-amber-400 tracking-tight text-lg shrink-0 inline-flex items-center gap-1.5">
          Data Joule
          {locale === 'fr' && (
            <>
              <span className="text-base leading-none opacity-70 sm:hidden">⚜</span>
              <QcFlag className="hidden sm:block h-4 w-auto rounded-sm" />
            </>
          )}
          {(locale === 'en' || locale === 'pt') && <span className="text-base leading-none">🏴‍☠️</span>}
        </Link>
        <div className="flex items-center gap-3">
          {connectionStatus === 'stale' && (
            <span className="text-xs font-mono text-yellow-400 border border-yellow-900 bg-yellow-950/30 px-2 py-0.5 rounded-full">
              {d.stale}
            </span>
          )}
          {connectionStatus === 'error' && (
            <span className="text-xs font-mono text-red-400 border border-red-900 bg-red-950/30 px-2 py-0.5 rounded-full">
              {d.connection_lost}
            </span>
          )}
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: connectionStatus === 'error' ? '#f87171' : data ? '#4ade80' : '#6b7280' }}
            />
            <span className="text-xs text-neutral-500 font-mono hidden sm:inline-flex items-center gap-1.5">
              {data ? (
                <>
                  <RpiLogo title={d.live} />
                  <span>· {timeAgo(data.timestamp)}</span>
                </>
              ) : (
                d.waiting
              )}
            </span>
          </div>
          {lastEvent && (
            <div className="hidden md:flex items-center gap-3">
              <span className="h-3 w-px bg-neutral-700" aria-hidden="true" />
              <span className="text-xs text-amber-400 font-mono">
                {d.last_event}: {lastEvent.triggered_by_source} · {timeAgo(lastEvent.ts)}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-neutral-600 font-mono uppercase tracking-widest hidden sm:inline">{d.page_title}</span>
          <LocaleSwitcher />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100">{d.heading}</h1>
          <p className="text-neutral-500 text-sm mt-1 font-mono">{d.node_info}</p>
        </div>

        {/* Primary metrics */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="rounded-lg border border-neutral-800 p-5 animate-pulse">
                <div className="h-3 w-24 bg-neutral-800 rounded mb-4" />
                <div className="h-12 w-32 bg-neutral-800 rounded mb-3" />
                <div className="h-3 w-16 bg-neutral-800 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Wattage */}
            <div className="rounded-lg border p-5 flex flex-col"
              style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
              <div className="text-xs text-amber-600 uppercase tracking-widest mb-2 font-mono">{d.current_load}</div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold font-mono text-amber-400">
                    {data ? data.wattage_w.toFixed(1) : '—'}
                  </span>
                  <span className="text-xl text-amber-600 font-mono">W</span>
                </div>
                {data && history.length > 0 && (() => {
                  const base = Math.max(data.wattage_w, ...history.map(h => h.wattage_w))
                  const pct = base > 0 ? Math.max(0, (base - data.wattage_w) / base * 100) : 0
                  return (
                    <div className="text-xs font-mono text-amber-600/80 mt-3">
                      {d.peak_30m} {base.toFixed(1)} W · ↓{pct.toFixed(0)}%
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* DR Tier */}
            <div className="rounded-lg border p-5 flex flex-col"
              style={{ borderColor: tierCfg.color + '44', background: tierCfg.bg }}>
              <div className="text-xs text-neutral-500 uppercase tracking-widest mb-2 font-mono">{d.dr_tier}</div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-bold font-mono" style={{ color: tierCfg.color }}>{tier}</span>
                  <div>
                    <div className="text-sm font-mono font-semibold" style={{ color: tierCfg.color }}>{tierCfg.label}</div>
                    <div className="text-xs text-neutral-500 font-mono">{d.tier_desc?.[tier] ?? tierCfg.desc}</div>
                  </div>
                </div>
                <div className="flex items-end gap-1 mt-4">
                  {[0, 1, 2, 3, 4].map(t => (
                    <div key={t} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded" style={{
                        height: 4 + t * 3,
                        background: t === tier ? TIER_CONFIG[t].color : 'rgba(115,115,115,0.25)',
                      }} />
                      <span className="text-[10px] font-mono" style={{ color: t === tier ? TIER_CONFIG[t].color : '#6b7280' }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Inference */}
            {(() => {
              const inferenceStatus = data?.inference_status ?? (data?.llm_status === 'active' ? 'active' : 'unknown')
              const tokS = data?.inference_tok_s ?? null
              const inferenceColor =
                inferenceStatus === 'active'    ? '#4ade80' :
                inferenceStatus === 'suspended' ? '#f87171' :
                inferenceStatus === 'error'     ? '#fb923c' : '#6b7280'
              return (
                <div className="rounded-lg border p-5 flex flex-col"
                  style={{ borderColor: inferenceColor + '44', background: inferenceColor === '#4ade80' ? 'rgba(74,222,128,0.05)' : 'transparent' }}>
                  <div className="text-xs text-neutral-500 uppercase tracking-widest mb-2 font-mono">{d.inference}</div>
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-5xl font-bold font-mono" style={{ color: inferenceColor }}>
                        {tokS !== null ? tokS.toFixed(1) : '—'}
                      </span>
                      <span className="text-xl font-mono" style={{ color: inferenceColor + 'aa' }}>tok/s</span>
                    </div>
                    <div className="text-xs font-mono font-semibold" style={{ color: inferenceColor }}>
                      ● {inferenceStatus.toUpperCase()}
                    </div>
                    <div className="text-xs text-neutral-600 font-mono mt-1">Llama-3.2-3B Q4_K_M</div>
                  </div>
                </div>
              )
            })()}

            {/* Grid monitor card */}
            <GridMonitorCard current={gridCurrent} locale={locale} g={g} d={d} />
          </div>
        )}

        {/* Active DR event banner */}
        {demoEvent && demoEvent.end_ts > Math.floor(now / 1000) && (
          <EventBanner event={demoEvent} signal={gridSignal} now={now} locale={locale} d={d} g={g} liveTier={tier} />
        )}

        {/* Wattage chart */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-1 sm:gap-0">
            <span className="text-xs text-neutral-500 uppercase tracking-widest font-mono">{chartTimeLabel}</span>
            <div className="flex gap-4 text-xs font-mono">
              <span className="text-neutral-500">MAX <span className="text-amber-400">{maxW} W</span></span>
              <span className="text-neutral-500">AVG <span className="text-amber-400">{avgW} W</span></span>
            </div>
          </div>
          <SparkChart data={wattages} collectingLabel={d.collecting} />
          <div className="flex justify-between text-xs text-neutral-700 font-mono mt-2">
            {xLabels.map((label, i) => <span key={i}>{label}</span>)}
          </div>
        </div>

        {/* Recent readings */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
          <div className="text-xs text-neutral-500 uppercase tracking-widest font-mono mb-4">{d.recent_readings}</div>
          {history.length === 0 ? (
            <div className="text-neutral-600 text-sm font-mono">{d.no_history}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-neutral-600 border-b border-neutral-800">
                    <th className="text-left py-2 pr-4 sticky left-0 bg-neutral-900">{d.th_time}</th>
                    <th className="text-right py-2 pr-4">{d.th_wattage}</th>
                    <th className="text-right py-2 pr-4">{d.th_tier}</th>
                    <th className="text-right py-2 pr-4">{d.th_llm}</th>
                    <th className="text-right py-2 hidden md:table-cell">{d.th_ven}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().slice(0, 12).map((entry, i) => (
                    <tr key={i} className="border-b border-neutral-800/50">
                      <td className="py-1.5 pr-4 text-neutral-400 sticky left-0 bg-neutral-900">
                        {timeAgo(entry.timestamp)}
                      </td>
                      <td className="py-1.5 pr-4 text-right text-amber-400">{entry.wattage_w.toFixed(1)} W</td>
                      <td className="py-1.5 pr-4 text-right font-semibold"
                        style={{ color: TIER_CONFIG[entry.dr_tier]?.color ?? '#9ca3af' }}>
                        {entry.dr_tier}
                      </td>
                      <td className="py-1.5 pr-4 text-right"
                        style={{ color: entry.llm_status === 'active' ? '#4ade80' : entry.llm_status === 'degraded' ? '#facc15' : '#f87171' }}>
                        {entry.llm_status === 'active' ? d.llm_active : entry.llm_status === 'degraded' ? d.llm_degraded : d.llm_offline}
                      </td>
                      <td className="py-1.5 text-right hidden md:table-cell"
                        style={{ color: entry.openadr_status === 'ready' ? '#22d3ee' : '#6b7280' }}>
                        {entry.openadr_status === 'ready' ? d.ven_ready : d.ven_offline}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <a
            href="/joule-credits"
            className="inline-flex items-center gap-2 text-xs font-mono text-purple-500 hover:text-purple-300 transition-colors border border-purple-900/40 hover:border-purple-700 bg-purple-950/10 rounded-full px-4 py-1.5"
          >
            <span className="text-purple-400">◈</span>
            {d.jlc_banner}
          </a>
        </div>
        <div className="mt-3 text-center text-xs text-neutral-700 font-mono">{d.footer}</div>
      </main>
    </div>
  )
}
