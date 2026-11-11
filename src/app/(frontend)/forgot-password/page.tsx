import type { Metadata } from 'next'

import { ForgotForm } from '@/components/site/AccountForms'

export const metadata: Metadata = { title: 'Reset your password', robots: { index: false } }

export default function ForgotPasswordPage() {
  return (
    <section className="wrap auth auth--narrow">
      <div className="auth__intro">
        <h1 className="hd hd-xl">Reset your password</h1>
        <p>Enter the email on your account and we&apos;ll send you a link to choose a new password.</p>
      </div>
      <ForgotForm />
    </section>
  )
}
