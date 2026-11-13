import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { DM_Mono, Funnel_Display, Funnel_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './observatory.css'

// Design: tasteskill 2.5.1 (design-taste-frontend), dealt Nov 2026. The kit lives in public/assets as plain files,
// unedited (the gate compares them with the skill's copy). Type pairing "funnel": Funnel Display / Funnel Sans +
// DM Mono, self-hosted through next/font (the CSP only allows font-src 'self').
const display = Funnel_Display({ subsets: ['latin'], weight: 'variable', variable: '--nf-display', display: 'swap' })
const text = Funnel_Sans({ subsets: ['latin'], weight: 'variable', variable: '--nf-text', display: 'swap' })
const mono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--nf-mono', display: 'swap' })

// The observatory is Data Joule at data-joule.com (domain swap of Oct 2026; the audit landing moved to
// bronze-engenharia.com.br). Data Joule is a brand of Bronze Engenharia de Energia.
const SITE_URL = 'https://data-joule.com'
const TITLE = 'Data Joule: observatório de energia do Brasil, atualizado todo dia'
const DESCRIPTION =
  'Carga do SIN, custo marginal, bandeira, cortes de eólica e solar, usinas, mercado livre, petróleo em reais e preço na bomba, lidos de dados públicos do ONS, ANEEL, CCEE, ANP e Banco Central. Um projeto da Bronze Engenharia de Energia.'

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#121314' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: { type: 'website', locale: 'pt_BR', url: SITE_URL, siteName: 'Data Joule', title: TITLE, description: DESCRIPTION, images: ['/assets/img/share.jpg'] },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/' },
  other: { 'site-kind': 'software', 'page-type': 'software' },
}

// Applies a saved theme before first paint (no flash). Without a saved choice the system setting wins via CSS.
const THEME_SCRIPT = `try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`
// The kit's two guards, as starter.html writes them: the hero's words wait for motion.js (700 ms at most), and the
// moments show their finished state if their module is late (2.5 s).
const ENTER_SCRIPT = "document.documentElement.classList.add('m-enter');setTimeout(()=>document.documentElement.classList.add('m-enter-done'),700)"
const MOMENTS_SCRIPT = "document.documentElement.classList.add('mo-js');setTimeout(()=>document.documentElement.classList.add('mo-safe'),2500)"
// Vercel's speed script only exists on Vercel; elsewhere (local checks) it would 404.
const ON_VERCEL = Boolean(process.env.VERCEL)

const KIT_CSS = ['system.css', 'ui/cards.css', 'motion/motion.css', 'backgrounds/backgrounds.css', 'layout/layout.css', 'layout/demo.css', 'icons/icon.css']

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${text.variable} ${mono.variable}`}
      data-type="software"
      data-radius="soft"
      data-ground="sage"
      data-buttons="pill"
      data-motion=""
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {KIT_CSS.map((f) => (
          <link key={f} rel="stylesheet" href={`/assets/${f}`} />
        ))}
        {/* the kit asks for the grounds' tokens before first paint: plain, not deferred */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/assets/backgrounds/backgrounds.js" />
        <script dangerouslySetInnerHTML={{ __html: ENTER_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: MOMENTS_SCRIPT }} />
        <link rel="modulepreload" href="/assets/moments/moments.js" />
        <link rel="modulepreload" href="/assets/moments/lib.js" />
        <link rel="modulepreload" href="/assets/moments/word-highlight/moment.js" />
        <link rel="modulepreload" href="/assets/moments/liquid-hover/moment.js" />
      </head>
      <body suppressHydrationWarning>
        {children}
        {/* nav sheet, hovers, presses, the hero's entrance and the dealt moments: the kit's scripts, after hydration */}
        <Script type="module" src="/assets/system.js" strategy="afterInteractive" />
        <Script type="module" src="/assets/motion/motion.js" strategy="afterInteractive" />
        <Script type="module" src="/assets/layout/layout.js" strategy="afterInteractive" />
        {ON_VERCEL && <SpeedInsights />}
        {ON_VERCEL && <Analytics />}
      </body>
    </html>
  )
}
