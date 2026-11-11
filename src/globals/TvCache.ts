import type { GlobalConfig } from 'payload'

import { anyone, isAdmin } from '../access'

/**
 * The last video list read from YouTube, saved by the daily job.
 * The Champion TV page uses it only if YouTube can't be reached, so the page never goes blank.
 */
export const TvCache: GlobalConfig = {
  slug: 'tv-cache',
  label: 'Champion TV (saved copy)',
  admin: { hidden: true },
  access: { read: anyone, update: isAdmin },
  fields: [
    { name: 'channelId', type: 'text' },
    { name: 'videos', type: 'json' },
    { name: 'savedAt', type: 'date' },
  ],
}
