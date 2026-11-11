import type { CollectionConfig } from 'payload'

import { anyone, isAdmin } from '../access'
import { revalidate } from '../lib/revalidate'

/** People who champion the Press Club: shown on /ambassadors, and (when ticked) quoted on the homepage. */
export const Ambassadors: CollectionConfig = {
  slug: 'ambassadors',
  admin: {
    useAsTitle: 'name',
    group: 'People',
    defaultColumns: ['name', 'title', 'order', 'onHomepage'],
    hidden: ({ user }) => (user as { role?: string } | null)?.role !== 'admin',
  },
  defaultSort: 'order',
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'title', label: 'Title or affiliation', type: 'text' },
      ],
    },
    { name: 'photo', type: 'upload', relationTo: 'media', filterOptions: { mimeType: { contains: 'image' } } },
    { name: 'quote', label: 'What they say about LASU Champion', type: 'textarea', required: true, maxLength: 400 },
    { name: 'profile', label: 'Short profile', type: 'textarea', maxLength: 1200 },
    {
      type: 'row',
      fields: [
        { name: 'order', type: 'number', defaultValue: 10 },
        { name: 'onHomepage', label: 'Quote on the homepage', type: 'checkbox', defaultValue: true },
      ],
    },
  ],
  hooks: {
    afterChange: [() => revalidate('/', '/ambassadors')],
    afterDelete: [() => revalidate('/', '/ambassadors')],
  },
}
