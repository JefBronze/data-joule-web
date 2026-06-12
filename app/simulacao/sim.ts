// Deterministic simulation engine for the white-label portfolio demo.
// Everything is a pure function of simulated time (minutes since 00:00),
// so the replay is identical on every run and there is no live-infra dependency.

export interface Site {
  id: string
  name: string
  segment: string
  loads: string
  committedKw: number
  baselineKw: number
  coldStorage: boolean
  reserve?: boolean
}

export const SITES: Site[] = [
  { id: 'boavista', name: 'Frigorífico Boa Vista',      segment: 'Frigorífico',        loads: 'Câmaras frias',          committedKw: 600, baselineKw: 1850, coldStorage: true },
  { id: 'aguia',    name: 'Rede Águia Supermercados',   segment: 'Varejo · 12 lojas',  loads: 'Refrigeração + HVAC',    committedKw: 800, baselineKw: 2400, coldStorage: true },
  { id: 'textil',   name: 'Têxtil Sancarlense',         segment: 'Indústria leve',     loads: 'Compressores + HVAC',    committedKw: 900, baselineKw: 2100, coldStorage: false },
  { id: 'vale',     name: 'Cond. Ind. Vale Verde',      segment: 'Condomínio',         loads: 'Utilidades + HVAC',      committedKw: 700, baselineKw: 1600, coldStorage: false, reserve: true },
  { id: 'horizonte',name: 'Atacadista Horizonte',       segment: 'Atacado',            loads: 'Refrigeração',           committedKw: 550, baselineKw: 1200, coldStorage: true },
  { id: 'pinheiral',name: 'Shopping Pinheiral',         segment: 'Varejo',             loads: 'HVAC central',           committedKw: 650, baselineKw: 1900, coldStorage: false },
  { id: 'serra',    name: 'Laticínios Serra Alta',      segment: 'Alimentos',          loads: 'Câmaras + bombas',       committedKw: 450, baselineKw:  950, coldStorage: true },
  { id: 'oeste',    name: 'Gráfica & Log. Oeste',       segment: 'Logística',          loads: 'HVAC + ar comprimido',   committedKw: 350, baselineKw:  800, coldStorage: false },
]

export const PORTFOLIO_KW = SITES.reduce((s, x) => s + x.committedKw, 0) // 5 000 kW

// ── Simulated timeline ─────────────────────────────────────────────────────────
// Key moments (minutes since 00:00):
export const T = {
  open: 835,        // 13:55 — sala calma, monitorando
  dispatch: 852,    // 14:12 — acionamento registrado
  precool: 1060,    // 17:40 — pré-condicionamento
  start: 1080,      // 18:00 — evento inicia
  incident: 1148,   // 19:08 — Têxtil cai para 71%
  redispatch: 1150, // 19:10 — reserva assume +280 kW
  recovered: 1153,  // 19:13 — portfólio recuperado
  end: 1320,        // 22:00 — evento encerra
  verified: 1355,   // 22:35 — verificação concluída
  paid: 1361,       // 22:41 — pagamento D+0
} as const

// Piecewise mapping sim-minutes → real seconds (controls pacing/drama).
const SEGMENTS: Array<{ from: number; to: number; dur: number }> = [
  { from: T.open,    to: T.dispatch, dur: 8 },
  { from: T.dispatch,to: T.precool,  dur: 12 },
  { from: T.precool, to: T.start,    dur: 14 },
  { from: T.start,   to: T.incident, dur: 30 },
  { from: T.incident,to: 1165,       dur: 30 },
  { from: 1165,      to: T.end,      dur: 28 },
  { from: T.end,     to: T.paid,     dur: 24 },
]

export const TOTAL_REAL_SECONDS = SEGMENTS.reduce((s, x) => s + x.dur, 0)

/** Map elapsed real seconds → simulated minute-of-day. Clamps at the end. */
export function simMinuteAt(elapsedSec: number): number {
  let acc = 0
  for (const seg of SEGMENTS) {
    if (elapsedSec <= acc + seg.dur) {
      const f = (elapsedSec - acc) / seg.dur
      return seg.from + f * (seg.to - seg.from)
    }
    acc += seg.dur
  }
  return T.paid
}

export function fmtClock(simMin: number): string {
  const h = Math.floor(simMin / 60) % 24
  const m = Math.floor(simMin % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ── Power model ────────────────────────────────────────────────────────────────

const ramp = (t: number, from: number, to: number) =>
  t <= from ? 0 : t >= to ? 1 : (t - from) / (to - from)

/** Per-site delivery performance during steady state (fraction of committed). */
const PERF: Record<string, number> = {
  boavista: 1.03, aguia: 1.0, textil: 0.99, vale: 1.0,
  horizonte: 0.98, pinheiral: 1.02, serra: 0.97, oeste: 1.01,
}

/** Reduction (kW) the site is delivering at sim minute t. */
export function reductionKw(site: Site, t: number): number {
  if (t < T.start) return 0
  const rampIn  = ramp(t, T.start, T.start + 6)
  const rampOut = 1 - ramp(t, T.end, T.end + 8)
  let target = site.committedKw * (PERF[site.id] ?? 1)

  if (site.id === 'textil') {
    // 19:08 — um lote urgente liga máquinas: entrega cai para 640 kW (71%).
    const drop = ramp(t, T.incident, T.incident + 1.5)
    const rec  = ramp(t, 1162, 1170)
    target = target + (640 - target) * drop + (880 - 640) * rec * drop
  }
  if (site.id === 'vale') {
    // 19:10 — redespacho automático do site de reserva: +280 kW até ~20:20.
    const boost = ramp(t, T.redispatch, T.redispatch + 2) * (1 - ramp(t, 1220, 1226))
    target += 280 * boost
  }

  const wobbleIdx = SITES.findIndex((s) => s.id === site.id)
  const wobble = Math.sin(t * 0.9 + wobbleIdx * 2.1) * site.committedKw * 0.015
  return Math.max(0, (target + wobble) * rampIn * rampOut)
}

/** Pre-cooling bump (kW above baseline) for cold-storage sites before the event. */
export function preBumpKw(site: Site, t: number): number {
  if (!site.coldStorage) return 0
  const up = ramp(t, T.precool, T.precool + 4) * (1 - ramp(t, T.start - 2, T.start + 2))
  return site.baselineKw * 0.06 * up
}

export function currentKw(site: Site, t: number): number {
  return site.baselineKw + preBumpKw(site, t) - reductionKw(site, t)
}

export function siteCompliance(site: Site, t: number): number {
  return reductionKw(site, t) / site.committedKw
}

export function portfolioReductionKw(t: number): number {
  return SITES.reduce((s, x) => s + reductionKw(x, t), 0)
}

export type SiteStatus =
  | 'prontidao' | 'armado' | 'preparando' | 'modulando'
  | 'alerta' | 'reserva' | 'normalizando' | 'concluido'

export function siteStatus(site: Site, t: number): SiteStatus {
  if (t < T.dispatch) return 'prontidao'
  if (t < T.precool) return 'armado'
  if (t < T.start) return site.coldStorage ? 'preparando' : 'armado'
  if (t < T.end) {
    if (site.id === 'textil' && siteCompliance(site, t) < 0.8) return 'alerta'
    if (site.id === 'vale' && reductionKw(site, t) > site.committedKw + 150) return 'reserva'
    return 'modulando'
  }
  if (t < T.verified) return 'normalizando'
  return 'concluido'
}

// ── SIN load model (deterministic, mirrors the ONS card on /demo) ─────────────

export const SIN_CAPACITY_GW = 105

// Anchor points [sim-minute, GW] tracing the SIN evening ramp on the event day.
const SIN_CURVE: Array<[number, number]> = [
  [800, 83.5], [880, 84.8], [960, 86.2], [1020, 88.4], [1060, 90.8],
  [1080, 93.6], [1120, 98.2], [1148, 100.9], [1170, 102.6], [1210, 101.8],
  [1260, 99.0], [1320, 94.2], [1365, 89.8],
]

export function sinLoadGw(t: number): number {
  const c = SIN_CURVE
  if (t <= c[0][0]) return c[0][1]
  if (t >= c[c.length - 1][0]) return c[c.length - 1][1]
  for (let i = 1; i < c.length; i++) {
    if (t <= c[i][0]) {
      const [t0, v0] = c[i - 1]
      const [t1, v1] = c[i]
      const f = (t - t0) / (t1 - t0)
      return v0 + (v1 - v0) * f + Math.sin(t * 0.7) * 0.18
    }
  }
  return c[c.length - 1][1]
}

// Regional split of the SIN load (fixed shares — illustrative).
export const SIN_REGIONS: Array<{ code: string; share: number }> = [
  { code: 'SE/CO', share: 0.55 },
  { code: 'S',     share: 0.18 },
  { code: 'NE',    share: 0.17 },
  { code: 'N',     share: 0.10 },
]

// ── Guided-mode explainers (business flow, shown as pausing popups) ────────────

export interface Explainer {
  id: string
  at: number      // sim minute at which the popup fires (replay pauses)
  title: string
  body: string
}

export const EXPLAINERS: Explainer[] = [
  {
    id: 'acionamento',
    at: T.dispatch + 1,
    title: 'O acionamento — quem manda é o ONS',
    body:
      'O operador do sistema aciona a redução pelos canais oficiais, com horas de antecedência. ' +
      'O agregador é pago pela disponibilidade — o "plantão" rende por dia útil, acionado ou não. ' +
      'O dia de acionamento é o dia de provar a entrega.',
  },
  {
    id: 'preparo',
    at: T.precool + 1,
    title: 'Preparo automático — o cliente não faz nada',
    body:
      'A plataforma já distribuiu o evento aos 8 sites e os equipamentos se preparam sozinhos: ' +
      'as câmaras frias resfriam 1 °C extra antes das 18h para atravessar as 4 horas sem risco ao produto. ' +
      'Nenhuma ligação, nenhuma planilha — automação.',
  },
  {
    id: 'regua',
    at: T.start + 3,
    title: 'A régua do edital: ≥ 80% por hora',
    body:
      'Cada hora do evento é avaliada separadamente: entregar menos de 80% do compromisso anula a hora — ' +
      'e quem falha de forma recorrente é desabilitado do leilão seguinte. ' +
      'Por isso a verificação precisa ser em tempo real, não semanas depois.',
  },
  {
    id: 'seguro',
    at: T.recovered + 1,
    title: 'O seguro de entrega',
    body:
      'Um cliente falhou — um lote urgente ligou máquinas fora do previsto. ' +
      'No fluxo oficial, isso só apareceria na apuração da CCEE, semanas depois, como receita perdida. ' +
      'Aqui o sistema detectou em segundos e redespachou a reserva: a hora foi preservada.',
  },
  {
    id: 'prova',
    at: T.verified + 1,
    title: 'Prova e pagamento',
    body:
      'O relatório por site replica a metodologia oficial da CCEE (linha de base) e é ancorado on-chain ' +
      'como recibo auditável do rateio. Com a entrega verificada, o agregador pode adiantar a parcela ' +
      'dos clientes ainda hoje — o pagamento D+0 que você verá a seguir.',
  },
]

// ── Operations feed ────────────────────────────────────────────────────────────

export type LogKind = 'info' | 'alert' | 'warn' | 'action' | 'ok' | 'pay'
export interface LogEntry { t: number; kind: LogKind; text: string }

export const LOG_SCRIPT: LogEntry[] = [
  { t: T.open,      kind: 'info',   text: 'Portfólio em prontidão · monitorando canais do operador (ONS)' },
  { t: T.dispatch,  kind: 'alert',  text: 'ACIONAMENTO registrado pela operadora — despacho 18h–22h (canal oficial ONS)' },
  { t: T.dispatch + 1, kind: 'info', text: 'VTN distribuiu o evento aos 8 sites (OpenADR 3.0) · todos confirmaram em 4 s' },
  { t: T.precool,   kind: 'info',   text: 'Pré-condicionamento: câmaras frias resfriando 1 °C abaixo do set-point' },
  { t: T.start,     kind: 'ok',     text: 'EVENTO INICIADO · meta do portfólio: 5.000 kW de redução por hora' },
  { t: T.incident,  kind: 'warn',   text: 'Têxtil Sancarlense em 71% do compromisso — lote urgente ligado fora do previsto' },
  { t: T.redispatch,kind: 'action', text: 'Redespacho automático: Cond. Vale Verde (reserva) assume +280 kW' },
  { t: T.recovered, kind: 'ok',     text: 'Portfólio recuperado · hora 19h–20h preservada (≥ 80%)' },
  { t: T.end,       kind: 'info',   text: 'EVENTO ENCERRADO · cargas retornando à operação normal' },
  { t: T.verified,  kind: 'ok',     text: 'Verificação concluída · relatório por site assinado pelo oráculo · recibo on-chain' },
  { t: T.paid,      kind: 'pay',    text: 'Pagamento D+0: parcelas creditadas em BRL · comprovante 0x84f2…c9a1' },
]

// ── Final report (static, fictional, consistent with the live replay) ─────────

export interface ReportRow {
  site: Site
  compliancePct: number
  kwh: number
  shareBrl: number
  note?: string
}

const REPORT_PERF: Record<string, { pct: number; note?: string }> = {
  boavista:  { pct: 103 },
  aguia:     { pct: 100 },
  textil:    { pct: 92, note: '1 oscilação às 19h — coberta pela reserva' },
  vale:      { pct: 104, note: 'reserva acionada: +280 kW' },
  horizonte: { pct: 98 },
  pinheiral: { pct: 102 },
  serra:     { pct: 97 },
  oeste:     { pct: 101 },
}

const BRL_PER_KWH = 0.25 // parcela ilustrativa do cliente por kWh entregue

export const REPORT: ReportRow[] = SITES.map((site) => {
  const { pct, note } = REPORT_PERF[site.id]
  const kwh = Math.round(site.committedKw * 4 * (pct / 100))
  return { site, compliancePct: pct, kwh, shareBrl: Math.round(kwh * BRL_PER_KWH), note }
})

export const REPORT_TOTAL_KWH = REPORT.reduce((s, r) => s + r.kwh, 0)
export const REPORT_TOTAL_BRL = REPORT.reduce((s, r) => s + r.shareBrl, 0)
