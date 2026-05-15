'use client'

import { useFlexState } from '@/app/hooks/useFlexState'
import { useLocale } from '@/app/lib/i18n'
import { TIER_COLOR } from '@/app/lib/telemetry'

export function LiveStatusHero() {
  const { data, loading, now } = useFlexState()
  const { t } = useLocale()
  const tier = data?.dr_tier ?? 0
  const tierColor = TIER_COLOR[tier] ?? TIER_COLOR[0]
  const tierLabels = t.home.tier_labels as readonly string[]
  const tierLabel = tierLabels[tier] ?? 'UNKNOWN'

  const diff = data ? Math.floor(now / 1000) - data.timestamp : 0
  const timeStr = diff < 60
    ? `${diff}${t.grid.sec_ago}`
    : `${Math.floor(diff / 60)} ${t.grid.min_ago}`

  return (
    <div
      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      className="rounded-lg border bg-neutral-900 p-5 w-full font-mono"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-neutral-400 uppercase tracking-widest">{t.home.live_node}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border${tier > 0 ? ' animate-pulse-ring' : ''}`}
          style={{ color: tierColor, borderColor: tierColor + '44', backgroundColor: tierColor + '18' }}
        >
          {tierLabel}
        </span>
      </div>

      {loading ? (
        <div className="h-12 w-32 bg-neutral-800 rounded animate-pulse mb-2" />
      ) : data ? (
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-4xl font-bold text-amber-400">
            {data.wattage_w.toFixed(1)}
          </span>
          <span className="text-lg text-amber-600">W</span>
        </div>
      ) : (
        <div className="text-neutral-500 text-sm mb-3">{t.home.waiting_telemetry}</div>
      )}

      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-neutral-400">LLM</span>
          <span className={
            data?.llm_status === 'active' ? 'text-green-400' :
            data?.llm_status === 'degraded' ? 'text-yellow-400' : 'text-red-400'
          }>
            ● {(data?.llm_status ?? 'offline').toUpperCase()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-neutral-400">VEN</span>
          <span className={data?.openadr_status === 'ready' ? 'text-cyan-400' : 'text-neutral-500'}>
            ● {(data?.openadr_status ?? 'offline').toUpperCase()}
          </span>
        </div>
      </div>

      {data && (
        <div className="mt-4 text-xs text-neutral-400 border-t border-neutral-800 pt-2">
          {t.grid.updated} {timeStr}
        </div>
      )}
    </div>
  )
}
