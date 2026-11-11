import { ValidationError, type CollectionConfig } from 'payload'

import { adminOrOwnStory, isAdminField, isAdminUser, isStaff, publishedOrStaff } from '../access'
import { slugField } from '../fields/slug'
import { viewCountField } from '../fields/viewCount'
import { notifyInstantSubscribers } from '../lib/alerts'
import { RESERVED_SLUGS } from '../lib/reserved'
import { revalidate } from '../lib/revalidate'
import { readingMinutes } from '../lib/text'

/**
 * Stories. Each lives at the site root (/<slug>), the same address shape as the old WordPress site.
 * Reporters write, edit and publish their own; admins can change or unpublish any of them.
 */
export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Story', plural: 'Stories' },
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', 'section', 'author', 'publishedAt', '_status', 'views'],
    description: 'Every story belongs to one section. Publish with a future "Publish on" date to schedule it.',
    listSearchableFields: ['title', 'excerpt'],
    preview: (doc) => `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/${doc.slug}`,
  },
  defaultSort: '-publishedAt',
  access: {
    read: publishedOrStaff,
    create: isStaff,
    update: adminOrOwnStory,
    delete: adminOrOwnStory,
  },
  versions: { drafts: true, maxPerDoc: 25 },
  fields: [
    { name: 'title', label: 'Headline', type: 'text', required: true },
    {
      name: 'excerpt',
      label: 'Standfirst',
      type: 'textarea',
      required: true,
      maxLength: 280,
      admin: { description: 'One or two sentences under the headline, on cards and in search results.' },
    },
    {
      name: 'cover',
      label: 'Featured image',
      type: 'upload',
      relationTo: 'media',
      filterOptions: { mimeType: { contains: 'image' } },
      admin: { description: 'Every story needs one. Add the caption and photo credit on the image itself.' },
    },
    { name: 'body', type: 'richText', required: true },
    slugField(),
    {
      name: 'publishedAt',
      label: 'Publish on',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      index: true,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'A future date schedules the story. It stays hidden until then.',
      },
    },
    { name: 'section', type: 'relationship', relationTo: 'sections', required: true, admin: { position: 'sidebar' } },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
      admin: { position: 'sidebar', description: 'Labels inside the section, e.g. ASUU, Senate, Birthday.' },
      // Only offer tags that belong to the chosen section.
      filterOptions: ({ siblingData }) => {
        const section = (siblingData as { section?: unknown })?.section
        const id = section && typeof section === 'object' ? (section as { id: number }).id : section
        return id ? { section: { equals: id } } : true
      },
    },
    {
      name: 'storyType',
      label: 'Story type',
      type: 'select',
      required: true,
      defaultValue: 'news',
      options: [
        { label: 'News', value: 'news' },
        { label: 'Feature', value: 'feature' },
        { label: 'Opinion', value: 'opinion' },
        { label: 'Interview', value: 'interview' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'author',
      label: 'Reporter',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar', description: 'Set to you automatically. Only admins can change it.' },
      access: { update: isAdminField },
    },
    {
      name: 'bylineName',
      label: 'Byline (when not a staff reporter)',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Optional, e.g. a guest writer or "LASU Champion". Shown instead of the reporter when filled in.',
      },
    },
    {
      name: 'featured',
      label: 'Lead story on the homepage',
      type: 'checkbox',
      defaultValue: false,
      access: { update: isAdminField },
      admin: { position: 'sidebar', description: 'The newest ticked story leads the homepage. Untick to fall back to the newest story.' },
    },
    {
      name: 'readingTime',
      type: 'number',
      admin: { position: 'sidebar', description: 'Minutes. Leave empty to estimate from the text.' },
    },
    {
      name: 'notifyMembers',
      label: 'Email members about this story',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Members on instant alerts are emailed when it goes live; everyone else gets it in the daily digest.',
      },
    },
    { name: 'alertsSent', type: 'checkbox', defaultValue: false, admin: { hidden: true } },
    viewCountField('post', 'Views'),
    {
      name: 'earlierViews',
      label: 'Views on the old website',
      type: 'number',
      min: 0,
      admin: { position: 'sidebar', description: 'Added to the count shown on the site.' },
    },
    {
      name: 'legacyPath',
      label: 'Old WordPress address',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Set by the WordPress importer. Visitors to this old address are sent to this story.',
        condition: (data) => Boolean(data?.legacyPath),
      },
    },
    { name: 'wpId', type: 'text', index: true, admin: { hidden: true } },
  ],
  hooks: {
    beforeValidate: [
      ({ data, req }) => {
        if (data?.slug && RESERVED_SLUGS.has(data.slug)) {
          throw new ValidationError({
            collection: 'posts',
            req,
            errors: [{ path: 'slug', message: `"${data.slug}" is used by another page on the site. Pick a different address.` }],
          })
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data, operation, req }) => {
        // The reporter who creates a story is its byline (admins can reassign it).
        if (operation === 'create' && !data.author && req.user?.collection === 'users') data.author = req.user.id
        if (operation === 'create' && req.user?.collection === 'users' && !isAdminUser(req.user)) data.author = req.user.id
        if (!data.readingTime && data.body) data.readingTime = readingMinutes(data.body)
        // A story's address can't be the same as a section's.
        if (data.slug) {
          const clash = await req.payload.count({ collection: 'sections', where: { slug: { equals: data.slug } }, req })
          if (clash.totalDocs) data.slug = `${data.slug}-story`
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, req, context }) => {
        revalidate('/', `/${doc.slug}`, '/[...path]', '/rss.xml', '/sitemap.xml', '/reporters/[slug]', '/search')
        if (context?.skipAlerts) return
        // Members on instant alerts hear about a story as soon as it is live.
        if (doc._status === 'published' && doc.notifyMembers && !doc.alertsSent && Date.parse(doc.publishedAt) <= Date.now()) {
          try {
            await notifyInstantSubscribers(req.payload, doc)
          } catch (err) {
            req.payload.logger.error({ err, msg: 'Instant alerts failed' })
          }
        }
      },
    ],
    afterDelete: [() => revalidate('/', '/[...path]')],
  },
}
