import { NextResponse, type NextRequest } from 'next/server'

import { payload } from '@/lib/data'
import { recordView, type ViewKind } from '@/lib/views'

const KINDS: ViewKind[] = ['page', 'post', 'issue', 'video']
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|pingdom|uptime/i
const WINDOW_SECONDS = 30 * 60

/**
 * Records one view. Body: { kind: 'page' | 'post' | 'issue' | 'video', id: string }.
 * A video "view" is a play started on the site (id = the YouTube video id).
 * The same visitor is only counted once per item every 30 minutes (cookie), and bots are ignored.
 */
export async function POST(req: NextRequest) {
  const ua = req.headers.get('user-agent') ?? ''
  if (!ua || BOT.test(ua)) return new NextResponse(null, { status: 204 })

  let body: { kind?: string; id?: string }
  try {
    body = JSON.parse(await req.text())
  } catch {
    return new NextResponse(null, { status: 400 })
  }
  const kind = body.kind as ViewKind
  const id = String(body.id ?? '').slice(0, 200)
  if (!KINDS.includes(kind) || !id) return new NextResponse(null, { status: 400 })
  // Page paths: keep only real site paths, never the admin or API.
  if (kind === 'page' && (!id.startsWith('/') || id.startsWith('/admin') || id.startsWith('/api'))) {
    return new NextResponse(null, { status: 204 })
  }
  if (kind === 'video' ? !/^[\w-]{11}$/.test(id) : kind !== 'page' && !/^\d+$/.test(id)) {
    return new NextResponse(null, { status: 400 })
  }

  const cookieName = `gv_${kind}_${id.replace(/[^a-zA-Z0-9]/g, '_')}`.slice(0, 120)
  if (req.cookies.get(cookieName)) return new NextResponse(null, { status: 204 })

  try {
    await recordView(await payload(), kind, id)
  } catch (err) {
    console.error('[views] failed to record', err)
    return new NextResponse(null, { status: 500 })
  }

  const res = new NextResponse(null, { status: 204 })
  res.cookies.set(cookieName, '1', { maxAge: WINDOW_SECONDS, httpOnly: true, sameSite: 'lax', path: '/' })
  return res
}
