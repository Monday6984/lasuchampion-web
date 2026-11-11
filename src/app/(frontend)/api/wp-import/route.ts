import { NextResponse, type NextRequest } from 'next/server'

import { payload } from '@/lib/data'
import { revalidate } from '@/lib/revalidate'
import type { WpPost } from '@/lib/wp-import-types'

// One post per request, including its image downloads.
export const maxDuration = 120

/** Imports a single WordPress post. Admins only; called by the admin Import page. */
export async function POST(req: NextRequest) {
  try {
    return await handle(req)
  } catch (err) {
    // Never a bare 500: the Import page shows this message in its log.
    console.error('[wp-import]', err)
    return NextResponse.json({ status: 'failed', title: '', message: err instanceof Error ? err.message : 'Import failed.' })
  }
}

async function handle(req: NextRequest) {
  const p = await payload()
  const { user } = await p.auth({ headers: req.headers })
  if (!user || (user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ status: 'failed', message: 'Only admins can import stories.' }, { status: 403 })
  }

  let post: WpPost
  try {
    post = (await req.json()) as WpPost
  } catch {
    return NextResponse.json({ status: 'failed', message: 'Unreadable request.' }, { status: 400 })
  }
  if (!post?.wpId || !post?.title) {
    return NextResponse.json({ status: 'failed', title: post?.title ?? '', message: 'Missing post id or title.' }, { status: 400 })
  }

  try {
    // Loaded here so that if the importer itself can't start, the admin sees the reason, not a bare 500.
    const { importWordPressPost } = await import('@/lib/wp-import')
    const result = await importWordPressPost(p, post)
    if (result.status === 'imported') revalidate('/', '/[...path]')
    return NextResponse.json(result)
  } catch (err) {
    p.logger.error({ err, msg: `WordPress import failed: ${post.title}` })
    return NextResponse.json({ status: 'failed', title: post.title, message: err instanceof Error ? err.message : 'Import failed.' })
  }
}
