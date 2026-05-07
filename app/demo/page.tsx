'use client'

import Link from 'next/link'
import { LocaleSwitcher } from '@/app/components/SiteNav'
import { useFlexState } from '@/app/hooks/useFlexState'
import type { DemoEvent, GridSignal, GridSource } from '@/app/hooks/useFlexState'
import { TIER_CONFIG, secondsAgo } from '@/app/lib/telemetry'
import { useLocale, type Locale } from '@/app/lib/i18n'

const BASELINE_W = 4.8

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCountdown(secs: number): string {
  const s = Math.max(0, Math.floor(secs))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function fmtMW(mw: number): string {
  return mw >= 1000
    ? `${(mw / 1000).toFixed(1)} GW`
    : `${Math.round(mw).toLocaleString()} MW`
}

function updatedAgo(updated: string, now: number, tUpdated: string, tMinAgo: string, tJustNow: string): string {
  if (!updated) return ''
  try {
    const ts = new Date(updated).getTime()
    if (isNaN(ts)) return ''
    const diffMin = Math.floor((now - ts) / 60000)
    if (diffMin < 1) return tJustNow
    return `${tUpdated} ${diffMin} ${tMinAgo}`
  } catch {
    return ''
  }
}

function tierStatusLabel(tier: number, g: ReturnType<typeof useLocale>['t']['grid']): string {
  if (tier >= 3) return g.status.critical
  if (tier === 2) return g.status.high
  if (tier === 1) return g.status.moderate
  return g.status.normal
}

// ── Demand bar ────────────────────────────────────────────────────────────────

function DemandBar({ pct }: { pct: number }) {
  const color =
    pct >= 90 ? '#f87171' :
    pct >= 80 ? '#fb923c' :
    pct >= 70 ? '#facc15' : '#4ade80'
  return (
    <div className="w-full bg-neutral-800 rounded-full h-1 my-1.5">
      <div
        className="h-1 rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
      />
    </div>
  )
}

// ── Source card ───────────────────────────────────────────────────────────────

function SourceCard({
  label, source, highlight, now, g,
}: {
  label: string
  source: GridSource | null | undefined
  highlight: boolean
  now: number
  g: ReturnType<typeof useLocale>['t']['grid']
}) {
  const tierColor = TIER_CONFIG[source?.tier ?? 0]?.color ?? '#6b7280'
  const borderColor = highlight
    ? (source?.tier ? tierColor : '#f59e0b')
    : 'rgba(55,65,81,0.6)'

  if (!source) {
    return (
      <div
        className="rounded-lg border p-4 flex-1 min-w-0"
        style={{ borderColor, opacity: 0.5 }}
      >
        <div className="text-xs text-neutral-500 font-mono uppercase tracking-widest mb-1">{label}</div>
        <div className="text-sm text-neutral-600 font-mono">{g.unavailable}</div>
      </div>
    )
  }

  const statusLabel = tierStatusLabel(source.tier, g)
  const updStr = updatedAgo(source.updated, now, g.updated, g.min_ago, g.just_now)

  return (
    <div
      className="rounded-lg border p-4 flex-1 min-w-0"
      style={{ borderColor, background: highlight ? `${tierColor}09` : 'transparent' }}
    >
      <div
        className="text-xs font-mono uppercase tracking-widest mb-1"
        style={{ color: highlight ? tierColor : '#6b7280' }}
      >
        {label}
      </div>
      <div className="text-xl font-bold font-mono text-neutral-100 mb-0.5">
        {fmtMW(source.demand_mw)}
      </div>
      <DemandBar pct={source.demand_pct} />
      <div className="flex items-center justify-between text-xs font-mono">
        <span style={{ color: tierColor }}>● {statusLabel}</span>
        <span className="text-neutral-600">{source.demand_pct.toFixed(1)}%</span>
      </div>
      {'peak_event_active' in source && source.peak_event_active ? (
        <div className="mt-1 text-xs font-mono text-red-400">{g.peak_alert}</div>
      ) : 'peak_event_active' in source ? (
        <div className="mt-1 text-xs font-mono text-neutral-700">{g.no_peak}</div>
      ) : null}
      {updStr && (
        <div className="mt-1 text-xs text-neutral-700 font-mono">{updStr}</div>
      )}
    </div>
  )
}

// ── Grid signal panel ─────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, { key: keyof ReturnType<typeof useLocale>['t']['grid'] }> = {
  hydroquebec: { key: 'source_hq' },
  isne:        { key: 'source_isne' },
  caiso:       { key: 'source_caiso' },
  nyiso:       { key: 'source_nyiso' },
  ons:         { key: 'source_ons' },
}

function GridSignalPanel({
  signal, locale, demoEvent, now, g,
}: {
  signal: GridSignal | null
  locale: Locale
  demoEvent: DemoEvent | null
  now: number
  g: ReturnType<typeof useLocale>['t']['grid']
}) {
  if (!signal) return null

  const activeEvent = demoEvent && demoEvent.end_ts > Math.floor(now / 1000)
  const triggeredLocale = signal.triggered_by_locale
  const isCrossLocale = activeEvent && triggeredLocale && triggeredLocale !== locale && !signal.is_synthetic

  const fr = signal.fr
  const en = signal.en
  const pt = signal.pt

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5 mb-6">
      <div className="text-xs text-neutral-500 uppercase tracking-widest font-mono mb-4">
        {g.panel_title}
      </div>

      {/* Locale-appropriate sources */}
      {locale === 'fr' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <SourceCard label={g.source_hq}   source={fr?.hq}   highlight={fr?.triggered_by === 'hydroquebec' && !!activeEvent} now={now} g={g} />
          <SourceCard label={g.source_isne} source={fr?.isne} highlight={fr?.triggered_by === 'isne' && !!activeEvent}        now={now} g={g} />
        </div>
      )}
      {locale === 'en' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <SourceCard label={g.source_caiso} source={en?.caiso} highlight={en?.triggered_by === 'caiso' && !!activeEvent} now={now} g={g} />
          <SourceCard label={g.source_nyiso} source={en?.nyiso} highlight={en?.triggered_by === 'nyiso' && !!activeEvent} now={now} g={g} />
        </div>
      )}
      {locale === 'pt' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <SourceCard label={g.source_ons} source={pt?.ons} highlight={pt?.triggered_by === 'ons' && !!activeEvent} now={now} g={g} />
        </div>
      )}

      {/* Cross-locale event source card */}
      {isCrossLocale && (
        <>
          <div className="flex items-center gap-2 my-4">
            <span className="text-xs font-mono text-amber-500">{g.event_source}</span>
            <div className="flex-1 h-px bg-amber-900/40" />
          </div>
          {triggeredLocale === 'fr' && (
            <div className="flex flex-col sm:flex-row gap-3">
              {signal.triggered_by_source === 'hydroquebec'
                ? <SourceCard label={g.source_hq}   source={fr?.hq}   highlight now={now} g={g} />
                : <SourceCard label={g.source_isne} source={fr?.isne} highlight now={now} g={g} />}
            </div>
          )}
          {triggeredLocale === 'en' && (
            <div className="flex flex-col sm:flex-row gap-3">
              {signal.triggered_by_source === 'caiso'
                ? <SourceCard label={g.source_caiso} source={en?.caiso} highlight now={now} g={g} />
                : <SourceCard label={g.source_nyiso} source={en?.nyiso} highlight now={now} g={g} />}
            </div>
          )}
          {triggeredLocale === 'pt' && (
            <SourceCard label={g.source_ons} source={pt?.ons} highlight now={now} g={g} />
          )}
        </>
      )}
    </div>
  )
}

// ── Event banner ──────────────────────────────────────────────────────────────

function EventBanner({
  event, signal, now, locale, d, g,
}: {
  event: DemoEvent
  signal: GridSignal | null
  now: number
  locale: Locale
  d: ReturnType<typeof useLocale>['t']['demo']
  g: ReturnType<typeof useLocale>['t']['grid']
}) {
  const nowSec  = Math.floor(now / 1000)
  const secsLeft = event.end_ts - nowSec
  if (secsLeft <= 0) return null

  const cfg    = TIER_CONFIG[event.tier] ?? TIER_CONFIG[0]
  const isSynthetic = signal?.is_synthetic ?? true

  // Build trigger description
  let triggerLine: string | null = null
  if (!isSynthetic && signal?.triggered_by_source) {
    const srcKey = SOURCE_LABELS[signal.triggered_by_source]?.key
    const srcLabel = srcKey ? (g[srcKey] as string) : signal.triggered_by_source

    // Find demand_pct from the triggering source
    let demandPct: number | null = null
    const tbl = signal.triggered_by_locale
    if (tbl === 'fr') {
      const src = signal.triggered_by_source === 'hydroquebec' ? signal.fr?.hq : signal.fr?.isne
      demandPct = src?.demand_pct ?? null
    } else if (tbl === 'en') {
      const src = signal.triggered_by_source === 'caiso' ? signal.en?.caiso : signal.en?.nyiso
      demandPct = src?.demand_pct ?? null
    } else if (tbl === 'pt') {
      demandPct = signal.pt?.ons?.demand_pct ?? null
    }

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
      <div className="flex items-start justify-between flex-wrap gap-3">
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
          {isSynthetic && (
            <div className="text-xs text-neutral-600 mt-1">{g.grid_low}</div>
          )}
          <div className="text-xs text-neutral-500 mt-1">{cfg.desc}</div>
        </div>
        <div className="text-right shrink-0">
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
  const g = t.grid
  const { data, history, hourly, demoEvent, nextEventTs, gridSignal, loading, now, connectionStatus } = useFlexState()

  const tier     = data?.dr_tier ?? 0
  const tierCfg  = TIER_CONFIG[tier] ?? TIER_CONFIG[0]
  const chartData = hourly.length >= 2 ? hourly : history
  const wattages  = chartData.map(h => h.wattage_w)
  const maxW = wattages.length ? Math.max(...wattages).toFixed(1) : '—'
  const avgW = wattages.length
    ? (wattages.reduce((a, b) => a + b, 0) / wattages.length).toFixed(1) : '—'

  const activeEvent   = demoEvent && demoEvent.end_ts > Math.floor(now / 1000)
  const showNextCheck = !activeEvent

  // "Next check" countdown: based on gridSignal.fetched_at + 300, fallback to nextEventTs
  const nextCheckTs = gridSignal?.fetched_at ? gridSignal.fetched_at + 300 : (nextEventTs ?? null)
  const nextCheckLabel = showNextCheck
    ? nextCheckTs && nextCheckTs > Math.floor(now / 1000)
      ? `${g.next_check} ${fmtCountdown(nextCheckTs - Math.floor(now / 1000))}`
      : d.events_schedule
    : null

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
        <Link href="/" className="font-[family-name:var(--font-display)] font-bold text-amber-400 tracking-tight text-lg shrink-0">
          Data Joule
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
            <span className="text-xs text-neutral-500 font-mono hidden sm:inline">
              {data ? `${d.live} · ${secondsAgo(data.timestamp, now)}` : d.waiting}
            </span>
          </div>
          {nextCheckLabel && (
            <div className="hidden md:flex items-center gap-3">
              <span className="h-3 w-px bg-neutral-700" aria-hidden="true" />
              <span className="text-xs text-amber-400 font-mono">{nextCheckLabel}</span>
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
            <div className="rounded-lg border p-5"
              style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
              <div className="text-xs text-amber-600 uppercase tracking-widest mb-2 font-mono">{d.current_load}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold font-mono text-amber-400">
                  {data ? data.wattage_w.toFixed(1) : '—'}
                </span>
                <span className="text-xl text-amber-600 font-mono">W</span>
              </div>
            </div>

            {/* DR Tier */}
            <div className="rounded-lg border p-5"
              style={{ borderColor: tierCfg.color + '44', background: tierCfg.bg }}>
              <div className="text-xs text-neutral-500 uppercase tracking-widest mb-2 font-mono">{d.dr_tier}</div>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold font-mono" style={{ color: tierCfg.color }}>{tier}</span>
                <div>
                  <div className="text-sm font-mono font-semibold" style={{ color: tierCfg.color }}>{tierCfg.label}</div>
                  <div className="text-xs text-neutral-500 font-mono">{tierCfg.desc}</div>
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
                <div className="rounded-lg border p-5"
                  style={{ borderColor: inferenceColor + '44', background: inferenceColor === '#4ade80' ? 'rgba(74,222,128,0.05)' : 'transparent' }}>
                  <div className="text-xs text-neutral-500 uppercase tracking-widest mb-2 font-mono">{d.inference}</div>
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
              )
            })()}
          </div>
        )}

        {/* Grid signal panel — always visible */}
        <GridSignalPanel signal={gridSignal} locale={locale} demoEvent={demoEvent} now={now} g={g} />

        {/* Active DR event banner */}
        {demoEvent && demoEvent.end_ts > Math.floor(now / 1000) && (
          <EventBanner event={demoEvent} signal={gridSignal} now={now} locale={locale} d={d} g={g} />
        )}

        {/* Wattage chart */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
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
                        {secondsAgo(entry.timestamp, now)}
                      </td>
                      <td className="py-1.5 pr-4 text-right text-amber-400">{entry.wattage_w.toFixed(1)} W</td>
                      <td className="py-1.5 pr-4 text-right font-semibold"
                        style={{ color: TIER_CONFIG[entry.dr_tier]?.color ?? '#9ca3af' }}>
                        {entry.dr_tier}
                      </td>
                      <td className="py-1.5 pr-4 text-right"
                        style={{ color: entry.llm_status === 'active' ? '#4ade80' : entry.llm_status === 'degraded' ? '#facc15' : '#f87171' }}>
                        {entry.llm_status.toUpperCase()}
                      </td>
                      <td className="py-1.5 text-right hidden md:table-cell"
                        style={{ color: entry.openadr_status === 'ready' ? '#22d3ee' : '#6b7280' }}>
                        {entry.openadr_status.toUpperCase()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-neutral-700 font-mono">{d.footer}</div>
      </main>
    </div>
  )
}
