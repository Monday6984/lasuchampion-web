import type { Payload } from 'payload'

import { today } from './views'

export const dailyLimit = () => Math.max(1, Number(process.env.DAILY_EMAIL_LIMIT) || 90)

/** Emails still allowed today. */
export async function remainingToday(payload: Payload) {
  const usage = await payload.findGlobal({ slug: 'email-usage', depth: 0 })
  const used = usage.day === today() ? (usage.sent ?? 0) : 0
  return Math.max(0, dailyLimit() - used)
}

/** Records emails sent today. */
export async function recordSent(payload: Payload, n: number) {
  if (n <= 0) return
  const usage = await payload.findGlobal({ slug: 'email-usage', depth: 0 })
  const day = today()
  const sent = (usage.day === day ? (usage.sent ?? 0) : 0) + n
  await payload.updateGlobal({ slug: 'email-usage', data: { day, sent } })
}
