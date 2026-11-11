import type { Payload } from 'payload'

import type { Media, Post, Section } from '@/payload-types'

import { recordSent, remainingToday } from './allowance'
import { alertEmail, emailEnabled, sendBatch, siteUrl } from './email'

export const imageUrl = (cover: Post['cover']) => {
  if (!cover || typeof cover !== 'object') return null
  const m = cover as Media
  const url = m.sizes?.card?.url || m.url
  if (!url) return null
  return url.startsWith('http') ? url : `${siteUrl()}${url}`
}

/**
 * Emails members on "Instant alerts" about a story that has just gone live. Uses whatever is left of
 * today's email allowance; if that runs out, the rest of them get the story in the next daily digest.
 */
export async function notifyInstantSubscribers(payload: Payload, doc: Post) {
  if (!emailEnabled()) return
  const budget = await remainingToday(payload)
  // Marked first, so a second save never sends the alert twice.
  await payload.update({ collection: 'posts', id: doc.id, data: { alertsSent: true }, context: { skipAlerts: true }, depth: 0 })
  if (budget <= 0) return

  const full = await payload.findByID({ collection: 'posts', id: doc.id, depth: 1 })
  const story = {
    title: full.title,
    slug: full.slug,
    excerpt: full.excerpt,
    image: imageUrl(full.cover),
    section: typeof full.section === 'object' ? (full.section as Section)?.name : null,
  }
  const members = await payload.find({
    collection: 'members',
    where: { and: [{ alerts: { equals: 'instant' } }, { blocked: { not_equals: true } }] },
    limit: budget,
    depth: 0,
    sort: 'createdAt',
  })
  if (!members.docs.length) return
  await sendBatch(members.docs.map((m) => alertEmail(m.email, story)))
  await recordSent(payload, members.docs.length)
}
