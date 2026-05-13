'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef } from 'react'
import { useLocale, type Locale } from '@/app/lib/i18n'

const LOCALES: { code: Locale; label: string }[] = [
  { code: 'pt', label: 'PT' },
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
]

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale()
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const active = LOCALES.find(l => l.code === locale) ?? LOCALES[0]
  const others = LOCALES.filter(l => l.code !== locale)

  const calcPos = () => {
    if (!buttonRef.current) return
    const r = buttonRef.current.getBoundingClientRect()
    setDropPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
  }

  const handleEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    calcPos()
    setOpen(true)
  }
  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  return (
    <div>
      <button
        ref={buttonRef}
        onClick={() => { calcPos(); setOpen(v => !v) }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className="flex items-center h-8 px-2 rounded text-xs font-mono font-semibold text-neutral-100 hover:bg-neutral-800 transition-colors"
        aria-label="Switch language"
      >
        {active.label}
      </button>

      {open && (
        <div
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          style={{ position: 'fixed', top: dropPos.top, right: dropPos.right, zIndex: 9999 }}
          className="flex flex-col gap-0.5 bg-neutral-900 border border-neutral-800 rounded-lg p-1.5 shadow-xl"
        >
          {others.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => { setLocale(code); setOpen(false) }}
              className="flex items-center px-2 py-1.5 rounded hover:bg-neutral-800 transition-colors text-xs font-mono font-semibold text-neutral-100 whitespace-nowrap"
            >
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function SiteNav() {
  const pathname = usePathname()
  const { t } = useLocale()

  const NAV_LINKS = [
    { href: '/method',         label: t.nav.method, color: null },
    { href: '/demo',           label: t.nav.demo,   color: null },
    { href: '/joule-credits',  label: t.nav.jlc,    color: 'text-purple-400 hover:text-purple-300' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800 bg-(--background)/90 backdrop-blur-sm px-6 py-4">
      <nav className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="font-[family-name:var(--font-display)] font-bold text-amber-400 tracking-tight text-lg">
          Data Joule
        </Link>
        <div className="flex items-center gap-6 text-sm">
          {NAV_LINKS.map(({ href, label, color }) => (
            <Link
              key={href}
              href={href}
              className={
                pathname === href
                  ? 'text-neutral-100'
                  : color ?? 'text-neutral-400 hover:text-neutral-100 transition-colors'
              }
            >
              {label}
            </Link>
          ))}
          <a
            href="https://github.com/Data-Joule/data-joule-web"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 hover:text-neutral-100 transition-colors"
          >
            GitHub
          </a>
          <LocaleSwitcher />
        </div>
      </nav>
    </header>
  )
}
