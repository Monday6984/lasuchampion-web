import type { Field } from 'payload'

import type { ViewKind } from '../lib/views'

/**
 * A read-only "Views" number shown in the admin, worked out from the DailyViews log.
 * Only computed for logged-in staff, so public pages don't pay for the extra query.
 */
export const viewCountField = (kind: ViewKind, label: string): Field => ({
  name: 'views',
  label,
  type: 'number',
  virtual: true,
  admin: { readOnly: true, position: 'sidebar', description: 'All-time, counted by this website (old-site views are added on top).' },
  hooks: {
    afterRead: [
      async ({ req, originalDoc }) => {
        if (req.user?.collection !== 'users' || !originalDoc?.id) return undefined
        const { getViewTotals } = await import('../lib/views')
        const totals = await getViewTotals(req.payload, kind, [originalDoc.id])
        return totals.get(String(originalDoc.id)) ?? 0
      },
    ],
  },
})
