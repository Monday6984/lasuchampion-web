import config from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import {
  getDailySeries,
  getTopViewed,
  getViewTotals,
  getViewsInPeriod,
} from '@/lib/views'
import { getVideos } from '@/lib/youtube'

const fmt = (n: number) => n.toLocaleString('en-GB')

const change = (now: number, before: number) => {
  if (!before) return now ? 'New this period' : 'No views yet'
  const pct = Math.round(((now - before) / before) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}% vs previous 30 days`
}

const card: React.CSSProperties = {
  background: 'var(--theme-elevation-50)',
  border: '1px solid var(--theme-elevation-100)',
  borderRadius: 12,
  padding: 20,
  minWidth: 0,
}
const label: React.CSSProperties = { fontSize: 13, color: 'var(--theme-elevation-600)', margin: 0 }
const big: React.CSSProperties = { fontSize: 32, fontWeight: 700, margin: '6px 0 4px', letterSpacing: '-0.02em' }
const th: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--theme-elevation-600)',
  padding: '8px 10px',
  borderBottom: '1px solid var(--theme-elevation-150)',
}
const td: React.CSSProperties = { padding: '10px', borderBottom: '1px solid var(--theme-elevation-100)', fontSize: 14 }

const dayLabel = (iso: string) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${Number(iso.slice(8))} ${months.at(Number(iso.slice(5, 7)) - 1)}`
}

/**
 * The admin home page: things waiting for an admin, stories by reporter this month, then views,
 * top stories, magazine reads and video plays, all from the site's own data.
 */
export async function Overview({ user }: { user?: { id?: number | string; role?: string; collection?: string } | null }) {
  const payload = await getPayload({ config })
  const isAdmin = user?.collection === 'users' && user.role === 'admin'
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const [pendingCelebrations, reportedComments, heldComments, members, monthStories] = await Promise.all([
    payload.count({ collection: 'celebrations', where: { status: { equals: 'pending' } } }),
    payload.count({ collection: 'comments', where: { and: [{ reportCount: { greater_than: 0 } }, { status: { equals: 'visible' } }] } }),
    payload.count({ collection: 'comments', where: { status: { equals: 'pending' } } }),
    payload.count({ collection: 'members' }),
    payload.find({
      collection: 'posts',
      where: { and: [{ _status: { equals: 'published' } }, { publishedAt: { greater_than_equal: monthStart } }] },
      limit: 1000,
      depth: 1,
      select: { author: true, bylineName: true },
      populate: { users: { name: true } },
    }),
  ])
  const perReporter = new Map<string, { name: string; n: number; me: boolean }>()
  for (const st of monthStories.docs) {
    const a = st.author && typeof st.author === 'object' ? st.author : null
    const key = a ? String(a.id) : 'other'
    const row = perReporter.get(key) ?? { name: a?.name ?? 'Other bylines', n: 0, me: Boolean(a && a.id === user?.id) }
    row.n++
    perReporter.set(key, row)
  }
  const reporterRows = [...perReporter.values()].sort((a, b) => b.n - a.n)
  const reporterMax = Math.max(1, ...reporterRows.map((r) => r.n))

  const [pageViews, pageViewsPrev, postViews, postViewsPrev, series, topPages, topPostIds, newEnquiries, latestIssue] =
    await Promise.all([
      getViewsInPeriod(payload, 'page', 30),
      getViewsInPeriod(payload, 'page', 30, 30),
      getViewsInPeriod(payload, 'post', 30),
      getViewsInPeriod(payload, 'post', 30, 30),
      getDailySeries(payload, 'page', 14),
      getTopViewed(payload, 'page', 30, 8),
      getTopViewed(payload, 'post', 30, 6),
      payload.count({ collection: 'enquiries', where: { status: { equals: 'new' } } }),
      payload.find({
        collection: 'issues',
        where: { and: [{ _status: { equals: 'published' } }, { releaseDate: { less_than_equal: new Date().toISOString() } }] },
        sort: '-releaseDate',
        limit: 1,
        depth: 0,
      }),
    ])

  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString()
  const [subscribers, newSubscribers] = await Promise.all([
    payload.count({ collection: 'subscribers', where: { active: { equals: true } } }),
    payload.count({ collection: 'subscribers', where: { and: [{ active: { equals: true } }, { createdAt: { greater_than: monthAgo } }] } }),
  ])
  const [videoPlays, videoPlaysPrev, topVideoIds, tv] = await Promise.all([
    getViewsInPeriod(payload, 'video', 30),
    getViewsInPeriod(payload, 'video', 30, 30),
    getTopViewed(payload, 'video', 30, 6),
    getVideos(payload).catch(() => ({ videos: [] as { id: string; title: string }[] })),
  ])
  const videoTitle = new Map(tv.videos.map((v) => [v.id, v.title]))
  const issue = latestIssue.docs[0]
  const issueReads = issue ? ((await getViewTotals(payload, 'issue', [issue.id])).get(String(issue.id)) ?? 0) : 0

  const posts = topPostIds.length
    ? await payload.find({
        collection: 'posts',
        where: { id: { in: topPostIds.map((p) => p.docId) } },
        depth: 0,
        limit: topPostIds.length,
        draft: false,
      })
    : { docs: [] }
  const titleById = new Map(posts.docs.map((p) => [String(p.id), p]))

  const max = Math.max(1, ...series.map((d) => d.value))
  const pageMax = Math.max(1, ...topPages.map((p) => p.total))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>Overview</h2>
        <span style={label}>Counted by the site · last 30 days unless noted</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {isAdmin && (
          <div style={card}>
            <p style={{ ...label, fontWeight: 600, color: 'var(--theme-text)', fontSize: 15, marginBottom: 8 }}>Waiting on you</p>
            {[
              ['Celebration notices to approve', pendingCelebrations.totalDocs, '/admin/collections/celebrations?where[status][equals]=pending'],
              ['Reported comments', reportedComments.totalDocs, '/admin/collections/comments?where[reportCount][greater_than]=0&sort=-reportCount'],
              ['Comments held for review', heldComments.totalDocs, '/admin/collections/comments?where[status][equals]=pending'],
              ['New messages and enquiries', newEnquiries.totalDocs, '/admin/collections/enquiries?where[status][equals]=new'],
            ].map(([text, n, href]) => (
              <a key={String(href)} href={String(href)} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--theme-elevation-100)', textDecoration: 'none', color: 'inherit', fontSize: 14 }}>
                <span>{text}</span>
                <strong style={{ color: Number(n) ? '#C8191E' : 'var(--theme-elevation-500)' }}>{fmt(Number(n))}</strong>
              </a>
            ))}
          </div>
        )}
        <div style={card}>
          <p style={{ ...label, fontWeight: 600, color: 'var(--theme-text)', fontSize: 15, marginBottom: 8 }}>Stories published this month, by reporter</p>
          {reporterRows.length === 0 && <p style={label}>No stories published yet this month.</p>}
          {reporterRows.map((r) => (
            <div key={r.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 160px) 1fr 32px', gap: 10, alignItems: 'center', padding: '6px 0', fontSize: 14 }}>
              <span style={{ fontWeight: r.me ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.me ? `${r.name} (you)` : r.name}</span>
              <span aria-hidden="true" style={{ height: 10, background: 'var(--theme-elevation-100)', borderRadius: 5 }}>
                <span style={{ display: 'block', height: 10, width: `${(r.n / reporterMax) * 100}%`, background: '#116CB1', borderRadius: 5 }} />
              </span>
              <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.n}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div style={card}>
          <p style={label}>Page views</p>
          <p style={big}>{fmt(pageViews)}</p>
          <p style={label}>{change(pageViews, pageViewsPrev)}</p>
        </div>
        <div style={card}>
          <p style={label}>Story views</p>
          <p style={big}>{fmt(postViews)}</p>
          <p style={label}>{change(postViews, postViewsPrev)}</p>
        </div>
        <div style={card}>
          <p style={label}>Magazine reads · current issue</p>
          <p style={big}>{fmt(issueReads)}</p>
          <p style={label}>{issue ? `Issue ${issue.issueNumber}: ${issue.title}` : 'No issue released yet'}</p>
        </div>
        <div style={card}>
          <p style={label}>Video plays · Champion TV</p>
          <p style={big}>{fmt(videoPlays)}</p>
          <p style={label}>{change(videoPlays, videoPlaysPrev)}</p>
        </div>
        <a href={isAdmin ? '/admin/collections/members' : '#'} style={{ ...card, textDecoration: 'none', color: 'inherit' }}>
          <p style={label}>Members</p>
          <p style={big}>{fmt(members.totalDocs)}</p>
          <p style={label}>Readers with accounts</p>
        </a>
        <a href={isAdmin ? '/admin/collections/subscribers' : '#'} style={{ ...card, textDecoration: 'none', color: 'inherit' }}>
          <p style={label}>Newsletter only</p>
          <p style={big}>{fmt(subscribers.totalDocs)}</p>
          <p style={label}>+{fmt(newSubscribers.totalDocs)} in the last 30 days</p>
        </a>
      </div>

      <div style={card}>
        <p style={{ ...label, marginBottom: 14, fontWeight: 600, color: 'var(--theme-text)', fontSize: 15 }}>
          Page views · last 14 days
        </p>
        <div
          role="img"
          aria-label={`Daily page views for the last 14 days, highest ${fmt(max)}`}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(14, minmax(0, 1fr))', gap: 6, alignItems: 'end', height: 180, borderBottom: '1px solid var(--theme-elevation-150)' }}
        >
          {series.map((d, i) => (
            <div
              key={d.day}
              title={`${dayLabel(d.day)}: ${fmt(d.value)} views`}
              style={{
                height: `${Math.max(2, (d.value / max) * 100)}%`,
                background: i === series.length - 1 ? '#C8191E' : 'var(--theme-elevation-800)',
                borderRadius: '4px 4px 0 0',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, minmax(0, 1fr))', gap: 6, marginTop: 6 }}>
          {series.map((d) => (
            <span key={d.day} style={{ fontSize: 11, textAlign: 'center', color: 'var(--theme-elevation-600)' }}>
              {Number(d.day.slice(8))}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        <div style={card}>
          <p style={{ ...label, fontWeight: 600, color: 'var(--theme-text)', fontSize: 15, marginBottom: 8 }}>Views by page</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Page</th>
                  <th style={{ ...th, textAlign: 'right' }}>Views</th>
                  <th style={{ ...th, width: '35%' }}>
                    <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Share</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {topPages.length === 0 && (
                  <tr>
                    <td style={td} colSpan={3}>No page views recorded yet.</td>
                  </tr>
                )}
                {topPages.map((p) => (
                  <tr key={p.docId}>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: 13 }}>{p.docId}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{fmt(p.total)}</td>
                    <td style={td}>
                      <div aria-hidden="true" style={{ height: 8, background: 'var(--theme-elevation-100)', borderRadius: 4 }}>
                        <div style={{ height: 8, width: `${(p.total / pageMax) * 100}%`, background: '#116CB1', borderRadius: 4 }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={card}>
          <p style={{ ...label, fontWeight: 600, color: 'var(--theme-text)', fontSize: 15, marginBottom: 8 }}>Top stories</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Story</th>
                  <th style={{ ...th, textAlign: 'right' }}>Views</th>
                </tr>
              </thead>
              <tbody>
                {topPostIds.length === 0 && (
                  <tr>
                    <td style={td} colSpan={2}>No story views recorded yet.</td>
                  </tr>
                )}
                {topPostIds.map((p) => {
                  const post = titleById.get(p.docId)
                  return (
                    <tr key={p.docId}>
                      <td style={td}>
                        {post ? <a href={`/admin/collections/posts/${post.id}`}>{post.title}</a> : 'Deleted story'}
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>{fmt(p.total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={card}>
        <p style={{ ...label, fontWeight: 600, color: 'var(--theme-text)', fontSize: 15, marginBottom: 8 }}>
          Top videos · plays started on the website
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Video</th>
                <th style={{ ...th, textAlign: 'right' }}>Plays</th>
              </tr>
            </thead>
            <tbody>
              {topVideoIds.length === 0 && (
                <tr>
                  <td style={td} colSpan={2}>No video plays recorded yet.</td>
                </tr>
              )}
              {topVideoIds.map((v) => (
                <tr key={v.docId}>
                  <td style={td}>
                    <a href={`https://www.youtube.com/watch?v=${v.docId}`} target="_blank" rel="noreferrer">
                      {videoTitle.get(v.docId) ?? v.docId}
                    </a>
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmt(v.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a className="btn btn--style-primary btn--size-medium" href="/admin/collections/posts/create">+ New story</a>
        {isAdmin && (
          <>
            <a className="btn btn--style-secondary btn--size-medium" href="/admin/collections/issues/create">Upload magazine issue</a>
            <a className="btn btn--style-secondary btn--size-medium" href="/admin/import">Import from WordPress</a>
          </>
        )}
        <a className="btn btn--style-secondary btn--size-medium" href="/" target="_blank" rel="noreferrer">View site</a>
      </div>
    </div>
  )
}
