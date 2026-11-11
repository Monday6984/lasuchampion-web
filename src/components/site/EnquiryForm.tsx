'use client'

import { useActionState } from 'react'

import { submitEnquiry, type FormState } from '@/app/(frontend)/actions'

const LABELS: Record<string, string> = {
  advertising: 'Advertising',
  tip: 'A story tip',
  general: 'Something else',
}

/** The Contact / Advertise form. Messages land in the admin (Enquiries) and are emailed to the club. */
export function EnquiryForm({ types = ['general', 'tip', 'advertising'], defaultType }: { types?: string[]; defaultType?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitEnquiry, null)
  if (state?.ok) {
    return (
      <div role="status" className="sent-box">
        <strong>Thanks, we&apos;ve got your message.</strong>
        <span>{state.message === 'tip' ? 'An editor will look into your tip. We may contact you for more details.' : "We'll get back to you by email."}</span>
      </div>
    )
  }
  return (
    <form action={action} className="form">
      {types.length > 1 ? (
        <fieldset className="choices">
          <legend>What is it about?</legend>
          {types.map((t) => (
            <label key={t} className="choice">
              <input type="radio" name="type" value={t} defaultChecked={t === (defaultType ?? types[0])} required />
              {LABELS[t] ?? t}
            </label>
          ))}
        </fieldset>
      ) : (
        <input type="hidden" name="type" value={types[0]} />
      )}
      <div className="grid-2">
        <label className="field">
          Your name
          <input name="name" required autoComplete="name" maxLength={200} />
        </label>
        <label className="field">
          Email
          <input name="email" type="email" required autoComplete="email" maxLength={200} />
        </label>
        <label className="field">
          Phone / WhatsApp <span className="optional">(optional)</span>
          <input name="phone" type="tel" autoComplete="tel" maxLength={50} />
        </label>
        <label className="field">
          {types.length === 1 && types[0] === 'advertising' ? 'Business or organisation' : 'Subject'} <span className="optional">(optional)</span>
          <input name={types.length === 1 && types[0] === 'advertising' ? 'organisation' : 'subject'} maxLength={200} />
        </label>
      </div>
      <label className="field">
        Message
        <textarea name="message" required rows={6} maxLength={5000} />
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ display: 'none' }} />
      <div className="btn-row">
        <button type="submit" className="btn lg" disabled={pending}>
          {pending ? 'Sending…' : 'Send message'}
        </button>
      </div>
      {state && !state.ok && (
        <p role="alert" className="form-msg error">
          {state.message}
        </p>
      )}
    </form>
  )
}
