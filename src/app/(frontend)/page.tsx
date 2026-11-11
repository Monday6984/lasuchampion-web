import Link from 'next/link'

import { AdSlot } from '@/components/site/AdSlot'
import { AmbassadorQuotes } from '@/components/site/AmbassadorQuotes'
import { LeadStory, StoryCard, StoryLine, StoryRow } from '@/components/site/Story'
import { SubscribeForm } from '@/components/site/SubscribeForm'
import { TvStrip } from '@/components/site/TvStrip'
import {
  formatDate,
  getAmbassadors,
  getIssues,
  getLeadStory,
  getSectionBySlug,
  getSections,
  getSettings,
  getStories,
  mediaUrl,
} from '@/lib/data'

// Cached and refreshed every 5 minutes, or straight away when a reporter publishes.
export const revalidate = 300

export default async function HomePage() {
  const [settings, lead, sections, issues] = await Promise.all([getSettings(), getLeadStory(), getSections(), getIssues()])

  const latest = await getStories({ limit: 9, exclude: lead ? [lead.id] : [], views: false })
  const secondary = latest.docs.slice(0, 2)
  const justIn = latest.docs.slice(2, 8)

  const shown = new Set([lead?.id, ...secondary.map((s) => s.id)].filter(Boolean) as number[])
  const homeSections = sections.filter((s) => s.onHomepage).slice(0, 3)
  const columns = await Promise.all(
    homeSections.map(async (s) => ({ section: s, stories: (await getStories({ section: s, limit: 4, exclude: [...shown], views: false })).docs })),
  )

  const celebrationsSection = settings.celebrationsOnHomepage !== false ? await getSectionBySlug('celebrations') : null
  const celebrations = celebrationsSection ? (await getStories({ section: celebrationsSection, limit: 4, views: false })).docs : []
  const ambassadors = settings.ambassadorsOnHomepage !== false ? await getAmbassadors(true) : []
  const issue = issues[0]

  return (
    <>
      {lead ? (
        <section aria-label="Top stories" className="wrap front">
          <div className="front__lead">
            <LeadStory post={lead} />
          </div>
          <div className="front__second">
            {secondary.map((p, i) => (
              <StoryCard key={p.id} post={p} image={i === 0} h="h2" />
            ))}
          </div>
          {justIn.length > 0 && (
            <aside aria-labelledby="just-h" className="front__rail">
              <h2 id="just-h" className="rail-title">
                Just in
              </h2>
              {justIn.map((p) => (
                <StoryLine key={p.id} post={p} />
              ))}
            </aside>
          )}
        </section>
      ) : (
        <section className="wrap section">
          <h1 className="hd hd-xl">LASU Champion</h1>
          <p className="standfirst">The first stories are on their way.</p>
        </section>
      )}

      {columns.some((c) => c.stories.length) && (
        <section aria-label="Section highlights" className="wrap section-columns">
          {columns.map(({ section, stories }) => (
            <div key={section.id} className="section-col">
              <div className="band-head">
                <h2>{section.name}</h2>
                <Link href={`/${section.slug}`} className="band-head__more">
                  See all →
                </Link>
              </div>
              {stories[0] ? <StoryCard post={stories[0]} /> : <p className="muted">No stories yet.</p>}
              {stories.slice(1).map((p) => (
                <StoryRow key={p.id} post={p} />
              ))}
            </div>
          ))}
        </section>
      )}

      <div className="wrap" style={{ paddingBottom: 48 }}>
        <AdSlot placement="home" />
      </div>

      {celebrationsSection && celebrations.length > 0 && (
        <section aria-labelledby="cel-h" className="celebrations-band">
          <div className="wrap">
            <div className="band-head band-head--red">
              <h2 id="cel-h">Celebrations</h2>
              <span className="band-head__actions">
                <Link href="/celebrations" className="band-head__more">
                  See all →
                </Link>
                <Link href="/account?tab=celebrate" className="btn">
                  Send a celebration
                </Link>
              </span>
            </div>
            <div className="celebration-grid">
              {celebrations.map((p) => {
                const img = mediaUrl(p.cover, 'card')
                return (
                  <Link key={p.id} href={`/${p.slug}`} className="celebration-card">
                    <div className="ph ph--square">{img && <img src={img} alt="" loading="lazy" />}</div>
                    <span className="celebration-card__body">
                      <span className="kick kick--sm">{(p.tags?.[0] && typeof p.tags[0] === 'object' && p.tags[0].name) || 'Celebration'}</span>
                      <span className="hd hd-s">{p.title}</span>
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <TvStrip />

      {issue && (
        <section aria-labelledby="mag-h" className="wrap mag-feature">
          <Link href={`/magazine/${issue.slug}`} className="mag-feature__cover" aria-label={`Read: ${issue.title}`}>
            {mediaUrl(issue.cover, 'cover') && <img src={mediaUrl(issue.cover, 'cover') as string} alt="" />}
          </Link>
          <div className="mag-feature__copy">
            <span className="kick">
              The magazine · Issue {issue.issueNumber} · {formatDate(issue.releaseDate, { day: undefined })}
            </span>
            <h2 id="mag-h" className="hd hd-xl">
              {issue.title}
            </h2>
            {issue.summary && <p className="standfirst">{issue.summary}</p>}
            <div className="btn-row">
              <Link className="btn blue" href={`/magazine/${issue.slug}`}>
                Read online
              </Link>
              {issue.allowDownload !== false && typeof issue.pdf === 'object' && issue.pdf?.url && (
                <a className="btn ghost" href={issue.pdf.url} download>
                  Download PDF
                </a>
              )}
              <Link className="btn ghost" href="/magazine#archive">
                Past issues
              </Link>
            </div>
          </div>
        </section>
      )}

      {ambassadors.length > 0 && (
        <section aria-labelledby="amb-h" className="soft-band">
          <div className="wrap amb-band">
            <div className="amb-band__intro">
              <span className="kick">Ambassador voices</span>
              <h2 id="amb-h" className="hd hd-l">
                What people say about LASU Champion
              </h2>
              <Link href="/ambassadors" className="text-link">
                Meet our ambassadors →
              </Link>
            </div>
            <AmbassadorQuotes
              items={ambassadors.map((a) => ({
                name: a.name,
                title: a.title ?? '',
                quote: a.quote,
                photo: mediaUrl(a.photo, 'thumb'),
              }))}
            />
          </div>
        </section>
      )}

      <section id="join" aria-labelledby="join-h" className="wrap join">
        <div className="join__box">
          <div className="join__copy">
            <h2 id="join-h" className="hd hd-l">
              Join the LASU Champion community
            </h2>
            <p>Create a free account to comment on stories, save what you read and send in celebrations. Or just get the daily digest by email.</p>
            <Link href="/signup" className="btn blue">
              Create an account
            </Link>
          </div>
          <div className="join__form">
            <p className="join__label">Daily digest only</p>
            <SubscribeForm source="homepage" />
          </div>
        </div>
      </section>
    </>
  )
}
