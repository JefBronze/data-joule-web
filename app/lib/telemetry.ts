export type TelemetryEntry = {
  dr_tier: number
  wattage_w: number
  llm_status: string
  openadr_status: string
  timestamp: number
  inference_tok_s?: number
  inference_status?: string
}

export type TierConfig = {
  label: string
  desc: string
  color: string
  bg: string
}

export const TIER_CONFIG: Record<number, TierConfig> = {
  0: { label: 'TIER 0', desc: 'BASELINE',   color: '#4ade80', bg: 'rgba(74,222,128,0.08)' },
  1: { label: 'TIER 1', desc: 'THROTTLED',  color: '#facc15', bg: 'rgba(250,204,21,0.08)' },
  2: { label: 'TIER 2', desc: 'POWER-SAVE', color: '#fb923c', bg: 'rgba(251,146,60,0.08)' },
  3: { label: 'TIER 3', desc: 'SUSPENDED',  color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
  4: { label: 'TIER 4', desc: 'HALT',       color: '#991b1b', bg: 'rgba(153,27,27,0.12)' },
}

export const TIER_LABEL: Record<number, string> = Object.fromEntries(
  Object.entries(TIER_CONFIG).map(([k, v]) => [k, v.desc])
)

export const TIER_COLOR: Record<number, string> = Object.fromEntries(
  Object.entries(TIER_CONFIG).map(([k, v]) => [k, v.color])
)

export function secondsAgo(ts: number, now: number): string {
  const diff = Math.floor(now / 1000) - ts
  if (diff < 60) return `${diff}s ago`
  return `${Math.floor(diff / 60)}m ago`
}
