'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { SiteNav } from '../components/SiteNav'
import { SiteFooter } from '../components/SiteFooter'
import ScrollReveal from '../components/ScrollReveal'
import { useLocale } from '../lib/i18n'

type EventReport = {
  event_name: string
  tier: number
  start_ts: number
  end_ts: number
  baseline_w: number
  avg_curtailed_w: number
  duration_s: number
  kwh_reduced: number
  completed_at: number
  tx_hash?: string
}

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_JLC_CONTRACT_ADDRESS ?? null

const ETH_TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/

export default function JouleCreditsPage() {
  const { t } = useLocale()
  const fleet = t.jlc.economics_fleet as readonly string[]
  const ECONOMICS = [
    { fleet: fleet[0], events: '100',          jlc: '0.0375 JLC',    usd: '$0.005'   },
    { fleet: fleet[1], events: '100 each',     jlc: '37.5 JLC',      usd: '$4.50'    },
    { fleet: fleet[2], events: '100 each',     jlc: '37,500 JLC',    usd: '$4,500'   },
    { fleet: fleet[3], events: '100 × 10 kWh', jlc: '1,000,000 JLC', usd: '$120,000' },
  ]
  const WHY_LABELS = t.jlc.why_labels as readonly string[]
  const [events, setEvents] = useState<EventReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLog() {
      try {
        const res = await fetch('/api/events/log')
        if (res.ok) {
          const data = await res.json()
          setEvents(Array.isArray(data) ? data : [])
        }
      } catch {
        // silent — show empty state
      } finally {
        setLoading(false)
      }
    }
    fetchLog()
    const id = setInterval(fetchLog, 30_000)
    return () => clearInterval(id)
  }, [])

  const totalJlc = events.reduce((s, e) => s + e.kwh_reduced, 0)

  const CHAIN_NODES = [
    { label: t.jlc.chain_step_vtn,    sub: 'vtn.data-joule.com',   color: '#22d3ee', glow: '#164e63', bg: 'bg-cyan-950/20',   border: 'border-cyan-900' },
    { label: t.jlc.chain_step_ven,    sub: 'mtl-ven-01',            color: '#22d3ee', glow: '#164e63', bg: 'bg-cyan-950/20',   border: 'border-cyan-900' },
    { label: t.jlc.chain_step_plug,   sub: 'Zigbee · wattage_w',   color: '#f59e0b', glow: '#78350f', bg: 'bg-amber-950/20',  border: 'border-amber-900' },
    { label: t.jlc.chain_step_oracle, sub: 'DON consensus',         color: '#a855f7', glow: '#6b21a8', bg: 'bg-purple-950/20', border: 'border-purple-900' },
    { label: t.jlc.chain_step_evm,    sub: 'JLC token · Polygon',   color: '#d8b4fe', glow: '#6b21a8', bg: 'bg-purple-950/20', border: 'border-purple-900' },
  ]

  return (
    <div className="min-h-screen bg-(--background) text-neutral-100 font-sans">
      <SiteNav />

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(168,85,247,0.10) 0%, transparent 65%)',
            }}
          />
          <div className="relative max-w-7xl mx-auto px-6 pt-10 pb-10 md:pt-24 md:pb-20">
            <ScrollReveal>
              <div className="text-center mb-16">
                <div className="inline-block mb-6">
                  <span className="text-xs font-mono text-purple-400 border border-purple-900 bg-purple-950/30 px-3 py-1 rounded-full">
                    {t.jlc.testnet_badge}
                  </span>
                </div>

                <h1 className="text-5xl lg:text-6xl font-bold tracking-[0.2em] text-neutral-50 mb-4 uppercase font-mono">
                  {t.jlc.hero_title}
                </h1>

                <p className="text-sm font-mono text-purple-400 mb-10">
                  {t.jlc.hero_sub}
                </p>

                <div className="flex justify-center mb-10">
                  <div
                    className="w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden shrink-0"
                    style={{ boxShadow: '0 0 48px 8px rgba(168,85,247,0.45)' }}
                  >
                    <Image
                      src="/jlc-coin.png"
                      alt="Joule Credits"
                      priority
                      width={300}
                      height={300}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Stat cards */}
                <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                  <div className="rounded-lg border border-purple-900/60 bg-purple-950/15 p-6 text-left">
                    <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-2">
                      {t.jlc.total_minted}
                    </div>
                    <div className="font-mono text-2xl font-bold text-amber-400">
                      {loading ? '—' : totalJlc === 0 ? '—' : totalJlc.toFixed(6)}
                    </div>
                    <div className="text-xs font-mono text-purple-600 mt-1">JLC</div>
                  </div>

                  <div className="rounded-lg border border-purple-900/60 bg-purple-950/15 p-6 text-left">
                    <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-2">
                      {t.jlc.events_verified}
                    </div>
                    <div className="font-mono text-2xl font-bold text-amber-400">
                      {loading ? '—' : events.length}
                    </div>
                    <div className="text-xs font-mono text-neutral-600 mt-1">
                      {CONTRACT_ADDRESS ? 'on Polygon Mainnet' : 'pending deploy'}
                    </div>
                  </div>

                  <div className="rounded-lg border border-purple-900/60 bg-purple-950/15 p-6 text-left">
                    <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-2">
                      {t.jlc.contract}
                    </div>
                    {CONTRACT_ADDRESS ? (
                      <a
                        href={`https://polygonscan.com/token/${CONTRACT_ADDRESS}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm font-bold text-purple-300 hover:text-purple-100 transition-colors"
                      >
                        {CONTRACT_ADDRESS.slice(0, 6)}…{CONTRACT_ADDRESS.slice(-4)}
                        <span className="ml-1 text-xs text-neutral-600">↗</span>
                      </a>
                    ) : (
                      <div className="font-mono text-sm text-neutral-600">Deploying…</div>
                    )}
                    <div className="text-xs font-mono text-neutral-600 mt-1">Polygon Mainnet</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── Verification Chain ── */}
        <section className="border-t border-neutral-800 py-12 md:py-24">
          <div className="max-w-7xl mx-auto px-6">
            <ScrollReveal>
              <h2 className="text-2xl font-bold mb-2 text-neutral-100">{t.jlc.chain_title}</h2>
              <p className="text-neutral-500 text-sm font-mono mb-12">
                {t.jlc.stat_equation} · {t.jlc.decentralized_verification}
              </p>
            </ScrollReveal>

            <ScrollReveal delay={150}>
              {/* Desktop horizontal SVG chain */}
              <div className="hidden sm:block mb-8">
                <svg
                  viewBox="0 0 880 104"
                  className="w-full"
                  aria-label="Verification chain: OpenADR VTN to VEN to Smart Plug to Chainlink DON to ERC-20 Mint"
                >
                  <defs>
                    <marker id="jlc-arr-cyan" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
                      <path d="M0,0 L6,2.5 L0,5 Z" fill="#164e63"/>
                    </marker>
                    <marker id="jlc-arr-amber" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
                      <path d="M0,0 L6,2.5 L0,5 Z" fill="#78350f"/>
                    </marker>
                    <marker id="jlc-arr-purple" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
                      <path d="M0,0 L6,2.5 L0,5 Z" fill="#6b21a8"/>
                    </marker>
                    <filter id="jlc-glow-purple" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                  </defs>

                  {/* VTN */}
                  <rect x="0" y="14" width="148" height="76" rx="8" fill="#091420" stroke="#164e63" strokeWidth="1.5"/>
                  <circle cx="20" cy="36" r="4" fill="none" stroke="#22d3ee" strokeWidth="1.5"/>
                  <text x="74" y="40" textAnchor="middle" fill="#22d3ee" fontSize="11" fontFamily="var(--font-mono)" fontWeight="700">OpenADR VTN</text>
                  <text x="74" y="57" textAnchor="middle" fill="#164e63" fontSize="8.5" fontFamily="var(--font-mono)">vtn.data-joule.com</text>
                  <text x="74" y="72" textAnchor="middle" fill="#0c3344" fontSize="8" fontFamily="var(--font-mono)">Issues event + ID</text>

                  <path d="M148,52 L180,52" stroke="#164e63" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#jlc-arr-cyan)" className="animate-signal-dash"/>

                  {/* VEN */}
                  <rect x="186" y="14" width="148" height="76" rx="8" fill="#091420" stroke="#164e63" strokeWidth="1.5"/>
                  <circle cx="206" cy="36" r="4" fill="none" stroke="#22d3ee" strokeWidth="1.5"/>
                  <text x="260" y="40" textAnchor="middle" fill="#22d3ee" fontSize="11" fontFamily="var(--font-mono)" fontWeight="700">VEN Control</text>
                  <text x="260" y="57" textAnchor="middle" fill="#164e63" fontSize="8.5" fontFamily="var(--font-mono)">mtl-ven-01</text>
                  <text x="260" y="72" textAnchor="middle" fill="#0c3344" fontSize="8" fontFamily="var(--font-mono)">Applies tier ladder</text>

                  <path d="M334,52 L366,52" stroke="#78350f" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#jlc-arr-amber)" className="animate-signal-dash" style={{animationDelay: '0.25s'}}/>

                  {/* Smart Plug */}
                  <rect x="372" y="14" width="148" height="76" rx="8" fill="#150a00" stroke="#78350f" strokeWidth="1.5"/>
                  <circle cx="392" cy="36" r="4" fill="none" stroke="#f59e0b" strokeWidth="1.5"/>
                  <text x="446" y="40" textAnchor="middle" fill="#f59e0b" fontSize="11" fontFamily="var(--font-mono)" fontWeight="700">Smart Plug</text>
                  <text x="446" y="57" textAnchor="middle" fill="#78350f" fontSize="8.5" fontFamily="var(--font-mono)">Zigbee · wattage_w</text>
                  <text x="446" y="72" textAnchor="middle" fill="#422006" fontSize="8" fontFamily="var(--font-mono)">Physical measurement</text>

                  <path d="M520,52 L552,52" stroke="#6b21a8" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#jlc-arr-purple)" className="animate-signal-dash" style={{animationDelay: '0.5s'}}/>

                  {/* Chainlink DON */}
                  <rect x="558" y="14" width="162" height="76" rx="8" fill="#0f0421" stroke="#7e22ce" strokeWidth="1.5" filter="url(#jlc-glow-purple)"/>
                  <circle cx="580" cy="36" r="4" fill="none" stroke="#a855f7" strokeWidth="2"/>
                  <text x="639" y="40" textAnchor="middle" fill="#a855f7" fontSize="11" fontFamily="var(--font-mono)" fontWeight="700">Chainlink DON</text>
                  <text x="639" y="57" textAnchor="middle" fill="#6b21a8" fontSize="8.5" fontFamily="var(--font-mono)">Functions · consensus</text>
                  <text x="639" y="72" textAnchor="middle" fill="#3b0764" fontSize="8" fontFamily="var(--font-mono)">{t.jlc.oracle_sub}</text>

                  <path d="M720,52 L752,52" stroke="#6b21a8" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#jlc-arr-purple)" className="animate-signal-dash" style={{animationDelay: '0.75s'}}/>

                  {/* ERC-20 Mint */}
                  <rect x="758" y="14" width="122" height="76" rx="8" fill="#0f0421" stroke="#7e22ce" strokeWidth="1.5" filter="url(#jlc-glow-purple)"/>
                  <circle cx="778" cy="36" r="4" fill="#a855f7" stroke="#a855f7" strokeWidth="1.5"/>
                  <text x="819" y="40" textAnchor="middle" fill="#d8b4fe" fontSize="11" fontFamily="var(--font-mono)" fontWeight="700">ERC-20 Mint</text>
                  <text x="819" y="57" textAnchor="middle" fill="#6b21a8" fontSize="8.5" fontFamily="var(--font-mono)">JLC · Amoy</text>
                  <text x="819" y="72" textAnchor="middle" fill="#3b0764" fontSize="8" fontFamily="var(--font-mono)">kWh × 10¹⁸ wei</text>
                </svg>
              </div>

              {/* Mobile vertical chain */}
              <div className="sm:hidden space-y-2 mb-8">
                {CHAIN_NODES.map((node, i) => (
                  <div key={i}>
                    <div className={`rounded-lg border ${node.border} ${node.bg} px-4 py-3 flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: node.color }}
                        />
                        <span className="font-mono text-xs font-semibold" style={{ color: node.color }}>
                          {node.label}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-neutral-600">{node.sub}</span>
                    </div>
                    {i < CHAIN_NODES.length - 1 && (
                      <div className="text-center text-neutral-700 text-sm py-0.5">↓</div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── Why This Is Different ── */}
        <section className="bg-[#0d0914] border-t border-neutral-800 py-12 md:py-24">
          <div className="max-w-7xl mx-auto px-6">
            <ScrollReveal>
              <h2 className="text-2xl font-bold mb-8 text-neutral-100">{t.jlc.why_title}</h2>
              <div className="grid lg:grid-cols-3 gap-6">
                {([t.jlc.why_p1, t.jlc.why_p2, t.jlc.why_p3] as const).map((para, i) => (
                  <div key={i} className="rounded-lg border border-purple-900/30 bg-purple-950/10 p-5">
                    <div className="text-purple-600 font-mono text-xs uppercase tracking-widest mb-3">
                      {WHY_LABELS[i]}
                    </div>
                    <p className="text-sm text-neutral-400 leading-relaxed">{para}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── Event Log ── */}
        <section className="border-t border-neutral-800 py-12 md:py-24">
          <div className="max-w-7xl mx-auto px-6">
            <ScrollReveal>
              <h2 className="text-2xl font-bold mb-2 text-neutral-100">{t.jlc.log_title}</h2>
              <p className="text-neutral-500 text-sm font-mono mb-8">
                {t.jlc.log_sub}
              </p>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div className="overflow-x-auto rounded-lg border border-neutral-800">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900/60">
                      {[
                        { label: t.jlc.log_col_date,      align: 'text-left'   },
                        { label: t.jlc.log_col_event,     align: 'text-left'   },
                        { label: t.jlc.log_col_tier,      align: 'text-center' },
                        { label: t.jlc.log_col_curtailed, align: 'text-right'  },
                        { label: t.jlc.log_col_jlc,       align: 'text-right'  },
                        { label: t.jlc.log_col_tx,        align: 'text-center' },
                      ].map(({ label, align }) => (
                        <th key={label} className={`${align} px-4 py-3 text-neutral-500 uppercase tracking-widest font-normal`}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-neutral-600">
                          {t.jlc.loading}
                        </td>
                      </tr>
                    ) : events.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-neutral-600">
                          {t.jlc.log_empty}
                        </td>
                      </tr>
                    ) : (
                      events.map((ev) => (
                        <tr
                          key={ev.event_name}
                          className="border-b border-neutral-800/50 hover:bg-neutral-900/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-neutral-400 whitespace-nowrap">
                            {new Date(ev.completed_at * 1000).toLocaleString('en-CA', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="px-4 py-3 text-neutral-300">{ev.event_name}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-amber-400">T{ev.tier}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-neutral-300">
                            {(ev.baseline_w - ev.avg_curtailed_w).toFixed(1)} W
                          </td>
                          <td className="px-4 py-3 text-right text-purple-300 font-bold">
                            {ev.kwh_reduced.toFixed(6)} JLC
                          </td>
                          <td className="px-4 py-3 text-center">
                            {ev.tx_hash && ETH_TX_HASH_RE.test(ev.tx_hash) ? (
                              <a
                                href={`https://polygonscan.com/tx/${ev.tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-400 hover:text-purple-200 transition-colors"
                                aria-label="View on Polygonscan"
                              >
                                ↗
                              </a>
                            ) : (
                              <span className="text-neutral-700">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── Token Economics ── */}
        <section className="bg-[#0d0914] border-t border-neutral-800 py-12 md:py-24">
          <div className="max-w-7xl mx-auto px-6">
            <ScrollReveal>
              <h2 className="text-2xl font-bold mb-2 text-neutral-100">{t.jlc.economics_title}</h2>
              <p className="text-neutral-500 text-sm font-mono mb-8">
                {t.jlc.economics_sub}
              </p>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div className="overflow-x-auto rounded-lg border border-neutral-800">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900/60">
                      <th className="text-left   px-4 py-3 text-neutral-500 uppercase tracking-widest font-normal">{t.jlc.economics_col_fleet}</th>
                      <th className="text-right  px-4 py-3 text-neutral-500 uppercase tracking-widest font-normal">{t.jlc.economics_col_events}</th>
                      <th className="text-right  px-4 py-3 text-neutral-500 uppercase tracking-widest font-normal">{t.jlc.economics_col_jlc}</th>
                      <th className="text-right  px-4 py-3 text-neutral-500 uppercase tracking-widest font-normal">{t.jlc.economics_col_usd}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ECONOMICS.map((row, i) => (
                      <tr
                        key={i}
                        className={`border-b border-neutral-800/50 ${i === ECONOMICS.length - 1 ? 'bg-purple-950/10' : ''}`}
                      >
                        <td className={`px-4 py-3 ${i === ECONOMICS.length - 1 ? 'text-purple-300 font-bold' : 'text-neutral-300'}`}>
                          {row.fleet}
                          {i === ECONOMICS.length - 1 && (
                            <span className="ml-2 text-purple-700 text-xs font-normal">{t.jlc.phase3}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-400">{row.events}</td>
                        <td className={`px-4 py-3 text-right font-bold ${i === ECONOMICS.length - 1 ? 'text-purple-300' : 'text-amber-400'}`}>
                          {row.jlc}
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-400">{row.usd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs font-mono text-neutral-700 mt-3">
                {t.jlc.v2g_note}
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* ── Contract Info ── */}
        <section className="border-t border-neutral-800 py-12 md:py-24">
          <div className="max-w-7xl mx-auto px-6">
            <ScrollReveal>
              <h2 className="text-2xl font-bold mb-8 text-neutral-100">{t.jlc.contract_title}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <a
                  href="https://github.com/Data-Joule/joule-credits"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 hover:border-purple-900/60 hover:bg-purple-950/10 transition-colors group"
                >
                  <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-2">
                    {t.jlc.view_source}
                  </div>
                  <div className="text-sm text-purple-300 group-hover:text-purple-100 transition-colors">
                    GitHub ↗
                  </div>
                  <div className="text-xs text-neutral-600 mt-1 font-mono">joule-credits repo</div>
                </a>

                {CONTRACT_ADDRESS ? (
                  <a
                    href={`https://polygonscan.com/token/${CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 hover:border-purple-900/60 hover:bg-purple-950/10 transition-colors group"
                  >
                    <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-2">
                      {t.jlc.polygonscan}
                    </div>
                    <div className="text-sm text-purple-300 group-hover:text-purple-100 font-mono transition-colors">
                      {CONTRACT_ADDRESS.slice(0, 10)}… ↗
                    </div>
                    <div className="text-xs text-neutral-600 mt-1 font-mono">Polygon Mainnet</div>
                  </a>
                ) : (
                  <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
                    <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-2">
                      {t.jlc.polygonscan}
                    </div>
                    <div className="text-sm text-neutral-600 font-mono">Deploying…</div>
                    <div className="text-xs text-neutral-700 mt-1 font-mono">Polygon Mainnet testnet</div>
                  </div>
                )}

                <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
                  <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-2">Network</div>
                  <div className="text-sm text-neutral-300 font-mono">Polygon Mainnet</div>
                  <div className="text-xs text-neutral-600 mt-1 font-mono">chainId 137</div>
                </div>

                <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
                  <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-2">License</div>
                  <div className="text-sm text-neutral-300 font-mono">Apache 2.0</div>
                  <div className="text-xs text-neutral-600 mt-1 font-mono">Patent protected</div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-neutral-800">
                <Link
                  href="/"
                  className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors font-mono"
                >
                  ← data-joule.com
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
