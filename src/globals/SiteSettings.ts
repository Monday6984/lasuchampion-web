import { ValidationError, type GlobalConfig } from 'payload'

import { anyone, isAdmin } from '../access'
import { revalidateAll } from '../lib/revalidate'
import { resolveChannelId } from '../lib/youtube'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site settings',
  admin: {
    group: 'Settings',
    hidden: ({ user }) => (user as { role?: string } | null)?.role !== 'admin',
  },
  access: { read: anyone, update: isAdmin },
  fields: [
    {
      // Set once the starting content has been loaded (src/lib/defaults.ts), so it is never re-added.
      name: 'defaultsLoaded',
      type: 'checkbox',
      defaultValue: false,
      admin: { hidden: true },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Homepage',
          fields: [
            {
              name: 'showTicker',
              label: 'Show the "Latest" headline ticker in the top bar',
              type: 'checkbox',
              defaultValue: true,
            },
            {
              name: 'tagline',
              type: 'text',
              defaultValue: 'The Foremost Inter-Campus News Magazine',
              admin: { description: 'Shown under the logo in search results and when links are shared.' },
            },
            {
              type: 'row',
              fields: [
                { name: 'ambassadorsOnHomepage', label: 'Show ambassador quotes on the homepage', type: 'checkbox', defaultValue: true },
                { name: 'celebrationsOnHomepage', label: 'Show the Celebrations wall on the homepage', type: 'checkbox', defaultValue: true },
              ],
            },
          ],
        },
        {
          label: 'About',
          fields: [
            {
              name: 'mission',
              type: 'textarea',
              admin: { description: 'Who LASU Champion Press Club is and what it does, in two or three sentences. Shown at the top of the About page.' },
            },
            { name: 'history', type: 'textarea', admin: { description: 'When the club was founded and its story so far. Paragraphs separated by a blank line.' } },
            {
              name: 'currentExcoSession',
              label: 'Current Exco session',
              type: 'text',
              defaultValue: '2026/2027',
              admin: {
                description:
                  'Excos with this session show as the current executives on the About page; every other session is listed under Past Executives.',
              },
            },
            { name: 'ambassadorsIntro', label: 'Ambassadors page intro', type: 'textarea' },
          ],
        },
        {
          label: 'Advertise page',
          fields: [
            {
              name: 'partnerIntro',
              label: 'Intro',
              type: 'textarea',
              defaultValue:
                'LASU Champion reaches students, staff, alumni and the community around Lagos State University: on the website, in the magazine and on Champion TV.',
            },
            {
              name: 'audience',
              label: 'Audience figures',
              type: 'array',
              maxRows: 4,
              admin: { description: 'Shown as figures on the Advertise page. Leave empty to hide the block.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'value', type: 'text', required: true, admin: { description: 'e.g. 45k' } },
                    { name: 'label', type: 'text', required: true, admin: { description: 'e.g. Monthly page views' } },
                  ],
                },
              ],
            },
            {
              name: 'adOptions',
              label: 'Ways to advertise',
              type: 'array',
              maxRows: 6,
              fields: [
                { name: 'title', type: 'text', required: true },
                { name: 'blurb', type: 'textarea', required: true, maxLength: 220 },
              ],
            },
            { name: 'partnersEmail', label: 'Advertising email', type: 'email' },
            { name: 'whatsapp', label: 'WhatsApp number for adverts', type: 'text', admin: { description: 'With country code, e.g. +234 803 000 0000' } },
            { name: 'replyTime', type: 'text', defaultValue: '2 working days' },
            { name: 'mediaKit', label: 'Rate card / media kit (PDF)', type: 'upload', relationTo: 'media' },
          ],
        },
        {
          label: 'Ad slots',
          fields: [
            {
              name: 'ads',
              type: 'array',
              admin: {
                description:
                  'Paid ads. Only ticked ads inside their dates are shown; if several run in the same place they take turns. When none is running, LASU Champion\'s own "Advertise with us" banner shows instead.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'advertiser', type: 'text', required: true },
                    {
                      name: 'placement',
                      type: 'select',
                      required: true,
                      options: [
                        { label: 'Homepage banner', value: 'home' },
                        { label: 'In stories', value: 'article' },
                        { label: 'Sidebar (section pages)', value: 'sidebar' },
                      ],
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'image',
                      label: 'Banner image',
                      type: 'upload',
                      relationTo: 'media',
                      required: true,
                      filterOptions: { mimeType: { contains: 'image' } },
                      admin: {
                        description:
                          'Homepage: 1940 × 500 px. In stories: 1456 × 180 px. Sidebar: 600 × 500 px. Shown in full, never cropped.',
                      },
                    },
                    {
                      name: 'mobileImage',
                      label: 'Phone version (optional)',
                      type: 'upload',
                      relationTo: 'media',
                      filterOptions: { mimeType: { contains: 'image' } },
                      admin: { description: 'Shown on phones instead: 600 × 500 px works well.' },
                    },
                  ],
                },
                { name: 'link', type: 'text', required: true, admin: { description: 'Where a click goes, e.g. https://advertiser.com' } },
                {
                  type: 'row',
                  fields: [
                    { name: 'startDate', type: 'date' },
                    { name: 'endDate', type: 'date' },
                    { name: 'active', type: 'checkbox', defaultValue: true },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Emails',
          fields: [
            {
              name: 'weeklyDigest',
              label: 'Send the daily digest of new stories',
              type: 'checkbox',
              defaultValue: true,
              admin: {
                description:
                  'Every evening, members on "Daily digest" and newsletter subscribers get one email listing the day\'s new stories. Nothing is sent on days with no new stories.',
              },
            },
            {
              name: 'commentWords',
              label: 'Hold comments containing these words for review',
              type: 'text',
              hasMany: true,
              admin: { description: 'One word or phrase per entry. Matching comments wait in Comments until an admin makes them visible.' },
            },
          ],
        },
        {
          label: 'View counts',
          fields: [
            {
              name: 'minViewsShown',
              label: 'Hide view counts below',
              type: 'number',
              min: 0,
              defaultValue: 50,
              admin: {
                description: 'Stories and magazine issues with fewer views than this show no count at all. The admin always shows the exact numbers.',
              },
            },
          ],
        },
        {
          label: 'Champion TV',
          fields: [
            {
              name: 'youtubeChannel',
              label: 'YouTube channel link',
              type: 'text',
              defaultValue: 'https://www.youtube.com/@LASUChampionTV',
              admin: { description: 'Champion TV and the homepage strip show the newest videos from this channel automatically.' },
            },
            { name: 'youtubeChannelId', type: 'text', admin: { hidden: true } },
            { name: 'tvOnHomepage', label: 'Show the newest videos on the homepage', type: 'checkbox', defaultValue: true },
          ],
        },
        {
          label: 'Contact & social',
          fields: [
            { name: 'contactEmail', type: 'email', defaultValue: 'lasuchampion@gmail.com' },
            {
              name: 'phones',
              label: 'Phone numbers',
              type: 'array',
              maxRows: 4,
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'number', type: 'text', required: true },
                    { name: 'label', type: 'text' },
                  ],
                },
              ],
            },
            { name: 'address', label: 'Office address', type: 'textarea' },
            {
              name: 'social',
              type: 'array',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'label', type: 'text', required: true, admin: { description: 'e.g. Instagram' } },
                    { name: 'url', type: 'text', required: true },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      // A new channel link: look up its channel ID once, here, so the site can read its video feed.
      async ({ data, originalDoc, req }) => {
        const link = typeof data.youtubeChannel === 'string' ? data.youtubeChannel.trim() : ''
        if (!link) return { ...data, youtubeChannel: '', youtubeChannelId: '' }
        if (link === originalDoc?.youtubeChannel && originalDoc?.youtubeChannelId) return data
        const id = await resolveChannelId(link)
        if (!id) {
          // On first start the lookup may fail (no network): keep the link and try again next save.
          if (req.context?.loadingDefaults) return { ...data, youtubeChannel: link }
          throw new ValidationError({
            global: 'site-settings',
            req,
            errors: [{ path: 'youtubeChannel', message: "Couldn't find that YouTube channel. Paste the channel's link, e.g. https://www.youtube.com/@LASUChampionTV" }],
          })
        }
        return { ...data, youtubeChannel: link, youtubeChannelId: id }
      },
    ],
    afterChange: [() => revalidateAll()],
  },
}
