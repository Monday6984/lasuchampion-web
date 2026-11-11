import type { EmailAdapter } from 'payload'

/**
 * Lets Payload's own emails (members' "forgot password") go through Resend, like every other email
 * the site sends. Without RESEND_API_KEY they are logged instead of sent.
 */
export const resendAdapter = (): EmailAdapter => () => ({
  name: 'resend-http',
  defaultFromAddress: (process.env.EMAIL_FROM ?? 'LASU Champion <no-reply@example.com>').replace(/^.*<|>.*$/g, ''),
  defaultFromName: 'LASU Champion',
  sendEmail: async (message) => {
    const key = process.env.RESEND_API_KEY
    const to = Array.isArray(message.to) ? message.to : [message.to]
    if (!key) {
      console.info(`[email] RESEND_API_KEY not set — skipped "${message.subject}" to ${to.join(', ')}`)
      return
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'LASU Champion <no-reply@example.com>',
        to: to.map((t) => (typeof t === 'string' ? t : t.address)),
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: process.env.EMAIL_REPLY_TO || undefined,
      }),
    })
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
    return res.json()
  },
})
