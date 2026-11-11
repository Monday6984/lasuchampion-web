/**
 * Turns posts from the WordPress REST API (/wp-json/wp/v2/posts?_embed) into the shape the importer uses.
 * Pure TypeScript with no server-only imports, so the browser (for an uploaded .json file) and the
 * server (when reading straight from the old site) share it.
 */
import type { WpPost } from './wp-import-types'

type Rendered = { rendered?: string } | string | undefined
type RestTerm = { taxonomy?: string; name?: string; slug?: string }
export type RestPost = {
  id: number | string
  date?: string
  date_gmt?: string
  slug?: string
  status?: string
  link?: string
  title?: Rendered
  content?: Rendered
  excerpt?: Rendered
  author?: number
  featured_media?: number
  _embedded?: {
    author?: { name?: string }[]
    'wp:featuredmedia'?: { source_url?: string; media_details?: { sizes?: { full?: { source_url?: string } } } }[]
    'wp:term'?: RestTerm[][]
  }
}

const html = (v: Rendered) => (typeof v === 'string' ? v : (v?.rendered ?? ''))

const iso = (gmt?: string, local?: string) => {
  const raw = gmt ? `${gmt.replace(/Z?$/, '')}Z` : local ? `${local}+01:00` : ''
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

export function fromRestPost(p: RestPost, siteUrl: string): WpPost {
  const terms = (p._embedded?.['wp:term'] ?? []).flat()
  const media = p._embedded?.['wp:featuredmedia']?.[0]
  return {
    wpId: String(p.id),
    title: html(p.title),
    slug: p.slug ?? '',
    date: iso(p.date_gmt, p.date),
    status: p.status ?? 'publish',
    link: p.link ?? '',
    html: html(p.content),
    excerpt: html(p.excerpt),
    author: p._embedded?.author?.[0]?.name ?? '',
    categories: terms.filter((t) => t.taxonomy === 'category').map((t) => ({ name: t.name ?? '', slug: t.slug ?? '' })),
    tags: terms.filter((t) => t.taxonomy === 'post_tag').map((t) => t.name ?? ''),
    featuredUrl: media?.media_details?.sizes?.full?.source_url || media?.source_url || null,
    siteUrl,
  }
}

/** Accepts the site's address in any form people type it and returns the base, e.g. https://example.com */
export function normaliseSiteUrl(input: string) {
  let s = input.trim()
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`
  const u = new URL(s)
  // Drop anything after the site root, including a pasted /wp-json/... path.
  const path = u.pathname.replace(/\/wp-json.*$/i, '').replace(/\/+$/, '')
  return `${u.protocol}//${u.host}${path}`
}
