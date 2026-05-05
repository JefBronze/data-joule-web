'use client'

import Image from 'next/image'
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
          <span className="flex items-center gap-2 font-[family-name:var(--font-display)] font-bold text-amber-400 tracking-tight text-lg">
            <Image src="/logo.png" alt="Data Joule" width={32} height={32} className="rounded-full" style={{ filter: 'brightness(0) invert(1)' }} />
            Data Joule
          </span>
        ) : (
          <Link href="/" className="flex items-center gap-2 font-[family-name:var(--font-display)] font-bold text-amber-400 tracking-tight text-lg">
            <Image src="/logo.png" alt="Data Joule" width={32} height={32} className="rounded-full" style={{ filter: 'brightness(0) invert(1)' }} />
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
