import { NextResponse, type NextRequest } from 'next/server'

import { payload } from '@/lib/data'
import { imageUrl } from '@/lib/alerts'
import { digestEmail } from '@/lib/email'
import { recentStories } from '@/lib/mailing'

/** Shows today's digest email in the browser, exactly as members and subscribers would get it. Admins only. */
export async function GET(req: NextRequest) {
  const p = await payload()
  const { user } = await p.auth({ headers: req.headers })
  if (user?.collection !== 'users' || (user as { role?: string }).role !== 'admin') return NextResponse.redirect(new URL('/admin/login', req.url))

  const posts = (await recentStories(p)).filter((x) => Date.parse(x.publishedAt) > Date.now() - 864e5).slice(0, 8)
  if (!posts.length) {
    return new NextResponse(
      '<!doctype html><meta charset="utf-8"><p style="font-family:Arial;padding:32px">No stories were published in the last 24 hours, so there is no digest to send today.</p>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }
  const email = digestEmail(
    user.email ?? 'you@example.com',
    posts.map((x) => ({ title: x.title, slug: x.slug, excerpt: x.excerpt, image: imageUrl(x.cover), section: typeof x.section === 'object' ? x.section?.name : null })),
    '#unsubscribe',
  )
  const banner = `<div style="font-family:Arial;background:#0B2A4A;color:#fff;padding:10px 16px;font-size:13px">Preview · Subject: <strong>${email.subject.replace(/</g, '&lt;')}</strong></div>`
  return new NextResponse(email.html.replace(/<body([^>]*)>/, `<body$1>${banner}`), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
