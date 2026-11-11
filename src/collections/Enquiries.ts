import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access'
import { sendEnquiryAlert } from '../lib/email'

export const Enquiries: CollectionConfig = {
  slug: 'enquiries',
  admin: {
    useAsTitle: 'name',
    group: 'Inbox',
    defaultColumns: ['name', 'type', 'organisation', 'status', 'createdAt'],
    description: 'Messages from the Contact and Advertise pages, including story tips.',
  },
  defaultSort: '-createdAt',
  access: {
    read: isAdmin,
    create: isAdmin, // the public forms save through server actions
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Replied', value: 'replied' },
        { label: 'Closed', value: 'closed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Advertising', value: 'advertising' },
        { label: 'Story tip', value: 'tip' },
        { label: 'General', value: 'general' },
        { label: 'Partnership', value: 'partnership' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'organisation', type: 'text' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'email', type: 'email', required: true },
        { name: 'phone', label: 'Phone / WhatsApp', type: 'text' },
      ],
    },
    { name: 'subject', type: 'text' },
    { name: 'message', type: 'textarea', required: true },
    { name: 'notes', label: 'Internal notes', type: 'textarea', admin: { description: 'Only staff see this.' } },
  ],
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return
        try {
          await sendEnquiryAlert(doc)
        } catch (err) {
          req.payload.logger.error({ err, msg: 'Enquiry alert email failed' })
        }
      },
    ],
  },
}
