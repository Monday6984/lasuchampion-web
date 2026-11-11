import type { CollectionConfig } from 'payload'

import { isAdmin, publishedOrStaff } from '../access'
import { slugField } from '../fields/slug'
import { viewCountField } from '../fields/viewCount'
import { revalidate } from '../lib/revalidate'

export const Issues: CollectionConfig = {
  slug: 'issues',
  labels: { singular: 'Magazine issue', plural: 'Magazine issues' },
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    hidden: ({ user }) => (user as { role?: string } | null)?.role !== 'admin',
    defaultColumns: ['issueNumber', 'title', 'releaseDate', '_status', 'views'],
    description:
      'Upload each issue as one PDF. Readers can read it online and, when ticked, download it. Publish with a future release date to schedule it; members and subscribers are emailed from that day.',
  },
  defaultSort: '-releaseDate',
  access: {
    read: publishedOrStaff,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  versions: { drafts: true, maxPerDoc: 10 },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'issueNumber', label: 'Issue no.', type: 'number', required: true, admin: { width: '25%' } },
        { name: 'title', type: 'text', required: true, admin: { width: '75%' } },
      ],
    },
    { name: 'summary', type: 'textarea', admin: { description: "What's inside, in one or two lines." } },
    {
      type: 'row',
      fields: [
        {
          name: 'cover',
          type: 'upload',
          relationTo: 'media',
          required: true,
          filterOptions: { mimeType: { contains: 'image' } },
        },
        {
          name: 'pdf',
          label: 'Magazine PDF',
          type: 'upload',
          relationTo: 'media',
          required: true,
          filterOptions: { mimeType: { equals: 'application/pdf' } },
          admin: { description: 'Export for screen (about 150 dpi) to keep it fast — ideally under 40 MB.' },
        },
      ],
    },
    {
      name: 'contents',
      label: 'In this issue',
      type: 'array',
      admin: { description: 'Shown under the reader; clicking a line jumps to that page.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'section', type: 'text', required: true },
            {
              name: 'page',
              type: 'number',
              required: true,
              min: 1,
              admin: { description: 'The page number printed in the magazine (the cover is page 1). Works the same whether the PDF has single pages or two-page spreads.' },
            },
          ],
        },
      ],
    },
    slugField(),
    {
      name: 'releaseDate',
      type: 'date',
      required: true,
      index: true,
      defaultValue: () => new Date().toISOString(),
      admin: { position: 'sidebar', description: 'A future date schedules the issue.' },
    },
    { name: 'allowDownload', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
    {
      name: 'notifySubscribers',
      label: 'Email members and subscribers on release',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'notificationsDone',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Ticked automatically once every subscriber has been emailed.',
      },
    },
    viewCountField('issue', 'Reads'),
    {
      name: 'earlierViews',
      label: 'Reads on the old website',
      type: 'number',
      min: 0,
      admin: {
        position: 'sidebar',
        description: 'Views on the old website, added to the count shown on the site. Filled in by Import → Old view counts, or type it in.',
      },
    },
    {
      name: 'legacyPath',
      label: 'Old website address',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'e.g. /3d-flip-book/america-evolves-at-250/ — visitors to this old address are sent to this issue.',
      },
    },
  ],
  hooks: {
    afterChange: [({ doc }) => revalidate('/', '/magazine', `/magazine/${doc.slug}`, '/sitemap.xml')],
    afterDelete: [() => revalidate('/', '/magazine')],
  },
}
