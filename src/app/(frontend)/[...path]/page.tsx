import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { SectionPage } from '@/components/pages/SectionPage'
import { StoryPage } from '@/components/pages/StoryPage'
import { getSectionBySlug, getStoryBySlug, getTagBySlug, mediaUrl } from '@/lib/data'
import { findLegacy } from '@/lib/legacy'

/**
 * Everything at the root of the site that isn't a fixed page:
 *   /<section>                     section page (Campus, Aluta…)
 *   /<section>/<tag>               tag page inside a section
 *   /<section>[/<tag>]/page/<n>    later pages of either
 *   /<story-slug>                  a story (the same address shape as the old WordPress site)
 * Anything else is checked against the old site's addresses and redirected, or shows a 404.
 */
export const revalidate = 300

export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ path: string[] }> }

type Resolved =
  | { kind: 'section'; sectionSlug: string; tagSlug?: string; page: number }
  | { kind: 'story'; slug: string }
  | { kind: 'none' }

async function resolve(parts: string[]): Promise<Resolved> {
  const [first, second, third, fourth] = parts
  const section = first ? await getSectionBySlug(first) : null
  if (section) {
    if (parts.length === 1) return { kind: 'section', sectionSlug: first, page: 1 }
    if (second === 'page' && third && parts.length === 3 && /^\d+$/.test(third)) return { kind: 'section', sectionSlug: first, page: Number(third) }
    const tag = second ? await getTagBySlug(section, second) : null
    if (tag) {
      if (parts.length === 2) return { kind: 'section', sectionSlug: first, tagSlug: second, page: 1 }
      if (third === 'page' && fourth && parts.length === 4 && /^\d+$/.test(fourth)) {
        return { kind: 'section', sectionSlug: first, tagSlug: second, page: Number(fourth) }
      }
    }
    return { kind: 'none' }
  }
  if (parts.length === 1 && /^[a-z0-9-]+$/.test(first)) {
    const story = await getStoryBySlug(first)
    if (story) return { kind: 'story', slug: first }
  }
  return { kind: 'none' }
}

const clean = async (params: Props['params']) =>
  (await params).path.map((s) => decodeURIComponent(s).toLowerCase()).filter(Boolean)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const parts = await clean(params)
  const r = await resolve(parts)
  if (r.kind === 'story') {
    const post = await getStoryBySlug(r.slug)
    if (!post) return {}
    const img = mediaUrl(post.cover, 'hero')
    return {
      title: post.title,
      description: post.excerpt,
      alternates: { canonical: `/${post.slug}` },
      openGraph: { type: 'article', title: post.title, description: post.excerpt, publishedTime: post.publishedAt, images: img ? [img] : undefined },
      twitter: { card: 'summary_large_image', title: post.title, description: post.excerpt, images: img ? [img] : undefined },
    }
  }
  if (r.kind === 'section') {
    const section = await getSectionBySlug(r.sectionSlug)
    const tag = section && r.tagSlug ? await getTagBySlug(section, r.tagSlug) : null
    const name = tag ? `${tag.name} · ${section?.name}` : section?.name
    return {
      title: name,
      description: section?.description ?? undefined,
      alternates: { canonical: `/${[r.sectionSlug, r.tagSlug].filter(Boolean).join('/')}` },
    }
  }
  return {}
}

export default async function CatchAll({ params }: Props) {
  const parts = await clean(params)
  const r = await resolve(parts)
  if (r.kind === 'story') return <StoryPage slug={r.slug} />
  if (r.kind === 'section') return <SectionPage sectionSlug={r.sectionSlug} tagSlug={r.tagSlug} page={r.page} />

  const target = await findLegacy(parts)
  if (target) permanentRedirect(target)
  notFound()
}
