'use client'

import { useEffect, useRef, useState } from 'react'
import {
  SITES, PORTFOLIO_KW, T, TOTAL_REAL_SECONDS,
  simMinuteAt, fmtClock, currentKw, reductionKw, preBumpKw,
  siteCompliance, siteStatus, portfolioReductionKw,
  LOG_SCRIPT, REPORT, REPORT_TOTAL_KWH, REPORT_TOTAL_BRL,
  sinLoadGw, SIN_CAPACITY_GW, SIN_REGIONS, EXPLAINERS,
  type Site, type SiteStatus, type LogKind, type Explainer,
} from './sim'

const nf = (n: number) => Math.round(n).toLocaleString('pt-BR')

// ── Status pill config ─────────────────────────────────────────────────────────

const STATUS_CFG: Record<SiteStatus, { label: string; color: string; pulse?: boolean }> = {
  prontidao:    { label: 'PRONTIDÃO',    color: '#7d8590' },
  armado:       { label: 'ACIONADO',     color: '#58a6ff' },
  preparando:   { label: 'PREPARANDO',   color: '#79c0ff', pulse: true },
  modulando:    { label: 'MODULANDO',    color: '#3fb950' },
  alerta:       { label: 'ALERTA',       color: '#f85149', pulse: true },
  reserva:      { label: 'RESERVA +280', color: '#d29922', pulse: true },
  normalizando: { label: 'NORMALIZANDO', color: '#7d8590' },
  concluido:    { label: 'CONCLUÍDO',    color: '#3fb950' },
}

const LOG_CFG: Record<LogKind, { mark: string; color: string }> = {
  info:   { mark: '·',  color: '#7d8590' },
  alert:  { mark: '▲',  color: '#58a6ff' },
  warn:   { mark: '⚠',  color: '#f85149' },
  action: { mark: '⇄',  color: '#d29922' },
  ok:     { mark: '✓',  color: '#3fb950' },
  pay:    { mark: 'R$', color: '#3fb950' },
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SimulacaoPage() {
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [elapsed, setElapsed] = useState(0)
  const [guided, setGuided] = useState(true)
  const [activeExplainer, setActiveExplainer] = useState<Explainer | null>(null)
  const seenExplainersRef = useRef<Set<string>>(new Set())

  // Loop state mirrored into refs so the rAF callback never reads stale values.
  const playingRef = useRef(playing)
  const speedRef = useRef(speed)
  const guidedRef = useRef(guided)
  const elapsedRef = useRef(0)
  useEffect(() => { playingRef.current = playing }, [playing])
  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { guidedRef.current = guided }, [guided])

  useEffect(() => {
    if (!started) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      if (playingRef.current) {
        const e = Math.min(TOTAL_REAL_SECONDS, elapsedRef.current + dt * speedRef.current)
        elapsedRef.current = e
        setElapsed(e)
        // Guided mode: pause the replay at each business-flow milestone.
        if (guidedRef.current) {
          const m = simMinuteAt(e)
          const next = EXPLAINERS.find((ex) => m >= ex.at && !seenExplainersRef.current.has(ex.id))
          if (next) {
            seenExplainersRef.current.add(next.id)
            setActiveExplainer(next)
            setPlaying(false)
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [started])

  const t = simMinuteAt(elapsed)
  const done = elapsed >= TOTAL_REAL_SECONDS

  const start = () => { seenExplainersRef.current.clear(); elapsedRef.current = 0; setElapsed(0); setStarted(true); setPlaying(true) }
  const restart = () => { seenExplainersRef.current.clear(); setActiveExplainer(null); elapsedRef.current = 0; setElapsed(0); setPlaying(true) }
  const closeExplainer = () => { setActiveExplainer(null); setPlaying(true) }
  const skipExplainers = () => { setGuided(false); setActiveExplainer(null); setPlaying(true) }

  return (
    <div
      className="min-h-screen pb-16"
      style={{
        background:
          'radial-gradient(ellipse 80% 50% at 50% -10%, #101626 0%, transparent 60%), ' +
          'repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,0.012) 3px 4px), #09090f',
      }}
    >
      <Header t={t} started={started} done={done}
        playing={playing} speed={speed}
        onPlayPause={() => setPlaying((p) => !p)}
        onSpeed={() => setSpeed((s) => (s === 1 ? 2 : 1))}
        onRestart={restart}
      />

      <main className={`mx-auto px-4 ${started ? 'max-w-6xl' : 'max-w-3xl'}`}>
        <DisclaimerRibbon compact={started} />

        {!started && (
          <IntroCard onStart={start} guided={guided} onToggleGuided={() => setGuided((g) => !g)} />
        )}

        {started && (
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5 lg:items-start">
            <div>
              {done && <ReportCard onRestart={restart} />}
              <HeroBand t={t} />
              <Stepper t={t} />
              <section className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SITES.map((s) => <SiteCard key={s.id} site={s} t={t} />)}
              </section>
            </div>
            <div className="lg:sticky lg:top-[76px]">
              <GridCard t={t} />
              <Feed t={t} />
            </div>
          </div>
        )}

        <footer className="mt-10 border-t border-(--border) pt-4 text-[11px] leading-relaxed text-neutral-500">
          Demonstração white-label: a marca, o contrato e o cliente são do parceiro; o motor é Data Joule.
          Sites e valores são fictícios. As regras encenadas — acionamento oficial pelo ONS, tolerância de ≥ 80% por hora,
          apuração retroativa pela CCEE — seguem a minuta do Edital RD-D/001/2026-ONS.
          <div className="mt-2 font-[family-name:var(--font-mono)] text-neutral-600">
            Data Joule · OpenADR 3.0 · Chainlink · Polygon · data-joule.com
          </div>
        </footer>
      </main>

      {activeExplainer && (
        <ExplainerOverlay
          ex={activeExplainer}
          step={EXPLAINERS.findIndex((e) => e.id === activeExplainer.id) + 1}
          total={EXPLAINERS.length}
          onContinue={closeExplainer}
          onSkipAll={skipExplainers}
        />
      )}
    </div>
  )
}

// ── Header ─────────────────────────────────────────────────────────────────────

function Header({ t, started, done, playing, speed, onPlayPause, onSpeed, onRestart }: {
  t: number; started: boolean; done: boolean; playing: boolean; speed: number
  onPlayPause: () => void; onSpeed: () => void; onRestart: () => void
}) {
  const phase =
    !started ? 'AGUARDANDO' :
    done ? 'LIQUIDADO' :
    t < T.dispatch ? 'MONITORANDO' :
    t < T.precool ? 'ACIONADO' :
    t < T.start ? 'PREPARO' :
    t < T.end ? 'EVENTO ATIVO' :
    t < T.verified ? 'ENCERRANDO' : 'VERIFICANDO'

  const phaseColor = phase === 'EVENTO ATIVO' ? '#3fb950' : phase === 'LIQUIDADO' ? '#3fb950' : '#58a6ff'

  return (
    <header className="sticky top-0 z-20 border-b border-(--border) bg-[#0b0b13e6] backdrop-blur">
      {/* Mobile: two rows (brand+title+clock / controls). sm+: single row. */}
      <div className="mx-auto max-w-6xl px-4 py-2.5 sm:py-3 flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2">
        <div className="order-1 flex min-w-0 flex-1 items-center gap-3">
          <div className="shrink-0 rounded border border-dashed border-neutral-600 px-2.5 py-1.5 text-center leading-none">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-neutral-300">SUA MARCA</div>
            <div className="mt-1 text-[8px] uppercase tracking-wider text-neutral-600">white-label</div>
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold font-[family-name:var(--font-display)]">
              Sala de Operação<span className="hidden sm:inline"> · Flexibilidade</span>
            </div>
            <div className="truncate text-[10px] uppercase tracking-widest" style={{ color: phaseColor }}>
              ● {phase}
            </div>
          </div>
        </div>

        <div className="order-2 sm:order-3 shrink-0 rounded bg-(--surface) border border-(--border) px-2.5 py-1.5 font-[family-name:var(--font-mono)] text-base sm:text-lg tabular-nums tracking-wider">
          {started ? fmtClock(t) : '--:--'}
        </div>

        {started && (
          <div className="order-3 sm:order-2 flex w-full sm:w-auto shrink-0 items-center justify-end gap-2">
            <button onClick={onSpeed} aria-label="Velocidade da simulação"
              className="rounded border border-(--border) px-3 py-1.5 sm:px-2 sm:py-1 text-[12px] sm:text-[11px] font-[family-name:var(--font-mono)] text-neutral-400 hover:text-neutral-200">
              {speed}×
            </button>
            {!done && (
              <button onClick={onPlayPause} aria-label={playing ? 'Pausar' : 'Continuar'}
                className="rounded border border-(--border) px-3 py-1.5 sm:px-2 sm:py-1 text-[12px] sm:text-[11px] font-[family-name:var(--font-mono)] text-neutral-400 hover:text-neutral-200">
                {playing ? '⏸' : '▶'}
              </button>
            )}
            <button onClick={onRestart} aria-label="Reiniciar simulação"
              className="rounded border border-(--border) px-3 py-1.5 sm:px-2 sm:py-1 text-[12px] sm:text-[11px] font-[family-name:var(--font-mono)] text-neutral-400 hover:text-neutral-200">
              ↺
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

function DisclaimerRibbon({ compact }: { compact?: boolean }) {
  if (compact) {
    // During the replay: one quiet line — the full rules live in the intro, the
    // explainers and the footer.
    return (
      <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-[10.5px] sm:text-[11px] text-amber-200/70 truncate">
        ⚠ Demonstração <strong>simulada</strong> — sites, cargas e valores fictícios.
      </div>
    )
  }
  return (
    <div className="mt-4 rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200/80">
      ⚠ Demonstração <strong>simulada</strong> — sites, cargas e valores fictícios. O fluxo operacional e as regras
      (≥ 80%/hora, apuração CCEE) são os do mecanismo oficial.
    </div>
  )
}

// ── Intro ──────────────────────────────────────────────────────────────────────

function IntroCard({ onStart, guided, onToggleGuided }: {
  onStart: () => void; guided: boolean; onToggleGuided: () => void
}) {
  return (
    <section className="mt-8 rounded-xl border border-(--border) bg-(--surface) p-6 animate-fade-up">
      <h1 className="text-2xl font-bold leading-tight">
        Um dia de evento,<br />do acionamento ao pagamento.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-neutral-400">
        Replay simulado da operação de um portfólio de resposta da demanda:
        <strong className="text-neutral-200"> 8 clientes · 5 MW</strong> de redução comprometida,
        despacho oficial das <strong className="text-neutral-200">18h às 22h</strong>.
        Você verá o despacho automático site a site, a verificação em tempo real
        (a régua de 80%/hora do edital), um quase-incidente resolvido pelo sistema — e o
        pagamento no mesmo dia.
      </p>
      <ul className="mt-4 space-y-1.5 text-[12px] text-neutral-500">
        <li>· 4 horas de evento comprimidas em ~2,5 minutos</li>
        <li>· Nenhum dado real: simulação determinística, roda no seu navegador</li>
        <li>· A marca no topo é do parceiro — o motor é Data Joule</li>
      </ul>
      <label className="mt-5 flex items-start gap-2.5 cursor-pointer select-none rounded-lg border border-(--border) bg-black/20 px-3 py-2.5">
        <input
          type="checkbox"
          checked={guided}
          onChange={onToggleGuided}
          className="mt-0.5 accent-sky-400"
        />
        <span className="text-[12px] leading-snug text-neutral-400">
          <strong className="text-neutral-200">Modo guiado</strong> — a simulação pausa nas etapas-chave
          com uma explicação curta do mecanismo (ideal para apresentar).
          Desmarque para o replay contínuo de ~2,5 min.
        </span>
      </label>
      <button onClick={onStart}
        className="mt-6 w-full rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-4 py-3.5 text-sm font-semibold tracking-wide text-emerald-300 hover:bg-emerald-500/25 transition-colors">
        ▶ INICIAR SIMULAÇÃO
      </button>
    </section>
  )
}

// ── Hero band ──────────────────────────────────────────────────────────────────

function HeroBand({ t }: { t: number }) {
  const inEvent = t >= T.start && t < T.end
  const red = portfolioReductionKw(t)
  const compliance = (red / PORTFOLIO_KW) * 100
  const color = !inEvent ? '#7d8590' : compliance >= 95 ? '#3fb950' : compliance >= 80 ? '#d29922' : '#f85149'

  return (
    <section className="mt-4 rounded-xl border border-(--border) bg-(--surface) p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">Entrega do portfólio</div>
          <div className="font-[family-name:var(--font-mono)] tabular-nums leading-none mt-1">
            <span className="text-4xl lg:text-6xl font-medium" style={{ color }}>{nf(red)}</span>
            <span className="text-sm lg:text-base text-neutral-500"> / {nf(PORTFOLIO_KW)} kW</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">Conformidade</div>
          <div className="font-[family-name:var(--font-mono)] tabular-nums text-4xl lg:text-6xl font-medium leading-none mt-1" style={{ color }}>
            {inEvent || t >= T.end ? `${Math.min(999, compliance).toFixed(0)}%` : '—'}
          </div>
        </div>
      </div>
      <Sparkline t={t} />
      <div className="mt-1 flex justify-between text-[10px] font-[family-name:var(--font-mono)] text-neutral-600">
        <span>18:00</span>
        <span className="text-neutral-500">linha tracejada = mínimo de 80% (4.000 kW)</span>
        <span>22:00</span>
      </div>
    </section>
  )
}

function Sparkline({ t }: { t: number }) {
  const from = T.start
  const to = Math.min(t, T.end)
  if (to <= from) {
    return <div className="mt-4 h-14 lg:h-24 rounded border border-(--border) bg-black/20" />
  }
  const pts: string[] = []
  for (let m = from; m <= to; m += 2) {
    const x = ((m - from) / (T.end - from)) * 100
    const y = 52 - (portfolioReductionKw(m) / (PORTFOLIO_KW * 1.12)) * 48
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  const targetY = 52 - (PORTFOLIO_KW / (PORTFOLIO_KW * 1.12)) * 48
  const minY = 52 - ((PORTFOLIO_KW * 0.8) / (PORTFOLIO_KW * 1.12)) * 48
  return (
    <svg viewBox="0 0 100 56" preserveAspectRatio="none" className="mt-4 h-14 lg:h-24 w-full rounded border border-(--border) bg-black/20">
      <line x1="0" y1={targetY} x2="100" y2={targetY} stroke="#3fb95040" strokeWidth="0.6" />
      <line x1="0" y1={minY} x2="100" y2={minY} stroke="#f8514950" strokeWidth="0.6" strokeDasharray="2 1.5" />
      <polyline points={pts.join(' ')} fill="none" stroke="#3fb950" strokeWidth="1.1"
        vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

// ── Stepper ────────────────────────────────────────────────────────────────────

const STEPS: Array<{ at: number; label: string; time: string }> = [
  { at: T.dispatch, label: 'Acionamento', time: '14:12' },
  { at: T.precool,  label: 'Preparo',     time: '17:40' },
  { at: T.start,    label: 'Evento',      time: '18:00' },
  { at: T.end,      label: 'Encerra',     time: '22:00' },
  { at: T.verified, label: 'Verificação', time: '22:35' },
  { at: T.paid,     label: 'Pagamento',   time: '22:41' },
]

function Stepper({ t }: { t: number }) {
  return (
    <ol className="mt-4 grid grid-cols-6 gap-1">
      {STEPS.map((s) => {
        const passed = t >= s.at
        return (
          <li key={s.label} className="text-center">
            <div className={`h-1 rounded-full ${passed ? 'bg-emerald-500' : 'bg-neutral-800'}`} />
            <div className={`mt-1.5 text-[9px] lg:text-[11px] uppercase tracking-wide leading-tight ${passed ? 'text-emerald-400' : 'text-neutral-600'}`}>
              {s.label}
            </div>
            <div className="text-[9px] lg:text-[10px] font-[family-name:var(--font-mono)] text-neutral-600">{s.time}</div>
          </li>
        )
      })}
    </ol>
  )
}

// ── Site card ──────────────────────────────────────────────────────────────────

function SiteCard({ site, t }: { site: Site; t: number }) {
  const status = siteStatus(site, t)
  const cfg = STATUS_CFG[status]
  const kw = currentKw(site, t)
  const red = reductionKw(site, t)
  const bump = preBumpKw(site, t)
  const comp = siteCompliance(site, t)
  const inEvent = t >= T.start && t < T.end
  const fillPct = Math.min(100, (kw / (site.baselineKw * 1.08)) * 100)
  const targetPct = ((site.baselineKw - site.committedKw) / (site.baselineKw * 1.08)) * 100
  const alert = status === 'alerta'

  return (
    <div className={`rounded-lg border bg-(--surface) p-3 transition-colors ${alert ? 'border-red-500/60' : 'border-(--border)'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold">{site.name}</div>
          <div className="truncate text-[10px] text-neutral-500">{site.segment} · {site.loads}</div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-[family-name:var(--font-mono)] tracking-wide ${cfg.pulse ? 'animate-pulse' : ''}`}
          style={{ color: cfg.color, borderColor: cfg.color + '55', background: cfg.color + '14' }}>
          {cfg.label}
        </span>
      </div>

      <div className="mt-2.5 h-2 rounded-full bg-neutral-900 relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
          style={{ width: `${fillPct}%`, background: alert ? '#f85149' : red > 0 ? '#3fb950' : bump > 0 ? '#79c0ff' : '#30363d' }} />
        <div className="absolute inset-y-0 w-px bg-white/40" style={{ left: `${targetPct}%` }} title="alvo" />
      </div>

      <div className="mt-1.5 flex items-baseline justify-between font-[family-name:var(--font-mono)] tabular-nums">
        <span className="text-sm text-neutral-200">{nf(kw)} <span className="text-[10px] text-neutral-500">kW</span></span>
        <span className="text-[11px] text-neutral-500">
          {inEvent
            ? <>−{nf(red)} kW · <span style={{ color: comp >= 0.8 ? '#3fb950' : '#f85149' }}>{Math.round(comp * 100)}%</span></>
            : bump > 0 ? <span className="text-sky-300">pré-resfriando</span>
            : <>compromisso {nf(site.committedKw)} kW</>}
        </span>
      </div>
    </div>
  )
}

// ── Feed ───────────────────────────────────────────────────────────────────────

function Feed({ t }: { t: number }) {
  const visible = LOG_SCRIPT.filter((e) => t >= e.t).reverse()
  return (
    <section className="mt-5 rounded-xl border border-(--border) bg-(--surface) p-4">
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">Diário de operação</div>
      <ul aria-live="polite" className="mt-2 space-y-1.5 font-[family-name:var(--font-mono)] text-[11.5px] leading-snug lg:max-h-[340px] lg:overflow-y-auto">
        {visible.length === 0 && <li className="text-neutral-600">— aguardando registros —</li>}
        {visible.map((e) => {
          const c = LOG_CFG[e.kind]
          return (
            <li key={e.t} className="flex gap-2 animate-fade-up">
              <span className="shrink-0 tabular-nums text-neutral-600">{fmtClock(e.t)}</span>
              <span className="shrink-0 w-4 text-center" style={{ color: c.color }}>{c.mark}</span>
              <span className={e.kind === 'info' ? 'text-neutral-400' : 'text-neutral-200'}>{e.text}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ── ONS grid monitor (deterministic sibling of /demo's GridMonitorCard) ────────

function GridCard({ t }: { t: number }) {
  const gw = sinLoadGw(t)
  const pct = (gw / SIN_CAPACITY_GW) * 100
  const color = pct >= 95 ? '#f85149' : pct >= 90 ? '#d29922' : '#3fb950'
  const peakWatch = t >= T.dispatch && t < T.end

  return (
    <div
      className="mt-4 rounded-xl border p-4"
      style={{ borderColor: 'rgba(30,58,138,0.6)', background: 'rgba(30,58,138,0.06)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-widest text-blue-400/90 font-[family-name:var(--font-mono)]">
          Monitor do sistema
        </span>
        <span className="text-[9px] uppercase tracking-wider text-neutral-600">simulado</span>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/ons-logo.png"
          alt="ONS — Operador Nacional do Sistema Elétrico"
          style={{ height: 20, width: 'auto', filter: 'brightness(0) invert(1)' }}
        />
      </div>
      <div className="mt-1 text-[10px] font-[family-name:var(--font-mono)] text-neutral-600">
        Sistema Interligado Nacional
      </div>

      <div className="mt-2 flex items-baseline gap-1.5 font-[family-name:var(--font-mono)] tabular-nums">
        <span className="text-3xl font-medium" style={{ color }}>{gw.toFixed(1)}</span>
        <span className="text-sm" style={{ color: color + 'aa' }}>GW</span>
      </div>
      <div className="mt-1 text-[11px] font-[family-name:var(--font-mono)]">
        <span style={{ color }}>{pct.toFixed(1)}% da capacidade</span>
        <span className="text-neutral-700"> · </span>
        {peakWatch
          ? <span className="text-red-400">⚡ PICO 18h–22h</span>
          : <span style={{ color }}>✓ OK</span>}
      </div>

      <div className="mt-3 border-t border-blue-900/40 pt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {SIN_REGIONS.map((r) => (
          <div key={r.code} className="flex items-baseline justify-between font-[family-name:var(--font-mono)] text-[10.5px]">
            <span className="text-neutral-500">{r.code}</span>
            <span style={{ color }}>{(gw * r.share).toFixed(1)} GW</span>
          </div>
        ))}
      </div>

      <div className="mt-2.5 text-[9.5px] leading-relaxed text-neutral-600">
        No piloto, este card mostra dados ao vivo da API pública do ONS — como na página /demo.
      </div>
    </div>
  )
}

// ── Guided-mode explainer overlay ──────────────────────────────────────────────

function ExplainerOverlay({ ex, step, total, onContinue, onSkipAll }: {
  ex: Explainer; step: number; total: number
  onContinue: () => void; onSkipAll: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-[2px] px-4"
      role="dialog" aria-modal="true" aria-label={ex.title}
    >
      <div className="w-full max-w-md rounded-xl border border-sky-500/40 bg-[#0d1117] p-5 shadow-2xl animate-fade-up">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-widest text-sky-400 font-[family-name:var(--font-mono)]">
            Como funciona · {step}/{total}
          </span>
          <span className="font-[family-name:var(--font-mono)] text-[11px] tabular-nums text-neutral-500">
            {fmtClock(ex.at)}
          </span>
        </div>
        <h3 className="mt-2 text-base font-bold leading-snug">{ex.title}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-neutral-300">{ex.body}</p>
        <button
          onClick={onContinue}
          className="mt-4 w-full rounded-lg bg-sky-500/15 border border-sky-500/40 px-4 py-2.5 text-sm font-semibold tracking-wide text-sky-300 hover:bg-sky-500/25 transition-colors"
        >
          Continuar ▶
        </button>
        <button
          onClick={onSkipAll}
          className="mt-2 w-full text-center text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          pular explicações e rodar direto
        </button>
      </div>
    </div>
  )
}

// ── Final report ───────────────────────────────────────────────────────────────

function ReportCard({ onRestart }: { onRestart: () => void }) {
  return (
    <section className="mt-4 rounded-xl border border-emerald-500/30 bg-(--surface) p-5 animate-fade-up">
      <div className="flex items-center gap-2">
        <span className="text-emerald-400 text-lg">✓</span>
        <h2 className="text-lg font-bold">Evento liquidado · D+0</h2>
      </div>
      <p className="mt-1 text-[12px] text-neutral-400">
        Relatório verificado pelo oráculo às 22:35 · rateio calculado por smart contract ·
        comprovante on-chain <span className="font-[family-name:var(--font-mono)] text-neutral-300">0x84f2…c9a1</span>
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { v: nf(REPORT_TOTAL_KWH), l: 'kWh entregues' },
          { v: '100%', l: 'horas preservadas' },
          { v: `R$ ${nf(REPORT_TOTAL_BRL)}`, l: 'parcelas D+0 (clientes)' },
        ].map((x) => (
          <div key={x.l} className="rounded-lg border border-(--border) bg-black/20 py-2.5">
            <div className="font-[family-name:var(--font-mono)] text-base font-medium text-emerald-300">{x.v}</div>
            <div className="mt-0.5 text-[9px] uppercase tracking-wide text-neutral-500">{x.l}</div>
          </div>
        ))}
      </div>

      <table className="mt-4 w-full text-[11px]">
        <thead>
          <tr className="text-left text-[9px] uppercase tracking-wider text-neutral-500">
            <th className="pb-1.5 font-medium">Site</th>
            <th className="pb-1.5 font-medium text-right">kWh</th>
            <th className="pb-1.5 font-medium text-right">Conf.</th>
            <th className="pb-1.5 font-medium text-right">Parcela</th>
          </tr>
        </thead>
        <tbody className="font-[family-name:var(--font-mono)] tabular-nums">
          {REPORT.map((r) => (
            <tr key={r.site.id} className="border-t border-(--border)">
              <td className="py-1.5 pr-2 font-[family-name:var(--font-body)]">
                {r.site.name}
                {r.note && <div className="text-[9px] text-amber-400/80">{r.note}</div>}
              </td>
              <td className="py-1.5 text-right text-neutral-300">{nf(r.kwh)}</td>
              <td className="py-1.5 text-right" style={{ color: r.compliancePct >= 95 ? '#3fb950' : '#d29922' }}>
                {r.compliancePct}%
              </td>
              <td className="py-1.5 text-right text-neutral-300">R$ {nf(r.shareBrl)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 rounded-md border border-(--border) bg-black/20 px-3 py-2 text-[11px] leading-relaxed text-neutral-400">
        No programa real, o acionamento vem do ONS e a apuração oficial é da CCEE (em até 45 dias, sobre a medição de
        faturamento) — ela continua mandando. Este painel opera do lado do participante: <strong className="text-neutral-200">garante
        a entrega, antecipa a verificação e organiza o rateio</strong>. O pagamento D+0 é adiantado pelo agregador com o
        evento verificado como gatilho.
      </p>

      <button onClick={onRestart}
        className="mt-4 w-full rounded-lg border border-(--border) px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 transition-colors">
        ↺ Repetir simulação
      </button>
    </section>
  )
}
