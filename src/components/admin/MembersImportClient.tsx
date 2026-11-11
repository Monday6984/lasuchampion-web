'use client'

import React, { useEffect, useState } from 'react'

type Row = {
  email: string
  name?: string
  username?: string
  faculty?: string
  department?: string
  level?: string
  registered?: string
  wpUserId?: string
}

const box: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 12,
  padding: 20,
  background: 'var(--theme-elevation-50)',
  marginTop: 20,
}

/** A small CSV reader: quoted cells, commas and line breaks inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',' || ch === ';' || ch === '\t') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      if (row.some((c) => c.trim())) rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim())) rows.push(row)
  return rows
}

/** Finds the columns we need, whatever the export plugin called them. */
function toRows(table: string[][]): Row[] {
  const [head, ...body] = table
  if (!head) return []
  const h = head.map((x) => x.trim().toLowerCase())
  const col = (...tests: RegExp[]) => h.findIndex((x) => tests.some((t) => t.test(x)))
  const email = col(/^(user_)?e-?mail$/, /e-?mail/)
  const display = col(/^display_name$/, /^display name$/, /^full ?name$/, /^name$/)
  const firstName = col(/^first_name$/, /^first name$/)
  const lastName = col(/^last_name$/, /^last name$/)
  const login = col(/^user_nicename$/, /^user_login$/, /^username$/, /^login$/)
  const faculty = col(/faculty/)
  const department = col(/department/, /^dept/)
  const level = col(/^level$/, /level/, /graduat/, /year/)
  const registered = col(/^user_registered$/, /registered/)
  const id = col(/^id$/, /^user_id$/)
  const at = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '')
  return body
    .map((r) => ({
      email: at(r, email),
      name: at(r, display) || [at(r, firstName), at(r, lastName)].filter(Boolean).join(' '),
      username: at(r, login),
      faculty: at(r, faculty),
      department: at(r, department),
      level: at(r, level),
      registered: at(r, registered),
      wpUserId: at(r, id),
    }))
    .filter((r) => r.email)
}

export function MembersImportClient() {
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState({ created: 0, skipped: 0, failed: 0, errors: [] as string[], finished: false })
  const [status, setStatus] = useState<{ waiting: number; emailEnabled: boolean; allowance: number } | null>(null)
  const [inviteMsg, setInviteMsg] = useState('')

  const call = async (body: unknown) => {
    const res = await fetch('/api/wp-import/members', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => ({ error: `Server error (${res.status})` }))
    if (data.error) throw new Error(data.error)
    return data
  }
  const refresh = () => call({ action: 'status' }).then(setStatus).catch(() => null)
  useEffect(() => {
    refresh()
  }, [])

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError('')
    setRows([])
    setDone({ created: 0, skipped: 0, failed: 0, errors: [], finished: false })
    const file = e.target.files?.[0]
    if (!file) return
    const list = toRows(parseCsv(await file.text()))
    if (!list.length) setError('No email column found in this file. Export users with their email address included.')
    setRows(list)
  }

  async function run() {
    setRunning(true)
    const total = { created: 0, skipped: 0, failed: 0, errors: [] as string[], finished: false }
    try {
      for (let i = 0; i < rows.length; i += 100) {
        const r = await call({ action: 'rows', rows: rows.slice(i, i + 100) })
        total.created += r.created
        total.skipped += r.skipped
        total.failed += r.failed
        total.errors.push(...(r.errors ?? []))
        setDone({ ...total })
      }
      total.finished = true
      setDone({ ...total })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
    }
    setRunning(false)
    refresh()
  }

  async function invite() {
    setInviteMsg('Sending…')
    try {
      const r = await call({ action: 'invite' })
      setInviteMsg(r.note ?? `Sent ${r.sent} set-password emails. ${r.waiting} still waiting.`)
    } catch (err) {
      setInviteMsg(err instanceof Error ? err.message : 'Could not send.')
    }
    refresh()
  }

  return (
    <div>
      <p style={{ color: 'var(--theme-elevation-600)', marginTop: 0 }}>
        Brings the old site&apos;s members across with their names and profile details. Passwords can&apos;t be copied from WordPress, so each
        member chooses a new one: they can use &ldquo;Forgot your password?&rdquo; on the login page at any time, and you can email them a link below.
      </p>
      <div style={box}>
        <label htmlFor="members-file" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
          Members file (.csv)
        </label>
        <p style={{ margin: '0 0 10px', color: 'var(--theme-elevation-600)', fontSize: 14 }}>
          In the old WordPress admin, install a plugin such as &ldquo;Export Users to CSV&rdquo;, include the BuddyPress profile fields, and
          export all users. Columns named email, display_name, user_nicename, faculty, department and level are picked up automatically.
        </p>
        <input id="members-file" type="file" accept=".csv,text/csv" onChange={onFile} disabled={running} />
        {rows.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ margin: '0 0 10px' }}>
              <strong>{rows.length}</strong> members found. First: {rows[0].name || rows[0].email}
              {rows[0].faculty ? ` (${rows[0].faculty})` : ''}.
            </p>
            <button type="button" className="btn btn--style-primary btn--size-medium" style={{ margin: 0 }} onClick={run} disabled={running}>
              {running ? 'Importing…' : `Import ${rows.length} members`}
            </button>
          </div>
        )}
        {(done.created || done.skipped || done.failed) > 0 && (
          <p role="status" style={{ marginBottom: 0 }}>
            {done.finished ? 'Finished. ' : ''}
            {done.created} created, {done.skipped} already here, {done.failed} failed.
            {done.errors.length > 0 && ` ${done.errors.slice(0, 5).join('; ')}`}
          </p>
        )}
        {error && (
          <p role="alert" style={{ color: 'var(--theme-error-500)', marginBottom: 0 }}>
            {error}
          </p>
        )}
      </div>

      <div style={box}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>Set-password emails</p>
        <p style={{ margin: '0 0 10px', color: 'var(--theme-elevation-600)', fontSize: 14 }}>
          Emails imported members a link to choose their password. To stay inside the free email plan, each click sends as many as
          today&apos;s allowance allows (up to 80). Click again on later days until nobody is waiting.
        </p>
        {status && (
          <p style={{ margin: '0 0 10px' }}>
            {status.waiting} imported members haven&apos;t been emailed yet.
            {status.emailEnabled ? ` ${status.allowance} emails left today.` : ' Email is not connected yet (RESEND_API_KEY).'}
          </p>
        )}
        <button type="button" className="btn btn--style-secondary btn--size-medium" style={{ margin: 0 }} onClick={invite} disabled={!status?.waiting || !status?.emailEnabled}>
          Send the next batch
        </button>
        {inviteMsg && (
          <p role="status" style={{ marginBottom: 0 }}>
            {inviteMsg}
          </p>
        )}
      </div>
    </div>
  )
}
