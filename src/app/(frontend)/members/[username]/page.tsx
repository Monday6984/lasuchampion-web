import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { formatDate, mediaUrl, payload } from '@/lib/data'

export const revalidate = 300
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ username: string }> }

const TYPES: Record<string, string> = { student: 'Student', alumni: 'Alumnus / alumna', staff: 'LASU staff', friend: 'Friend of LASU' }

async function getProfile(username: string) {
  const p = await payload()
  const res = await p.find({
    collection: 'members',
    where: { and: [{ username: { equals: username.toLowerCase() } }, { blocked: { not_equals: true } }] },
    limit: 1,
    depth: 1,
    select: { name: true, username: true, photo: true, memberType: true, faculty: true, department: true, level: true, bio: true, createdAt: true },
  })
  return res.docs[0] ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = await getProfile((await params).username)
  return m ? { title: m.name, robots: { index: false } } : {}
}

/** A member's public profile (the old BuddyPress /members/<name>/ page). */
export default async function MemberProfile({ params }: Props) {
  const m = await getProfile((await params).username)
  if (!m) notFound()
  const p = await payload()
  const comments = await p.find({
    collection: 'comments',
    where: { and: [{ member: { equals: m.id } }, { status: { equals: 'visible' } }] },
    sort: '-createdAt',
    limit: 10,
    depth: 1,
  })
  const photo = mediaUrl(m.photo, 'card')
  return (
    <>
      <section className="wrap profile-head">
        <span className="avatar avatar--xxl" aria-hidden="true">
          {photo && <img src={photo} alt="" />}
        </span>
        <div className="profile-head__text">
          <span className="kick">Member</span>
          <h1 className="hd hd-xl">{m.name}</h1>
          <p className="meta">
            {[TYPES[m.memberType ?? ''] ?? '', m.department, m.faculty, m.level].filter(Boolean).join(' · ')}
            {m.createdAt ? ` · Member since ${formatDate(m.createdAt, { day: undefined })}` : ''}
          </p>
          {m.bio && <p className="body-text">{m.bio}</p>}
        </div>
      </section>
      {comments.docs.length > 0 && (
        <section className="wrap section" aria-labelledby="mc-h">
          <div className="band-head">
            <h2 id="mc-h">Recent comments</h2>
          </div>
          <ul className="my-comments">
            {comments.docs.map((c) => {
              const post = typeof c.post === 'object' ? c.post : null
              return (
                <li key={c.id}>
                  <p>“{c.body.length > 240 ? `${c.body.slice(0, 240)}…` : c.body}”</p>
                  <span className="meta">
                    {post && (
                      <>
                        On <Link href={`/${post.slug}#comment-${c.id}`}>{post.title}</Link> ·{' '}
                      </>
                    )}
                    {formatDate(c.createdAt)}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </>
  )
}
