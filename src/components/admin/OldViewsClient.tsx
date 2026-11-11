'use client'

import React, { useState } from 'react'

type Target = { collection: 'posts' | 'issues'; id: string; title: string }
type Row = { postId: string; title: string; url: string; views: number; match: Target | null }

const box: React.CSSProperties = {
  marginTop: 16,
  padding: 20,
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 8,
  background: 'var(--theme-elevation-50)',
}
const input: React.CSSProperties = {
  flex: '1 1 220px',
  minHeight: 40,
  padding: '0 12px',
  borderRadius: 6,
  border: '1px solid var(--theme-elevation-250)',
  background: 'var(--theme-input-bg)',
  color: 'var(--theme-text)',
  fontSize: 15,
}
const th: React.CSSProperties = { textAlign: 'left', fontSize: 12, padding: '8px', borderBottom: '1px solid var(--theme-elevation-150)', color: 'var(--theme-elevation-600)' }
const td: React.CSSProperties = { padding: '8px', borderBottom: '1px solid var(--theme-elevation-100)', fontSize: 14, verticalAlign: 'top' }
const key = (t: Target | null) => (t ? `${t.collection}:${t.id}` : '')

/** Import → Old view counts: Jetpack Stats from the old WordPress site, matched to posts and issues. */
export function OldViewsClient() {
  const [source, setSource] = useState<'key' | 'file'>('key')
  const [site, setSite] = useState('https://lasuchampion.com/')
  const [apiKey, setApiKey] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [options, setOptions] = useState<Target[]>([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const call = async (body: object) => {
    const res = await fetch('/api/old-views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({ error: `Server error (${res.status})` }))
    if (!res.ok) throw new Error(data.error ?? `Server error (${res.status})`)
    return data
  }

  const load = async (body: object) => {
    setBusy('Reading the view counts…')
    setError('')
    setDone('')
    try {
      const data = await call(body)
      setRows(data.rows)
      setOptions(data.options)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await load({ action: 'csv', text: await file.text() })
  }

  const setMatch = (i: number, value: string) => {
    setRows((rs) => rs && rs.map((r, k) => (k === i ? { ...r, match: options.find((o) => key(o) === value) ?? null } : r)))
  }

  const toSave = rows?.filter((r) => r.match) ?? []

  const save = async () => {
    setBusy('Saving…')
    setError('')
    try {
      const data = await call({
        action: 'save',
        items: toSave.map((r) => ({ collection: r.match!.collection, id: r.match!.id, views: r.views, url: r.url })),
      })
      setDone(`Saved old view counts for ${data.saved} posts and issues. They now show on the site (allow a few minutes for cached pages).`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  return (
    <div>
      <p style={{ color: 'var(--theme-elevation-600)', marginTop: 0 }}>
        Brings each post&apos;s and magazine&apos;s all-time views across from the old site&apos;s Jetpack Stats, so they don&apos;t start
        from zero here. They&apos;re added to the views counted on this site. Running it again replaces the old numbers rather than
        adding them twice.
      </p>

      <div role="tablist" aria-label="Where the numbers come from" style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        {(
          [
            ['key', 'With a WordPress.com API key'],
            ['file', 'From a CSV file'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={source === k}
            className={`btn btn--size-small ${source === k ? 'btn--style-primary' : 'btn--style-secondary'}`}
            style={{ margin: 0 }}
            onClick={() => setSource(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {source === 'key' ? (
        <form
          style={box}
          onSubmit={(e) => {
            e.preventDefault()
            void load({ action: 'fetch', site, apiKey })
          }}
        >
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--theme-elevation-600)' }}>
            Log in at{' '}
            <a href="https://apikey.wordpress.com/" target="_blank" rel="noreferrer">
              apikey.wordpress.com
            </a>{' '}
            with the WordPress.com account that Jetpack is connected to on the old site, and copy the API key shown there. It&apos;s only
            used for this import and isn&apos;t saved.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input aria-label="Old site address" style={input} value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://lasuchampion.com/" />
            <input aria-label="API key" style={{ ...input, flex: '0 1 200px' }} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API key" autoComplete="off" />
            <button type="submit" className="btn btn--style-primary btn--size-medium" style={{ margin: 0 }} disabled={Boolean(busy) || !site.trim() || !apiKey.trim()}>
              Get view counts
            </button>
          </div>
        </form>
      ) : (
        <div style={box}>
          <label htmlFor="old-views-file" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
            Jetpack stats CSV
          </label>
          <p style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--theme-elevation-600)' }}>
            A CSV with each page&apos;s title or address and its views, e.g. from Jetpack&apos;s export (columns: date, post_id, post_title,
            post_permalink, views).
          </p>
          <input id="old-views-file" type="file" accept=".csv,text/csv" onChange={onFile} disabled={Boolean(busy)} />
        </div>
      )}

      {busy && <p role="status">{busy}</p>}
      {error && (
        <p role="alert" style={{ color: 'var(--theme-error-500)' }}>
          {error}
        </p>
      )}

      {rows && (
        <div style={box}>
          <p style={{ marginTop: 0 }}>
            <strong>{rows.length}</strong> old pages with views. <strong>{toSave.length}</strong> matched to posts or issues here. Check
            the matches, change any that are wrong, and choose the right issue for old magazine pages that weren&apos;t matched.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Old page</th>
                  <th style={{ ...th, textAlign: 'right' }}>Views</th>
                  <th style={th}>Goes to</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.postId}-${r.url}-${i}`}>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{r.title || '(no title)'}</div>
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, wordBreak: 'break-all' }}>
                          {r.url.replace(/^https?:\/\/(www\.)?/, '')}
                        </a>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{r.views.toLocaleString('en-GB')}</td>
                    <td style={{ ...td, minWidth: 240 }}>
                      <select
                        aria-label={`Where the views of "${r.title}" go`}
                        value={key(r.match)}
                        onChange={(e) => setMatch(i, e.target.value)}
                        style={{ ...input, width: '100%', minHeight: 36 }}
                      >
                        <option value="">Don&apos;t import</option>
                        <optgroup label="Magazine issues">
                          {options.filter((o) => o.collection === 'issues').map((o) => (
                            <option key={key(o)} value={key(o)}>
                              {o.title}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Posts">
                          {options.filter((o) => o.collection === 'posts').map((o) => (
                            <option key={key(o)} value={key(o)}>
                              {o.title}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn--style-primary btn--size-medium" style={{ margin: '16px 0 0' }} onClick={save} disabled={Boolean(busy) || !toSave.length}>
            Save {toSave.length} view counts
          </button>
          {done && (
            <p role="status" style={{ color: 'var(--theme-success-500)', marginBottom: 0 }}>
              {done}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
