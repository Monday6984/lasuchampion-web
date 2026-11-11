import { NextResponse, type NextRequest } from 'next/server'

import { payload } from '@/lib/data'
import { runDailyEmails } from '@/lib/mailing'
import { revalidate } from '@/lib/revalidate'
import { saveVideoCopy } from '@/lib/youtube'

/**
 * Runs once a day (vercel.json → crons; Vercel Hobby allows one run a day).
 * Refreshes listings for stories and issues scheduled for today, saves a copy of the Champion TV
 * video list, then sends the day's emails (alerts for scheduled stories, new-issue notices and the
 * daily digest) within the daily email allowance.
 */
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Scheduled stories and issues go live on their date; refresh the cached pages that list them.
  revalidate('/', '/[...path]', '/magazine', '/rss.xml', '/sitemap.xml')

  const p = await payload()
  // Keep a saved copy of the Champion TV video list, used if YouTube is ever unreachable.
  const tv = await saveVideoCopy(p).catch((err) => ({ error: String(err) }))

  const result = await runDailyEmails(p)
  return NextResponse.json({ ...result, tv })
}
