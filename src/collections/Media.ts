import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isStaff } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Content',
    description: 'Images and magazine PDFs. Add a caption and photo credit to story images here; they show under the picture.',
  },
  access: {
    read: anyone,
    // Members' photos (profile pictures, celebration notices) are saved by the site's own forms.
    create: isStaff,
    update: isStaff,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      admin: { description: 'Describe the image for screen readers and search engines. Not needed for PDFs.' },
    },
    { name: 'caption', type: 'text' },
    { name: 'credit', type: 'text' },
    // Where an imported image came from, so a re-run of the WordPress import reuses it.
    { name: 'sourceUrl', type: 'text', index: true, admin: { hidden: true } },
  ],
  upload: {
    mimeTypes: ['image/*', 'application/pdf'],
    // Resized copies are made once on upload, so pages never need paid image optimisation.
    imageSizes: [
      { name: 'thumb', width: 320, height: 240, position: 'centre' },
      { name: 'card', width: 800, height: 500, position: 'centre' },
      { name: 'hero', width: 1600, height: undefined },
      { name: 'cover', width: 720, height: 960, position: 'centre' },
    ],
    adminThumbnail: 'card',
    focalPoint: true,
  },
}
