import Link from 'next/link'
import { LiveStatusHero } from './components/LiveStatus'
import ScrollReveal from './components/ScrollReveal'
import { SiteNav } from './components/SiteNav'
import { SiteFooter } from './components/SiteFooter'

const RESPONSE_LADDER = [
  {
    tier: 0,
    name: 'Baseline',
    action: 'ondemand governor, full inference active',
    power: '~14 W',
    reduction: '—',
    sla: 'Full service',
    color: '#4ade80',
  },
  {
    tier: 1,
    name: 'Throttle',
    action: 'conservative CPU governor, inference continues',
    power: '~11 W',
    reduction: '−21%',
    sla: '~10% slower',
    color: '#facc15',
  },
  {
    tier: 2,
    name: 'Power-save',
    action: 'powersave CPU governor, inference continues',
    power: '~8 W',
    reduction: '−43%',
    sla: '~40% slower',
    color: '#fb923c',
  },
  {
    tier: 3,
    name: 'Suspend',
    action: 'SIGSTOP sent to llama-server process',
    power: '~4 W',
    reduction: '−71%',
    sla: 'Offline',
    color: '#f87171',
  },
  {
    tier: 4,
    name: 'Halt',
    action: 'systemctl halt — node goes offline',
    power: '~2 W',
    reduction: '−86%',
    sla: 'Node offline',
    color: '#991b1b',
  },
]

const PROOF_ITEMS = [
  {
    label: 'Hardware',
    value: 'Raspberry Pi 5',
    icon: (
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" className="text-amber-500">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="5" y="5" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1"/>
        <line x1="5" y1="0" x2="5" y2="2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="8" y1="0" x2="8" y2="2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="11" y1="0" x2="11" y2="2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="5" y1="14" x2="5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="8" y1="14" x2="8" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="11" y1="14" x2="11" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'Protocol',
    value: 'OpenADR 3.0',
    icon: (
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" className="text-amber-500">
        <path d="M8 14C11.314 14 14 11.314 14 8C14 4.686 11.314 2 8 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M8 11C9.657 11 11 9.657 11 8C11 6.343 9.657 5 8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
      </svg>
    ),
  },
  {
    label: 'Signal source',
    value: 'VTN on VPS',
    icon: (
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" className="text-amber-500">
        <rect x="2" y="8" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <line x1="5" y1="10.5" x2="11" y2="10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        <line x1="5" y1="12" x2="8" y2="12" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        <path d="M5 8V5.5C5 3.567 6.567 2 8.5 2H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M11 8V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="11" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
  },
  {
    label: 'Response tiers',
    value: '4 levels',
    icon: (
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" className="text-amber-500">
        <path d="M8 2L10 6H14L11 9L12 13L8 10.5L4 13L5 9L2 6H6L8 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-(--background) text-neutral-100 font-sans">

      <SiteNav />

      <main>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(251,191,36,0.06) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-20">
          <div className="flex flex-col lg:flex-row items-start gap-12">
            <div className="flex-1">
              <ScrollReveal>
                <div className="inline-block mb-6">
                  <span className="text-xs font-mono text-cyan-400 border border-cyan-900 bg-cyan-950/30 px-3 py-1 rounded-full">
                    OpenADR 3.0 · Live Hardware · Montréal, QC
                  </span>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={150}>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-neutral-50 mb-6">
                  Grid-Interactive<br />
                  AI Compute,<br />
                  <span className="text-amber-400">Proven on Real Hardware</span>
                </h1>
              </ScrollReveal>
              <ScrollReveal delay={300}>
                <p className="text-lg text-neutral-400 leading-relaxed mb-8 max-w-lg">
                  A Raspberry Pi edge node that receives OpenADR 3.0 demand-response signals
                  and reduces its LLM inference load in real time. Watch the wattage drop live.
                </p>
              </ScrollReveal>
              <ScrollReveal delay={450}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/demo"
                    className="inline-flex items-center justify-center h-11 px-6 rounded bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
                  >
                    Watch Live Demo →
                  </Link>
                  <Link
                    href="/method"
                    className="inline-flex items-center justify-center h-11 px-6 rounded border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-neutral-100 text-sm transition-colors"
                  >
                    How It Works
                  </Link>
                </div>
              </ScrollReveal>
            </div>
            <div className="lg:pt-4 lg:w-80 w-full shrink-0">
              <LiveStatusHero />
            </div>
          </div>
        </div>
      </section>

      {/* ── Proof strip ── */}
      <section className="border-y border-neutral-800 bg-neutral-900/40 py-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 text-center">
            {PROOF_ITEMS.map((item) => (
              <div key={item.label} className="px-4 flex flex-col items-center gap-2">
                {item.icon}
                <div>
                  <div className="text-xs text-neutral-400 font-mono uppercase tracking-widest mb-1">
                    {item.label}
                  </div>
                  <div className="text-sm font-semibold text-neutral-200">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="bg-[#0d0d18] py-28">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <div>
                <h2 className="text-2xl font-bold mb-4 text-neutral-100">
                  AI loads are growing.<br />Grids are not.
                </h2>
                <p className="text-neutral-400 leading-relaxed mb-4">
                  Data center electricity demand is projected to double by 2030, driven largely
                  by inference workloads. Grid operators need flexible loads that can respond
                  to capacity constraints in real time.
                </p>
                <p className="text-neutral-400 leading-relaxed">
                  Most AI compute treats power like a constant. It doesn&#39;t have to.
                  Inference workloads have natural SLA flexibility — a slightly slower response
                  is often acceptable, especially during grid stress events.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { stat: '2×', desc: 'Projected data center power demand growth by 2030' },
                  { stat: '~15%', desc: 'Of US peak demand already attributable to data centers' },
                  { stat: '0', desc: 'OpenADR-compliant AI edge nodes publicly demonstrated before this project' },
                ].map((item) => (
                  <div key={item.stat} className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 flex gap-4 items-start">
                    <span className="font-mono text-3xl font-bold text-amber-400 shrink-0">{item.stat}</span>
                    <p className="text-sm text-neutral-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Mechanism / Signal Flow ── */}
      <section className="border-t border-neutral-800 py-28">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <h2 className="text-2xl font-bold mb-2 text-neutral-100">How it works</h2>
            <p className="text-neutral-500 text-sm font-mono mb-10">
              Signal chain from grid operator to live dashboard
            </p>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            {/* Desktop SVG signal flow */}
            <div className="hidden sm:block mb-6">
              <svg
                viewBox="0 0 790 80"
                className="w-full"
                aria-label="Signal flow diagram: Grid Operator to VTN to VEN to Control Agent to Smart Plug"
              >
                <defs>
                  <marker id="ah-gray" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
                    <path d="M0,0 L6,2.5 L0,5 Z" fill="#374151"/>
                  </marker>
                  <marker id="ah-cyan" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
                    <path d="M0,0 L6,2.5 L0,5 Z" fill="#164e63"/>
                  </marker>
                  <marker id="ah-amber" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
                    <path d="M0,0 L6,2.5 L0,5 Z" fill="#78350f"/>
                  </marker>
                </defs>

                {/* Grid Operator */}
                <rect x="0" y="12" width="120" height="56" rx="6" fill="#111118" stroke="#374151" strokeWidth="1"/>
                <text x="60" y="37" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">Grid Operator</text>
                <text x="60" y="53" textAnchor="middle" fill="#4b5563" fontSize="8.5" fontFamily="var(--font-mono)">Issues DR event</text>

                {/* Arrow 1 */}
                <path d="M120,40 L152,40" stroke="#374151" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#ah-gray)" className="animate-signal-dash"/>

                {/* VTN */}
                <rect x="158" y="12" width="120" height="56" rx="6" fill="#091420" stroke="#164e63" strokeWidth="1"/>
                <text x="218" y="37" textAnchor="middle" fill="#22d3ee" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">VTN</text>
                <text x="218" y="53" textAnchor="middle" fill="#4b5563" fontSize="8.5" fontFamily="var(--font-mono)">vtn.data-joule.com</text>

                {/* Arrow 2 */}
                <path d="M278,40 L310,40" stroke="#164e63" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#ah-cyan)" className="animate-signal-dash" style={{animationDelay: "0.2s"}}/>

                {/* VEN */}
                <rect x="316" y="12" width="120" height="56" rx="6" fill="#091420" stroke="#164e63" strokeWidth="1"/>
                <text x="376" y="37" textAnchor="middle" fill="#22d3ee" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">VEN</text>
                <text x="376" y="49" textAnchor="middle" fill="#4b5563" fontSize="8.5" fontFamily="var(--font-mono)">mtl-ven-01</text>
                <text x="376" y="60" textAnchor="middle" fill="#4b5563" fontSize="8.5" fontFamily="var(--font-mono)">Raspberry Pi</text>

                {/* Arrow 3 */}
                <path d="M436,40 L468,40" stroke="#78350f" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#ah-amber)" className="animate-signal-dash" style={{animationDelay: "0.4s"}}/>

                {/* Control Agent */}
                <rect x="474" y="12" width="120" height="56" rx="6" fill="#150a00" stroke="#78350f" strokeWidth="1"/>
                <text x="534" y="37" textAnchor="middle" fill="#f59e0b" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">Control Agent</text>
                <text x="534" y="53" textAnchor="middle" fill="#4b5563" fontSize="8.5" fontFamily="var(--font-mono)">pi-compute:8081</text>

                {/* Arrow 4 */}
                <path d="M594,40 L626,40" stroke="#78350f" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#ah-amber)" className="animate-signal-dash" style={{animationDelay: "0.6s"}}/>

                {/* Smart Plug */}
                <rect x="632" y="12" width="158" height="56" rx="6" fill="#150a00" stroke="#78350f" strokeWidth="1"/>
                <text x="711" y="37" textAnchor="middle" fill="#f59e0b" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">Smart Plug</text>
                <text x="711" y="53" textAnchor="middle" fill="#4b5563" fontSize="8.5" fontFamily="var(--font-mono)">Zigbee · measures W</text>
              </svg>
            </div>

            {/* Mobile vertical stack */}
            <div className="sm:hidden space-y-2 mb-6">
              {[
                { label: 'Grid Operator', sub: 'Issues DR event', color: '#9ca3af', bg: 'bg-neutral-900', border: 'border-neutral-700' },
                { label: 'VTN', sub: 'vtn.data-joule.com', color: '#22d3ee', bg: 'bg-cyan-950/20', border: 'border-cyan-900' },
                { label: 'VEN', sub: 'mtl-ven-01 · Raspberry Pi', color: '#22d3ee', bg: 'bg-cyan-950/20', border: 'border-cyan-900' },
                { label: 'Control Agent', sub: 'pi-compute:8081', color: '#f59e0b', bg: 'bg-amber-950/20', border: 'border-amber-900' },
                { label: 'Smart Plug', sub: 'Zigbee · measures W', color: '#f59e0b', bg: 'bg-amber-950/20', border: 'border-amber-900' },
              ].map((node, i) => (
                <div key={i}>
                  <div className={`rounded-lg border ${node.border} ${node.bg} px-4 py-3 flex items-center justify-between`}>
                    <span className="font-mono text-xs font-semibold" style={{ color: node.color }}>{node.label}</span>
                    <span className="font-mono text-xs text-neutral-600">{node.sub}</span>
                  </div>
                  {i < 4 && <div className="text-center text-neutral-700 text-sm py-0.5">↓</div>}
                </div>
              ))}
            </div>

            {/* Telemetry return path */}
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-neutral-500">
                <span className="text-amber-500">Zigbee plug</span>
                <span>→ MQTT → state writer →</span>
                <span className="text-cyan-400">telemetry_pusher.py</span>
                <span>→ /api/ingest → Redis →</span>
                <span className="text-cyan-400">/api/state</span>
                <span>→ Live Dashboard (5s)</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Response Ladder ── */}
      <section className="bg-[#0d0d18] border-t border-neutral-800 py-28">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <h2 className="text-2xl font-bold mb-2 text-neutral-100">Response ladder</h2>
            <p className="text-neutral-500 text-sm font-mono mb-10">
              Four graded tiers — from mild throttling to full halt
            </p>
          </ScrollReveal>

          {/* Desktop table */}
          <div className="hidden md:block space-y-2">
            {RESPONSE_LADDER.map((row) => (
              <ScrollReveal key={row.tier} delay={row.tier * 60}>
                <div
                  className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                  style={{ borderLeftColor: row.color, borderLeftWidth: 3 }}
                >
                  <div className="w-24 shrink-0">
                    <span className="font-mono font-bold text-sm" style={{ color: row.color }}>
                      TIER {row.tier}
                    </span>
                    <div className="text-xs text-neutral-500 font-mono">{row.name}</div>
                  </div>
                  <div className="flex-1 text-sm text-neutral-300 font-mono">{row.action}</div>
                  <div className="flex gap-6 shrink-0 text-xs font-mono">
                    <div>
                      <div className="text-neutral-600">Power</div>
                      <div className="text-amber-400 font-semibold">{row.power}</div>
                    </div>
                    <div>
                      <div className="text-neutral-600">Reduction</div>
                      <div className="font-semibold" style={{ color: row.color }}>{row.reduction}</div>
                    </div>
                    <div>
                      <div className="text-neutral-600">SLA</div>
                      <div className="text-neutral-300">{row.sla}</div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Mobile accordion */}
          <div className="md:hidden space-y-2">
            {RESPONSE_LADDER.map((row) => (
              <details
                key={row.tier}
                className="rounded-lg border border-neutral-800 bg-neutral-900 group"
                style={{ borderLeftColor: row.color, borderLeftWidth: 3 }}
              >
                <summary className="p-4 flex items-center justify-between cursor-pointer list-none">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm" style={{ color: row.color }}>
                      TIER {row.tier}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">{row.name}</span>
                  </div>
                  <span className="text-neutral-600 text-xs font-mono">{row.reduction}</span>
                </summary>
                <div className="px-4 pb-4 pt-0 space-y-2 border-t border-neutral-800">
                  <p className="text-sm text-neutral-300 font-mono pt-3">{row.action}</p>
                  <div className="flex gap-6 text-xs font-mono">
                    <div>
                      <div className="text-neutral-600">Power</div>
                      <div className="text-amber-400 font-semibold">{row.power}</div>
                    </div>
                    <div>
                      <div className="text-neutral-600">Reduction</div>
                      <div className="font-semibold" style={{ color: row.color }}>{row.reduction}</div>
                    </div>
                    <div>
                      <div className="text-neutral-600">SLA</div>
                      <div className="text-neutral-300">{row.sla}</div>
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Snapshot CTA ── */}
      <section className="border-t border-neutral-800 py-28">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/10 p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="flex-1">
                <div className="text-xs font-mono text-amber-600 uppercase tracking-widest mb-2">
                  Live System
                </div>
                <h2 className="text-2xl font-bold text-neutral-100 mb-2">
                  The node is running right now.
                </h2>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Live telemetry from pi-compute in Montréal. Wattage, tier, and LLM status
                  updated every 5 seconds. Watch a DR event arrive and the load drop in real time.
                </p>
              </div>
              <Link
                href="/demo"
                className="shrink-0 inline-flex items-center justify-center h-12 px-8 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors"
              >
                Open Live Dashboard
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Why It Matters ── */}
      <section className="bg-[#0d0d18] border-t border-neutral-800 py-28">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <h2 className="text-2xl font-bold mb-10 text-neutral-100">Why this matters</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  audience: 'Utilities',
                  point: 'Demonstrates that AI edge loads can be controllable, dispatchable resources — not just passive consumers.',
                },
                {
                  audience: 'Hyperscalers',
                  point: 'Quantifies the SLA cost of power flexibility at each tier, enabling real trade-off decisions.',
                },
                {
                  audience: 'Researchers',
                  point: 'Open-source testbed for grid-interactive compute. Reproducible on commodity hardware.',
                },
                {
                  audience: 'Hiring teams',
                  point: 'Publicly observable proof of cross-domain capability: grid protocols, embedded systems, and web telemetry.',
                },
              ].map((item) => (
                <div key={item.audience} className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
                  <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-3">
                    {item.audience}
                  </div>
                  <p className="text-sm text-neutral-400 leading-relaxed">{item.point}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── About ── */}
      <section className="border-t border-neutral-800 py-28">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold mb-6 text-neutral-100">About this project</h2>
              <p className="text-neutral-400 leading-relaxed mb-4">
                Data Joule is an Internet of Energy portfolio project built to demonstrate
                that AI edge compute can participate in real-time grid flexibility markets.
                The full stack — from VTN deployment on a VPS to the Zigbee smart plug
                measuring wattage — was designed, deployed, and tested over four weeks.
              </p>
              <p className="text-neutral-400 leading-relaxed mb-8">
                The hardware runs 24/7. The telemetry is real. The OpenADR signals come from
                a production-grade VTN reference implementation. Nothing here is simulated.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://github.com/JefBronze/data-joule"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-neutral-300 border border-neutral-700 hover:border-neutral-500 px-4 py-2 rounded transition-colors"
                >
                  GitHub
                </a>
                <a
                  href="https://linkedin.com/in/jefersonbronze"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-neutral-300 border border-neutral-700 hover:border-neutral-500 px-4 py-2 rounded transition-colors"
                >
                  LinkedIn
                </a>
                <a
                  href="mailto:jefersonbronze@gmail.com"
                  className="inline-flex items-center gap-2 text-sm text-neutral-300 border border-neutral-700 hover:border-neutral-500 px-4 py-2 rounded transition-colors"
                >
                  Contact
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      </main>

      <SiteFooter />
    </div>
  )
}
