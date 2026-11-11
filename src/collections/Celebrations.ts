import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access'
import { celebrationDecisionEmail, sendEmail } from '../lib/email'
import { plainTextToLexical } from '../lib/lexical'
import { revalidate } from '../lib/revalidate'

export const CELEBRATION_KINDS = [
  { label: 'Birthday', value: 'birthday' },
  { label: 'Wedding', value: 'wedding' },
  { label: 'Graduation', value: 'graduation' },
  { label: 'Promotion', value: 'promotion' },
  { label: 'Anniversary', value: 'anniversary' },
  { label: 'Retirement', value: 'retirement' },
  { label: 'Tribute', value: 'tribute' },
] as const

/**
 * Celebration notices sent in by members. Approving one publishes it as a story in the
 * Celebrations section (tagged with its kind) and emails the member; declining just emails them.
 */
export const Celebrations: CollectionConfig = {
  slug: 'celebrations',
  labels: { singular: 'Celebration notice', plural: 'Celebration notices' },
  admin: {
    useAsTitle: 'headline',
    group: 'Community',
    defaultColumns: ['headline', 'kind', 'member', 'status', 'createdAt'],
    description:
      'Notices sent in by members. Set the status to Approved to publish it as a story in Celebrations (you can tidy the wording first), or Declined.',
    hidden: ({ user }) => (user as { role?: string } | null)?.role !== 'admin',
  },
  defaultSort: '-createdAt',
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Waiting for approval', value: 'pending' },
        { label: 'Approved (published)', value: 'approved' },
        { label: 'Declined', value: 'declined' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'member', type: 'relationship', relationTo: 'members', admin: { position: 'sidebar', readOnly: true } },
    {
      type: 'row',
      fields: [
        { name: 'kind', type: 'select', required: true, options: [...CELEBRATION_KINDS] },
        { name: 'celebrant', label: "Celebrant's name", type: 'text', required: true },
        { name: 'date', type: 'date' },
      ],
    },
    {
      name: 'headline',
      type: 'text',
      admin: { description: 'Filled in automatically, e.g. "Happy birthday, Ada". Edit before approving if you like.' },
    },
    { name: 'message', type: 'textarea', required: true, maxLength: 3000 },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    {
      name: 'declineReason',
      label: 'Note to the member (if declining)',
      type: 'textarea',
      admin: { condition: (d) => d?.status === 'declined' },
    },
    { name: 'story', type: 'relationship', relationTo: 'posts', admin: { position: 'sidebar', readOnly: true } },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (!data.headline && data.celebrant) {
          const name = String(data.celebrant).trim()
          const lines: Record<string, string> = {
            birthday: `Happy birthday, ${name}`,
            wedding: `${name} tie the knot`,
            graduation: `Congratulations, ${name}, on your graduation`,
            promotion: `Congratulations, ${name}, on your promotion`,
            anniversary: `Happy anniversary, ${name}`,
            retirement: `${name} retires`,
            tribute: `In memory of ${name}`,
          }
          data.headline = lines[data.kind as string] ?? name
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        const changed = doc.status !== previousDoc?.status
        if (!changed) return
        const member =
          doc.member && typeof doc.member === 'object'
            ? doc.member
            : doc.member
              ? await req.payload.findByID({ collection: 'members', id: doc.member, depth: 0, req }).catch(() => null)
              : null

        if (doc.status === 'approved' && !doc.story) {
          const section = await req.payload.find({ collection: 'sections', where: { slug: { equals: 'celebrations' } }, limit: 1, depth: 0, req })
          const sectionId = section.docs[0]?.id
          if (!sectionId) {
            req.payload.logger.error('No "celebrations" section, so the notice could not be published.')
            return
          }
          const tagName = doc.kind === 'tribute' ? 'Tributes' : String(doc.kind).replace(/^\w/, (c: string) => c.toUpperCase())
          const tag = await req.payload.find({
            collection: 'tags',
            where: { and: [{ section: { equals: sectionId } }, { name: { equals: tagName } }] },
            limit: 1,
            depth: 0,
            req,
          })
          const photoId = doc.photo && typeof doc.photo === 'object' ? doc.photo.id : doc.photo
          const story = await req.payload.create({
            collection: 'posts',
            req,
            data: {
              title: doc.headline,
              excerpt: String(doc.message).replace(/\s+/g, ' ').slice(0, 260),
              body: plainTextToLexical(doc.message) as never,
              cover: photoId ?? undefined,
              section: sectionId,
              tags: tag.docs[0] ? [tag.docs[0].id] : [],
              storyType: 'news',
              bylineName: member?.name ? `Shared by ${member.name}` : 'LASU Champion',
              publishedAt: new Date().toISOString(),
              notifyMembers: false,
              _status: 'published',
            },
          })
          await req.payload.update({ collection: 'celebrations', id: doc.id, data: { story: story.id }, req, context: { skipEmail: true } })
          revalidate('/', '/celebrations')
          if (member?.email) {
            await sendEmail(celebrationDecisionEmail(member.email, member.name, true, `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/${story.slug}`)).catch(
              () => null,
            )
          }
        }
        if (doc.status === 'declined' && member?.email) {
          await sendEmail(celebrationDecisionEmail(member.email, member.name, false, undefined, doc.declineReason)).catch(() => null)
        }
      },
    ],
  },
}
