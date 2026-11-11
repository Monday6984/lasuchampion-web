import { randomBytes } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'

import { recordSent, remainingToday } from '@/lib/allowance'
import { payload } from '@/lib/data'
import { emailEnabled } from '@/lib/email'

export const maxDuration = 60

export type MemberRow = {
  email: string
  name?: string
  username?: string
  faculty?: string
  department?: string
  level?: string
  registered?: string
  wpUserId?: string
}

type Body = { action: 'rows'; rows: MemberRow[] } | { action: 'invite' } | { action: 'status' }

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

/**
 * Admin only.
 *  rows   → creates member accounts for old WordPress / BuddyPress members (skips emails already here).
 *           Each gets a random password and is asked to choose their own.
 *  invite → emails the next batch of imported members a "set your password" link, within today's
 *           email allowance; click again on later days to reach everyone.
 *  status → how many imported members are still waiting for that email.
 */
export async function POST(req: NextRequest) {
  const p = await payload()
  const { user } = await p.auth({ headers: req.headers })
  if (user?.collection !== 'users' || (user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can import members.' }, { status: 403 })
  }
  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 })
  }

  const waiting = async () =>
    (await p.count({ collection: 'members', where: { and: [{ mustSetPassword: { equals: true } }, { invitedAt: { exists: false } }] } })).totalDocs

  if (body.action === 'status') return NextResponse.json({ waiting: await waiting(), emailEnabled: emailEnabled(), allowance: await remainingToday(p) })

  if (body.action === 'invite') {
    if (!emailEnabled()) return NextResponse.json({ error: 'Email is not connected yet (RESEND_API_KEY), so nothing can be sent.' }, { status: 400 })
    const budget = await remainingToday(p)
    if (budget <= 0) return NextResponse.json({ sent: 0, waiting: await waiting(), note: "Today's email allowance is used up. Try again tomorrow." })
    const batch = await p.find({
      collection: 'members',
      where: { and: [{ mustSetPassword: { equals: true } }, { invitedAt: { exists: false } }] },
      sort: 'createdAt',
      limit: Math.min(budget, 80),
      depth: 0,
    })
    let sent = 0
    for (const m of batch.docs) {
      try {
        await p.forgotPassword({ collection: 'members', data: { email: m.email }, disableEmail: false })
        await p.update({ collection: 'members', id: m.id, data: { invitedAt: new Date().toISOString() } })
        sent++
      } catch (err) {
        p.logger.error({ err, msg: `Set-password email failed for member ${m.id}` })
      }
    }
    await recordSent(p, sent)
    return NextResponse.json({ sent, waiting: await waiting() })
  }

  if (body.action === 'rows') {
    const results = { created: 0, skipped: 0, failed: 0, errors: [] as string[] }
    for (const row of (body.rows ?? []).slice(0, 200)) {
      const email = String(row.email ?? '').trim().toLowerCase()
      if (!isEmail(email)) {
        results.failed++
        if (results.errors.length < 10) results.errors.push(`"${row.email}" is not an email address`)
        continue
      }
      const exists = await p.count({ collection: 'members', where: { email: { equals: email } } })
      if (exists.totalDocs) {
        results.skipped++
        continue
      }
      try {
        const registered = row.registered ? new Date(row.registered.replace(' ', 'T') + (row.registered.includes('Z') ? '' : 'Z')) : null
        await p.create({
          collection: 'members',
          data: {
            email,
            name: (row.name || row.username || email.split('@')[0]).slice(0, 120),
            username: row.username || undefined,
            faculty: row.faculty || undefined,
            department: row.department || undefined,
            level: row.level || undefined,
            wpUserId: row.wpUserId || undefined,
            password: randomBytes(24).toString('base64url'),
            mustSetPassword: true,
            alerts: 'digest',
            ...(registered && !Number.isNaN(registered.getTime()) ? { createdAt: registered.toISOString() } : {}),
          } as never,
        })
        results.created++
      } catch (err) {
        results.failed++
        if (results.errors.length < 10) results.errors.push(`${email}: ${err instanceof Error ? err.message : 'could not be created'}`)
      }
    }
    return NextResponse.json(results)
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
}
