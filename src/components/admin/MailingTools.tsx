import React from 'react'

/** Shown above the subscriber list: download the list, and preview today's digest. */
export function MailingTools() {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', margin: '0 0 16px' }}>
      <a className="btn btn--style-secondary btn--size-small" style={{ margin: 0 }} href="/api/mailing/export">
        Download list (CSV)
      </a>
      <a className="btn btn--style-secondary btn--size-small" style={{ margin: 0 }} href="/api/mailing/preview" target="_blank" rel="noreferrer">
        Preview today's digest
      </a>
      <span style={{ fontSize: 13, color: 'var(--theme-elevation-600)' }}>
        {process.env.RESEND_API_KEY ? 'Emails are being sent.' : 'Sign-ups are being collected. Emails start once the email service (Resend) is connected.'}
      </span>
    </div>
  )
}
