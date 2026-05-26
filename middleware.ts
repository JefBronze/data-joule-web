import { NextRequest, NextResponse } from 'next/server'

const LOCALE_COOKIE = 'dj-locale'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // If the user already made a manual choice, respect it — don't override
  if (req.cookies.has(LOCALE_COOKIE)) return res

  const host = req.headers.get('host') ?? ''

  // Brazilian domain → always Portuguese
  if (host.includes('data-joule.com.br')) {
    res.cookies.set(LOCALE_COOKIE, 'pt', { path: '/', maxAge: COOKIE_MAX_AGE, sameSite: 'lax' })
    return res
  }

  // data-joule.com → detect from browser Accept-Language
  const acceptLang = req.headers.get('accept-language') ?? ''
  if (/\bfr\b/i.test(acceptLang)) {
    res.cookies.set(LOCALE_COOKIE, 'fr', { path: '/', maxAge: COOKIE_MAX_AGE, sameSite: 'lax' })
  } else if (/\bpt\b/i.test(acceptLang)) {
    res.cookies.set(LOCALE_COOKIE, 'pt', { path: '/', maxAge: COOKIE_MAX_AGE, sameSite: 'lax' })
  }
  // English (or anything else) → no cookie, LocaleProvider defaults to 'en'

  return res
}

export const config = {
  // Run on all routes except API routes, Next.js internals, and static assets
  matcher: ['/((?!api|_next/static|_next/image|favicon).*)'],
}
