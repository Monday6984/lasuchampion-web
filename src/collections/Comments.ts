import type { CollectionConfig } from 'payload'

import { anyone, isAdmin } from '../access'
import { revalidate } from '../lib/revalidate'

/**
 * Members' comments on stories. Posted from the story page; visible straight away unless the
 * text trips the word filter (Site settings → Comments), in which case it waits for an admin.
 * Members can report a comment; reported comments are flagged here for admins.
 */
export const Comments: CollectionConfig = {
  slug: 'comments',
  admin: {
    useAsTitle: 'excerpt',
    group: 'Community',
    defaultColumns: ['excerpt', 'member', 'post', 'status', 'reportCount', 'createdAt'],
    description: 'Hide a comment by setting its status to Hidden. Block a member from Members. Reported comments show a report count.',
    hidden: ({ user }) => (user as { role?: string } | null)?.role !== 'admin',
    listSearchableFields: ['body'],
  },
  defaultSort: '-createdAt',
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'post', label: 'Story', type: 'relationship', relationTo: 'posts', required: true, index: true },
    { name: 'member', type: 'relationship', relationTo: 'members', index: true },
    {
      name: 'guestName',
      type: 'text',
      admin: { description: 'For comments imported from the old site whose writer has no member account.', condition: (d) => !d?.member },
    },
    { name: 'parent', label: 'Reply to', type: 'relationship', relationTo: 'comments' },
    { name: 'body', type: 'textarea', required: true, maxLength: 3000 },
    {
      name: 'excerpt',
      type: 'text',
      admin: { hidden: true },
      hooks: { beforeChange: [({ siblingData }) => String(siblingData.body ?? '').replace(/\s+/g, ' ').slice(0, 80)] },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'visible',
      index: true,
      options: [
        { label: 'Visible', value: 'visible' },
        { label: 'Waiting for review', value: 'pending' },
        { label: 'Hidden', value: 'hidden' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'reportCount', label: 'Reports', type: 'number', defaultValue: 0, index: true, admin: { position: 'sidebar', readOnly: true } },
    { name: 'reportedBy', type: 'relationship', relationTo: 'members', hasMany: true, admin: { position: 'sidebar', readOnly: true } },
    { name: 'wpCommentId', type: 'text', index: true, admin: { hidden: true } },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        const postId = typeof doc.post === 'object' ? doc.post?.id : doc.post
        if (!postId) return
        const post = await req.payload.findByID({ collection: 'posts', id: postId, depth: 0, req }).catch(() => null)
        if (post?.slug) revalidate(`/${post.slug}`)
      },
    ],
  },
}
