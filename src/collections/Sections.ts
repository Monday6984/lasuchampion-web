import { ValidationError, type CollectionConfig } from 'payload'

import { anyone, isAdmin } from '../access'
import { slugField } from '../fields/slug'
import { RESERVED_SLUGS } from '../lib/reserved'
import { revalidateAll } from '../lib/revalidate'

/** The main shelves: Campus, Aluta, Special Reports… Each has its own page at /<slug>. */
export const Sections: CollectionConfig = {
  slug: 'sections',
  admin: {
    useAsTitle: 'name',
    group: 'Content',
    defaultColumns: ['name', 'slug', 'menuOrder', 'inMainMenu'],
    description: 'The main sections of the site. Every story belongs to one. Tags (below) are the finer labels inside a section.',
  },
  defaultSort: 'menuOrder',
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField('name'),
    { name: 'description', type: 'textarea', maxLength: 240, admin: { description: 'One line shown at the top of the section page.' } },
    {
      type: 'row',
      fields: [
        { name: 'menuOrder', type: 'number', defaultValue: 10, admin: { description: 'Lower numbers come first.' } },
        {
          name: 'inMainMenu',
          label: 'Show in the main menu',
          type: 'checkbox',
          defaultValue: true,
          admin: { description: 'Unticked sections sit under "More".' },
        },
        {
          name: 'onHomepage',
          label: 'Show as a column on the homepage',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Up to three sections are shown side by side on the homepage.' },
        },
      ],
    },
    {
      name: 'legacySlugs',
      label: 'Old category addresses',
      type: 'text',
      hasMany: true,
      admin: { position: 'sidebar', description: 'Old WordPress category slugs that should redirect to this section, e.g. "aluta-unionism".' },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, req }) => {
        if (data?.slug && RESERVED_SLUGS.has(data.slug)) {
          throw new ValidationError({
            collection: 'sections',
            req,
            errors: [{ path: 'slug', message: `"${data.slug}" is used by another page. Pick a different address.` }],
          })
        }
        return data
      },
    ],
    afterChange: [() => revalidateAll()],
    afterDelete: [() => revalidateAll()],
  },
}
