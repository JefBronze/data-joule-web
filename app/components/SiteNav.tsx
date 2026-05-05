'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/method', label: 'Method' },
  { href: '/demo',   label: 'Demo' },
]

export function SiteNav() {
  const pathname = usePathname()

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
            href="https://github.com/JefBronze/data-joule"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 hover:text-neutral-100 transition-colors"
          >
            GitHub
          </a>
        </div>
      </nav>
    </header>
  )
}
