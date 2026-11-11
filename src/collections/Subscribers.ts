import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access'

export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  admin: {
    useAsTitle: 'email',
    group: 'Inbox',
    defaultColumns: ['email', 'active', 'source', 'lastDigestAt', 'createdAt'],
    description:
      'Newsletter sign-ups from people without a member account. They get the daily digest of new stories and a note when a magazine issue comes out. Untick "Active" to stop emailing someone.',
    components: {
      beforeListTable: ['@/components/admin/MailingTools#MailingTools'],
    },
  },
  defaultSort: '-createdAt',
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true },
    { name: 'active', type: 'checkbox', defaultValue: true },
    { name: 'source', type: 'text', admin: { readOnly: true, description: 'Where they signed up.' } },
    {
      name: 'lastDigestAt',
      label: 'Last digest',
      type: 'date',
      index: true,
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'lastNotifiedIssue',
      type: 'relationship',
      relationTo: 'issues',
      admin: { readOnly: true, description: 'The latest issue this person has been emailed about.' },
    },
  ],
}
