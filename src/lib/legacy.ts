import { getSections, getTags, payload } from './data'

/**
 * Old WordPress / BuddyPress addresses → their new home. Returns the new path, or null.
 * Fixed pages (about-lasu-champion, contact-us, advertisement, register…) are redirected in next.config.ts.
 */
export async function findLegacy(parts: string[]): Promise<string | null> {
  const p = await payload()
  const path = `/${parts.join('/')}`

  // /category/<parent>/<child>/ → the matching tag or section.
  if (parts[0] === 'category') {
    for (const slug of [...parts.slice(1)].reverse()) {
      const target = await categoryTarget(slug)
      if (target) return target
    }
    return '/'
  }
  // /tag/<x>/ → search for it.
  if (parts[0] === 'tag' && parts[1]) return `/search?q=${encodeURIComponent(parts[1].replace(/-/g, ' '))}`
  // /author/<x>/ → that reporter, if they came across in the import.
  if (parts[0] === 'author' && parts[1]) {
    const u = await p.find({ collection: 'users', where: { slug: { equals: parts[1] } }, limit: 1, depth: 0 })
    return u.docs[0] ? `/reporters/${u.docs[0].slug}` : '/reporters'
  }
  // /3d-flip-book/<issue>/ → that magazine issue.
  if (parts[0] === '3d-flip-book') {
    const issue = await p.find({
      collection: 'issues',
      where: { and: [{ legacyPath: { in: [path, `${path}/`] } }, { _status: { equals: 'published' } }] },
      limit: 1,
      depth: 0,
    })
    if (issue.docs[0]?.slug) return `/magazine/${issue.docs[0].slug}`
    if (parts[1]) {
      const bySlug = await p.find({ collection: 'issues', where: { slug: { equals: parts[1] } }, limit: 1, depth: 0 })
      if (bySlug.docs[0]?.slug) return `/magazine/${bySlug.docs[0].slug}`
    }
    return '/magazine'
  }
  if (parts.at(-1) === 'feed') return '/rss.xml'
  if (parts[0] === 'page' && /^\d+$/.test(parts[1] ?? '')) return '/'

  // An imported story, matched on its exact old address.
  const exact = await p.find({
    collection: 'posts',
    where: { and: [{ legacyPath: { in: [path, `${path}/`] } }, { _status: { equals: 'published' } }] },
    limit: 1,
    depth: 0,
  })
  if (exact.docs[0]?.slug) return `/${exact.docs[0].slug}`

  // /2024/05/my-story → /my-story
  const last = parts.at(-1)
  if (parts.length > 1 && last && /^[a-z0-9-]+$/.test(last)) {
    const bySlug = await p.find({ collection: 'posts', where: { and: [{ slug: { equals: last } }, { _status: { equals: 'published' } }] }, limit: 1, depth: 0 })
    if (bySlug.docs[0]?.slug) return `/${bySlug.docs[0].slug}`
  }
  return null
}

/** An old category slug → /section or /section/tag. */
export async function categoryTarget(slug: string): Promise<string | null> {
  const [sections, tags] = await Promise.all([getSections(), getTags()])
  const tag = tags.find((t) => t.slug === slug || (t.legacySlugs ?? []).includes(slug))
  if (tag) {
    const sectionId = typeof tag.section === 'object' ? tag.section?.id : tag.section
    const section = sections.find((s) => s.id === sectionId)
    if (section) return `/${section.slug}/${tag.slug}`
  }
  const section = sections.find((s) => s.slug === slug || (s.legacySlugs ?? []).includes(slug))
  return section ? `/${section.slug}` : null
}
