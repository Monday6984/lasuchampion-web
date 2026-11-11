/**
 * Email through Resend's HTTP API (free plan: 3,000 a month, 100 a day).
 * With no RESEND_API_KEY set, emails are skipped and logged, so local development works without it.
 */

export type Email = { to: string; subject: string; html: string; replyTo?: string; unsubscribe?: string }

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
const from = () => process.env.EMAIL_FROM ?? 'LASU Champion <no-reply@example.com>'
// Where readers' replies go (the sending address has no inbox).
const defaultReplyTo = () => process.env.EMAIL_REPLY_TO || undefined

const RED = '#C8191E'
const BLUE = '#116CB1'
const MUTED = '#4A5160'

export const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

async function resend(path: string, body: unknown) {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.info(`[email] RESEND_API_KEY not set — skipped ${path}`)
    return false
  }
  const res = await fetch(`https://api.resend.com${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
  return true
}

/** True when emails can actually be sent (Resend is connected). */
export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY)

const toPayload = (e: Email) => ({
  from: from(),
  to: [e.to],
  subject: e.subject,
  html: e.html,
  reply_to: e.replyTo ?? defaultReplyTo(),
  headers: e.unsubscribe ? { 'List-Unsubscribe': `<${e.unsubscribe}>` } : undefined,
})

export const sendEmail = (e: Email) => resend('/emails', toPayload(e))

/** Sends up to 100 emails in one request. */
export async function sendBatch(emails: Email[]) {
  for (let i = 0; i < emails.length; i += 100) await resend('/emails/batch', emails.slice(i, i + 100).map(toPayload))
  return emails.length > 0
}

export const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:${RED};color:#FFFFFF;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:4px">${label}</a>`

export const layout = (inner: string) => `<!doctype html><html><body style="margin:0;background:#F4F6F9;font-family:Arial,Helvetica,sans-serif;color:#14171C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#FFFFFF;border-radius:8px;border-top:4px solid ${RED}" cellpadding="0" cellspacing="0">
<tr><td style="padding:24px 32px 0"><a href="${siteUrl()}"><img src="${siteUrl()}/brand/lasu-champion-logo.png" alt="LASU Champion" width="72" height="77" style="display:block;border:0"></a></td></tr>
<tr><td style="padding:16px 32px 32px;font-size:16px;line-height:1.6">${inner}</td></tr></table>
<p style="font-size:12px;color:${MUTED}">LASU Champion · A publication of LASU Champion Press Club</p></td></tr></table></body></html>`

const footerNote = (why: string, unsubscribe?: string, manage = true) =>
  `<p style="margin:28px 0 0;font-size:12px;color:${MUTED}">${why}${
    manage ? ` <a href="${siteUrl()}/account?tab=alerts" style="color:${MUTED}">Change your email settings</a>` : ''
  }${unsubscribe ? ` · <a href="${unsubscribe}" style="color:${MUTED}">Unsubscribe</a>` : ''}</p>`

export async function sendEnquiryAlert(doc: {
  id: string | number
  type: string
  name: string
  organisation?: string | null
  email: string
  phone?: string | null
  subject?: string | null
  message: string
}) {
  const to = process.env.ENQUIRY_NOTIFY_EMAIL
  if (!to) return false
  const label = ({ advertising: 'advertising enquiry', tip: 'story tip', general: 'message', partnership: 'partnership enquiry' } as Record<string, string>)[doc.type] ?? 'message'
  const rows = [
    ['Name', doc.name],
    ['Organisation', doc.organisation ?? ''],
    ['Email', doc.email],
    ['Phone', doc.phone ?? ''],
    ['Subject', doc.subject ?? ''],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:${MUTED}">${k}</td><td>${escape(String(v))}</td></tr>`)
    .join('')
  return sendEmail({
    to,
    replyTo: doc.email,
    subject: `New ${label} from ${doc.name}`,
    html: layout(`<p style="margin:0 0 16px">A new ${label} came in from the website.</p>
<table role="presentation" style="font-size:15px;margin-bottom:16px">${rows}</table>
<p style="white-space:pre-line;margin:0 0 20px">${escape(doc.message)}</p>
<a href="${siteUrl()}/admin/collections/enquiries/${doc.id}" style="color:${RED};font-weight:bold">Open in the admin</a>`),
  })
}

export const issueEmail = (
  to: string,
  issue: { title: string; issueNumber: number; summary?: string | null; slug: string },
  unsubscribe?: string,
): Email => ({
  to,
  unsubscribe,
  subject: `New LASU Champion magazine: ${issue.title}`,
  html: layout(`<p style="margin:0 0 8px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:${RED};font-weight:bold">Issue ${issue.issueNumber} is out</p>
<h1 style="margin:0 0 12px;font-size:28px;line-height:1.1">${escape(issue.title)}</h1>
${issue.summary ? `<p style="margin:0 0 20px">${escape(issue.summary)}</p>` : ''}
${button(`${siteUrl()}/magazine/${issue.slug}`, 'Read it online')}
${footerNote("You're getting this because you follow LASU Champion.", unsubscribe, !unsubscribe)}`),
})

export const welcomeEmail = (to: string, name: string): Email => ({
  to,
  subject: 'Welcome to LASU Champion',
  html: layout(`<h1 style="margin:0 0 12px;font-size:26px;line-height:1.15">Welcome, ${escape(name.split(' ')[0] || name)}</h1>
<p style="margin:0 0 12px">Your LASU Champion account is ready. You can now comment on stories, save stories to read later and send in celebrations.</p>
<p style="margin:0 0 20px">We'll email you a daily digest of new stories. You can switch to instant alerts, or turn emails off, in your account.</p>
${button(`${siteUrl()}/account`, 'Go to your account')}`),
})

export const replyEmail = (
  to: string,
  name: string,
  replier: string,
  story: { title: string; slug: string },
  text: string,
): Email => ({
  to,
  subject: `${replier} replied to your comment`,
  html: layout(`<p style="margin:0 0 12px">Hi ${escape(name.split(' ')[0] || name)}, ${escape(replier)} replied to your comment on <strong>${escape(story.title)}</strong>:</p>
<blockquote style="margin:0 0 20px;padding:8px 0 8px 16px;border-left:4px solid ${BLUE};color:#3A404C">${escape(text.slice(0, 600))}</blockquote>
${button(`${siteUrl()}/${story.slug}#comments`, 'See the conversation')}
${footerNote("You're getting this because you comment on LASU Champion.")}`),
})

export const celebrationDecisionEmail = (to: string, name: string, approved: boolean, link?: string, note?: string | null): Email => ({
  to,
  subject: approved ? 'Your celebration is now on LASU Champion' : 'About your celebration notice',
  html: layout(
    approved
      ? `<h1 style="margin:0 0 12px;font-size:24px">It's published</h1>
<p style="margin:0 0 20px">Hi ${escape(name.split(' ')[0] || name)}, the celebration you sent in has been approved and is now on the Celebrations page.</p>
${link ? button(link, 'See it on the site') : ''}`
      : `<p style="margin:0 0 12px">Hi ${escape(name.split(' ')[0] || name)}, thanks for sending in a celebration. We weren't able to publish this one.</p>
${note ? `<p style="margin:0 0 12px;white-space:pre-line">${escape(note)}</p>` : ''}
<p style="margin:0">You're welcome to send another from your account.</p>`,
  ),
})

type StoryForEmail = { title: string; slug?: string | null; excerpt?: string | null; image?: string | null; section?: string | null }

const storyBlock = (s: StoryForEmail) => {
  const link = `${siteUrl()}/${s.slug}`
  return `<tr><td style="padding:0 0 26px">
${s.image ? `<a href="${link}"><img src="${s.image}" alt="" width="496" style="display:block;width:100%;max-width:496px;height:auto;border-radius:4px;border:0;margin:0 0 12px"></a>` : ''}
${s.section ? `<p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${RED};font-weight:bold">${escape(s.section)}</p>` : ''}
<a href="${link}" style="color:#14171C;text-decoration:none;font-size:20px;font-weight:bold;line-height:1.25">${escape(s.title)}</a>
<p style="margin:6px 0 8px;color:#3A404C;font-size:15px;line-height:1.55">${escape(s.excerpt ?? '')}</p>
<a href="${link}" style="color:${BLUE};font-weight:bold;font-size:14px;text-decoration:none">Read the story →</a>
</td></tr>`
}

/** The daily digest: today's new stories in one email. */
export const digestEmail = (to: string, stories: StoryForEmail[], unsubscribe?: string): Email => ({
  to,
  unsubscribe,
  subject: stories.length > 1 ? `Today on LASU Champion: ${stories[0].title} and more` : `New on LASU Champion: ${stories[0]?.title ?? ''}`,
  html: layout(`<p style="margin:0 0 6px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:${RED};font-weight:bold">Today on LASU Champion</p>
<h1 style="margin:0 0 24px;font-size:26px;line-height:1.15">${stories.length === 1 ? 'A new story for you' : `${stories.length} new stories for you`}</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${stories.map(storyBlock).join('')}</table>
${button(siteUrl(), 'See all the news')}
${footerNote("You're getting this because you follow LASU Champion.", unsubscribe, !unsubscribe)}`),
})

/** An instant alert: one new story. */
export const alertEmail = (to: string, story: StoryForEmail): Email => ({
  to,
  subject: `New on LASU Champion: ${story.title}`,
  html: layout(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${storyBlock(story)}</table>
${footerNote("You're getting this because you chose instant alerts.")}`),
})
