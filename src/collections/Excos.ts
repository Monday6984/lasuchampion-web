import type { CollectionConfig } from 'payload'

import { anyone, isAdmin } from '../access'
import { revalidate } from '../lib/revalidate'

/**
 * Press Club executives, one entry per person per session. The About page shows the session set in
 * Site settings → About as the current Excos; earlier sessions appear under "Past Executives".
 * Electing a new Exco = add the new people with the new session, then change the current session.
 */
export const Excos: CollectionConfig = {
  slug: 'excos',
  labels: { singular: 'Exco member', plural: 'Excos' },
  admin: {
    useAsTitle: 'name',
    group: 'People',
    defaultColumns: ['name', 'office', 'session', 'order'],
    description: 'Executives by session (e.g. 2026/2027). Set the current session in Site settings → About.',
    hidden: ({ user }) => (user as { role?: string } | null)?.role !== 'admin',
  },
  defaultSort: ['-session', 'order'],
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'office', type: 'text', required: true, admin: { description: 'e.g. President, Editor-in-Chief' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'session', type: 'text', required: true, index: true, admin: { description: 'e.g. 2026/2027' } },
        { name: 'order', type: 'number', defaultValue: 10, admin: { description: 'Lower numbers show first (President = 1).' } },
      ],
    },
    { name: 'faculty', label: 'Faculty / department', type: 'text' },
    { name: 'photo', type: 'upload', relationTo: 'media', filterOptions: { mimeType: { contains: 'image' } } },
  ],
  hooks: { afterChange: [() => revalidate('/about')], afterDelete: [() => revalidate('/about')] },
}
