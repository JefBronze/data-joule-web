'use client'

import Link from 'next/link'
import Image from 'next/image'
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

const IconMethod = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)

const IconDemo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M10 8.5l6 3.5-6 3.5V8.5z" fill="currentColor" stroke="none"/>
  </svg>
)

const IconJLC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l7.794 4.5v9L12 20l-7.794-4.5v-9L12 2z"/>
    <path d="M12 8v4M12 14h.01" strokeWidth={2}/>
  </svg>
)

export function SiteNav() {
  const pathname = usePathname()
  const { t, locale } = useLocale()

  const NAV_LINKS = [
    { href: '/method',        label: t.nav.method, color: null,                                       icon: <IconMethod /> },
    { href: '/demo',          label: t.nav.demo,   color: null,                                       icon: <IconDemo /> },
    { href: '/joule-credits', label: t.nav.jlc,    color: 'text-purple-400 hover:text-purple-300',   icon: <IconJLC /> },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800 bg-(--background)/90 backdrop-blur-sm px-6 py-4">
      <nav className="max-w-7xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          onClick={() => { if (pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          className="whitespace-nowrap font-[family-name:var(--font-display)] font-bold text-amber-400 tracking-tight text-lg inline-flex items-center gap-2"
        >
          <Image src="/golden_coin.png" alt="" width={20} height={20} className="rounded-full" priority />
          Data Joule
          {locale === 'fr' && <span className="text-base leading-none opacity-70">⚜</span>}
        </Link>
        <div className="flex items-center gap-4 sm:gap-6 text-sm">
          {NAV_LINKS.map(({ href, label, color, icon }) => (
            <Link
              key={href}
              href={href}
              className={
                'whitespace-nowrap ' + (
                  pathname === href
                    ? 'text-neutral-100'
                    : color ?? 'text-neutral-400 hover:text-neutral-100 transition-colors'
                )
              }
              aria-label={label}
            >
              <span className="sm:hidden">{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
          <a
            href="https://github.com/Data-Joule/data-joule-web"
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap text-neutral-400 hover:text-neutral-100 transition-colors"
            aria-label="GitHub"
          >
            <svg className="sm:hidden" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <LocaleSwitcher />
        </div>
      </nav>
    </header>
  )
}
