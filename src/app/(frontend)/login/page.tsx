import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { LoginForm } from '@/components/site/AccountForms'
import { getMember } from '@/lib/member'

export const metadata: Metadata = { title: 'Log in', robots: { index: false } }

type Props = { searchParams: Promise<{ next?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  const raw = (await searchParams).next ?? '/account'
  const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/account'
  if (await getMember()) redirect(next)
  return (
    <section className="wrap auth auth--narrow">
      <div className="auth__intro">
        <h1 className="hd hd-xl">Log in</h1>
        <p>
          New here? <Link href="/signup">Create a free account</Link>
        </p>
        <p className="meta">
          Members of the old site: your account has come across. If you haven&apos;t set a password on the new site yet, use{' '}
          <Link href="/forgot-password">Forgot your password?</Link>
        </p>
      </div>
      <LoginForm next={next} />
    </section>
  )
}
