import { NextResponse, type NextRequest } from 'next/server'

import { payload } from '@/lib/data'
import { fetchJetpackStats, matchRows, pathOf, readStats, type OldRow } from '@/lib/old-views'

export const maxDuration = 60

type Body =
  | { action: 'fetch'; site: string; apiKey: string }
  | { action: 'csv'; text: string }
  | { action: 'save'; items: { collection: 'posts' | 'issues'; id: string; views: number; url?: string }[] }

/**
 * Admin only. Brings view counts across from the old WordPress site's Jetpack Stats:
 * fetch (with the WordPress.com API key) or csv (an export file) → suggested matches; save → stores
 * them as each post's / issue's "views on the old website". The API key is used once and never stored.
 */
export async function POST(req: NextRequest) {
  const p = await payload()
  const { user } = await p.auth({ headers: req.headers })
  if (!user || (user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can import view counts.' }, { status: 403 })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 })
  }

  try {
    if (body.action === 'fetch' || body.action === 'csv') {
      let rows: OldRow[]
      if (body.action === 'fetch') {
        const site = String(body.site ?? '').trim()
        const key = String(body.apiKey ?? '').trim()
        if (!site || !key) return NextResponse.json({ error: 'Add the old site address and the API key.' }, { status: 400 })
        const url = /^https?:\/\//i.test(site) ? site : `https://${site}`
        rows = await fetchJetpackStats(url, key)
      } else {
        rows = readStats(String(body.text ?? ''))
      }
      if (!rows.length) return NextResponse.json({ error: 'No view counts found. Check the file, or the site address and key.' }, { status: 400 })
      return NextResponse.json(await matchRows(p, rows.slice(0, 1000)))
    }

    if (body.action === 'save') {
      // Several old pages can point at one item (e.g. an old post and its AMP copy): their views add up.
      const totals = new Map<string, { collection: 'posts' | 'issues'; id: string; views: number; url?: string }>()
      for (const it of body.items ?? []) {
        if (!['posts', 'issues'].includes(it.collection) || !it.id) continue
        const views = Math.max(0, Math.round(Number(it.views) || 0))
        const key = `${it.collection}:${it.id}`
        const prev = totals.get(key)
        if (prev) prev.views += views
        else totals.set(key, { ...it, views })
      }
      let saved = 0
      for (const t of totals.values()) {
        if (t.collection === 'issues') {
          const issue = await p.findByID({ collection: 'issues', id: t.id, depth: 0 })
          const path = t.url ? pathOf(t.url) : ''
          await p.update({
            collection: 'issues',
            id: t.id,
            // The issue also takes over its old flip-book address, so old links lead to it.
            data: { earlierViews: t.views, ...(path && path !== '/' && !issue.legacyPath ? { legacyPath: `${path}/` } : {}) },
            depth: 0,
          })
        } else {
          await p.update({ collection: 'posts', id: t.id, data: { earlierViews: t.views }, depth: 0 })
        }
        saved++
      }
      return NextResponse.json({ saved })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
}
