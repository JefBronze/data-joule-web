import { timingSafeEqual } from 'node:crypto'

/**
 * Vercel Cron calls the job with `Authorization: Bearer $CRON_SECRET` when that variable is set on the project.
 * Fails closed: without a secret nobody may trigger a rebuild (each one costs ~200 ISR writes on Vercel Hobby).
 */
export function isCronAuthorized(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || !authorization) return false
  const got = Buffer.from(authorization)
  const want = Buffer.from(`Bearer ${secret}`)
  return got.length === want.length && timingSafeEqual(got, want)
}
