import type { Metadata } from 'next'
import Link from 'next/link'

import { ResetForm } from '@/components/site/AccountForms'

export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false } }

type Props = { searchParams: Promise<{ token?: string }> }

export default async function ResetPasswordPage({ searchParams }: Props) {
  const token = (await searchParams).token ?? ''
  return (
    <section className="wrap auth auth--narrow">
      <div className="auth__intro">
        <h1 className="hd hd-xl">Choose a new password</h1>
      </div>
      {token ? (
        <ResetForm token={token} />
      ) : (
        <p>
          This link is missing its code. <Link href="/forgot-password">Ask for a new link</Link>.
        </p>
      )}
    </section>
  )
}
