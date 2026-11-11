import type { CollectionConfig, TextField } from 'payload'

import { anyone, isAdmin } from '../access'
import { slugField } from '../fields/slug'
import { revalidate } from '../lib/revalidate'

/**
 * Finer labels inside a section (ASUU under Aluta, Birthday under Celebrations…).
 * Each tag has a page at /<section>/<tag> and shows as a filter chip on its section page.
 */
export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: {
    useAsTitle: 'name',
    group: 'Content',
    defaultColumns: ['name', 'section', 'slug'],
    description: 'Labels inside a section. Reporters pick from these; admins add new ones.',
  },
  defaultSort: 'name',
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'section', type: 'relationship', relationTo: 'sections', required: true },
    {
      ...(slugField('name') as TextField),
      unique: false,
      admin: { position: 'sidebar', description: 'Used in the address /<section>/<tag>. Leave empty to create it from the name.' },
    },
    {
      name: 'legacySlugs',
      label: 'Old category addresses',
      type: 'text',
      hasMany: true,
      admin: {
        position: 'sidebar',
        description: 'Old WordPress category slugs that should redirect here, e.g. "religion-news".',
      },
    },
  ],
  indexes: [{ fields: ['section', 'slug'], unique: true }],
  hooks: {
    afterChange: [() => revalidate('/', '/[...path]')],
  },
}
