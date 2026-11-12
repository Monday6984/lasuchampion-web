import Link from 'next/link'

import { formatCount, formatDate, getIssueReads, getIssues, getNextIssueDate, mediaUrl } from '@/lib/data'
import type { Issue } from '@/payload-types'

import { Reader } from './Reader'

/** The magazine page: the chosen issue in the reader, then the archive of every issue. */
export async function MagazineView({ issue }: { issue: Issue | null }) {
  const [issues, nextDate] = await Promise.all([getIssues(), getNextIssueDate()])
  const current = issue ?? issues[0] ?? null
  const reads = await getIssueReads(issues)
  const pdf = current && typeof current.pdf === 'object' ? current.pdf : null

  return (
    <div className="mag-page">
      {current && pdf?.url ? (
        <>
          <section aria-labelledby="mag-h" className="wrap" style={{ paddingTop: 44, paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="kicker" style={{ color: 'var(--accent-light)' }}>
              Now reading · Issue {current.issueNumber} · {formatDate(current.releaseDate, { day: undefined })}
            </span>
            <h1 id="mag-h" className="hd hd-xl">
              {current.title}
            </h1>
            {current.summary && (
              <p className="standfirst" style={{ color: '#D5DCE6' }}>
                {current.summary}
              </p>
            )}
          </section>
          <div className="wrap">
            <Reader
              issueId={String(current.id)}
              pdfUrl={pdf.url}
              title={current.title}
              allowDownload={current.allowDownload ?? true}
              contents={(current.contents ?? []).map((c) => ({ section: c.section, page: c.page }))}
            />
          </div>
        </>
      ) : (
        <section className="wrap section">
          <h1 className="hd hd-xl">The magazine</h1>
          <p className="standfirst" style={{ color: '#D5DCE6', marginTop: 16 }}>
            The first issue is on its way{nextDate ? ` — out ${formatDate(nextDate)}` : ''}.
          </p>
        </section>
      )}

      <section id="archive" aria-labelledby="arch-h" className="archive">
        <div className="wrap section" style={{ paddingTop: 64, paddingBottom: 80 }}>
          <div className="band-head">
            <h2 id="arch-h" className="hd hd-l">
              All issues
            </h2>
            <span className="muted" style={{ fontSize: 15 }}>
              Pick an issue to open it in the reader
            </span>
          </div>
          <div className="archive-grid">
            {issues.map((i) => {
              const img = mediaUrl(i.cover, 'cover')
              return (
                <Link
                  key={i.id}
                  href={`/magazine/${i.slug}`}
                  className="issue-card"
                  aria-current={current?.id === i.id ? 'page' : undefined}
                >
                  <div className="cover-sm">{img && <img src={img} alt="" loading="lazy" />}</div>
                  <span style={{ fontWeight: 500 }}>
                    Issue {i.issueNumber}: {i.title}
                  </span>
                  <span className="muted" style={{ fontSize: 13, marginTop: -6 }}>
                    {formatDate(i.releaseDate, { day: undefined })}
                    {reads.get(String(i.id)) != null && ` · ${formatCount(reads.get(String(i.id)) as number)} reads`}
                  </span>
                </Link>
              )
            })}
            {nextDate && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                  style={{
                    aspectRatio: '3 / 4',
                    borderRadius: 6,
                    border: '2px dashed #B8BBC3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: 16,
                    color: 'var(--muted)',
                    fontSize: 14,
                  }}
                >
                  Next issue
                  <br />
                  out {formatDate(nextDate)}
                </div>
                <Link href="/#join" style={{ fontSize: 14, fontWeight: 500 }}>
                  Get notified →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
