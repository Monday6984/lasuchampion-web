'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { payload } from '@/lib/data'
import { replyEmail, sendEmail, welcomeEmail } from '@/lib/email'
import { clearMemberCookie, getMember, setMemberCookie } from '@/lib/member'

export type FormState = { ok: boolean; message: string } | null

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? '').trim().slice(0, max)

// A small in-memory limit per visitor, enough to slow down spam on a free plan.
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

const MEMBER_TYPES = ['student', 'alumni', 'staff', 'friend'] as const
const safeNext = (v: string) => (v.startsWith('/') && !v.startsWith('//') ? v : '/account')

/** Saves an uploaded image (profile photo or celebration picture) into Media. */
async function saveImage(file: FormDataEntryValue | null, alt: string) {
  if (!file || typeof file === 'string' || !file.size) return undefined
  if (!file.type.startsWith('image/')) throw new Error('Please choose a photo (JPG or PNG).')
  if (file.size > 4 * 1024 * 1024) throw new Error('That photo is too big. Please choose one under 4 MB.')
  const p = await payload()
  const name = (file.name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-80)
  const doc = await p.create({
    collection: 'media',
    data: { alt },
    file: { data: Buffer.from(await file.arrayBuffer()), mimetype: file.type, name, size: file.size },
  })
  return doc.id
}

// ---------- accounts ----------

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  if (str(form, 'website')) return { ok: false, message: 'Something went wrong.' } // honeypot
  const name = str(form, 'name', 120)
  const email = str(form, 'email', 200).toLowerCase()
  const password = String(form.get('password') ?? '')
  const memberType = str(form, 'memberType') as (typeof MEMBER_TYPES)[number]
  if (!name) return { ok: false, message: 'Please add your name.' }
  if (!isEmail(email)) return { ok: false, message: 'Please enter a valid email address.' }
  if (password.length < 8) return { ok: false, message: 'Please choose a password of at least 8 characters.' }
  if (await tooMany('signup', 4, 60 * 60_000)) return { ok: false, message: 'Too many sign-ups from here. Please try again later.' }

  const p = await payload()
  const taken = await p.count({ collection: 'members', where: { email: { equals: email } } })
  if (taken.totalDocs) return { ok: false, message: 'There is already an account with that email. Log in, or reset your password.' }

  await p.create({
    collection: 'members',
    data: {
      name,
      email,
      password,
      memberType: MEMBER_TYPES.includes(memberType) ? memberType : 'student',
      faculty: str(form, 'faculty', 120) || undefined,
      department: str(form, 'department', 120) || undefined,
      level: str(form, 'level', 40) || undefined,
      alerts: form.get('digest') ? 'digest' : 'off',
    },
  })
  const { token, exp } = await p.login({ collection: 'members', data: { email, password } })
  if (token) await setMemberCookie(token, exp)
  await sendEmail(welcomeEmail(email, name)).catch(() => null)
  redirect('/account?welcome=1')
}

export async function logIn(_prev: FormState, form: FormData): Promise<FormState> {
  const email = str(form, 'email', 200).toLowerCase()
  const password = String(form.get('password') ?? '')
  if (!isEmail(email) || !password) return { ok: false, message: 'Please enter your email and password.' }
  if (await tooMany('login', 10)) return { ok: false, message: 'Too many attempts. Please wait a few minutes and try again.' }
  const p = await payload()
  let result: { token?: string; exp?: number } = {}
  try {
    result = await p.login({ collection: 'members', data: { email, password } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (/locked/i.test(msg)) return { ok: false, message: 'This account is locked for 15 minutes after too many attempts. Try again later, or reset your password.' }
    return { ok: false, message: "That email and password don't match. Try again, or reset your password." }
  }
  if (!result.token) return { ok: false, message: 'Could not log you in. Please try again.' }
  await setMemberCookie(result.token, result.exp)
  redirect(safeNext(str(form, 'next', 300)))
}

export async function logOut() {
  await clearMemberCookie()
  redirect('/')
}

export async function forgotPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const email = str(form, 'email', 200).toLowerCase()
  if (!isEmail(email)) return { ok: false, message: 'Please enter a valid email address.' }
  if (await tooMany('forgot', 5)) return { ok: false, message: 'Too many requests. Please try again later.' }
  const p = await payload()
  try {
    await p.forgotPassword({ collection: 'members', data: { email } })
  } catch {
    // Same answer whether or not the address has an account.
  }
  return { ok: true, message: 'If there is an account with that email, a link to set a new password is on its way. Check your inbox and spam folder.' }
}

export async function resetPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const token = str(form, 'token', 500)
  const password = String(form.get('password') ?? '')
  if (password.length < 8) return { ok: false, message: 'Please choose a password of at least 8 characters.' }
  if (password !== String(form.get('confirm') ?? '')) return { ok: false, message: "The two passwords don't match." }
  const p = await payload()
  try {
    const res = await p.resetPassword({ collection: 'members', data: { token, password }, overrideAccess: true })
    if (res.token) await setMemberCookie(res.token)
  } catch {
    return { ok: false, message: 'This link has expired or was already used. Ask for a new one.' }
  }
  redirect('/account?reset=1')
}

// ---------- profile and settings ----------

async function requireMember() {
  const member = await getMember()
  if (!member) redirect('/login?next=/account')
  return member
}

export async function updateProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const member = await requireMember()
  const name = str(form, 'name', 120)
  if (!name) return { ok: false, message: 'Please keep a name on your profile.' }
  const memberType = str(form, 'memberType') as (typeof MEMBER_TYPES)[number]
  let photo: number | undefined
  try {
    photo = await saveImage(form.get('photo'), name)
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not save the photo.' }
  }
  const p = await payload()
  await p.update({
    collection: 'members',
    id: member.id,
    data: {
      name,
      memberType: MEMBER_TYPES.includes(memberType) ? memberType : member.memberType,
      faculty: str(form, 'faculty', 120),
      department: str(form, 'department', 120),
      level: str(form, 'level', 40),
      bio: str(form, 'bio', 400),
      ...(photo ? { photo } : {}),
    },
  })
  revalidatePath(`/members/${member.username}`)
  return { ok: true, message: 'Profile saved.' }
}

export async function updateAlerts(_prev: FormState, form: FormData): Promise<FormState> {
  const member = await requireMember()
  const alerts = str(form, 'alerts')
  const p = await payload()
  await p.update({
    collection: 'members',
    id: member.id,
    data: {
      alerts: alerts === 'instant' || alerts === 'off' ? alerts : 'digest',
      magazineEmails: Boolean(form.get('magazineEmails')),
      replyEmails: Boolean(form.get('replyEmails')),
    },
  })
  return { ok: true, message: 'Email settings saved.' }
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const member = await requireMember()
  const current = String(form.get('current') ?? '')
  const password = String(form.get('password') ?? '')
  if (password.length < 8) return { ok: false, message: 'Please choose a password of at least 8 characters.' }
  const p = await payload()
  try {
    await p.login({ collection: 'members', data: { email: member.email, password: current } })
  } catch {
    return { ok: false, message: 'Your current password is not right.' }
  }
  await p.update({ collection: 'members', id: member.id, data: { password, mustSetPassword: false } })
  const { token, exp } = await p.login({ collection: 'members', data: { email: member.email, password } })
  if (token) await setMemberCookie(token, exp)
  return { ok: true, message: 'Password changed.' }
}

// ---------- stories ----------

/** Saves or unsaves a story for the member; returns the new state. */
export async function toggleSave(postId: number): Promise<{ ok: boolean; saved?: boolean; needLogin?: boolean }> {
  const member = await getMember()
  if (!member) return { ok: false, needLogin: true }
  const ids = (member.savedStories ?? []).map((s) => (typeof s === 'object' ? s.id : s))
  const saved = !ids.includes(postId)
  const next = saved ? [postId, ...ids] : ids.filter((id) => id !== postId)
  const p = await payload()
  await p.update({ collection: 'members', id: member.id, data: { savedStories: next.slice(0, 500) } })
  return { ok: true, saved }
}

export async function postComment(_prev: FormState, form: FormData): Promise<FormState> {
  const member = await getMember()
  if (!member) return { ok: false, message: 'Please log in to comment.' }
  if (member.blocked) return { ok: false, message: 'Your account cannot post comments. Contact us if you think this is a mistake.' }
  const body = str(form, 'body', 3000)
  const postId = Number(form.get('postId'))
  const parentId = Number(form.get('parentId')) || undefined
  if (!body) return { ok: false, message: 'Please write something first.' }
  if (!postId) return { ok: false, message: 'Something went wrong. Please reload the page.' }
  if (await tooMany(`comment:${member.id}`, 6, 5 * 60_000)) return { ok: false, message: "You're commenting very fast. Please wait a moment." }

  const p = await payload()
  const post = await p.findByID({ collection: 'posts', id: postId, depth: 0 }).catch(() => null)
  if (!post || post._status !== 'published') return { ok: false, message: 'This story is no longer available.' }
  const settings = await p.findGlobal({ slug: 'site-settings', depth: 0 })
  const lower = body.toLowerCase()
  const held = (settings.commentWords ?? []).some((w) => w && lower.includes(String(w).toLowerCase()))

  const comment = await p.create({
    collection: 'comments',
    data: { post: postId, member: member.id, body, parent: parentId, status: held ? 'pending' : 'visible' },
  })

  // Tell the person being replied to (if they want to know, and it isn't themselves).
  if (parentId && !held) {
    const parent = await p.findByID({ collection: 'comments', id: parentId, depth: 1 }).catch(() => null)
    const to = parent?.member && typeof parent.member === 'object' ? parent.member : null
    if (to && to.id !== member.id && to.replyEmails !== false && !to.blocked) {
      await sendEmail(replyEmail(to.email, to.name, member.name, { title: post.title, slug: post.slug ?? '' }, body)).catch(() => null)
    }
  }
  revalidatePath(`/${post.slug}`)
  return {
    ok: true,
    message: held ? 'Thanks. Your comment will appear once an editor has checked it.' : `posted:${comment.id}`,
  }
}

export async function reportComment(commentId: number): Promise<{ ok: boolean; needLogin?: boolean }> {
  const member = await getMember()
  if (!member) return { ok: false, needLogin: true }
  const p = await payload()
  const c = await p.findByID({ collection: 'comments', id: commentId, depth: 0 }).catch(() => null)
  if (!c) return { ok: false }
  const by = (c.reportedBy ?? []).map((m) => (typeof m === 'object' ? m.id : m))
  if (!by.includes(member.id)) {
    await p.update({ collection: 'comments', id: c.id, data: { reportedBy: [...by, member.id], reportCount: by.length + 1 } })
  }
  return { ok: true }
}

export async function deleteOwnComment(commentId: number): Promise<{ ok: boolean }> {
  const member = await getMember()
  if (!member) return { ok: false }
  const p = await payload()
  const c = await p.findByID({ collection: 'comments', id: commentId, depth: 1 }).catch(() => null)
  const ownerId = c?.member && typeof c.member === 'object' ? c.member.id : c?.member
  if (!c || ownerId !== member.id) return { ok: false }
  await p.update({ collection: 'comments', id: c.id, data: { status: 'hidden' } })
  const slug = c.post && typeof c.post === 'object' ? c.post.slug : null
  if (slug) revalidatePath(`/${slug}`)
  return { ok: true }
}

// ---------- celebrations ----------

const KINDS = ['birthday', 'wedding', 'graduation', 'promotion', 'anniversary', 'retirement', 'tribute'] as const

export async function submitCelebration(_prev: FormState, form: FormData): Promise<FormState> {
  const member = await getMember()
  if (!member) return { ok: false, message: 'Please log in to send a celebration.' }
  if (member.blocked) return { ok: false, message: 'Your account cannot send celebrations. Contact us if you think this is a mistake.' }
  const kind = str(form, 'kind') as (typeof KINDS)[number]
  const celebrant = str(form, 'celebrant', 160)
  const message = str(form, 'message', 3000)
  if (!KINDS.includes(kind)) return { ok: false, message: 'Please choose what you are celebrating.' }
  if (!celebrant || !message) return { ok: false, message: "Please add the celebrant's name and a message." }
  if (await tooMany(`celebrate:${member.id}`, 5, 60 * 60_000)) return { ok: false, message: 'You have sent several today. Please try again tomorrow.' }
  let photo: number | undefined
  try {
    photo = await saveImage(form.get('photo'), celebrant)
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not save the photo.' }
  }
  const date = str(form, 'date', 20)
  const p = await payload()
  await p.create({
    collection: 'celebrations',
    data: { member: member.id, kind, celebrant, message, photo, date: date ? new Date(date).toISOString() : undefined, status: 'pending' },
  })
  return { ok: true, message: 'sent' }
}
