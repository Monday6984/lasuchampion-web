import { createHmac, timingSafeEqual } from 'crypto'

const sign = (email: string) =>
  createHmac('sha256', process.env.PAYLOAD_SECRET || 'dev').update(email.toLowerCase()).digest('base64url').slice(0, 32)

/** A link that unsubscribes this email address; signed so nobody can unsubscribe someone else. */
export const unsubscribeUrl = (email: string) =>
  `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/unsubscribe?e=${encodeURIComponent(email)}&t=${sign(email)}`

export const validToken = (email: string, token: string) => {
  const expected = Buffer.from(sign(email))
  const given = Buffer.from(token)
  return expected.length === given.length && timingSafeEqual(expected, given)
}
