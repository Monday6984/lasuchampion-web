import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { payload } from '@/lib/data'
import { validToken } from '@/lib/unsubscribe'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Unsubscribe', robots: { index: false } }

async function unsubscribe(form: FormData) {
  'use server'
  const email = String(form.get('e') ?? '').toLowerCase()
  const token = String(form.get('t') ?? '')
  if (!email || !validToken(email, token)) return
  const p = await payload()
  const found = await p.find({ collection: 'subscribers', where: { email: { equals: email } }, limit: 1, depth: 0 })
  if (found.docs[0]) await p.update({ collection: 'subscribers', id: found.docs[0].id, data: { active: false } })
  redirect('/unsubscribe?done=1')
}

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ e?: string; t?: string; done?: string }> }) {
  const { e = '', t = '', done } = await searchParams
  const valid = e && t && validToken(e, t)

  return (
    <section className="wrap narrow section" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 className="display h-l">{done ? "You're unsubscribed" : 'Unsubscribe'}</h1>
      {done ? (
        <p style={{ margin: 0, fontSize: 17 }}>
          We won&apos;t email you again. Changed your mind? You can <Link href="/#subscribe">join again</Link> any time.
        </p>
      ) : valid ? (
        <form action={unsubscribe} style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
          <p style={{ margin: 0, fontSize: 17 }}>
            Stop sending new-issue emails to <strong>{e}</strong>?
          </p>
          <input type="hidden" name="e" value={e} />
          <input type="hidden" name="t" value={t} />
          <button className="btn lg" type="submit">
            Unsubscribe
          </button>
        </form>
      ) : (
        <p style={{ margin: 0, fontSize: 17 }}>This link isn&apos;t valid. Use the unsubscribe link at the bottom of one of our emails.</p>
      )}
    </section>
  )
}
