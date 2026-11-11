import type { Metadata } from 'next'
import Link from 'next/link'

import { getAmbassadors, getSettings, mediaUrl } from '@/lib/data'

export const revalidate = 300
export const metadata: Metadata = {
  title: 'Our Ambassadors',
  description: 'The people who champion LASU Champion Press Club, and what they say about it.',
}

export default async function AmbassadorsPage() {
  const [settings, ambassadors] = await Promise.all([getSettings(), getAmbassadors()])
  return (
    <>
      <section className="wrap page-head">
        <nav aria-label="Breadcrumb" className="crumbs">
          <Link href="/about">About</Link> / <span>Ambassadors</span>
        </nav>
        <h1 className="page-title">Our Ambassadors</h1>
        {settings.ambassadorsIntro && <p className="standfirst">{settings.ambassadorsIntro}</p>}
      </section>
      <section className="wrap section" aria-label="Ambassadors">
        {ambassadors.length ? (
          <div className="amb-grid">
            {ambassadors.map((a) => (
              <article key={a.id} className="amb-card" id={`ambassador-${a.id}`}>
                <div className="amb-card__head">
                  <span className="avatar avatar--xl" aria-hidden="true">
                    {mediaUrl(a.photo, 'thumb') && <img src={mediaUrl(a.photo, 'thumb') as string} alt="" />}
                  </span>
                  <span>
                    <h2 className="hd hd-s">{a.name}</h2>
                    {a.title && <span className="meta">{a.title}</span>}
                  </span>
                </div>
                <blockquote>“{a.quote}”</blockquote>
                {a.profile && (
                  <details>
                    <summary>Read profile</summary>
                    {a.profile.split(/\n\s*\n/).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </details>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="empty">Our ambassadors will be introduced here soon.</p>
        )}
      </section>
    </>
  )
}
