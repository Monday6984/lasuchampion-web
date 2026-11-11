import 'server-only'

import { cookies } from 'next/headers'
import { cache } from 'react'

import type { Member } from '@/payload-types'

import { payload } from './data'

/**
 * Members' logins live in their own cookie (not Payload's admin cookie), so a member session never
 * reaches the admin or its API, and a staff member can be logged in to both on one browser.
 */
export const MEMBER_COOKIE = 'lc-member'

/** The member viewing this page, or null. */
export const getMember = cache(async (): Promise<Member | null> => {
  const token = (await cookies()).get(MEMBER_COOKIE)?.value
  if (!token) return null
  try {
    const p = await payload()
    const { user } = await p.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
    if (!user || user.collection !== 'members') return null
    return user as unknown as Member
  } catch {
    return null
  }
})

export async function setMemberCookie(token: string, exp?: number) {
  ;(await cookies()).set(MEMBER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: exp ? new Date(exp * 1000) : undefined,
  })
}

export async function clearMemberCookie() {
  ;(await cookies()).delete(MEMBER_COOKIE)
}
