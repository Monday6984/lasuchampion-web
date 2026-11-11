import type { CollectionConfig } from 'payload'

import { isAdmin, isStaff } from '../access'

/**
 * One row per item per day: how many times a page was loaded, a post was viewed or an issue was read.
 * Written by /api/views; read by the site (view counts) and the admin Overview.
 */
export const DailyViews: CollectionConfig = {
  slug: 'daily-views',
  labels: { singular: 'Daily views', plural: 'Daily views' },
  admin: {
    group: 'Analytics',
    hidden: ({ user }) => (user as { role?: string } | null)?.role !== 'admin',
    defaultColumns: ['day', 'kind', 'docId', 'count'],
    description: 'Raw view counts, one row per post or issue per day. Recorded automatically.',
  },
  access: {
    read: isStaff,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  indexes: [{ fields: ['kind', 'docId', 'day'], unique: true }],
  fields: [
    { name: 'kind', type: 'text', required: true, index: true, admin: { description: 'page, post, issue or video (a play started on the site)' } },
    { name: 'docId', type: 'text', required: true, index: true, admin: { description: 'Page path, the post / issue id, or the YouTube video id' } },
    { name: 'day', type: 'text', required: true, index: true, admin: { description: 'YYYY-MM-DD (Lagos time)' } },
    { name: 'count', type: 'number', required: true, defaultValue: 0 },
  ],
}
