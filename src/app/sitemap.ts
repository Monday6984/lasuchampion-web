import type { MetadataRoute } from 'next'

import { getIssues, getReporters, getSections, getStories, getTags } from '@/lib/data'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const [stories, issues, sections, tags, reporters] = await Promise.all([
    getStories({ limit: 5000, views: false }),
    getIssues(),
    getSections(),
    getTags(),
    getReporters(),
  ])
  const sectionSlug = new Map(sections.map((s) => [s.id, s.slug]))
  return [
    { url: `${site}/`, changeFrequency: 'hourly', priority: 1 },
    ...sections.map((s) => ({ url: `${site}/${s.slug}`, changeFrequency: 'daily' as const, priority: 0.8 })),
    ...tags
      .map((t) => {
        const sec = sectionSlug.get(typeof t.section === 'object' ? (t.section?.id ?? 0) : t.section)
        return sec ? { url: `${site}/${sec}/${t.slug}`, changeFrequency: 'weekly' as const, priority: 0.4 } : null
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x)),
    { url: `${site}/magazine`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${site}/tv`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${site}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${site}/ambassadors`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${site}/reporters`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${site}/advertise`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${site}/contact`, changeFrequency: 'yearly', priority: 0.3 },
    ...reporters.filter((r) => r.storyCount > 0).map((r) => ({ url: `${site}/reporters/${r.slug}`, priority: 0.3 })),
    ...stories.docs.map((p) => ({ url: `${site}/${p.slug}`, lastModified: p.updatedAt, priority: 0.7 })),
    ...issues.map((i) => ({ url: `${site}/magazine/${i.slug}`, lastModified: i.updatedAt, priority: 0.6 })),
  ]
}
