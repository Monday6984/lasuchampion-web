import type { Metadata } from 'next'
import Link from 'next/link'

import { getReporters, mediaUrl } from '@/lib/data'

export const revalidate = 300
export const metadata: Metadata = {
  title: 'Our Reporters',
  description: "The student journalists of LASU Champion Press Club, and everything they've written.",
}

export default async function ReportersPage() {
  const reporters = await getReporters()
  const active = reporters.filter((r) => r.active !== false)
  const alumni = reporters.filter((r) => r.active === false)
  const card = (r: (typeof reporters)[number]) => (
    <Link key={r.id} href={`/reporters/${r.slug}`} className="reporter-card">
      <span className="avatar avatar--xl" aria-hidden="true">
        {mediaUrl(r.photo, 'thumb') && <img src={mediaUrl(r.photo, 'thumb') as string} alt="" />}
      </span>
      <span className="reporter-card__text">
        <strong>{r.name}</strong>
        <span className="meta">{[r.position, r.faculty].filter(Boolean).join(' · ')}</span>
        <span className="meta">
          {r.storyCount} {r.storyCount === 1 ? 'story' : 'stories'}
        </span>
      </span>
    </Link>
  )
  return (
    <>
      <section className="wrap page-head">
        <h1 className="page-title">Our Reporters</h1>
        <p className="standfirst">The student journalists behind LASU Champion.</p>
      </section>
      <section className="wrap section" aria-label="Reporters">
        <div className="reporter-grid">{active.map(card)}</div>
        {alumni.length > 0 && (
          <>
            <div className="band-head" style={{ marginTop: 48 }}>
              <h2>Former reporters</h2>
            </div>
            <div className="reporter-grid">{alumni.map(card)}</div>
          </>
        )}
      </section>
    </>
  )
}
