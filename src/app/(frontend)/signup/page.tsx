import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { SignUpForm } from '@/components/site/AccountForms'
import { getMember } from '@/lib/member'

export const metadata: Metadata = { title: 'Join LASU Champion', robots: { index: false } }

export default async function SignUpPage() {
  if (await getMember()) redirect('/account')
  return (
    <section className="wrap auth">
      <div className="auth__intro">
        <h1 className="hd hd-xl">Join the LASU Champion community</h1>
        <ul className="ticks">
          <li>Your own profile page</li>
          <li>Comment on every story</li>
          <li>Save stories to read later</li>
          <li>New-story alerts by email</li>
          <li>Send in celebrations for publication</li>
        </ul>
        <p>
          Already a member? <Link href="/login">Log in</Link>
        </p>
      </div>
      <SignUpForm />
    </section>
  )
}
