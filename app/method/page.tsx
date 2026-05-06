import Link from 'next/link'
import ScrollReveal from '../components/ScrollReveal'
import { SiteNav } from '../components/SiteNav'
import { SiteFooter } from '../components/SiteFooter'

const RESPONSE_LADDER = [
  {
    tier: 0,
    name: 'Baseline',
    mechanism: 'CPU governor → ondemand. llama-server active. Inference at full speed (~28 tokens/s prompt, ~6 tokens/s gen).',
    power: '~14 W',
    reduction: '—',
    color: '#4ade80',
  },
  {
    tier: 1,
    name: 'Throttle',
    mechanism: "CPU governor → conservative. This switches the CPU's frequency scaling algorithm from reactive to conservative: it raises frequency slowly and lowers it quickly. Net effect: 15–20% less power, ~10% slower inference. Fully transparent to the LLM.",
    power: '~11 W',
    reduction: '−21%',
    color: '#facc15',
  },
  {
    tier: 2,
    name: 'Power-save',
    mechanism: 'CPU governor → powersave. Forces the CPU to its minimum frequency (1.5 GHz on Pi 5 vs 2.4 GHz max). Inference continues but throughput drops ~40%. Still usable for non-latency-sensitive workloads.',
    power: '~8 W',
    reduction: '−43%',
    color: '#fb923c',
  },
  {
    tier: 3,
    name: 'Suspend',
    mechanism: 'SIGSTOP sent to the llama-server process. The process freezes in memory — no CPU time consumed, no inference possible, state preserved. SIGCONT resumes it instantly when the event clears.',
    power: '~4 W',
    reduction: '−71%',
    color: '#f87171',
  },
  {
    tier: 4,
    name: 'Halt',
    mechanism: 'Control agent calls `systemctl halt` on mtl-edge-01. After OS shutdown, the VEN issues a Zigbee off command to Plug #1, cutting USB-C power. On event clear, the VEN issues Zigbee on — Pi 5 cold-boots in ~55 seconds via its autostart systemd units.',
    power: '~2 W',
    reduction: '−86%',
    color: '#991b1b',
  },
]

const STACK = [
  { layer: 'VEN daemon', tech: 'Python 3.13', detail: 'openleadr3 library, stdlib-only constraints, systemd service' },
  { layer: 'VTN (server)', tech: 'OpenADR 3.0 RI', detail: 'Docker on Hetzner VPS, Caddy reverse proxy + Let\'s Encrypt' },
  { layer: 'Control agent', tech: 'Python 3.13 http.server', detail: 'Minimal HTTP on :8081, no external dependencies' },
  { layer: 'Zigbee stack', tech: 'Zigbee2MQTT + Mosquitto', detail: 'ConBee II coordinator on mtl-ven-01, MQTT pub/sub for plug control' },
  { layer: 'Telemetry pusher', tech: 'Python 3.13 urllib', detail: 'HTTPS POST every 5s with exponential backoff, Bearer auth' },
  { layer: 'Data store', tech: 'Upstash Redis (serverless)', detail: 'lpush + ltrim rolling 360-entry list, REST API' },
  { layer: 'Web / API', tech: 'Next.js 16.2.4', detail: 'App Router, TypeScript, Vercel serverless functions' },
  { layer: 'Styling', tech: 'Tailwind CSS v4', detail: '@theme inline, no tailwind.config.js, CSS-first config' },
  { layer: 'LLM runtime', tech: 'llama.cpp', detail: 'Llama 3.2-3B-Instruct Q4_K_M, 28.5 tok/s prompt, 6.1 tok/s gen' },
]

const STEPS = [
  {
    n: 1,
    title: 'VTN creates an event',
    detail: 'A grid operator (or test script) POST to /openadr3/3.1.0/events with a SIMPLE payload. The payload value (1–4) maps directly to a DR tier. The event includes an intervalPeriod with a start time and duration.',
    code: `curl -X POST https://vtn.data-joule.com/openadr3/3.1.0/events \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"programID":"1","eventName":"tier2-test",
       "intervals":[{"id":0,
         "intervalPeriod":{"start":"2026-05-02T14:00:00Z",
                           "duration":"PT60S"},
         "payloads":[{"type":"SIMPLE","values":[2]}]}]}'`,
  },
  {
    n: 2,
    title: 'VEN polls every 10 seconds',
    detail: 'ven.py::poll_once() calls GET /openadr3/3.1.0/events?programID=1 with an OAuth2 Bearer token obtained via client_credentials flow. The token is cached until it expires.',
    code: `# ven.py — poll_once()
resp = requests.get(VTN_EVENTS_URL, headers=auth_header())
events = resp.json()
for event in events:
    if is_active(event) and event["id"] not in _handled:
        run_event(event)`,
  },
  {
    n: 3,
    title: 'is_active() checks interval timing',
    detail: 'The OpenADR 3.0 RI does not set eventStatus reliably. Instead, is_active() manually checks whether NOW falls within any interval\'s [start, start+duration) window. parse_iso_duration_seconds() handles ISO 8601 durations (PT60S, PT1H, etc.).',
    code: `def is_active(event: dict) -> bool:
    now = datetime.now(timezone.utc)
    for interval in event.get("intervals", []):
        p = interval.get("intervalPeriod", {})
        start = datetime.fromisoformat(p["start"].replace("Z","+00:00"))
        dur   = parse_iso_duration_seconds(p.get("duration","PT0S"))
        end   = start + timedelta(seconds=dur)
        if start <= now < end:
            return True
    return False`,
  },
  {
    n: 4,
    title: 'run_event() walks the response ladder',
    detail: 'The SIMPLE payload value becomes the tier. run_event() calls the matching action function and adds the event ID to the _handled set (in-memory deduplication). After the event\'s interval expires, the VEN restores tier 0 and posts a completion report.',
    code: `TIER_ACTIONS = {
    0: tier0_baseline,
    1: tier1_conservative,
    2: tier2_powersave,
    3: tier3_sigstop,
    4: tier4_shutdown,
}

def run_event(event: dict) -> None:
    tier = extract_tier(event)
    TIER_ACTIONS.get(tier, tier0_baseline)()
    _handled.add(event["id"])`,
  },
  {
    n: 5,
    title: 'Control agent executes on mtl-edge-01',
    detail: 'For tiers 1–2, the VEN SSHes to mtl-edge-01 and calls cpupower (governor change). For tier 3, it POSTs to mtl-edge-01\'s control_agent.py (:8081) which sends SIGSTOP/SIGCONT to llama-server. For tier 4, it calls systemctl halt, then issues a Zigbee plug-off command via MQTT.',
    code: `# control_agent.py — tier 3
@app.route("/pause", methods=["POST"])
def pause():
    proc = find_llama_server()
    if proc:
        proc.send_signal(signal.SIGSTOP)
    return {"status": "paused"}

@app.route("/resume", methods=["POST"])
def resume():
    proc = find_llama_server()
    if proc:
        proc.send_signal(signal.SIGCONT)
    return {"status": "resumed"}`,
  },
  {
    n: 6,
    title: 'VEN posts a completion report',
    detail: 'After the event interval ends, the VEN calls tier0_baseline() to restore normal operation, then POST /openadr3/3.1.0/reports to the VTN with the actual duration and payload values observed. This closes the OpenADR event lifecycle.',
    code: `# ven.py — post_report()
requests.post(VTN_REPORTS_URL,
    headers=auth_header(),
    json={
        "programID": "1",
        "eventID": event["id"],
        "resources": [{"resourceName": "mtl-edge-01",
                       "intervals": [{"id": 0,
                         "payloads": [{"type":"SIMPLE",
                                       "values":[tier]}]}]}]
    })`,
  },
]

export default function MethodPage() {
  return (
    <div className="min-h-screen bg-(--background) text-neutral-100 font-sans">

      <SiteNav />

      <main>
      {/* Section 1 — Header */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-12">
        <ScrollReveal>
          <div className="inline-block mb-4">
            <span className="text-xs font-mono text-cyan-400 border border-cyan-900 bg-cyan-950/30 px-3 py-1 rounded-full">
              Technical Deep-Dive
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-neutral-50 mb-4">
            How It Works
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl leading-relaxed">
            End-to-end walkthrough of the FlexCompute Edge signal chain — from OpenADR 3.0 event
            creation at the VTN through demand response execution on the Pi, telemetry capture via
            Zigbee, and live display on this dashboard.
          </p>
        </ScrollReveal>
      </section>

      {/* Section 2 — Architecture Diagram */}
      <section className="bg-[#0d0d18] border-t border-neutral-800 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <h2 className="text-2xl font-bold mb-2 text-neutral-100">System Architecture</h2>
            <p className="text-neutral-500 text-sm font-mono mb-8">
              Two-Pi home lab + VPS control plane + Vercel data plane
            </p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            {/* Architecture SVG */}
            <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 overflow-x-auto">
              <svg viewBox="0 0 720 300" className="w-full min-w-[560px]" aria-label="System architecture diagram">

                {/* Internet / Public */}
                <text x="360" y="18" textAnchor="middle" fill="#374151" fontSize="9" fontFamily="var(--font-mono)" fontWeight="600" letterSpacing="3">PUBLIC INTERNET</text>

                {/* VTN box */}
                <rect x="20" y="30" width="160" height="64" rx="6" fill="#091420" stroke="#164e63" strokeWidth="1.2"/>
                <text x="100" y="52" textAnchor="middle" fill="#22d3ee" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">VTN</text>
                <text x="100" y="67" textAnchor="middle" fill="#4b5563" fontSize="8" fontFamily="var(--font-mono)">vtn.data-joule.com</text>
                <text x="100" y="81" textAnchor="middle" fill="#374151" fontSize="7.5" fontFamily="var(--font-mono)">Caddy + Docker · Hetzner</text>

                {/* Vercel box */}
                <rect x="280" y="30" width="160" height="64" rx="6" fill="#0f0f1a" stroke="#4b5563" strokeWidth="1.2"/>
                <text x="360" y="52" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">data-joule.com</text>
                <text x="360" y="67" textAnchor="middle" fill="#4b5563" fontSize="8" fontFamily="var(--font-mono)">/api/ingest · /api/state</text>
                <text x="360" y="81" textAnchor="middle" fill="#374151" fontSize="7.5" fontFamily="var(--font-mono)">Next.js · Vercel · Redis</text>

                {/* Browser box */}
                <rect x="540" y="30" width="160" height="64" rx="6" fill="#0f0f1a" stroke="#374151" strokeWidth="1.2"/>
                <text x="620" y="52" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">Browser</text>
                <text x="620" y="67" textAnchor="middle" fill="#4b5563" fontSize="8" fontFamily="var(--font-mono)">Polls /api/state every 5s</text>
                <text x="620" y="81" textAnchor="middle" fill="#374151" fontSize="7.5" fontFamily="var(--font-mono)">Live dashboard</text>

                {/* Vercel → Browser arrow */}
                <line x1="440" y1="62" x2="538" y2="62" stroke="#374151" strokeWidth="1.2" strokeDasharray="4 3"/>
                <polygon points="538,59 544,62 538,65" fill="#374151"/>

                {/* HOME LAB boundary */}
                <rect x="20" y="130" width="680" height="158" rx="8" fill="none" stroke="#1e1e2e" strokeWidth="1.5" strokeDasharray="6 4"/>
                <text x="36" y="148" fill="#374151" fontSize="8.5" fontFamily="var(--font-mono)" fontWeight="600" letterSpacing="2">HOME LAB — Montréal, QC  [egress-only]</text>

                {/* mtl-ven-01 box */}
                <rect x="40" y="158" width="200" height="116" rx="6" fill="#091420" stroke="#164e63" strokeWidth="1.2"/>
                <text x="140" y="178" textAnchor="middle" fill="#22d3ee" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">mtl-ven-01</text>
                <text x="140" y="193" textAnchor="middle" fill="#4b5563" fontSize="8" fontFamily="var(--font-mono)">192.168.2.175</text>
                <text x="58" y="212" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">• VEN daemon (ven.py)</text>
                <text x="58" y="226" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">• Zigbee2MQTT + Mosquitto</text>
                <text x="58" y="240" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">• Workload orchestrator</text>
                <text x="58" y="254" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">• ConBee II (Zigbee coord.)</text>

                {/* mtl-edge-01 box */}
                <rect x="280" y="158" width="200" height="116" rx="6" fill="#150a00" stroke="#78350f" strokeWidth="1.2"/>
                <text x="380" y="178" textAnchor="middle" fill="#f59e0b" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">mtl-edge-01</text>
                <text x="380" y="193" textAnchor="middle" fill="#4b5563" fontSize="8" fontFamily="var(--font-mono)">192.168.2.174</text>
                <text x="298" y="212" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">• llama.cpp (Llama 3.2-3B)</text>
                <text x="298" y="226" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">• Control agent (:8081)</text>
                <text x="298" y="240" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">• oled_status_writer.py</text>
                <text x="298" y="254" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">• telemetry_pusher.py</text>

                {/* Zigbee plug box */}
                <rect x="520" y="178" width="160" height="76" rx="6" fill="#1a0e00" stroke="#78350f" strokeWidth="1" strokeDasharray="0"/>
                <text x="600" y="200" textAnchor="middle" fill="#f59e0b" fontSize="9.5" fontFamily="var(--font-mono)" fontWeight="600">Zigbee Plug #1</text>
                <text x="600" y="216" textAnchor="middle" fill="#4b5563" fontSize="8" fontFamily="var(--font-mono)">ThirdReality smart plug</text>
                <text x="600" y="232" textAnchor="middle" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">meters mtl-edge-01 USB-C</text>
                <text x="600" y="244" textAnchor="middle" fill="#6b7280" fontSize="8" fontFamily="var(--font-mono)">Tier 4: cuts power</text>

                {/* VTN ↔ mtl-ven-01: control plane */}
                <line x1="100" y1="94" x2="100" y2="116" stroke="#164e63" strokeWidth="1.2" strokeDasharray="3 3"/>
                <line x1="100" y1="116" x2="140" y2="116" stroke="#164e63" strokeWidth="1.2" strokeDasharray="3 3"/>
                <line x1="140" y1="116" x2="140" y2="158" stroke="#164e63" strokeWidth="1.2" strokeDasharray="3 3"/>
                <text x="68" y="110" fill="#164e63" fontSize="7.5" fontFamily="var(--font-mono)">HTTPS + OAuth2</text>

                {/* mtl-edge-01 → Vercel: telemetry */}
                <line x1="380" y1="158" x2="380" y2="116" stroke="#78350f" strokeWidth="1.2" strokeDasharray="3 3"/>
                <line x1="380" y1="116" x2="360" y2="116" stroke="#78350f" strokeWidth="1.2" strokeDasharray="3 3"/>
                <line x1="360" y1="116" x2="360" y2="94" stroke="#78350f" strokeWidth="1.2" strokeDasharray="3 3"/>
                <text x="385" y="110" fill="#78350f" fontSize="7.5" fontFamily="var(--font-mono)">HTTPS POST 5s</text>

                {/* mtl-ven-01 → mtl-edge-01: control */}
                <line x1="240" y1="216" x2="280" y2="216" stroke="#374151" strokeWidth="1.2" strokeDasharray="3 3"/>
                <polygon points="280,213 286,216 280,219" fill="#374151"/>
                <text x="248" y="210" fill="#374151" fontSize="7.5" fontFamily="var(--font-mono)">HTTP</text>

                {/* mtl-ven-01 → Zigbee plug */}
                <line x1="240" y1="232" x2="518" y2="216" stroke="#374151" strokeWidth="1.2" strokeDasharray="3 3"/>
                <polygon points="518,213 524,216 518,219" fill="#374151"/>
                <text x="360" y="248" fill="#374151" fontSize="7.5" fontFamily="var(--font-mono)" textAnchor="middle">Zigbee 3.0</text>

                {/* Zigbee plug → mtl-edge-01: powers */}
                <line x1="520" y1="220" x2="482" y2="220" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.4"/>
                <text x="495" y="235" fill="#78350f" fontSize="7" fontFamily="var(--font-mono)">USB-C power</text>
              </svg>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Section 3 — Signal Flow Walkthrough */}
      <section className="border-t border-neutral-800 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <h2 className="text-2xl font-bold mb-2 text-neutral-100">Signal Flow Walkthrough</h2>
            <p className="text-neutral-500 text-sm font-mono mb-10">
              Six steps from grid event to curtailed inference
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

                  <h3 className="text-base font-bold text-neutral-100 mb-2 pt-1">{step.title}</h3>
                  <p className="text-sm text-neutral-400 leading-relaxed mb-4 max-w-3xl">{step.detail}</p>
                  <div className="rounded-lg bg-neutral-950 border border-neutral-800 p-4 overflow-x-auto">
                    <pre className="text-xs text-neutral-300 font-mono leading-relaxed whitespace-pre">{step.code}</pre>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Telemetry Chain */}
      <section className="bg-[#0d0d18] border-t border-neutral-800 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <h2 className="text-2xl font-bold mb-2 text-neutral-100">Telemetry Chain</h2>
            <p className="text-neutral-500 text-sm font-mono mb-8">
              How wattage gets from the smart plug to your browser
            </p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
              {/* Telemetry chain nodes */}
              <div className="flex flex-col gap-3">
                {[
                  { node: 'Zigbee Plug #1', detail: 'Measures USB-C draw every second, publishes to MQTT topic zigbee2mqtt/plug_1', color: '#f59e0b' },
                  { node: 'Mosquitto (MQTT broker)', detail: 'Brokers messages between Zigbee2MQTT and subscribers on mtl-ven-01', color: '#9ca3af' },
                  { node: 'oled_status_writer.py', detail: 'Subscribes to plug MQTT topic + polls llama.cpp /health endpoint. Writes /tmp/flexcompute_state.json atomically (os.replace)', color: '#22d3ee' },
                  { node: 'telemetry_pusher.py', detail: 'Reads state file every 5s. HTTPS POST to /api/ingest with Bearer auth. Exponential backoff on failure.', color: '#22d3ee' },
                  { node: '/api/ingest', detail: 'Vercel serverless function. Validates Bearer token. Redis pipeline: SET telemetry:latest + LPUSH telemetry:history + LTRIM to 360 entries.', color: '#9ca3af' },
                  { node: 'Upstash Redis', detail: 'Stores telemetry:latest (current state) + telemetry:history (30-min rolling window at 5s cadence)', color: '#9ca3af' },
                  { node: '/api/state', detail: 'Returns latest + last 60 history entries. Cache-Control: no-store.', color: '#9ca3af' },
                  { node: 'Browser (5s poll)', detail: 'fetch("/api/state") via useCallback. Updates wattage display, sparkline, and tier badge in React state.', color: '#4ade80' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="shrink-0 flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: item.color }} />
                      {i < 7 && <div className="w-px flex-1 bg-neutral-800 mt-1 min-h-[28px]" />}
                    </div>
                    <div className="pb-2">
                      <span className="font-mono text-xs font-semibold" style={{ color: item.color }}>{item.node}</span>
                      <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Section 5 — Response Ladder Deep-Dive */}
      <section className="border-t border-neutral-800 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <h2 className="text-2xl font-bold mb-2 text-neutral-100">Response Ladder — Mechanisms</h2>
            <p className="text-neutral-500 text-sm font-mono mb-10">
              What each tier actually does to the hardware
            </p>
          </ScrollReveal>
          <div className="space-y-4">
            {RESPONSE_LADDER.map((row, i) => (
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
              <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-3">Baseline Measurements — mtl-edge-01 (2026-04-28)</div>
              <div className="grid sm:grid-cols-3 gap-4 text-xs font-mono">
                <div>
                  <div className="text-neutral-600 mb-1">OS idle (llama.cpp loaded)</div>
                  <div className="text-amber-400 font-semibold">2–3 W</div>
                </div>
                <div>
                  <div className="text-neutral-600 mb-1">Inference under load</div>
                  <div className="text-amber-400 font-semibold">8.7–10.3 W</div>
                </div>
                <div>
                  <div className="text-neutral-600 mb-1">Tier 4 restore time</div>
                  <div className="text-amber-400 font-semibold">~55 seconds</div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Section 6 — Stack */}
      <section className="bg-[#0d0d18] border-t border-neutral-800 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <h2 className="text-2xl font-bold mb-2 text-neutral-100">Stack</h2>
            <p className="text-neutral-500 text-sm font-mono mb-8">
              Every technology layer, from Zigbee to browser
            </p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="rounded-lg border border-neutral-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900">
                    <th className="text-left px-5 py-3 text-xs font-mono text-neutral-500 uppercase tracking-widest">Layer</th>
                    <th className="text-left px-5 py-3 text-xs font-mono text-neutral-500 uppercase tracking-widest">Technology</th>
                    <th className="text-left px-5 py-3 text-xs font-mono text-neutral-500 uppercase tracking-widest hidden md:table-cell">Detail</th>
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
                Watch Live Demo →
              </Link>
              <a
                href="https://github.com/JefBronze/flexcompute-edge"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-11 px-6 rounded border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-neutral-100 text-sm transition-colors"
              >
                View Source on GitHub
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
