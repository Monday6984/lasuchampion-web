import type { GlobalConfig } from 'payload'

import { isAdmin } from '../access'

/**
 * How many emails have gone out today (Lagos time). Instant alerts, the daily digest and magazine
 * notices all draw from one daily allowance (DAILY_EMAIL_LIMIT, default 90) so the site stays inside
 * Resend's free plan of 100 a day. Anything over the allowance waits for the next day's run.
 */
export const EmailUsage: GlobalConfig = {
  slug: 'email-usage',
  label: 'Email usage',
  admin: { hidden: true },
  access: { read: isAdmin, update: isAdmin },
  fields: [
    { name: 'day', type: 'text' },
    { name: 'sent', type: 'number', defaultValue: 0 },
  ],
}
