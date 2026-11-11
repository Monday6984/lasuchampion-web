import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { StoryRow } from '@/components/site/Story'
import { getReporterBySlug, getStories, mediaUrl } from '@/lib/data'

export const revalidate = 300
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }>; searchParams?: never }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getReporterBySlug((await params).slug)
  return r ? { title: r.name, description: r.bio ?? `Stories by ${r.name} for LASU Champion.` } : {}
}

export default async function ReporterPage({ params }: Props) {
  const r = await getReporterBySlug((await params).slug)
  if (!r) notFound()
  const stories = await getStories({ author: r.id, limit: 60, views: false })
  const photo = mediaUrl(r.photo, 'card')
  return (
    <>
      <section className="wrap profile-head">
        <span className="avatar avatar--xxl" aria-hidden="true">
          {photo && <img src={photo} alt="" />}
        </span>
        <div className="profile-head__text">
          <nav aria-label="Breadcrumb" className="crumbs">
            <Link href="/reporters">Our Reporters</Link>
          </nav>
          <h1 className="hd hd-xl">{r.name}</h1>
          <p className="meta">
            {[r.position || (r.active === false ? 'Former reporter' : 'Reporter'), r.faculty, r.department].filter(Boolean).join(' · ')}
          </p>
          {r.bio && <p className="body-text">{r.bio}</p>}
          {(r.social ?? []).length > 0 && (
            <p className="btn-row">
              {(r.social ?? []).map((s) => (
                <a key={s.id ?? s.url} className="btn ghost sm" href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              ))}
            </p>
          )}
        </div>
      </section>
      <section className="wrap section" aria-labelledby="by-h">
        <div className="band-head">
          <h2 id="by-h">
            {stories.totalDocs} {stories.totalDocs === 1 ? 'story' : 'stories'} by {r.name.split(' ')[0]}
          </h2>
        </div>
        {stories.docs.length ? (
          <div className="row-grid">
            {stories.docs.map((p) => (
              <StoryRow key={p.id} post={p} />
            ))}
          </div>
        ) : (
          <p className="empty">No stories yet.</p>
        )}
      </section>
    </>
  )
}
