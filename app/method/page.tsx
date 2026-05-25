'use client'

import Link from 'next/link'
import Image from 'next/image'
import ScrollReveal from '../components/ScrollReveal'
import { SiteNav } from '../components/SiteNav'
import { SiteFooter } from '../components/SiteFooter'
import { useLocale } from '../lib/i18n'

const RESPONSE_LADDER = [
  {
    tier: 0,
    power: '~10 W',
    reduction: '-',
    color: '#4ade80',
  },
  {
    tier: 1,
    power: '~8 W',
    reduction: '-20%',
    color: '#facc15',
  },
  {
    tier: 2,
    power: '~6 W',
    reduction: '-40%',
    color: '#fb923c',
  },
  {
    tier: 3,
    power: '~3 W',
    reduction: '-70%',
    color: '#f87171',
  },
  {
    tier: 4,
    power: '~0.5 W',
    reduction: '-95%',
    color: '#991b1b',
  },
]

const STACK = [
  { layer: 'VEN daemon', tech: 'Python 3.13', detail: 'openleadr3 library, stdlib-only constraints, systemd service' },
  { layer: 'VTN (server)', tech: 'OpenADR 3.0 RI', detail: 'Docker on Hetzner VPS, Caddy reverse proxy + Let\'s Encrypt' },
  { layer: 'Grid signal bridges', tech: 'Python 3.13 (stdlib)', detail: 'hq_bridge.py · ons_bridge.py · nyiso_bridge.py — poll HQ / ONS / NYISO every 300s, write grid:current:{source} snapshot to Redis, fire VTN events on tier transitions' },
  { layer: 'Control agent', tech: 'Python 3.13 http.server', detail: 'Private LAN service with constrained actions and no public ingress' },
  { layer: 'Zigbee stack', tech: 'Zigbee2MQTT + Mosquitto', detail: 'ConBee II coordinator on mtl-ven-01, MQTT pub/sub for plug control' },
  { layer: 'Telemetry pusher', tech: 'Python 3.13 urllib', detail: 'Authenticated HTTPS telemetry with exponential backoff' },
  { layer: 'Data store', tech: 'Upstash Redis (serverless)', detail: 'lpush + ltrim rolling 360-entry list, REST API' },
  { layer: 'Web / API', tech: 'Next.js 16.2.6', detail: 'App Router, TypeScript, Vercel serverless functions' },
  { layer: 'Styling', tech: 'Tailwind CSS v4', detail: '@theme inline, no tailwind.config.js, CSS-first config' },
  { layer: 'LLM runtime', tech: 'llama.cpp', detail: 'Llama 3.2-3B-Instruct Q4_K_M, 28.5 tok/s prompt, 6.1 tok/s gen' },
  { layer: 'Settlement', tech: 'Chainlink Functions + ERC-20', detail: 'Decentralized oracle verifies curtailment kWh; JouleCredit.sol mints JLC on Polygon Mainnet' },
]

const STEPS = [
  {
    n: 1,
    code: `OpenADR event
  target: edge-compute resource group
  signal: SIMPLE tier value
  window: start time + duration
  protection: authenticated control plane`,
  },
  {
    n: 2,
    code: `Poll cycle
  fetch authorized events
  keep only active windows
  ignore events already handled
  dispatch selected tier`,
  },
  {
    n: 3,
    code: `Active-window check
  parse event start
  parse event duration
  compare with current UTC time
  act only inside the interval`,
  },
  {
    n: 4,
    code: `Response ladder
  tier 0: normal operation
  tier 1-2: reduce compute intensity
  tier 3: pause inference workload
  tier 4: controlled shutdown path`,
  },
  {
    n: 5,
    code: `Local execution
  receive tier from trusted LAN controller
  apply constrained compute action
  preserve observable state
  restore baseline after event clears`,
  },
  {
    n: 6,
    code: `Completion report
  restore baseline
  summarize observed tier
  record actual response window
  close event lifecycle`,
  },
  {
    n: 7,
    code: `Settlement
  event:report:{name} → written to Redis
  Chainlink DON fetches /api/events/{name}
  source.js encodes kWh_reduced Ã— 1e9 → uint256
  consensus fulfilled → fulfillRequest() fires
  JouleCredit.sol mints kWh_reduced JLC on Polygon`,
  },
]
export default function MethodPage() {
  const { t } = useLocale()
  const m = t.method

  const localizedLadder = RESPONSE_LADDER.map((row, i) => ({
    ...row,
    name: m.ladder[i].name,
    mechanism: m.ladder[i].mechanism,
  }))

  return (
    <div className="min-h-screen bg-(--background) text-neutral-100 font-sans">

      <SiteNav />

      <main>
        {/* Section 1 — Header */}
        <section className="max-w-7xl mx-auto px-6 pt-10 pb-8 md:pt-20 md:pb-12">
          <ScrollReveal>
            <div>
              <div className="inline-block mb-4">
                <span className="text-xs font-mono text-cyan-400 border border-cyan-900 bg-cyan-950/30 px-3 py-1 rounded-full">
                  {m.badge}
                </span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-neutral-50 mb-4">
                {m.heading}
              </h1>
              <p className="text-lg text-neutral-400 max-w-2xl leading-relaxed">
                {m.intro}
              </p>
            </div>
          </ScrollReveal>
        </section>

        {/* Section 2 Ã¢â‚¬" Architecture Diagram */}
        <section className="bg-[#0d0d18] border-t border-neutral-800 py-12 md:py-20">
          <div className="max-w-7xl mx-auto px-6">
            <ScrollReveal>
              <h2 className="text-2xl font-bold mb-2 text-neutral-100">{m.architecture_heading}</h2>
              <p className="text-neutral-500 text-sm font-mono mb-8">
                {m.architecture_sub}
              </p>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              {/* Architecture SVG */}
              <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 overflow-x-auto">
                <svg viewBox="0 0 720 420" className="w-full min-w-[560px]" aria-label="System architecture diagram">

                  {/* Internet / Public */}
                  <text x="360" y="18" textAnchor="middle" fill="#374151" fontSize="9" fontFamily="var(--font-mono)" fontWeight="600" letterSpacing="3">{m.public_internet}</text>

                  {/* VTN box (extended to include Grid Bridges sub-section) */}
                  <rect x="20" y="30" width="160" height="92" rx="6" fill="#091420" stroke="#164e63" strokeWidth="1.2" />
                  <text x="100" y="46" textAnchor="middle" fill="#22d3ee" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">VTN</text>
                  <text x="100" y="60" textAnchor="middle" fill="#4b5563" fontSize="8" fontFamily="var(--font-mono)">vtn.data-joule.com</text>
                  <text x="100" y="73" textAnchor="middle" fill="#374151" fontSize="7.5" fontFamily="var(--font-mono)">Caddy + Docker - Hetzner</text>

                  {/* Divider line between VTN and Bridges sub-section */}
                  <line x1="32" y1="82" x2="168" y2="82" stroke="#164e63" strokeWidth="0.5" strokeOpacity="0.5" />

                  {/* Grid Bridges sub-section (lives on same VPS as VTN) */}
                  <text x="100" y="95" textAnchor="middle" fill="#22d3ee" fontSize="8.5" fontFamily="var(--font-mono)" fontWeight="600">Grid Bridges</text>
                  <text x="100" y="107" textAnchor="middle" fill="#6b7280" fontSize="7" fontFamily="var(--font-mono)">hq · ons · nyiso (300s)</text>
                  <text x="100" y="117" textAnchor="middle" fill="#374151" fontSize="7" fontFamily="var(--font-mono)">→ /api/grid/snapshot</text>

                  {/* Vercel box */}
                  <rect x="280" y="30" width="160" height="64" rx="6" fill="#0f0f1a" stroke="#4b5563" strokeWidth="1.2" />
                  <text x="360" y="52" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">data-joule.com</text>
                  <text x="360" y="67" textAnchor="middle" fill="#4b5563" fontSize="8" fontFamily="var(--font-mono)">/api/ingest - /api/state</text>
                  <text x="360" y="81" textAnchor="middle" fill="#374151" fontSize="7.5" fontFamily="var(--font-mono)">Next.js - Vercel - Redis</text>

                  {/* Browser box */}
                  <rect x="540" y="30" width="160" height="64" rx="6" fill="#0f0f1a" stroke="#374151" strokeWidth="1.2" />
                  <text x="620" y="52" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">Browser</text>
                  <text x="620" y="67" textAnchor="middle" fill="#4b5563" fontSize="8" fontFamily="var(--font-mono)">{m.browser_poll}</text>
                  <text x="620" y="81" textAnchor="middle" fill="#374151" fontSize="7.5" fontFamily="var(--font-mono)">{m.browser_dashboard}</text>

                  {/* Vercel Ã¢â€ â€™ Browser arrow */}
                  <line x1="440" y1="62" x2="538" y2="62" stroke="#374151" strokeWidth="1.2" strokeDasharray="4 3" />
                  <polygon points="538,59 544,62 538,65" fill="#374151" />

                  {/* HOME LAB boundary */}
                  <rect x="20" y="130" width="680" height="158" rx="8" fill="none" stroke="#1e1e2e" strokeWidth="1.5" strokeDasharray="6 4" />
                  <text x="36" y="148" fill="#374151" fontSize="8.5" fontFamily="var(--font-mono)" fontWeight="600" letterSpacing="2">{m.home_lab}</text>

                  {/* mtl-ven-01 box */}
                  <rect x="40" y="158" width="200" height="116" rx="6" fill="#091420" stroke="#164e63" strokeWidth="1.2" />
                  <text x="140" y="178" textAnchor="middle" fill="#22d3ee" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">mtl-ven-01</text>
                  <text x="140" y="193" textAnchor="middle" fill="#4b5563" fontSize="8" fontFamily="var(--font-mono)">private LAN node</text>
                  <text x="58" y="212" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">- VEN daemon (ven.py)</text>
                  <text x="58" y="226" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">- Zigbee2MQTT + Mosquitto</text>
                  <text x="58" y="240" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">- Workload orchestrator</text>
                  <text x="58" y="254" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">- ConBee II (Zigbee coord.)</text>

                  {/* mtl-edge-01 box */}
                  <rect x="280" y="158" width="200" height="116" rx="6" fill="#150a00" stroke="#78350f" strokeWidth="1.2" />
                  <text x="380" y="178" textAnchor="middle" fill="#f59e0b" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">mtl-edge-01</text>
                  <text x="380" y="193" textAnchor="middle" fill="#4b5563" fontSize="8" fontFamily="var(--font-mono)">private LAN node</text>
                  <text x="298" y="212" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">- llama.cpp (Llama 3.2-3B)</text>
                  <text x="298" y="226" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">- Control agent</text>
                  <text x="298" y="240" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">- oled_status_writer.py</text>
                  <text x="298" y="254" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">- telemetry_pusher.py</text>

                  {/* Zigbee plug box */}
                  <rect x="520" y="178" width="160" height="76" rx="6" fill="#1a0e00" stroke="#78350f" strokeWidth="1" strokeDasharray="0" />
                  <text x="600" y="200" textAnchor="middle" fill="#f59e0b" fontSize="9.5" fontFamily="var(--font-mono)" fontWeight="600">{m.smart_plug}</text>
                  <text x="600" y="216" textAnchor="middle" fill="#4b5563" fontSize="8" fontFamily="var(--font-mono)">{m.smart_plug_detail}</text>
                  <text x="600" y="232" textAnchor="middle" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">{m.smart_plug_meter}</text>
                  <text x="600" y="244" textAnchor="middle" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">{m.smart_plug_power}</text>

                  {/* VTN Ã¢â€ " mtl-ven-01: control plane */}
                  <line x1="140" y1="122" x2="140" y2="158" stroke="#164e63" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="146" y="142" fill="#164e63" fontSize="7.5" fontFamily="var(--font-mono)">HTTPS + OAuth2</text>

                  {/* Bridges → Vercel: snapshot POST every 300s */}
                  <line x1="180" y1="100" x2="278" y2="100" stroke="#22d3ee" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.55" />
                  <polygon points="278,97 284,100 278,103" fill="#22d3ee" fillOpacity="0.55" />
                  <text x="229" y="96" textAnchor="middle" fill="#22d3ee" fontSize="6.5" fontFamily="var(--font-mono)" fillOpacity="0.7">snapshot POST</text>

                  {/* mtl-edge-01 Ã¢â€ â€™ Vercel: telemetry */}
                  <line x1="380" y1="158" x2="380" y2="116" stroke="#78350f" strokeWidth="1.2" strokeDasharray="3 3" />
                  <line x1="380" y1="116" x2="360" y2="116" stroke="#78350f" strokeWidth="1.2" strokeDasharray="3 3" />
                  <line x1="360" y1="116" x2="360" y2="94" stroke="#78350f" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="385" y="110" fill="#78350f" fontSize="7.5" fontFamily="var(--font-mono)">HTTPS POST 5s</text>

                  {/* mtl-ven-01 Ã¢â€ â€™ mtl-edge-01: control */}
                  <line x1="240" y1="216" x2="280" y2="216" stroke="#374151" strokeWidth="1.2" strokeDasharray="3 3" />
                  <polygon points="280,213 286,216 280,219" fill="#374151" />
                  <text x="248" y="210" fill="#374151" fontSize="7.5" fontFamily="var(--font-mono)">HTTP</text>

                  {/* mtl-ven-01 Ã¢â€ â€™ Zigbee plug */}
                  <path d="M140,274 L140,284 L600,284 L600,256" fill="none" stroke="#374151" strokeWidth="1.2" strokeDasharray="3 3" />
                  <polygon points="597,256 600,250 603,256" fill="#374151" />
                  <text x="555" y="280" fill="#374151" fontSize="7.5" fontFamily="var(--font-mono)" textAnchor="middle">Zigbee 3.0</text>

                  {/* Zigbee plug Ã¢â€ â€™ mtl-edge-01: powers */}
                  <line x1="520" y1="220" x2="482" y2="220" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.4" />

                  {/* SETTLEMENT LAYER */}
                  <rect x="20" y="300" width="680" height="108" rx="8" fill="none" stroke="#2d1b4e" strokeWidth="1.5" strokeDasharray="6 4" />
                  <text x="36" y="318" fill="#4b3a7a" fontSize="8.5" fontFamily="var(--font-mono)" fontWeight="600" letterSpacing="2">SETTLEMENT — POLYGON MAINNET</text>

                  {/* Chainlink DON box */}
                  <rect x="40" y="325" width="210" height="72" rx="6" fill="#150920" stroke="#5b21b6" strokeWidth="1.2" />
                  <text x="145" y="345" textAnchor="middle" fill="#a78bfa" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">Chainlink DON</text>
                  <text x="145" y="360" textAnchor="middle" fill="#4b5563" fontSize="8" fontFamily="var(--font-mono)">functions.chain.link</text>
                  <text x="58" y="376" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">- Independent oracle nodes</text>
                  <text x="58" y="389" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">- Consensus on kWh_reduced</text>

                  {/* JouleCredit.sol box */}
                  <rect x="470" y="325" width="210" height="72" rx="6" fill="#150920" stroke="#5b21b6" strokeWidth="1.2" />
                  <text x="575" y="345" textAnchor="middle" fill="#a78bfa" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">JouleCredit.sol</text>
                  <text x="575" y="360" textAnchor="middle" fill="#4b5563" fontSize="8" fontFamily="var(--font-mono)">ERC-20 Â· Polygon Mainnet</text>
                  <text x="488" y="376" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">- Mints kWh_reduced JLC tokens</text>
                  <text x="488" y="389" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">- 0x14b90C2E...8470101</text>

                  {/* Arrow Chainlink DON → JouleCredit.sol (full span) */}
                  <line x1="250" y1="361" x2="468" y2="361" stroke="#5b21b6" strokeWidth="1.2" strokeDasharray="3 3" />
                  <polygon points="468,358 474,361 468,364" fill="#5b21b6" />
                  <text x="359" y="356" textAnchor="middle" fill="#5b21b6" fontSize="7" fontFamily="var(--font-mono)">fulfillRequest()</text>

                  {/* Vercel → Chainlink DON: oracle fetch, routes along left edge */}
                  <line x1="280" y1="94" x2="280" y2="126" stroke="#5b21b6" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.5" />
                  <line x1="280" y1="126" x2="12" y2="126" stroke="#5b21b6" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.5" />
                  <line x1="12" y1="126" x2="12" y2="361" stroke="#5b21b6" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.5" />
                  <line x1="12" y1="361" x2="40" y2="361" stroke="#5b21b6" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.5" />
                  <polygon points="40,358 46,361 40,364" fill="#5b21b6" fillOpacity="0.5" />
                  <text x="7" y="243" textAnchor="middle" fill="#5b21b6" fontSize="6.5" fontFamily="var(--font-mono)" transform="rotate(-90, 7, 243)">oracle fetch: /api/events/{'{name}'}</text>
                </svg>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Section 3 Ã¢â‚¬" Signal Flow Walkthrough */}
        <section className="border-t border-neutral-800 py-12 md:py-20">
          <div className="max-w-7xl mx-auto px-6">
            <ScrollReveal>
              <h2 className="text-2xl font-bold mb-2 text-neutral-100">{m.signal_heading}</h2>
              <p className="text-neutral-500 text-sm font-mono mb-10">
                {m.signal_sub}
              </p>
            </ScrollReveal>

            <div className="space-y-0">
              {STEPS.map((step, i) => (
                <ScrollReveal key={step.n} delay={i * 60}>
                  <div className="relative pl-12 pb-10">
                    {/* Step connector line */}
                    {i < STEPS.length - 1 && (
                      <div className="absolute left-[17px] top-8 bottom-0 w-px bg-neutral-800" />
                    )}
                    {/* Step number */}
                    <div className="absolute left-0 top-0 w-9 h-9 rounded-full border border-amber-900 bg-amber-950/30 flex items-center justify-center">
                      <span className="font-mono text-xs font-bold text-amber-400">{step.n}</span>
                    </div>

                    <h3 className="text-base font-bold text-neutral-100 mb-2 pt-1">{m.steps[i].title}</h3>
                    <p className="text-sm text-neutral-400 leading-relaxed mb-4 max-w-3xl">{m.steps[i].detail}</p>
                    <div className="rounded-lg bg-neutral-950 border border-neutral-800 p-4 overflow-x-auto">
                      <pre className="text-xs text-neutral-300 font-mono leading-relaxed whitespace-pre">{step.code}</pre>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4 Ã¢â‚¬" Telemetry Chain */}
        <section className="bg-[#0d0d18] border-t border-neutral-800 py-12 md:py-20">
          <div className="max-w-7xl mx-auto px-6">
            <ScrollReveal>
              <h2 className="text-2xl font-bold mb-2 text-neutral-100">{m.telemetry_heading}</h2>
              <p className="text-neutral-500 text-sm font-mono mb-8">
                {m.telemetry_sub}
              </p>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
                {/* Telemetry chain nodes */}
                <div className="flex flex-col gap-3">
                  {m.telemetry_nodes.map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="shrink-0 flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: ['#f59e0b', '#9ca3af', '#22d3ee', '#22d3ee', '#9ca3af', '#9ca3af', '#9ca3af', '#4ade80'][i] }} />
                        {i < 7 && <div className="w-px flex-1 bg-neutral-800 mt-1 min-h-[28px]" />}
                      </div>
                      <div className="pb-2">
                        <span className="font-mono text-xs font-semibold" style={{ color: ['#f59e0b', '#9ca3af', '#22d3ee', '#22d3ee', '#9ca3af', '#9ca3af', '#9ca3af', '#4ade80'][i] }}>{item.node}</span>
                        <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Section 5 Ã¢â‚¬" Response Ladder Deep-Dive */}
        <section className="border-t border-neutral-800 py-12 md:py-20">
          <div className="max-w-7xl mx-auto px-6">
            <ScrollReveal>
              <h2 className="text-2xl font-bold mb-2 text-neutral-100">{m.ladder_heading}</h2>
              <p className="text-neutral-500 text-sm font-mono mb-10">
                {m.ladder_sub}
              </p>
            </ScrollReveal>
            <div className="space-y-4">
              {localizedLadder.map((row, i) => (
                <ScrollReveal key={row.tier} delay={i * 50}>
                  <div
                    className="rounded-lg border border-neutral-800 bg-neutral-900 p-5"
                    style={{ borderLeftColor: row.color, borderLeftWidth: 3 }}
                  >
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className="font-mono font-bold text-sm" style={{ color: row.color }}>
                        TIER {row.tier}
                      </span>
                      <span className="text-xs text-neutral-500 font-mono">{row.name}</span>
                      <span className="ml-auto text-xs font-mono text-amber-400">{row.power}</span>
                      <span className="text-xs font-mono font-semibold" style={{ color: row.color }}>{row.reduction}</span>
                    </div>
                    <p className="text-sm text-neutral-400 leading-relaxed">{row.mechanism}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={300}>
              <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-950 p-5">
                <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-3">{m.baseline_measurements}</div>
                <div className="grid sm:grid-cols-3 gap-4 text-xs font-mono">
                  <div>
                    <div className="text-neutral-600 mb-1">{m.idle_label}</div>
                    <div className="text-amber-400 font-semibold">2-3 W</div>
                  </div>
                  <div>
                    <div className="text-neutral-600 mb-1">{m.load_label}</div>
                    <div className="text-amber-400 font-semibold">8.7-10.3 W</div>
                  </div>
                  <div>
                    <div className="text-neutral-600 mb-1">{m.restore_label}</div>
                    <div className="text-amber-400 font-semibold">~55 seconds</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Section 6 Ã¢â‚¬" Stack */}
        <section className="bg-[#0d0d18] border-t border-neutral-800 py-12 md:py-20">
          <div className="max-w-7xl mx-auto px-6">
            <ScrollReveal>
              <h2 className="text-2xl font-bold mb-2 text-neutral-100">{m.stack_heading}</h2>
              <p className="text-neutral-500 text-sm font-mono mb-8">
                {m.stack_sub}
              </p>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <div className="rounded-lg border border-neutral-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900">
                      <th className="text-left px-5 py-3 text-xs font-mono text-neutral-500 uppercase tracking-widest">{m.layer}</th>
                      <th className="text-left px-5 py-3 text-xs font-mono text-neutral-500 uppercase tracking-widest">{m.technology}</th>
                      <th className="text-left px-5 py-3 text-xs font-mono text-neutral-500 uppercase tracking-widest hidden md:table-cell">{m.detail}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STACK.map((row, i) => (
                      <tr key={i} className="border-b border-neutral-800/60 bg-neutral-950 hover:bg-neutral-900 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-neutral-400">{row.layer}</td>
                        <td className="px-5 py-3 font-mono text-xs text-cyan-400">{row.tech}</td>
                        <td className="px-5 py-3 text-xs text-neutral-600 hidden md:table-cell">{row.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center h-11 px-6 rounded bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
                >
                  {m.cta_demo}
                </Link>
                <a
                  href="/joule-credits"
                  className="inline-flex items-center justify-center h-11 px-6 rounded border border-purple-800 hover:border-purple-600 text-purple-400 hover:text-purple-300 text-sm transition-colors"
                >
                  Joule Credits (JLC) →
                </a>
                <a
                  href="https://github.com/Data-Joule/data-joule-web"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-11 px-6 rounded border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-neutral-100 text-sm transition-colors"
                >
                  {m.cta_source}
                </a>
              </div>
            </ScrollReveal>
          </div>
        </section>

      </main>

      <SiteFooter />
    </div>
  )
}


