import type { Metadata } from 'next'
import Link from 'next/link'

import { StoryRow } from '@/components/site/Story'
import { getStories } from '@/lib/data'

export const metadata: Metadata = { title: 'Search', robots: { index: false } }

type Props = { searchParams: Promise<{ q?: string; page?: string }> }

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim().slice(0, 100)
  const page = Math.max(1, Number(sp.page) || 1)
  const res = q ? await getStories({ q, page, limit: 20, views: false }) : null
  return (
    <>
      <section className="wrap page-head">
        <h1 className="page-title">Search</h1>
        <form action="/search" role="search" className="search-big">
          <label htmlFor="q" className="sr-only">
            Search stories
          </label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Search stories, e.g. convocation" autoFocus={!q} />
          <button className="btn lg" type="submit">
            Search
          </button>
        </form>
      </section>
      <section className="wrap section" aria-label="Results">
        {res && (
          <>
            <p className="meta" role="status">
              {res.totalDocs} {res.totalDocs === 1 ? 'story' : 'stories'} for “{q}”
            </p>
            <div className="row-grid">
              {res.docs.map((p) => (
                <StoryRow key={p.id} post={p} showBy h="h2" />
              ))}
            </div>
            {res.totalPages > 1 && (
              <nav aria-label="Pages" className="pagination">
                {res.hasPrevPage && (
                  <Link className="pill" href={`/search?q=${encodeURIComponent(q)}&page=${page - 1}`}>
                    ← Previous
                  </Link>
                )}
                <span className="pagination__now">
                  Page {page} of {res.totalPages}
                </span>
                {res.hasNextPage && (
                  <Link className="pill" href={`/search?q=${encodeURIComponent(q)}&page=${page + 1}`}>
                    Next →
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </section>
    </>
  )
}
