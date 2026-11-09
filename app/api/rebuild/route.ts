import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { isCronAuthorized } from '@/lib/cron'

// Daily rebuild at 23h BRT (vercel.json cron "0 2 * * *" UTC), so "today" charts like 3a (Energia Agora) show
// almost the whole day instead of whatever hour the page last happened to rebuild. The page's own
// `revalidate = 86400` stays as the fallback if the cron is missed.
export async function GET(req: Request) {
  if (!isCronAuthorized(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return new Response('unauthorized', { status: 401 })
  }
  // Marks "/" and the source fetches it made (implicit path tags) as stale. From a Route Handler the rebuild
  // only happens on the next visit, so visit it ourselves once the response is sent.
  revalidatePath('/')
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (process.env.VERCEL_ENV === 'production' && host) {
    after(async () => {
      await fetch(`https://${host}/`, { cache: 'no-store', headers: { 'User-Agent': 'data-joule-rebuild' } }).catch(() => {})
    })
  }
  return Response.json({ revalidated: '/', at: new Date().toISOString() })
}
