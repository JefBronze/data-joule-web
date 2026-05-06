'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef } from 'react'
import { useLocale, type Locale } from '@/app/lib/i18n'

function QuebecFlag() {
  return (
    <svg width="22" height="15" viewBox="0 0 22 15" className="rounded-[2px] shrink-0">
      <rect width="22" height="15" fill="#003DA5" />
      {/* white cross */}
      <rect x="9.2" y="0" width="3.6" height="15" fill="white" />
      <rect x="0" y="5.7" width="22" height="3.6" fill="white" />
      {/* fleur-de-lis — four quadrants */}
      <text x="4.6"  y="5.4"  textAnchor="middle" fontSize="4.5" fill="white">⚜</text>
      <text x="17.4" y="5.4"  textAnchor="middle" fontSize="4.5" fill="white">⚜</text>
      <text x="4.6"  y="13.2" textAnchor="middle" fontSize="4.5" fill="white">⚜</text>
      <text x="17.4" y="13.2" textAnchor="middle" fontSize="4.5" fill="white">⚜</text>
    </svg>
  )
}

function USFlag() {
  return (
    <svg width="22" height="15" viewBox="0 0 22 15" className="rounded-[2px] shrink-0">
      {/* red and white stripes */}
      {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
        <rect key={i} x="0" y={i * (15/13)} width="22" height={15/13} fill={i % 2 === 0 ? '#B22234' : 'white'} />
      ))}
      {/* blue canton */}
      <rect x="0" y="0" width="9" height={15 * 7/13} fill="#3C3B6E" />
      {/* stars — 5 rows of 6, 4 rows of 5 */}
      {[...Array(50)].map((_, i) => {
        const col = i % 6
        const row = Math.floor(i / 6)
        if (row > 8) return null
        const isOffRow = row % 2 === 1
        if (isOffRow && col >= 5) return null
        const x = isOffRow ? 1.6 + col * 1.55 : 0.85 + col * 1.55
        const y = 0.7 + row * 0.85
        return <circle key={i} cx={x} cy={y} r="0.35" fill="white" />
      })}
    </svg>
  )
}

function BrazilFlag() {
  return (
    <svg width="22" height="15" viewBox="0 0 22 15" className="rounded-[2px] shrink-0">
      <rect width="22" height="15" fill="#009C3B" />
      {/* yellow diamond */}
      <polygon points="11,1.8 20.5,7.5 11,13.2 1.5,7.5" fill="#FEDF00" />
      {/* blue circle */}
      <circle cx="11" cy="7.5" r="3.8" fill="#002776" />
      {/* white band */}
      <clipPath id="brcircle">
        <circle cx="11" cy="7.5" r="3.8" />
      </clipPath>
      <rect x="7" y="6.6" width="8" height="1.4" fill="white" transform="rotate(-10 11 7.5)" clipPath="url(#brcircle)" />
    </svg>
  )
}

const LOCALES: { code: Locale; flag: React.ReactNode; label: string }[] = [
  { code: 'en', flag: <USFlag />, label: 'EN' },
  { code: 'fr', flag: <QuebecFlag />, label: 'FR' },
  { code: 'pt', flag: <BrazilFlag />, label: 'PT' },
]

function LocaleSwitcher() {
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
        className="flex items-center p-1.5 rounded hover:bg-neutral-800 transition-colors"
        aria-label="Switch language"
      >
        {active.flag}
      </button>

      {open && (
        <div
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          style={{ position: 'fixed', top: dropPos.top, right: dropPos.right, zIndex: 9999 }}
          className="flex flex-col gap-0.5 bg-neutral-900 border border-neutral-800 rounded-lg p-1.5 shadow-xl"
        >
          {others.map(({ code, flag, label }) => (
            <button
              key={code}
              onClick={() => { setLocale(code); setOpen(false) }}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-neutral-800 transition-colors text-xs font-mono text-neutral-400 hover:text-neutral-200 whitespace-nowrap"
            >
              {flag}
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
    { href: '/method', label: t.nav.method },
    { href: '/demo',   label: t.nav.demo },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800 bg-(--background)/90 backdrop-blur-sm px-6 py-4">
      <nav className="max-w-7xl mx-auto flex items-center justify-between">
        {pathname === '/' ? (
          <span className="font-[family-name:var(--font-display)] font-bold text-amber-400 tracking-tight text-lg">
            Data Joule
          </span>
        ) : (
          <Link href="/" className="font-[family-name:var(--font-display)] font-bold text-amber-400 tracking-tight text-lg">
            Data Joule
          </Link>
        )}
        <div className="flex items-center gap-6 text-sm">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={
                pathname === href
                  ? 'text-neutral-100'
                  : 'text-neutral-400 hover:text-neutral-100 transition-colors'
              }
            >
              {label}
            </Link>
          ))}
          <a
            href="https://github.com/JefBronze/data-joule-web"
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
