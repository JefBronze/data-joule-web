'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { en } from './translations/en'
import { fr } from './translations/fr'
import { pt } from './translations/pt'

export type Locale = 'en' | 'fr' | 'pt'
export type Translations = typeof en

const translations = { en, fr, pt } as unknown as Record<Locale, Translations>

const LocaleContext = createContext<{
  locale: Locale
  setLocale: (l: Locale) => void
  t: Translations
}>({
  locale: 'en',
  setLocale: () => {},
  t: en,
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    // 1. Manual user choice in localStorage takes highest priority
    const saved = localStorage.getItem('dj-locale') as Locale | null
    if (saved && saved in translations) {
      queueMicrotask(() => setLocaleState(saved as Locale))
      return
    }

    // 2. Locale cookie set by edge middleware (domain-based or Accept-Language)
    const cookie = document.cookie
      .split('; ')
      .find(r => r.startsWith('dj-locale='))
      ?.split('=')[1] as Locale | undefined
    if (cookie && cookie in translations) {
      queueMicrotask(() => setLocaleState(cookie))
    }
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    localStorage.setItem('dj-locale', l)
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
