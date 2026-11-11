import type { Metadata } from 'next'
import Link from 'next/link'

import { getExcos, getSections, getSettings, mediaUrl } from '@/lib/data'

export const revalidate = 300
export const metadata: Metadata = {
  title: 'About LASU Champion',
  description: 'LASU Champion Press Club: who we are, what we cover, and the executives who run the club.',
}

export default async function AboutPage() {
  const [settings, excos, sections] = await Promise.all([getSettings(), getExcos(), getSections()])
  const current = settings.currentExcoSession ?? ''
  const now = excos.filter((e) => e.session === current).sort((a, b) => (a.order ?? 10) - (b.order ?? 10))
  const past = new Map<string, typeof excos>()
  for (const e of excos.filter((x) => x.session !== current)) past.set(e.session, [...(past.get(e.session) ?? []), e])
  const pastSessions = [...past.keys()].sort().reverse()
  const history = (settings.history ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)

  return (
    <>
      <section className="wrap about-hero">
        <div className="about-hero__copy">
          <span className="kick">About LASU Champion</span>
          <h1 className="hd hd-xxl">{settings.tagline || 'The Foremost Inter-Campus News Magazine'}</h1>
          {settings.mission && <p className="standfirst">{settings.mission}</p>}
          {history.map((p, i) => (
            <p key={i} className="body-text">
              {p}
            </p>
          ))}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="about-hero__logo" src="/brand/lasu-champion-logo.png" alt="LASU Champion logo" width={280} height={300} />
      </section>

      <section aria-label="What we do" className="soft-band">
        <div className="wrap what-we-do">
          <Link href={`/${sections[0]?.slug ?? ''}`} className="what">
            <span className="what__title">News</span>
            <span>{sections.map((s) => s.name).slice(0, 6).join(', ')}.</span>
          </Link>
          <Link href="/magazine" className="what">
            <span className="what__title">The magazine</span>
            <span>Issues you can read online or download.</span>
          </Link>
          <Link href="/tv" className="what">
            <span className="what__title">Champion TV</span>
            <span>Video reports on YouTube.</span>
          </Link>
          <Link href="/reporters" className="what">
            <span className="what__title">Our reporters</span>
            <span>Student journalists from across LASU&apos;s faculties.</span>
          </Link>
        </div>
      </section>

      {now.length > 0 && (
        <section aria-labelledby="exco-h" className="wrap section">
          <div className="band-head">
            <h2 id="exco-h">Current Executives · {current}</h2>
          </div>
          <div className="people-grid">
            {now.map((e) => (
              <div key={e.id} className="person">
                <div className="ph ph--portrait">{mediaUrl(e.photo, 'card') && <img src={mediaUrl(e.photo, 'card') as string} alt="" loading="lazy" />}</div>
                <span className="kick kick--sm">{e.office}</span>
                <strong className="person__name">{e.name}</strong>
                {e.faculty && <span className="meta">{e.faculty}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {pastSessions.length > 0 && (
        <section aria-labelledby="past-h" className="wrap section past-execs">
          <div className="band-head">
            <h2 id="past-h">Past Executives</h2>
          </div>
          {pastSessions.map((s) => (
            <details key={s} className="session">
              <summary>{s} session</summary>
              <ul>
                {(past.get(s) ?? [])
                  .sort((a, b) => (a.order ?? 10) - (b.order ?? 10))
                  .map((e) => (
                    <li key={e.id}>
                      <strong>{e.office}:</strong> {e.name}
                    </li>
                  ))}
              </ul>
            </details>
          ))}
        </section>
      )}

      <section className="navy-band">
        <div className="wrap navy-band__row">
          <h2 className="hd hd-l">Meet the people behind the stories</h2>
          <span className="btn-row">
            <Link className="btn" href="/ambassadors">
              Our ambassadors
            </Link>
            <Link className="btn light" href="/reporters">
              Our reporters
            </Link>
            <Link className="btn ghost-light" href="/contact">
              Contact us
            </Link>
          </span>
        </div>
      </section>
    </>
  )
}
