import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="border-t border-amber-500/10 py-8">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link href="/" className="font-[family-name:var(--font-display)] text-sm text-amber-400 font-bold">
          Data Joule
        </Link>
        <p className="text-xs text-neutral-400 font-mono">
          Live telemetry from a Raspberry Pi compute node in Montréal, QC. Updated every 5s.
        </p>
        <div className="flex gap-4 text-xs text-neutral-400">
          <a
            href="https://github.com/JefBronze/data-joule-web"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-200 transition-colors"
          >
            GitHub
          </a>
          <Link href="/method" className="hover:text-neutral-200 transition-colors">Method</Link>
          <Link href="/demo"   className="hover:text-neutral-200 transition-colors">Demo</Link>
        </div>
      </div>
    </footer>
  )
}
