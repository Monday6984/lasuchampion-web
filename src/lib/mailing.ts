/**
 * The daily email run (called by /api/cron/daily once a day, in the evening Lagos time).
 *
 * Everything shares one daily allowance (Resend's free plan: 100 a day; see lib/allowance.ts):
 *  1. Instant alerts for scheduled stories that went live since they were saved.
 *  2. A new magazine issue: to members who want magazine emails and to newsletter subscribers,
 *     oldest first, until everyone has it.
 *  3. The daily digest: members on "Daily digest" and newsletter subscribers get one email listing
 *     the stories published since their last digest (nothing on days with no new stories).
 * Whatever doesn't fit in today's allowance goes out in tomorrow's run.
 */
import type { Payload, Where } from 'payload'

import type { Post, Section } from '@/payload-types'

import { imageUrl, notifyInstantSubscribers } from './alerts'
import { recordSent, remainingToday } from './allowance'
import { digestEmail, emailEnabled, issueEmail, sendBatch, type Email } from './email'
import { unsubscribeUrl } from './unsubscribe'

const LOOKBACK = 3 * 864e5 // a digest never reaches back more than three days

const live = (): Where => ({
  and: [{ _status: { equals: 'published' } }, { publishedAt: { less_than_equal: new Date().toISOString() } }],
})

/** Stories from the last three days that should go to members, newest first. */
export async function recentStories(payload: Payload) {
  const res = await payload.find({
    collection: 'posts',
    where: {
      and: [live(), { notifyMembers: { not_equals: false } }, { publishedAt: { greater_than: new Date(Date.now() - LOOKBACK).toISOString() } }],
    },
    sort: '-publishedAt',
    limit: 20,
    depth: 1,
  })
  return res.docs
}

const forEmail = (p: Post) => ({
  title: p.title,
  slug: p.slug,
  excerpt: p.excerpt,
  image: imageUrl(p.cover),
  section: typeof p.section === 'object' ? (p.section as Section)?.name : null,
})

const storiesSince = (since: string | null | undefined, created: string, pool: Post[]) => {
  const from = Math.max(since ? Date.parse(since) : Date.parse(created), Date.now() - LOOKBACK)
  return pool.filter((p) => Date.parse(p.publishedAt) > from).slice(0, 8)
}

type RunResult = {
  emailEnabled: boolean
  alerts: number
  issue?: { title: string; sent: number; remaining: number; done: boolean }
  digest: { sent: number; waiting: number }
  note?: string
}

export async function runDailyEmails(payload: Payload): Promise<RunResult> {
  // Without Resend nothing can be sent, so nothing is marked as sent either.
  if (!emailEnabled()) {
    return { emailEnabled: false, alerts: 0, digest: { sent: 0, waiting: 0 }, note: 'Email not connected yet (RESEND_API_KEY). Nothing sent.' }
  }
  const result: RunResult = { emailEnabled: true, alerts: 0, digest: { sent: 0, waiting: 0 } }

  // 1. Scheduled stories that are now live but haven't had their instant alerts.
  const pendingAlerts = await payload.find({
    collection: 'posts',
    where: { and: [live(), { notifyMembers: { equals: true } }, { alertsSent: { not_equals: true } }, { publishedAt: { greater_than: new Date(Date.now() - LOOKBACK).toISOString() } }] },
    limit: 10,
    depth: 0,
  })
  for (const p of pendingAlerts.docs) {
    await notifyInstantSubscribers(payload, p)
    result.alerts++
  }

  let budget = await remainingToday(payload)

  // 2. A new magazine issue.
  const due = await payload.find({
    collection: 'issues',
    where: {
      and: [
        { _status: { equals: 'published' } },
        { releaseDate: { less_than_equal: new Date().toISOString() } },
        { notifySubscribers: { equals: true } },
        { notificationsDone: { not_equals: true } },
      ],
    },
    sort: 'releaseDate',
    limit: 1,
    depth: 0,
  })
  const issue = due.docs[0]
  if (issue && budget > 0) {
    const notYet: Where = { or: [{ lastNotifiedIssue: { exists: false } }, { lastNotifiedIssue: { not_equals: issue.id } }] }
    const info = { title: issue.title, issueNumber: issue.issueNumber, summary: issue.summary, slug: issue.slug ?? '' }
    const members = await payload.find({
      collection: 'members',
      where: { and: [{ magazineEmails: { not_equals: false } }, { blocked: { not_equals: true } }, notYet] },
      sort: 'createdAt',
      limit: budget,
      depth: 0,
    })
    let sent = 0
    if (members.docs.length) {
      await sendBatch(members.docs.map((m) => issueEmail(m.email, info)))
      await payload.update({ collection: 'members', where: { id: { in: members.docs.map((m) => m.id) } }, data: { lastNotifiedIssue: issue.id } })
      sent += members.docs.length
    }
    const subsLeft = budget - sent
    const subs = await payload.find({
      collection: 'subscribers',
      where: { and: [{ active: { equals: true } }, notYet] },
      sort: 'createdAt',
      limit: Math.max(1, subsLeft),
      depth: 0,
    })
    if (subsLeft > 0 && subs.docs.length) {
      await sendBatch(subs.docs.map((s) => issueEmail(s.email, info, unsubscribeUrl(s.email))))
      await payload.update({ collection: 'subscribers', where: { id: { in: subs.docs.map((s) => s.id) } }, data: { lastNotifiedIssue: issue.id } })
      sent += subs.docs.length
    }
    await recordSent(payload, sent)
    budget -= sent
    const remaining = members.totalDocs - members.docs.length + (subsLeft > 0 ? subs.totalDocs - subs.docs.length : subs.totalDocs)
    const done = remaining <= 0
    if (done) await payload.update({ collection: 'issues', id: issue.id, data: { notificationsDone: true } })
    result.issue = { title: issue.title, sent, remaining, done }
  }

  // 3. The daily digest.
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  if (settings.weeklyDigest === false || budget <= 0) return result
  const pool = await recentStories(payload)
  if (!pool.length) return result
  const newest = pool[0].publishedAt
  const stale: Where = { or: [{ lastDigestAt: { exists: false } }, { lastDigestAt: { less_than: newest } }] }

  const members = await payload.find({
    collection: 'members',
    where: { and: [{ alerts: { equals: 'digest' } }, { blocked: { not_equals: true } }, stale] },
    sort: 'lastDigestAt',
    limit: 1000,
    depth: 0,
  })
  const memberEmails = new Set(members.docs.map((m) => m.email))
  const subs = await payload.find({
    collection: 'subscribers',
    where: { and: [{ active: { equals: true } }, stale] },
    sort: 'lastDigestAt',
    limit: 1000,
    depth: 0,
  })

  type Job = { collection: 'members' | 'subscribers'; id: number | string; email: Email }
  const jobs: Job[] = []
  for (const m of members.docs) {
    const stories = storiesSince(m.lastDigestAt, m.createdAt, pool)
    if (stories.length) jobs.push({ collection: 'members', id: m.id, email: digestEmail(m.email, stories.map(forEmail)) })
  }
  for (const s of subs.docs) {
    if (memberEmails.has(s.email)) continue // a member already gets it through their account
    const stories = storiesSince(s.lastDigestAt, s.createdAt, pool)
    if (stories.length) jobs.push({ collection: 'subscribers', id: s.id, email: digestEmail(s.email, stories.map(forEmail), unsubscribeUrl(s.email)) })
  }
  const now = jobs.slice(0, budget)
  if (now.length) {
    await sendBatch(now.map((j) => j.email))
    const stamp = new Date().toISOString()
    for (const collection of ['members', 'subscribers'] as const) {
      const ids = now.filter((j) => j.collection === collection).map((j) => j.id)
      if (ids.length) await payload.update({ collection, where: { id: { in: ids } }, data: { lastDigestAt: stamp } })
    }
    await recordSent(payload, now.length)
  }
  result.digest = { sent: now.length, waiting: Math.max(0, jobs.length - now.length) }
  return result
}
