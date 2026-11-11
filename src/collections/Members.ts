import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminUser } from '../access'
import { slugify } from '../fields/slug'
import { escape, layout, siteUrl } from '../lib/email'

/**
 * Readers with accounts (the old BuddyPress members). They sign up and log in on the public site
 * (never the admin), keep a profile, comment on stories, save stories, choose their email alerts
 * and submit celebration notices. Their login is kept in its own cookie (see src/lib/member.ts),
 * separate from staff logins.
 */
export const Members: CollectionConfig = {
  slug: 'members',
  admin: {
    useAsTitle: 'name',
    group: 'People',
    defaultColumns: ['name', 'email', 'memberType', 'faculty', 'alerts', 'blocked', 'createdAt'],
    description:
      'Readers with accounts. Tick "Blocked" to stop someone commenting and submitting celebrations. Passwords are never shown.',
    hidden: ({ user }) => (user as { role?: string } | null)?.role !== 'admin',
  },
  defaultSort: '-createdAt',
  auth: {
    tokenExpiration: 60 * 60 * 24 * 30,
    maxLoginAttempts: 8,
    lockTime: 15 * 60 * 1000,
    forgotPassword: {
      // Long enough for set-password invites opened days later; an expired link points to "Ask for a new link".
      expiration: 3 * 24 * 60 * 60 * 1000,
      generateEmailSubject: () => 'Set your LASU Champion password',
      generateEmailHTML: (args) => {
        const token = (args as { token?: string })?.token ?? ''
        const name = ((args as { user?: { name?: string } })?.user?.name ?? '').split(' ')[0]
        const link = `${siteUrl()}/reset-password?token=${encodeURIComponent(token)}`
        return layout(`<h1 style="margin:0 0 12px;font-size:24px">Set your password</h1>
<p style="margin:0 0 16px">Hi${name ? ` ${escape(name)}` : ''}, use the button below to choose a new password for your LASU Champion account. The link works for 3 days.</p>
<a href="${link}" style="display:inline-block;background:#C8191E;color:#FFFFFF;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:4px">Choose a password</a>
<p style="margin:24px 0 0;font-size:13px;color:#4A5160">If you didn't ask for this, you can ignore this email.</p>`)
      },
    },
  },
  access: {
    // Everything members do goes through the site's own server actions (which check the member),
    // so the REST API is admin-only.
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
    admin: () => false,
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'username',
          type: 'text',
          unique: true,
          index: true,
          admin: { description: 'Public profile address: /members/<username>.' },
        },
      ],
    },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    {
      type: 'row',
      fields: [
        {
          name: 'memberType',
          label: 'I am',
          type: 'select',
          defaultValue: 'student',
          options: [
            { label: 'Student', value: 'student' },
            { label: 'Alumnus / alumna', value: 'alumni' },
            { label: 'Staff', value: 'staff' },
            { label: 'Friend of LASU', value: 'friend' },
          ],
        },
        { name: 'faculty', type: 'text' },
        { name: 'department', type: 'text' },
        { name: 'level', label: 'Level or graduation year', type: 'text', admin: { description: 'e.g. 300L or 2019' } },
      ],
    },
    { name: 'bio', type: 'textarea', maxLength: 400 },
    {
      name: 'alerts',
      label: 'New-story emails',
      type: 'select',
      required: true,
      defaultValue: 'digest',
      options: [
        { label: 'Daily digest', value: 'digest' },
        { label: 'Instant alerts', value: 'instant' },
        { label: 'Off', value: 'off' },
      ],
    },
    { name: 'magazineEmails', label: 'Email me new magazine issues', type: 'checkbox', defaultValue: true },
    { name: 'replyEmails', label: 'Email me replies to my comments', type: 'checkbox', defaultValue: true },
    { name: 'savedStories', type: 'relationship', relationTo: 'posts', hasMany: true, admin: { readOnly: true } },
    {
      name: 'blocked',
      type: 'checkbox',
      defaultValue: false,
      access: { update: ({ req }) => isAdminUser(req.user) },
      admin: { position: 'sidebar', description: 'Stops this member commenting and submitting celebrations.' },
    },
    { name: 'lastDigestAt', type: 'date', index: true, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'lastNotifiedIssue', type: 'relationship', relationTo: 'issues', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'mustSetPassword', type: 'checkbox', defaultValue: false, admin: { hidden: true } },
    { name: 'invitedAt', label: 'Set-password email sent', type: 'date', index: true, admin: { readOnly: true, position: 'sidebar', condition: (d) => Boolean(d?.invitedAt) } },
    { name: 'wpUserId', type: 'text', index: true, admin: { hidden: true } },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, originalDoc }) => {
        if (data.email) data.email = String(data.email).trim().toLowerCase()
        // Every member gets a username for their public profile address.
        if (!data.username && !originalDoc?.username) {
          const base = slugify(data.name || String(data.email ?? '').split('@')[0] || 'member').slice(0, 30) || 'member'
          let candidate = base
          for (let i = 2; i < 200; i++) {
            const taken = await req.payload.count({ collection: 'members', where: { username: { equals: candidate } }, req })
            if (!taken.totalDocs) break
            candidate = `${base}-${i}`
          }
          data.username = candidate
        } else if (data.username) {
          data.username = slugify(String(data.username)).slice(0, 40)
        }
        return data
      },
    ],
  },
}
