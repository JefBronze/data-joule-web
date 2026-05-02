import Link from 'next/link'
import { LiveStatusHero } from './components/LiveStatus'

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

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#09090f] text-neutral-100 font-sans">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-[#09090f]/90 backdrop-blur-sm px-6 py-4">
        <nav className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-mono font-bold text-amber-400 tracking-tight text-lg">
            Data Joule
          </span>
          <div className="flex items-center gap-6 text-sm text-neutral-400">
            <Link href="/demo" className="hover:text-neutral-100 transition-colors">Demo</Link>
            <a
              href="https://github.com/JefBronze/data-joule"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-100 transition-colors"
            >
              GitHub
            </a>
          </div>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <div className="flex flex-col lg:flex-row items-start gap-12">
          <div className="flex-1">
            <div className="inline-block mb-6">
              <span className="text-xs font-mono text-cyan-400 border border-cyan-900 bg-cyan-950/30 px-3 py-1 rounded-full">
                OpenADR 3.0 · Live Hardware · Montréal, QC
              </span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-neutral-50 mb-6">
              Grid-Interactive<br />
              AI Compute,<br />
              <span className="text-amber-400">Proven on Real Hardware</span>
            </h1>
            <p className="text-lg text-neutral-400 leading-relaxed mb-8 max-w-lg">
              A Raspberry Pi edge node that receives OpenADR 3.0 demand-response signals
              and reduces its LLM inference load in real time. Watch the wattage drop live.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/demo"
                className="inline-flex items-center justify-center h-11 px-6 rounded bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
              >
                Watch Live Demo
              </Link>
              <a
                href="https://github.com/JefBronze/data-joule"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-11 px-6 rounded border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-neutral-100 text-sm transition-colors"
              >
                View on GitHub
              </a>
            </div>
          </div>
          <div className="lg:pt-4">
            <LiveStatusHero />
          </div>
        </div>
      </section>

      {/* ── Proof strip ── */}
      <section className="border-y border-neutral-800 bg-neutral-900/40 py-5">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 text-center">
            {[
              { label: 'Hardware', value: 'Raspberry Pi 5' },
              { label: 'Protocol', value: 'OpenADR 3.0' },
              { label: 'Signal source', value: 'VTN on VPS' },
              { label: 'Response tiers', value: '4 levels' },
            ].map((item) => (
              <div key={item.label} className="px-4">
                <div className="text-xs text-neutral-500 font-mono uppercase tracking-widest mb-1">
                  {item.label}
                </div>
                <div className="text-sm font-semibold text-neutral-200">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
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
      </section>

      {/* ── Mechanism ── */}
      <section className="border-t border-neutral-800 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-2 text-neutral-100">How it works</h2>
          <p className="text-neutral-500 text-sm font-mono mb-12">
            Signal chain from grid operator to live dashboard
          </p>

          <div className="relative">
            {/* Signal flow */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-stretch">
              {[
                {
                  label: 'Grid Operator',
                  sublabel: 'Issues DR event',
                  color: '#6b7280',
                  border: 'border-neutral-700',
                  bg: 'bg-neutral-900',
                },
                {
                  label: 'VTN',
                  sublabel: 'vtn.data-joule.com',
                  color: '#22d3ee',
                  border: 'border-cyan-900',
                  bg: 'bg-cyan-950/20',
                },
                {
                  label: 'VEN',
                  sublabel: 'pi-ven · Raspberry Pi',
                  color: '#22d3ee',
                  border: 'border-cyan-900',
                  bg: 'bg-cyan-950/20',
                },
                {
                  label: 'Control Agent',
                  sublabel: 'pi-compute · HTTP',
                  color: '#f59e0b',
                  border: 'border-amber-900',
                  bg: 'bg-amber-950/20',
                },
                {
                  label: 'Smart Plug',
                  sublabel: 'Zigbee · measured W',
                  color: '#f59e0b',
                  border: 'border-amber-900',
                  bg: 'bg-amber-950/20',
                },
              ].map((node, i) => (
                <div key={i} className="flex sm:flex-col items-center gap-2 sm:gap-0">
                  <div
                    className={`rounded-lg border ${node.border} ${node.bg} px-3 py-4 text-center w-full`}
                  >
                    <div className="text-xs font-mono font-semibold" style={{ color: node.color }}>
                      {node.label}
                    </div>
                    <div className="text-xs text-neutral-600 mt-1 font-mono">{node.sublabel}</div>
                  </div>
                  {i < 4 && (
                    <div className="hidden sm:block text-neutral-700 text-xl mx-1">→</div>
                  )}
                </div>
              ))}
            </div>

            {/* Telemetry return path */}
            <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-neutral-500">
                <span className="text-cyan-400">pi-ven</span>
                <span>→ telemetry_pusher.py (5s) →</span>
                <span className="text-cyan-400">data-joule.com/api/ingest</span>
                <span>→ Upstash Redis →</span>
                <span className="text-cyan-400">/api/state</span>
                <span>→ Live Dashboard</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Response Ladder ── */}
      <section className="border-t border-neutral-800 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-2 text-neutral-100">Response ladder</h2>
          <p className="text-neutral-500 text-sm font-mono mb-10">
            Four graded tiers — from mild throttling to full halt
          </p>

          <div className="space-y-2">
            {RESPONSE_LADDER.map((row) => (
              <div
                key={row.tier}
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
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Snapshot CTA ── */}
      <section className="border-t border-neutral-800 py-20">
        <div className="max-w-5xl mx-auto px-6">
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
        </div>
      </section>

      {/* ── Why It Matters ── */}
      <section className="border-t border-neutral-800 py-20">
        <div className="max-w-5xl mx-auto px-6">
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
        </div>
      </section>

      {/* ── About ── */}
      <section className="border-t border-neutral-800 py-20">
        <div className="max-w-5xl mx-auto px-6">
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
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-neutral-800 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-mono text-sm text-amber-400 font-bold">Data Joule</span>
          <p className="text-xs text-neutral-600 font-mono text-center">
            Live telemetry from a Raspberry Pi compute node in Montréal, QC.
            Updated every 5 seconds.
          </p>
          <div className="flex gap-4 text-xs text-neutral-500">
            <a href="https://github.com/JefBronze/data-joule" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-300 transition-colors">
              GitHub
            </a>
            <Link href="/demo" className="hover:text-neutral-300 transition-colors">Demo</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
