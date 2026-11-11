import { APIError, type CollectionConfig } from 'payload'

import { isAdmin, isAdminField, isAdminUser, isStaff, isStaffUser } from '../access'
import { slugField } from '../fields/slug'
import { revalidate } from '../lib/revalidate'

/**
 * Staff: admins and reporters. Each staff member is also a byline with a public author page
 * (/reporters/<slug>). Reporters write, edit and publish their own stories; admins run everything.
 * A reporter who graduates or leaves is set to inactive: they can no longer log in, but their
 * author page and bylines stay.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Staff member', plural: 'Staff (admins & reporters)' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'active', 'faculty'],
    group: 'People',
    description:
      'Admins and reporters. Reporters write and publish their own stories. Untick "Active" when someone leaves: they can no longer log in, but their stories and author page stay.',
  },
  auth: { tokenExpiration: 60 * 60 * 24 * 7 },
  access: {
    read: isStaff,
    // The very first user can always be created (Payload's first-user screen); after that, admins only.
    create: isAdmin,
    update: ({ req, id }) => isAdminUser(req.user) || (isStaffUser(req.user) && req.user?.id === id),
    delete: isAdmin,
    admin: ({ req }) => isStaffUser(req.user),
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'role',
          type: 'select',
          required: true,
          defaultValue: 'reporter',
          options: [
            { label: 'Admin — everything', value: 'admin' },
            { label: 'Reporter — writes and publishes own stories', value: 'reporter' },
          ],
          access: { update: isAdminField },
          saveToJWT: true,
        },
      ],
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      access: { update: isAdminField },
      admin: { position: 'sidebar', description: 'Untick to stop this person logging in. Their stories stay published.' },
    },
    slugField('name'),
    { name: 'photo', type: 'upload', relationTo: 'media', filterOptions: { mimeType: { contains: 'image' } } },
    {
      type: 'row',
      fields: [
        { name: 'faculty', type: 'text' },
        { name: 'department', type: 'text' },
        { name: 'position', type: 'text', admin: { description: 'Shown under the name, e.g. "Reporter", "Editor-in-Chief".' } },
      ],
    },
    { name: 'bio', type: 'textarea', maxLength: 600 },
    {
      name: 'social',
      type: 'array',
      maxRows: 5,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', required: true, admin: { description: 'e.g. X, Instagram, LinkedIn' } },
            { name: 'url', type: 'text', required: true },
          ],
        },
      ],
    },
    { name: 'wpAuthorId', type: 'text', index: true, admin: { hidden: true } },
  ],
  hooks: {
    beforeChange: [
      // The first account created on an empty site is always an admin.
      async ({ data, operation, req }) => {
        if (operation === 'create') {
          const count = await req.payload.count({ collection: 'users', req, overrideAccess: true })
          if (count.totalDocs === 0) {
            data.role = 'admin'
            data.active = true
          }
        }
        return data
      },
    ],
    beforeLogin: [
      ({ user }) => {
        if (user && (user as { active?: boolean | null }).active === false) {
          throw new APIError('This account has been switched off. Ask an admin to turn it back on.', 403, null, true)
        }
      },
    ],
    afterChange: [({ doc }) => revalidate('/reporters', `/reporters/${doc.slug}`)],
  },
}
