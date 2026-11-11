import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AdSlot } from '@/components/site/AdSlot'
import { LeadStory, StoryLine, StoryRow } from '@/components/site/Story'
import { getMostRead, getSectionBySlug, getStories, getTagBySlug, getTagsForSection, withViews } from '@/lib/data'

const PER_PAGE = 13

export async function SectionPage({ sectionSlug, tagSlug, page }: { sectionSlug: string; tagSlug?: string; page: number }) {
  const section = await getSectionBySlug(sectionSlug)
  if (!section) notFound()
  const tag = tagSlug ? await getTagBySlug(section, tagSlug) : null
  if (tagSlug && !tag) notFound()

  const [tags, res, mostRead] = await Promise.all([
    getTagsForSection(section),
    getStories({ section, tag: tag ?? undefined, page, limit: PER_PAGE, views: false }),
    getMostRead(5),
  ])
  if (page > 1 && !res.docs.length) notFound()

  const base = `/${section.slug}${tag ? `/${tag.slug}` : ''}`
  const [lead, ...rest] = page === 1 ? res.docs : [null, ...res.docs]
  const mostReadWithViews = await withViews(mostRead)

  return (
    <>
      <section className="wrap page-head">
        <nav aria-label="Breadcrumb" className="crumbs">
          <Link href="/">Home</Link> / {tag ? <Link href={`/${section.slug}`}>{section.name}</Link> : <span>{section.name}</span>}
          {tag && <> / <span>{tag.name}</span></>}
        </nav>
        <h1 className="page-title">{tag ? tag.name : section.name}</h1>
        {!tag && section.description && <p className="standfirst">{section.description}</p>}
        {tags.length > 0 && (
          <nav aria-label={`${section.name} topics`} className="chips">
            <Link href={`/${section.slug}`} className="chip" aria-current={!tag ? 'page' : undefined}>
              All
            </Link>
            {tags.map((t) => (
              <Link key={t.id} href={`/${section.slug}/${t.slug}`} className="chip" aria-current={tag?.id === t.id ? 'page' : undefined}>
                {t.name}
              </Link>
            ))}
          </nav>
        )}
      </section>

      <div className="wrap with-aside">
        <section aria-label="Stories" className="main-col">
          {lead && (
            <div className="section-lead">
              <LeadStory post={lead} h="h2" />
            </div>
          )}
          {rest.length > 0 && (
            <div className="row-grid">
              {rest.map((p) => p && <StoryRow key={p.id} post={p} showBy h="h2" />)}
            </div>
          )}
          {!res.docs.length && (
            <p className="empty">No stories here yet. New stories appear as soon as they&apos;re published.</p>
          )}
          {res.totalPages > 1 && (
            <nav aria-label="Pages" className="pagination">
              {res.hasPrevPage && (
                <Link className="pill" href={page - 1 === 1 ? base : `${base}/page/${page - 1}`}>
                  ← Newer
                </Link>
              )}
              <span className="pagination__now">
                Page {page} of {res.totalPages}
              </span>
              {res.hasNextPage && (
                <Link className="pill" href={`${base}/page/${page + 1}`}>
                  Older →
                </Link>
              )}
            </nav>
          )}
        </section>

        <aside className="side-col">
          <div className="panel-plain">
            <h2 className="rail-title">Most read this week</h2>
            {mostReadWithViews.map((p, i) => (
              <StoryLine key={p.id} post={p} n={i + 1} time={false} />
            ))}
          </div>
          <AdSlot placement="sidebar" />
        </aside>
      </div>
    </>
  )
}
