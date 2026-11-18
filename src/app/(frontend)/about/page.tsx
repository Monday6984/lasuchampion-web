import type { Metadata } from 'next'
import Link from 'next/link'

import { getExcos, getSections, getSettings, mediaUrl } from '@/lib/data'
import { founder, milestones, patrons, signOff, story, storyIntroCount } from '@/lib/our-story'

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

      <section aria-labelledby="story-h" className="story-band">
        <div className="wrap founder">
          <figure className="founder__card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={founder.photo} alt={founder.name} width={640} height={800} />
            <figcaption>
              <strong>{founder.name}</strong>
              <span>{founder.title}</span>
            </figcaption>
          </figure>
          <div className="founder__story">
            <span className="kick">Our story</span>
            <h2 id="story-h" className="hd hd-xl">
              A vision conceived in 1987
            </h2>
            <blockquote className="founder__pull">To make LASU great is a task that must be done!</blockquote>
            {story.slice(0, storyIntroCount).map((p, i) => (
              <p key={i} className="body-text">
                {p}
              </p>
            ))}
            <details className="founder__more">
              <summary>Read the full story</summary>
              {story.slice(storyIntroCount).map((p, i) => (
                <p key={i} className="body-text">
                  {p}
                </p>
              ))}
              <p className="founder__signoff">
                {signOff.map((l) => (
                  <strong key={l}>{l}</strong>
                ))}
                <span>
                  By {founder.name}, {founder.title}
                </span>
              </p>
            </details>
          </div>
        </div>

        <div className="wrap">
          <ol className="milestones" aria-label="Milestones">
            {milestones.map((m) => (
              <li key={m.year}>
                <span className="milestones__year">{m.year}</span>
                <strong>{m.title}</strong>
                <span>{m.text}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="wrap patrons-wrap">
          <div className="band-head">
            <h2>Those who launched it</h2>
          </div>
          <ul className="patrons">
            {patrons.map((p) => (
              <li key={p.name} className="patron">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.photo} alt={p.name} width={400} height={500} loading="lazy" />
                <div className="patron__text">
                  <span className="kick kick--sm">{p.role}</span>
                  <strong>{p.name}</strong>
                  <span className="meta">{p.note}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
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
