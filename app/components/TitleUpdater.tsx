'use client'

import { useEffect } from 'react'
import { useLocale } from '../lib/i18n'

export function TitleUpdater() {
  const { t } = useLocale()

  useEffect(() => {
    document.title = t.site_title
  }, [t.site_title])

  return null
}
