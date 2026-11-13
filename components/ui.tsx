import type { CSSProperties, ReactNode } from 'react'
import type { Status } from '@/lib/observatory'

/** Source line under an instrument. A source that failed shows its last good reading, marked as such. */
export function Stamp({ status, source, when, cadence, children }: { status?: Status; source: string; when: string; cadence?: string; children?: ReactNode }) {
  const live = status?.live ?? true
  return (
    <div className="stamp">
      <span className={live ? 'live' : 'live stale'}>
        <span className={live ? 'dot' : 'dot off'} aria-hidden="true" />
        {live ? `${source} · ${when}${cadence ? ` · ${cadence}` : ''}` : `${source} · sem sinal agora · última leitura ${when}`}
      </span>
      {children}
    </div>
  )
}

export function Lido({ label = 'Lido hoje', children }: { label?: string; children: ReactNode }) {
  return (
    <p className="lido">
      <b>{label}</b>
      {children}
    </p>
  )
}

export function Metodo({ children }: { children: ReactNode }) {
  return (
    <details className="met">
      <summary>Método</summary>
      {/* a div, not a p: some notes hold several paragraphs, and a p inside a p breaks hydration */}
      <div className="met__body">{children}</div>
    </details>
  )
}

export function ParaVoce({ children, label = 'Para você.' }: { children: ReactNode; label?: string | null }) {
  return (
    <p className="pv">
      {label && <b>{label}</b>} {children}
    </p>
  )
}

/** Red mono tag for anything not yet verified against its primary source. */
export function Todo({ children }: { children: ReactNode }) {
  return <span className="todo">{children}</span>
}

/**
 * One section on the design kit's box (public/assets/system.css): exactly one or two screens at 1440x900
 * (`h`), its h2 first. A two-screen section (`g2`) holds two <Group>s, one per screen.
 */
export function Section({
  id,
  h = 1,
  g2 = false,
  ground,
  className,
  moment,
  children,
}: {
  id: string
  h?: 1 | 2
  g2?: boolean
  ground?: string
  className?: string
  moment?: string
  children: ReactNode
}) {
  const cls = ['section', g2 ? 'g2' : '', ground ?? '', className ?? ''].filter(Boolean).join(' ')
  return (
    <section className={cls} id={id} style={{ '--h': g2 ? 2 : h } as CSSProperties} aria-labelledby={`${id}-h`} data-moment={moment}>
      <div className="wrap">{children}</div>
    </section>
  )
}

/** One screen's part of a two-screen section. */
export function Group({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className ? `group ${className}` : 'group'}>{children}</div>
}

/** The section's h2 (a noun that names the instrument) and one line under it. */
export function Head({ id, title, children }: { id: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="section-head">
      <h2 id={`${id}-h`}>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  )
}

export function Swatch({ color, dashed }: { color: string; dashed?: boolean }) {
  return <span className={dashed ? 'sw dash' : 'sw'} style={dashed ? { color } : { background: color }} aria-hidden="true" />
}

/** The audit service lives on Bronze Engenharia's site (Data Joule is the observatory). */
export const BRONZE_URL = 'https://www.bronze-engenharia.com.br'
