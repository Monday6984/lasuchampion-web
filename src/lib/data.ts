import config from '@payload-config'
import { getPayload, type Where } from 'payload'
import { cache } from 'react'

import type { Issue, Media, Post, Section, SiteSetting, Tag, User } from '@/payload-types'

import { getTopViewed, getViewTotals } from './views'

export const payload = cache(() => getPayload({ config }))

const nowIso = () => new Date().toISOString()

/** Only published stories whose publish date has arrived (a future date = scheduled). */
export const liveStories = (): Where => ({
  and: [{ _status: { equals: 'published' } }, { publishedAt: { less_than_equal: nowIso() } }],
})
const liveIssues = (): Where => ({
  and: [{ _status: { equals: 'published' } }, { releaseDate: { less_than_equal: nowIso() } }],
})

/** viewCount is null when the count is below Site settings → View counts (so nothing is shown). */
export type Story = Post & { viewCount: number | null }

export async function publicCount(counted: number, earlier?: number | null) {
  const total = counted + Math.max(0, earlier ?? 0)
  const min = (await getSettings()).minViewsShown ?? 0
  return total >= min ? total : null
}

export async function withViews(posts: Post[]): Promise<Story[]> {
  if (!posts.length) return []
  const p = await payload()
  const totals = await getViewTotals(p, 'post', posts.map((x) => x.id))
  return Promise.all(posts.map(async (x) => ({ ...x, viewCount: await publicCount(totals.get(String(x.id)) ?? 0, x.earlierViews) })))
}

const publicUserSelect = { name: true, slug: true, photo: true, faculty: true, department: true, position: true, bio: true, social: true, active: true } as const

/** Staff accounts are private, so public queries return authors as bare IDs; fill in their public profile fields. */
async function withAuthors<T extends Post>(posts: T[]): Promise<T[]> {
  const ids = [...new Set(posts.map((x) => x.author).filter((a): a is number => typeof a === 'number'))]
  if (!ids.length) return posts
  const p = await payload()
  const res = await p.find({ collection: 'users', where: { id: { in: ids } }, limit: ids.length, depth: 1, select: publicUserSelect })
  const byId = new Map(res.docs.map((u) => [u.id, u as User]))
  return posts.map((x) => (typeof x.author === 'number' && byId.has(x.author) ? { ...x, author: byId.get(x.author)! } : x))
}

type StoryQuery = {
  page?: number
  limit?: number
  section?: Section | number
  tag?: Tag | number
  author?: User | number
  q?: string
  exclude?: (number | string)[]
  views?: boolean
}

const idOf = (x: { id: number } | number | null | undefined) => (x && typeof x === 'object' ? x.id : x)

export async function getStories(opts: StoryQuery = {}) {
  const p = await payload()
  const and: Where[] = [liveStories()]
  if (opts.section) and.push({ section: { equals: idOf(opts.section) } })
  if (opts.tag) and.push({ tags: { contains: idOf(opts.tag) } })
  if (opts.author) and.push({ author: { equals: idOf(opts.author) } })
  if (opts.exclude?.length) and.push({ id: { not_in: opts.exclude } })
  if (opts.q) and.push({ or: [{ title: { like: opts.q } }, { excerpt: { like: opts.q } }] })
  const res = await p.find({
    collection: 'posts',
    where: { and },
    sort: '-publishedAt',
    limit: opts.limit ?? 12,
    page: opts.page ?? 1,
    depth: 1,
    overrideAccess: false,
  })
  const docs = await withAuthors(res.docs)
  return { ...res, docs: opts.views === false ? docs.map((d) => ({ ...d, viewCount: null })) : await withViews(docs) }
}

/** The homepage lead: the newest story ticked "Lead story", or else the newest story. */
export async function getLeadStory() {
  const p = await payload()
  const picked = await p.find({
    collection: 'posts',
    where: { and: [liveStories(), { featured: { equals: true } }] },
    sort: '-publishedAt',
    limit: 1,
    depth: 1,
    overrideAccess: false,
  })
  if (picked.docs[0]) return (await withViews(await withAuthors(picked.docs)))[0]
  return (await getStories({ limit: 1 })).docs[0] ?? null
}

export async function getStoryBySlug(slug: string) {
  const p = await payload()
  const res = await p.find({
    collection: 'posts',
    where: { and: [liveStories(), { slug: { equals: slug } }] },
    limit: 1,
    depth: 2,
    overrideAccess: false,
  })
  const post = res.docs[0]
  if (!post) return null
  return (await withViews(await withAuthors([post])))[0]
}

export async function getRelated(post: Post, limit = 3) {
  const res = await getStories({ section: post.section as Section | number, exclude: [post.id], limit, views: false })
  if (res.docs.length >= limit) return res.docs
  const more = await getStories({ exclude: [post.id, ...res.docs.map((d) => d.id)], limit: limit - res.docs.length, views: false })
  return [...res.docs, ...more.docs]
}

export async function getMostRead(limit = 5) {
  const p = await payload()
  const top = await getTopViewed(p, 'post', 7, limit * 3)
  let posts: Post[] = []
  if (top.length) {
    const res = await p.find({
      collection: 'posts',
      where: { and: [liveStories(), { id: { in: top.map((t) => t.docId) } }] },
      limit: top.length,
      depth: 0,
      overrideAccess: false,
    })
    const byId = new Map(res.docs.map((d) => [String(d.id), d]))
    posts = top.map((t) => byId.get(t.docId)).filter((x): x is Post => Boolean(x))
  }
  // A new site has few views yet: fill the list with the newest stories.
  if (posts.length < limit) {
    const fill = await getStories({ limit: limit - posts.length, exclude: posts.map((x) => x.id), views: false })
    posts = [...posts, ...fill.docs]
  }
  return posts.slice(0, limit)
}

// ---------- sections, tags ----------

export const getSections = cache(async () => {
  const p = await payload()
  const res = await p.find({ collection: 'sections', sort: 'menuOrder', limit: 50, depth: 0 })
  return res.docs
})

export async function getSectionBySlug(slug: string) {
  return (await getSections()).find((s) => s.slug === slug) ?? null
}

export const getTags = cache(async () => {
  const p = await payload()
  const res = await p.find({ collection: 'tags', sort: 'name', limit: 500, depth: 0 })
  return res.docs
})

export async function getTagsForSection(section: Section) {
  return (await getTags()).filter((t) => idOf(t.section as Section | number) === section.id)
}

export async function getTagBySlug(section: Section, slug: string) {
  return (await getTagsForSection(section)).find((t) => t.slug === slug) ?? null
}

// ---------- people ----------


export async function getReporters() {
  const p = await payload()
  const res = await p.find({ collection: 'users', sort: 'name', limit: 300, depth: 1, select: publicUserSelect })
  const counts = await Promise.all(
    res.docs.map((u) => p.count({ collection: 'posts', where: { and: [liveStories(), { author: { equals: u.id } }] } })),
  )
  return res.docs
    .map((u, i) => ({ ...u, storyCount: counts[i].totalDocs }))
    .filter((u) => u.storyCount > 0 || u.active !== false)
}

export async function getReporterBySlug(slug: string) {
  const p = await payload()
  const res = await p.find({ collection: 'users', where: { slug: { equals: slug } }, limit: 1, depth: 1, select: publicUserSelect })
  return res.docs[0] ?? null
}

export async function getExcos() {
  const p = await payload()
  const res = await p.find({ collection: 'excos', sort: ['-session', 'order'], limit: 500, depth: 1 })
  return res.docs
}

export async function getAmbassadors(homepageOnly = false) {
  const p = await payload()
  const res = await p.find({
    collection: 'ambassadors',
    where: homepageOnly ? { onHomepage: { equals: true } } : undefined,
    sort: 'order',
    limit: 100,
    depth: 1,
  })
  return res.docs
}

// ---------- magazine ----------

export async function getIssues() {
  const p = await payload()
  const res = await p.find({ collection: 'issues', where: liveIssues(), sort: '-releaseDate', limit: 100, depth: 1, overrideAccess: false })
  return res.docs
}

export async function getIssueBySlug(slug: string) {
  const p = await payload()
  const res = await p.find({
    collection: 'issues',
    where: { and: [liveIssues(), { slug: { equals: slug } }] },
    limit: 1,
    depth: 1,
    overrideAccess: false,
  })
  return res.docs[0] ?? null
}

export async function getIssueReads(issues: Issue[]) {
  const p = await payload()
  const counted = await getViewTotals(p, 'issue', issues.map((i) => i.id))
  const out = new Map<string, number | null>()
  for (const i of issues) out.set(String(i.id), await publicCount(counted.get(String(i.id)) ?? 0, i.earlierViews))
  return out
}

export async function getNextIssueDate() {
  const p = await payload()
  const res = await p.find({
    collection: 'issues',
    where: { and: [{ _status: { equals: 'published' } }, { releaseDate: { greater_than: nowIso() } }] },
    sort: 'releaseDate',
    limit: 1,
    depth: 0,
  })
  return res.docs[0]?.releaseDate ?? null
}

// ---------- settings, ads ----------

export const getSettings = cache(async (): Promise<SiteSetting> => {
  const p = await payload()
  return p.findGlobal({ slug: 'site-settings', depth: 1 })
})

export async function getActiveAds(placement: 'home' | 'article' | 'sidebar') {
  const settings = await getSettings()
  const now = Date.now()
  return (settings.ads ?? []).filter(
    (ad) =>
      ad.active &&
      ad.placement === placement &&
      (!ad.startDate || Date.parse(ad.startDate) <= now) &&
      (!ad.endDate || Date.parse(ad.endDate) + 864e5 > now),
  )
}

// ---------- helpers ----------

export const mediaUrl = (media: number | Media | null | undefined, size?: 'card' | 'hero' | 'cover' | 'thumb') => {
  if (!media || typeof media !== 'object') return null
  return (size && media.sizes?.[size]?.url) || media.url || null
}

export const formatDate = (iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}) =>
  iso
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos', ...opts }).format(
        new Date(iso),
      )
    : ''

export const formatCount = (n: number) => n.toLocaleString('en-GB')

export const STORY_TYPES: Record<string, string> = { news: 'News', feature: 'Feature', opinion: 'Opinion', interview: 'Interview' }

export const sectionOf = (post: Post) => (post.section && typeof post.section === 'object' ? (post.section as Section) : null)
export const tagsOf = (post: Post) => (post.tags ?? []).filter((t): t is Tag => typeof t === 'object' && t !== null)
export const authorOf = (post: Post) => (post.author && typeof post.author === 'object' ? (post.author as User) : null)

/** The byline shown on a story: a guest byline if set, else the reporter, else the paper. */
export const bylineOf = (post: Post) => post.bylineName || authorOf(post)?.name || 'LASU Champion'

/** The label above a headline: the first tag (or the section) and the story type when it isn't plain news. */
export const kickerOf = (post: Post) => {
  const label = tagsOf(post)[0]?.name ?? sectionOf(post)?.name ?? ''
  const type = post.storyType && post.storyType !== 'news' ? STORY_TYPES[post.storyType] : ''
  return [label, type].filter(Boolean).join(' · ')
}
