'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { SubscribeForm } from './SubscribeForm'

const HIDDEN = ['/', '/unsubscribe', '/signup', '/login', '/account', '/forgot-password', '/reset-password']

/** Newsletter signup above the footer on every page except the homepage (which has its own) and account pages. */
export function FooterSignup() {
  const path = usePathname()
  if (HIDDEN.some((h) => (h === '/' ? path === '/' : path.startsWith(h)))) return null
  return (
    <div className="footer-signup">
      <div>
        <p className="footer-signup__title">Get the day&apos;s stories by email</p>
        <p className="footer-signup__sub">
          A daily digest of new stories, plus each new magazine issue. Or{' '}
          <Link href="/signup">create a member account</Link> to comment and save stories.
        </p>
      </div>
      <SubscribeForm source={`footer:${path}`} compact />
    </div>
  )
}
