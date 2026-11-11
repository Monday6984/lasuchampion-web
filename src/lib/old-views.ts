/**
 * Bringing view counts across from the old WordPress site (Jetpack Stats).
 *
 * Jetpack's export (stats.wordpress.com/csv.php, table=postviews) lists every post and page with its
 * WordPress post ID, title, address and views. Posts brought over by the WordPress importer kept
 * their WordPress ID (wpId) and old address (legacyPath), so they match exactly; magazine issues are
 * matched on their old address, slug or title, and anything can be matched by hand in the admin.
 */
import type { Payload } from 'payload'

export type OldRow = { postId: string; title: string; url: string; views: number }
export type Target = { collection: 'posts' | 'issues'; id: string; title: string }

/** Minimal CSV reader (quoted fields, commas and line breaks inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      if (row.some((f) => f.trim())) rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  row.push(field)
  if (row.some((f) => f.trim())) rows.push(row)
  return rows
}

/**
 * Reads Jetpack's postviews CSV (date, post_id, post_title, post_permalink, views), with or without
 * a header row. Other exports work too if they have title/address and views columns.
 */
export function readStats(text: string): OldRow[] {
  const rows = parseCsv(text.replace(/^﻿/, ''))
  if (!rows.length) return []
  const head = rows[0].map((h) => h.trim().toLowerCase())
  const hasHeader = head.some((h) => /title|views|permalink|url|post_id/.test(h))
  const col = (re: RegExp, fallback: number) => {
    const i = hasHeader ? head.findIndex((h) => re.test(h)) : -1
    return i >= 0 ? i : fallback
  }
  const iId = col(/^post_?id$|^id$/, 1)
  const iTitle = col(/title/, 2)
  const iUrl = col(/permalink|url|link|address/, 3)
  const iViews = col(/views|count|visits/, 4)

  const byKey = new Map<string, OldRow>()
  for (const r of hasHeader ? rows.slice(1) : rows) {
    const views = Number(String(r[iViews] ?? '').replace(/[^\d]/g, ''))
    if (!Number.isFinite(views) || views <= 0) continue
    const row: OldRow = {
      postId: String(r[iId] ?? '').trim(),
      title: String(r[iTitle] ?? '').trim(),
      url: String(r[iUrl] ?? '').trim(),
      views,
    }
    // Daily rows (or the same post twice) are added together.
    const key = row.postId && row.postId !== '0' ? `id:${row.postId}` : `url:${row.url || row.title}`
    const prev = byKey.get(key)
    if (prev) prev.views += row.views
    else byKey.set(key, row)
  }
  return [...byKey.values()].sort((a, b) => b.views - a.views)
}

/** The path part of an old address, without a trailing slash: "/3d-flip-book/america-evolves-at-250". */
export const pathOf = (url: string) => {
  try {
    const p = new URL(url, 'https://example.com').pathname.replace(/\/+$/, '')
    return p || '/'
  } catch {
    return ''
  }
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/&amp;|&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Suggests where each old page's views should go, and lists every post and issue to choose from. */
export async function matchRows(payload: Payload, rows: OldRow[]) {
  const [posts, issues] = await Promise.all([
    payload.find({ collection: 'posts', limit: 2000, depth: 0, pagination: false, select: { title: true, slug: true, wpId: true, legacyPath: true } }),
    payload.find({ collection: 'issues', limit: 500, depth: 0, pagination: false, select: { title: true, slug: true, legacyPath: true, issueNumber: true } }),
  ])
  const postT = (p: (typeof posts.docs)[number]): Target => ({ collection: 'posts', id: String(p.id), title: p.title })
  const issueT = (i: (typeof issues.docs)[number]): Target => ({ collection: 'issues', id: String(i.id), title: `Issue ${i.issueNumber}: ${i.title}` })

  const byWpId = new Map(posts.docs.filter((p) => p.wpId).map((p) => [String(p.wpId), postT(p)]))
  const byPath = new Map<string, Target>()
  const bySlug = new Map<string, Target>()
  const byTitle = new Map<string, Target>()
  for (const p of posts.docs) {
    if (p.legacyPath) byPath.set(pathOf(p.legacyPath), postT(p))
    if (p.slug) bySlug.set(p.slug, postT(p))
    byTitle.set(norm(p.title), postT(p))
  }
  for (const i of issues.docs) {
    if (i.legacyPath) byPath.set(pathOf(i.legacyPath), issueT(i))
    if (i.slug) bySlug.set(i.slug, issueT(i))
    byTitle.set(norm(i.title), issueT(i))
  }
  const issueTitles = issues.docs.map((i) => ({ t: issueT(i), n: norm(i.title) })).filter((x) => x.n.length >= 8)

  const matched = rows.map((row) => {
    const path = pathOf(row.url)
    const slug = path.split('/').filter(Boolean).at(-1) ?? ''
    const isFlipBook = /flip-?book|magazine|issue/i.test(path)
    const title = norm(row.title)
    const match =
      (row.postId && byWpId.get(row.postId)) ||
      (path && byPath.get(path)) ||
      (slug && bySlug.get(slug)) ||
      (title && byTitle.get(title)) ||
      // Old flip-book pages: an issue whose title appears in the old title, or the other way round.
      (isFlipBook && title ? issueTitles.find((x) => title.includes(x.n) || x.n.includes(title))?.t : undefined) ||
      null
    return { ...row, match }
  })

  const options: Target[] = [...issues.docs.map(issueT), ...posts.docs.map(postT).sort((a, b) => a.title.localeCompare(b.title))]
  return { rows: matched, options }
}

/** Jetpack's stats export for a site: all-time views per post and page. */
export async function fetchJetpackStats(site: string, apiKey: string) {
  const q = new URLSearchParams({
    api_key: apiKey,
    blog_uri: site,
    table: 'postviews',
    days: '-1',
    limit: '-1',
    summarize: '1',
    format: 'csv',
  })
  let res: Response
  try {
    res = await fetch(`https://stats.wordpress.com/csv.php?${q}`, { cache: 'no-store', signal: AbortSignal.timeout(30_000) })
  } catch {
    throw new Error("Couldn't reach Jetpack Stats (stats.wordpress.com). Try again in a minute, or use the CSV file option.")
  }
  const text = await res.text()
  if (!res.ok || /^\s*error/i.test(text)) {
    throw new Error(text.replace(/^\s*error:?\s*/i, '').trim().slice(0, 200) || `Jetpack replied ${res.status}`)
  }
  return readStats(text)
}
