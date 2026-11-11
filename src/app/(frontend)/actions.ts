'use server'

import { headers } from 'next/headers'

import { payload } from '@/lib/data'

export type FormState = { ok: boolean; message: string } | null

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? '').trim().slice(0, max)

// A very small in-memory limit per visitor, enough to slow down form spam on a free plan.
const recent = new Map<string, number[]>()
async function tooMany(key: string, limit = 5, windowMs = 10 * 60_000) {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const k = `${key}:${ip}`
  const now = Date.now()
  const hits = (recent.get(k) ?? []).filter((t) => now - t < windowMs)
  hits.push(now)
  recent.set(k, hits)
  return hits.length > limit
}

export async function subscribe(_prev: FormState, form: FormData): Promise<FormState> {
  if (str(form, 'website')) return { ok: true, message: "You're on the list." } // honeypot
  const email = str(form, 'email', 200).toLowerCase()
  if (!isEmail(email)) return { ok: false, message: 'Please enter a valid email address.' }
  if (await tooMany('subscribe')) return { ok: false, message: 'Too many attempts. Please try again later.' }

  const p = await payload()
  const existing = await p.find({ collection: 'subscribers', where: { email: { equals: email } }, limit: 1, depth: 0 })
  if (existing.docs[0]) {
    if (!existing.docs[0].active) {
      await p.update({ collection: 'subscribers', id: existing.docs[0].id, data: { active: true } })
    }
  } else {
    await p.create({ collection: 'subscribers', data: { email, active: true, source: str(form, 'source', 100) || 'website' } })
  }
  return { ok: true, message: "You're on the list. Look out for the daily digest of new stories." }
}

const TYPES = ['advertising', 'tip', 'general'] as const

export async function submitEnquiry(_prev: FormState, form: FormData): Promise<FormState> {
  if (str(form, 'website')) return { ok: true, message: 'Thanks — we have it.' } // honeypot
  const type = str(form, 'type') as (typeof TYPES)[number]
  const name = str(form, 'name', 200)
  const email = str(form, 'email', 200)
  const message = str(form, 'message', 5000)
  if (!TYPES.includes(type)) return { ok: false, message: 'Please choose what your message is about.' }
  if (!name || !message) return { ok: false, message: 'Please add your name and a short message.' }
  if (!isEmail(email)) return { ok: false, message: 'Please enter a valid email address.' }
  if (await tooMany('enquiry', 3)) return { ok: false, message: 'Too many messages. Please email us instead.' }

  const p = await payload()
  await p.create({
    collection: 'enquiries',
    data: {
      type,
      name,
      email,
      message,
      organisation: str(form, 'organisation', 200) || undefined,
      subject: str(form, 'subject', 200) || undefined,
      phone: str(form, 'phone', 50) || undefined,
      status: 'new',
    },
  })
  return { ok: true, message: type }
}
