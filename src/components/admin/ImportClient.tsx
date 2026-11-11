'use client'

import React, { useRef, useState } from 'react'

import type { WpPost } from '@/lib/wp-import-types'
import { fromRestPost, type RestPost } from '@/lib/wp-rest'


type Result = {
  status: 'imported' | 'skipped' | 'failed'
  title: string
  id?: number | string
  slug?: string
  imagesOk?: number
  imagesFailed?: number
  message?: string
}

type Parsed = { siteUrl: string; posts: WpPost[]; first: string; last: string }

const first = (el: Element, tag: string) => el.getElementsByTagName(tag)[0]?.textContent?.trim() ?? ''

/** Turns WordPress's "2024-05-01 10:00:00" into an ISO date, preferring the GMT field. */
function toIso(gmt: string, local: string) {
  const pick = gmt && !gmt.startsWith('0000') ? `${gmt.replace(' ', 'T')}Z` : `${local.replace(' ', 'T')}+01:00`
  const d = new Date(pick)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

/** Reads a WordPress export (WXR) file in the browser, so large files never hit the server's upload limit. */
function parseExport(xml: string): Parsed {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('This file is not a valid WordPress export (.xml).')
  const channel = doc.getElementsByTagName('channel')[0]
  if (!channel) throw new Error('No WordPress content found in this file.')

  const siteUrl = first(channel, 'wp:base_blog_url') || first(channel, 'wp:base_site_url') || first(channel, 'link')

  const authors = new Map<string, string>()
  for (const a of Array.from(doc.getElementsByTagName('wp:author'))) {
    authors.set(first(a, 'wp:author_login'), first(a, 'wp:author_display_name') || first(a, 'wp:author_login'))
  }

  const items = Array.from(channel.getElementsByTagName('item'))
  const attachments = new Map<string, string>()
  for (const item of items) {
    if (first(item, 'wp:post_type') === 'attachment') attachments.set(first(item, 'wp:post_id'), first(item, 'wp:attachment_url'))
  }

  const posts: WpPost[] = []
  for (const item of items) {
    if (first(item, 'wp:post_type') !== 'post') continue
    const status = first(item, 'wp:status')
    if (status === 'trash' || status === 'auto-draft' || status === 'inherit') continue

    let thumbId = ''
    for (const meta of Array.from(item.getElementsByTagName('wp:postmeta'))) {
      if (first(meta, 'wp:meta_key') === '_thumbnail_id') thumbId = first(meta, 'wp:meta_value')
    }
    const cats = Array.from(item.getElementsByTagName('category'))
    const login = first(item, 'dc:creator')
    const comments = Array.from(item.getElementsByTagName('wp:comment'))
      .filter((c) => first(c, 'wp:comment_approved') === '1' && !['pingback', 'trackback'].includes(first(c, 'wp:comment_type')))
      .map((c) => ({
        id: first(c, 'wp:comment_id'),
        parentId: first(c, 'wp:comment_parent'),
        author: first(c, 'wp:comment_author'),
        email: first(c, 'wp:comment_author_email'),
        date: toIso(first(c, 'wp:comment_date_gmt'), first(c, 'wp:comment_date')),
        content: c.getElementsByTagName('wp:comment_content')[0]?.textContent ?? '',
      }))

    posts.push({
      wpId: first(item, 'wp:post_id'),
      title: first(item, 'title'),
      slug: first(item, 'wp:post_name'),
      date: toIso(first(item, 'wp:post_date_gmt'), first(item, 'wp:post_date')),
      status,
      link: first(item, 'link'),
      html: item.getElementsByTagName('content:encoded')[0]?.textContent ?? '',
      excerpt: item.getElementsByTagName('excerpt:encoded')[0]?.textContent ?? '',
      author: authors.get(login) ?? login,
      categories: cats
        .filter((c) => c.getAttribute('domain') === 'category')
        .map((c) => ({ name: c.textContent?.trim() ?? '', slug: c.getAttribute('nicename') ?? '' })),
      tags: cats.filter((c) => c.getAttribute('domain') === 'post_tag').map((c) => c.textContent?.trim() ?? ''),
      featuredUrl: (thumbId && attachments.get(thumbId)) || null,
      siteUrl,
      comments,
    })
  }
  return summarise(siteUrl, posts)
}

/** Reads posts saved from the site's API (…/wp-json/wp/v2/posts?per_page=100&page=1&_embed). */
function parseJson(text: string): Parsed {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('This .json file could not be read.')
  }
  const list = (Array.isArray(data) ? data : (data as { posts?: unknown[] })?.posts) as RestPost[] | undefined
  if (!Array.isArray(list) || !list.length || !('id' in (list[0] as object))) {
    throw new Error('No WordPress posts found in this .json file.')
  }
  let siteUrl = ''
  try {
    siteUrl = new URL(list[0].link ?? '').origin
  } catch {
    siteUrl = ''
  }
  const posts = list.map((p) => fromRestPost(p, siteUrl))
  return summarise(siteUrl, posts)
}

function summarise(siteUrl: string, posts: WpPost[]): Parsed {
  const unique = Array.from(new Map(posts.map((p) => [p.wpId, p])).values()).sort((a, b) => a.date.localeCompare(b.date))
  return { siteUrl, posts: unique, first: unique[0]?.date ?? '', last: unique.at(-1)?.date ?? '' }
}

const fmt = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

const box: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 12,
  padding: 20,
  background: 'var(--theme-elevation-50)',
  marginTop: 20,
}

export function ImportClient() {
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [error, setError] = useState('')
  const [source, setSource] = useState<'site' | 'file'>('site')
  const [siteInput, setSiteInput] = useState('')
  const [reading, setReading] = useState('')
  const [includeDrafts, setIncludeDrafts] = useState(false)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [doneCount, setDoneCount] = useState(0)
  const stopRef = useRef(false)

  const queue = parsed ? parsed.posts.filter((p) => includeDrafts || p.status === 'publish' || p.status === 'future') : []
  const published = parsed?.posts.filter((p) => p.status === 'publish' || p.status === 'future').length ?? 0
  const counts = {
    imported: results.filter((r) => r.status === 'imported').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    failed: results.filter((r) => r.status === 'failed').length,
    imagesFailed: results.reduce((n, r) => n + (r.imagesFailed ?? 0), 0),
  }

  const reset = () => {
    setError('')
    setParsed(null)
    setResults([])
    setDoneCount(0)
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    reset()
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    try {
      const all: WpPost[] = []
      let siteUrl = ''
      for (const file of files) {
        const text = await file.text()
        const part = /\.json$/i.test(file.name) || text.trimStart().startsWith('[') || text.trimStart().startsWith('{') ? parseJson(text) : parseExport(text)
        all.push(...part.posts)
        siteUrl ||= part.siteUrl
      }
      setParsed(summarise(siteUrl, all))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read the file.')
    }
  }

  /** Reads every published post from the old site's API, a page of 20 at a time. */
  async function readSite(e: React.FormEvent) {
    e.preventDefault()
    reset()
    if (!siteInput.trim()) return
    const all: WpPost[] = []
    let site = ''
    try {
      for (let page = 1, total = 1; page <= total; page++) {
        setReading(total > 1 ? `Reading page ${page} of ${total}…` : 'Reading your WordPress site…')
        const res = await fetch(`/api/wp-import/fetch?site=${encodeURIComponent(siteInput)}&page=${page}`, { credentials: 'include' })
        const data = (await res.json().catch(() => ({ error: `Server error (${res.status})` }))) as {
          error?: string
          posts?: WpPost[]
          totalPages?: number
          site?: string
        }
        if (data.error) throw new Error(data.error)
        all.push(...(data.posts ?? []))
        total = data.totalPages ?? 1
        site = data.site ?? site
      }
      if (!all.length) throw new Error('No published posts were found on that site.')
      setParsed(summarise(site, all))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read the site.')
      if (all.length) setParsed(summarise(site, all))
    } finally {
      setReading('')
    }
  }

  async function run(list: WpPost[]) {
    setRunning(true)
    stopRef.current = false
    setDoneCount(0)
    const onLeave = (ev: BeforeUnloadEvent) => ev.preventDefault()
    window.addEventListener('beforeunload', onLeave)
    for (let i = 0; i < list.length; i++) {
      if (stopRef.current) break
      const post = list[i]
      let result: Result
      try {
        const res = await fetch('/api/wp-import', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(post),
        })
        result = (await res.json().catch(() => null)) ?? { status: 'failed', title: post.title, message: `Server error (${res.status})` }
        if (!result.title) result.title = post.title
      } catch {
        result = { status: 'failed', title: post.title, message: 'Network error — check your connection.' }
      }
      ;(result as Result & { wpId?: string }).wpId = post.wpId
      setResults((r) => [result, ...r])
      setDoneCount(i + 1)
    }
    window.removeEventListener('beforeunload', onLeave)
    setRunning(false)
  }

  const failedPosts = parsed
    ? parsed.posts.filter((p) => results.some((r) => r.status === 'failed' && (r as Result & { wpId?: string }).wpId === p.wpId))
    : []

  return (
    <div>
      <p style={{ color: 'var(--theme-elevation-600)', marginTop: 0 }}>
        Stories keep their titles, dates, authors, images and comments, and keep their old addresses. Old categories are filed
        under the new sections and tags (e.g. &ldquo;ASUU&rdquo; goes to Aluta → ASUU). Running the import again skips stories that are already here.
      </p>

      <div role="tablist" aria-label="Where to import from" style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button type="button" role="tab" aria-selected={source === 'site'} className={`btn btn--size-small ${source === 'site' ? 'btn--style-primary' : 'btn--style-secondary'}`} style={{ margin: 0 }} onClick={() => { setSource('site'); reset() }} disabled={running}>
          From the site&apos;s address
        </button>
        <button type="button" role="tab" aria-selected={source === 'file'} className={`btn btn--size-small ${source === 'file' ? 'btn--style-primary' : 'btn--style-secondary'}`} style={{ margin: 0 }} onClick={() => { setSource('file'); reset() }} disabled={running}>
          From a file (.json or .xml)
        </button>
      </div>

      {source === 'site' ? (
        <form style={box} onSubmit={readSite}>
          <label htmlFor="wp-site" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
            Old WordPress site address
          </label>
          <p style={{ margin: '0 0 10px', color: 'var(--theme-elevation-600)', fontSize: 14 }}>
            Reads every published post (and its comments) through WordPress&apos;s built-in API. No login or export needed. Drafts aren&apos;t available this way.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              id="wp-site"
              type="text"
              inputMode="url"
              placeholder="lasuchampion.com"
              value={siteInput}
              onChange={(e) => setSiteInput(e.target.value)}
              disabled={running || Boolean(reading)}
              style={{ flex: '1 1 280px', minHeight: 40, padding: '0 12px', borderRadius: 6, border: '1px solid var(--theme-elevation-250)', background: 'var(--theme-input-bg)', color: 'var(--theme-text)', fontSize: 15 }}
            />
            <button type="submit" className="btn btn--style-primary btn--size-medium" style={{ margin: 0 }} disabled={running || Boolean(reading) || !siteInput.trim()}>
              Find posts
            </button>
          </div>
          {reading && <p role="status" style={{ marginBottom: 0 }}>{reading}</p>}
        </form>
      ) : (
        <div style={box}>
          <label htmlFor="wp-file" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
            WordPress .json or .xml file(s)
          </label>
          <p style={{ margin: '0 0 10px', color: 'var(--theme-elevation-600)', fontSize: 14 }}>
            <strong>.json:</strong> in your browser open <code>yoursite.com/wp-json/wp/v2/posts?per_page=100&amp;_embed&amp;page=1</code>, save the page
            (Ctrl/Cmd + S) as a .json file, then repeat with <code>page=2</code>, <code>page=3</code>… until it shows an error. Choose all the
            files together. <strong>.xml:</strong> WordPress Tools → Export → All content (includes comments and drafts).
          </p>
          <input id="wp-file" type="file" multiple accept=".xml,.json,application/xml,text/xml,application/json" onChange={onFiles} disabled={running} />
        </div>
      )}

      {error && (
        <p role="alert" style={{ color: 'var(--theme-error-500)', marginBottom: 0 }}>
          {error}
        </p>
      )}

      {parsed && (
        <div style={box}>
          <p style={{ marginTop: 0, fontSize: 16 }}>
            <strong>{parsed.posts.length}</strong> posts found from <strong>{parsed.siteUrl || 'your WordPress site'}</strong>
            {parsed.first && (
              <>
                , {fmt(parsed.first)} to {fmt(parsed.last)}
              </>
            )}
            . {published} published, {parsed.posts.length - published} drafts or private.
          </p>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0' }}>
            <input type="checkbox" checked={includeDrafts} onChange={(e) => setIncludeDrafts(e.target.checked)} disabled={running} />
            Also import drafts and private posts (they arrive as drafts)
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {!running ? (
              <button type="button" className="btn btn--style-primary btn--size-medium" style={{ margin: 0 }} onClick={() => run(queue)} disabled={!queue.length}>
                Import {queue.length} posts
              </button>
            ) : (
              <button type="button" className="btn btn--style-secondary btn--size-medium" style={{ margin: 0 }} onClick={() => (stopRef.current = true)}>
                Stop after this post
              </button>
            )}
            {!running && failedPosts.length > 0 && (
              <button type="button" className="btn btn--style-secondary btn--size-medium" style={{ margin: 0 }} onClick={() => run(failedPosts)}>
                Retry {failedPosts.length} failed
              </button>
            )}
          </div>
          {(running || results.length > 0) && (
            <div style={{ marginTop: 16 }}>
              <div aria-hidden="true" style={{ height: 8, background: 'var(--theme-elevation-150)', borderRadius: 4 }}>
                <div style={{ height: 8, width: `${queue.length ? (doneCount / queue.length) * 100 : 0}%`, background: '#C8191E', borderRadius: 4 }} />
              </div>
              <p role="status" style={{ marginBottom: 0 }}>
                {running ? `Importing ${doneCount + 1} of ${queue.length}… keep this tab open.` : 'Finished.'} {counts.imported} imported,{' '}
                {counts.skipped} already here, {counts.failed} failed
                {counts.imagesFailed ? `, ${counts.imagesFailed} images couldn't be downloaded` : ''}.
              </p>
            </div>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div style={box}>
          <p style={{ marginTop: 0, fontWeight: 600 }}>Log (newest first)</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 420, overflowY: 'auto' }}>
            {results.slice(0, 300).map((r, i) => (
              <li key={i} style={{ padding: '8px 0', borderTop: '1px solid var(--theme-elevation-100)', fontSize: 14 }}>
                <strong style={{ color: r.status === 'failed' ? 'var(--theme-error-500)' : r.status === 'skipped' ? 'var(--theme-elevation-500)' : 'var(--theme-success-600)' }}>
                  {r.status === 'imported' ? 'Imported' : r.status === 'skipped' ? 'Skipped' : 'Failed'}
                </strong>{' '}
                {r.id ? <a href={`/admin/collections/posts/${r.id}`}>{r.title}</a> : r.title}
                {r.imagesFailed ? ` · ${r.imagesFailed} image(s) missing` : ''}
                {r.message && r.status !== 'imported' ? ` · ${r.message}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
