import ThemeToggle from '@/components/ThemeToggle'
import Bastidores from '@/components/sections/Bastidores'
import Bomba from '@/components/sections/Bomba'
import Cortes from '@/components/sections/Cortes'
import Fora from '@/components/sections/Fora'
import Mercado from '@/components/sections/Mercado'
import Mini from '@/components/sections/Mini'
import Parana from '@/components/sections/Parana'
import Pato, { PatoCortes } from '@/components/sections/Pato'
import Quem, { Termicas } from '@/components/sections/Quem'
import Petroleo from '@/components/sections/Petroleo'
import Preco from '@/components/sections/Preco'
import Tendencias from '@/components/sections/Tendencias'
import Pulso from '@/components/sections/Pulso'
import Link from 'next/link'
import { BRONZE_URL } from '@/components/ui'
import { atSlot, BBL_LITERS, cmoSlotNow, cmoStats, curtailStats, termicaStats, FLAG_NAME, flagNow } from '@/lib/derive'
import { dec, ddmm, fmt, hhmm, monthLabel, pct } from '@/lib/format'
import { getObservatory, type Status } from '@/lib/observatory'

// The page is rebuilt in the background at most once a day (Vercel Hobby ISR-write budget); the source caches use the
// same floor (MIN_REVALIDATE in lib/sources/http.ts), otherwise the shortest fetch would set the pace.
export const revalidate = 86400

/*
  type: software (site-kind software): a free observatory whose "product UI" is its live instruments.
  deal (tasteskill 2.5.1, Nov 2026): hero collage · nav nav-mega · close close-word · footer footer-columns ·
  rhythm surface-pairs (Tendências + Bastidores) · buttons pill · mark: the client's own logo (dealt ring not used) ·
  palette white-link-blue (the first, white-mint-tiles, read as a data series: wind and the green flag, and clashed
  with the logo's orange) · type funnel · lit ground sage · grounds bg-dots (minigeração; the dealt bg-field on the hero inset its lines, dropped) ·
  moments word-highlight (#cortes) and liquid-hover (#quem, the Itaipu photograph) · no shader effect.
  Main action: Falar com um engenheiro (e-mail to contato@data-joule.com).
*/

const WHATSAPP = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '14389796085').replace(/\D/g, '')
const MAIL = 'mailto:contato@data-joule.com?subject=Data%20Joule'
const MAIN_ACTION = 'Falar com um engenheiro'

type Reading = { label: string; value: string; source: string; color: string; status?: Status }

function Arrow() {
  return (
    <svg className="m-arrow" viewBox="0 0 12 12" aria-hidden="true">
      <path className="m-arrow__stem" d="M1 6h8" />
      <path className="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5" />
    </svg>
  )
}

function Logo() {
  return (
    <a className="nav__logo" href="#top" aria-label="Data Joule, início">
      <svg className="djmark" width={24} height={24} viewBox="0 0 36 36" aria-hidden="true">
        <rect x="4" y="22" width="6" height="10" fill="currentColor" />
        <rect x="13" y="16" width="6" height="16" fill="currentColor" />
        <rect x="22" y="12" width="6" height="20" fill="currentColor" />
        <rect x="2" y="5" width="32" height="3" fill="var(--dj)" />
      </svg>
      <span className="djword">
        Data<span className="djus">_</span>Joule
      </span>
    </a>
  )
}

export default async function Page() {
  const o = await getObservatory()
  const slot = cmoSlotNow(o)
  const cmo = cmoStats(o, slot ?? 47)
  const cmoSE = o.cmo.bySub.SE[slot ?? 47]
  const brentL = (o.brent.at(-1)!.v * o.ptax.venda) / BBL_LITERS
  const fuel = o.fuel.curitiba as Record<string, number>
  const cut = curtailStats(o)
  const term = termicaStats(o)
  const flag = flagNow(o)
  const lido = `${ddmm(o.renderedAt)} · ${hhmm(o.renderedAt)}`

  const readings: Reading[] = [
    { label: 'Carga do SIN', value: `${fmt(o.carga.sinNow)} MW`, source: `ONS · ${hhmm(o.carga.asOf)}`, color: 'var(--c1)', status: o.status.ons },
    { label: 'CMO Sudeste', value: `R$ ${dec(cmoSE, 1)}/MWh`, source: 'ONS · meia-hora', color: 'var(--c2)', status: o.status.cmo },
    { label: 'Bandeira', value: FLAG_NAME[flag], source: `ANEEL · ${monthLabel(o.bandeira.mes)}`, color: 'var(--c3)' },
    ...(term ? [{ label: 'Térmicas ontem', value: `${fmt(term.total / 1000)} GWh`, source: `ONS · ${pct(term.byMotivo.inflex / term.total)} inflexível`, color: 'var(--c4)' }] : []),
    { label: 'Cortes eól. + sol.', value: `${dec(cut.total / 1e6, 1)} TWh`, source: `ONS · ${monthLabel(cut.m)}`, color: 'var(--sol)' },
    { label: 'Brent em reais', value: `R$ ${dec(brentL)}/L`, source: 'FRED × PTAX', color: 'var(--c6)', status: o.status.fred },
    { label: 'Gasolina, Curitiba', value: `R$ ${dec(fuel.GASOLINA)}/L`, source: `ANP · ${o.fuel.month}`, color: 'var(--c5)' },
  ]

  return (
    <>
      <header className="nav">
        <div className="wrap nav__bar">
          <a className="skip-link" href="#pulso">Pular para o conteúdo</a>
          <Logo />
          <nav className="nav__links" aria-label="Seções">
            <div className="nav__item">
              <a className="nav__link" href="#pulso">
                Eletricidade{' '}
                <svg className="chev" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <div className="nav__menu">
                <div className="wrap grid">
                  <div className="menu-col span-3">
                    <p className="t-label">Eletricidade</p>
                    <a href="#pulso">Carga hoje<span>O que o país consome agora</span></a>
                    <a href="#preco">Preço do MWh<span>Do CMO a três faturas</span></a>
                    <a href="#pato">Curva do pato<span>Sobra ao meio-dia, rampa à noite</span></a>
                    <a href="#cortes-mes">Cortes por mês<span>Eólica e solar, por motivo</span></a>
                  </div>
                  <div className="menu-col span-3">
                    <p className="t-label">Usinas e mercado</p>
                    <a href="#quem">Quem gera<span>As maiores usinas, ontem</span></a>
                    <a href="#termicas">Térmicas e bandeira<span>Por que ligaram, que cor vem</span></a>
                    <a href="#mercado">Mercado livre<span>Livre, cativo ou telhado</span></a>
                    <a href="#minigeracao">Minigeração<span>O que perderia num corte</span></a>
                  </div>
                  <a className="menu-card span-3 start-10" href="#minigeracao">
                    <div className="panel">
                      <img className="frame__img" src="/assets/img/photo-f149704805-500.jpg" width={500} height={358} alt="Usina solar flutuante sobre um reservatório" data-source="stand-in" data-subject="usina solar flutuante" />
                    </div>
                    <span className="t-card">Minigeração sob controle</span>
                    <span className="t-small muted">Cortes por sobra de energia, usina por usina</span>
                  </a>
                </div>
              </div>
            </div>
            <div className="nav__item"><a className="nav__link" href="#petroleo">Combustíveis</a></div>
            <div className="nav__item"><a className="nav__link" href="#parana">Demanda</a></div>
            <div className="nav__item"><a className="nav__link" href="#tendencias">Tendências</a></div>
            <div className="nav__item"><a className="nav__link" href="#bastidores">Fontes</a></div>
          </nav>
          <div className="nav__actions">
            <a className="btn btn--primary" href={MAIL}>{MAIN_ACTION}</a>
          </div>
          <button className="nav__toggle" type="button" aria-expanded="false" aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M2 5h14M2 13h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero hero--collage" data-enter aria-labelledby="hero-h">
          <div className="wrap">
            <div className="hero-text grid hero__grid">
              <div className="hero__text span-5">
                <h1 id="hero-h">Observatório de energia do Brasil, todo dia</h1>
                <p className="hero__lead">
                  Carga, custo marginal, bandeira, cortes de eólica e solar, petróleo em reais e preço na bomba, dos dados públicos do ONS, ANEEL, CCEE, ANP e Banco Central.
                </p>
                <div className="btn-row">
                  <a className="btn btn--primary" href={MAIL}>
                    {MAIN_ACTION}
                    <Arrow />
                  </a>
                  <a className="btn btn--secondary" href="#pulso">Ver a carga de hoje</a>
                </div>
                <p className="hero__proof">
                  Às {hhmm(o.carga.asOf)} o Brasil pedia {fmt(o.carga.sinNow)} MW. Página montada em {lido}.
                </p>
              </div>
              <div
                className="hero__art span-6 start-7"
                role="img"
                aria-label={`Painel de leituras de ${ddmm(o.renderedAt)}: carga do SIN ${fmt(o.carga.sinNow)} MW, CMO do Sudeste R$ ${dec(cmoSE, 1)} por MWh, bandeira ${FLAG_NAME[flag]}, Brent R$ ${dec(brentL)} por litro.`}
              >
                <div className="ly-piece ly-piece--main d-win" aria-hidden="true">
                  <div className="d-win__bar">
                    <span className="d-win__dots"><i></i><i></i><i></i></span>
                    <span>Data Joule · leituras de {ddmm(o.renderedAt)}</span>
                  </div>
                  <div className="d-win__body">
                    <div className="d-side">
                      <span className="is-on"><i></i>Hoje</span>
                      <span><i></i>Preço</span>
                      <span><i></i>Cortes</span>
                      <span><i></i>Usinas</span>
                      <span><i></i>Mercado</span>
                      <span><i></i>Bomba</span>
                      <span className="d-side__label">Fontes</span>
                      <span><i></i>ONS</span>
                      <span><i></i>ANEEL</span>
                      <span><i></i>ANP</span>
                    </div>
                    <div className="d-main">
                      <div className="d-main__head">
                        <h4>Leituras de hoje</h4>
                        <span className="d-btn">{lido}</span>
                      </div>
                      <div className="d-tabs">
                        <span className="is-on">Todas {readings.length}</span>
                        <span>Eletricidade 5</span>
                        <span>Combustíveis 2</span>
                      </div>
                      <div className="d-rows">
                        {readings.map((r) => (
                          <div className="d-row" key={r.label}>
                            <span className="d-thumb" style={{ background: r.color }} />
                            <div>
                              <b>{r.label}</b>
                              <small>{r.source}</small>
                            </div>
                            <span className="num">{r.value}</span>
                            <span className={r.status && !r.status.live ? 'd-chip d-chip--low' : 'd-chip'}>{r.status && !r.status.live ? 'última' : 'lido'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ly-piece ly-piece--note d-card" aria-hidden="true" data-ly-steps="700">
                  <div className="d-card__row">
                    <h5>Custo marginal, Sudeste</h5>
                    <span className="d-chip" data-step data-step-at="4">ONS</span>
                  </div>
                  <div className="d-note__line" data-step>
                    <i>✓</i>
                    <span>
                      Agora <b>R$ {dec(cmoSE, 1)}/MWh</b>
                    </span>
                  </div>
                  <div className="d-note__line" data-step>
                    <i className="warn">!</i>
                    <span>
                      Pico de <b>R$ {fmt(cmo.max)}</b> {atSlot(cmo.maxSlot)}
                    </span>
                  </div>
                  <div className="d-note__line" data-step>
                    <i>✓</i>
                    <span>
                      Bandeira <b>{FLAG_NAME[flag]}</b> em {monthLabel(o.bandeira.mes)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Pulso o={o} />
        <Preco o={o} />
        <Pato o={o} />
        <Cortes o={o} />
        <PatoCortes o={o} />
        <Quem o={o} />
        <Termicas o={o} />
        <Mercado o={o} />
        <Mini o={o} />
        <Petroleo o={o} />
        <Bomba o={o} />
        <Parana o={o} />
        <Fora o={o} />
        <Tendencias o={o} />
        <Bastidores o={o} />
      </main>

      <footer className="footer closing" id="contact" aria-labelledby="close-h">
        <div className="wrap">
          <div className="closing__cta close--word">
            <div className="section-head--split">
              <div>
                <h2 id="close-h">Os números da sua fatura ou da sua usina</h2>
                <p className="t-lead">A Bronze Engenharia de Energia lê faturas de Grupo A e cortes de usinas com os mesmos dados públicos desta página.</p>
              </div>
              <a className="btn btn--primary" href={MAIL}>
                {MAIN_ACTION}
                <Arrow />
              </a>
            </div>
            <p className="close__word" aria-hidden="true">Data Joule</p>
          </div>
          <div className="closing__links">
            <div className="grid">
              <div className="span-4 stack-4">
                <Logo />
                <p className="footer__lede">Observatório de energia da Bronze Engenharia de Energia, em Curitiba e Montréal.</p>
              </div>
              <div className="span-2 footer__col">
                <h3>Eletricidade</h3>
                <ul>
                  <li><a href="#pulso">Carga hoje</a></li>
                  <li><a href="#preco">Preço do MWh</a></li>
                  <li><a href="#pato">Curva do pato</a></li>
                  <li><a href="#quem">Quem gera</a></li>
                </ul>
              </div>
              <div className="span-2 footer__col">
                <h3>Mercado</h3>
                <ul>
                  <li><a href="#mercado">Mercado livre</a></li>
                  <li><a href="#minigeracao">Minigeração</a></li>
                  <li><a href="#parana">Paraná</a></li>
                  <li><a href="#fora">Lá fora</a></li>
                </ul>
              </div>
              <div className="span-2 footer__col">
                <h3>Combustíveis</h3>
                <ul>
                  <li><a href="#petroleo">Petróleo</a></li>
                  <li><a href="#bomba">Na bomba</a></li>
                  <li><a href="#bastidores">Fontes</a></li>
                </ul>
              </div>
              <div className="span-2 footer__col">
                <h3>Contato</h3>
                <ul>
                  <li><a href={`https://wa.me/${WHATSAPP}`}>WhatsApp</a></li>
                  <li><a href={BRONZE_URL}>Bronze Engenharia</a></li>
                  <li><Link href="/privacidade">Privacidade</Link></li>
                </ul>
              </div>
            </div>
            <div className="footer__legal">
              <span>© 2026 Bronze Engenharia de Energia · CREA-PR 194835/D</span>
              <ThemeToggle />
              <details className="credits">
                <summary>Fotografias via Wikimedia Commons</summary>
                <p className="t-small">
                  Itaipu: Jonas de Carvalho, CC BY-SA 2.0 · Parque Eólico de Rio do Fogo: Fabiogurgelamaral, CC BY-SA 3.0 · Usina fotovoltaica flutuante: Governo do Estado de São Paulo, CC BY 2.0
                </p>
              </details>
            </div>
          </div>
        </div>
      </footer>
      <nav className="actionbar" aria-label="Ação rápida">
        <a className="btn btn--primary" href={MAIL}>{MAIN_ACTION}</a>
      </nav>
    </>
  )
}
