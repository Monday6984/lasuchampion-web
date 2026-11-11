import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { logOut } from '@/app/(frontend)/member-actions'
import { AlertsForm, CelebrationForm, PasswordForm, ProfileForm } from '@/components/site/AccountForms'
import { StoryRow } from '@/components/site/Story'
import { formatDate, liveStories, mediaUrl, payload } from '@/lib/data'
import { getMember } from '@/lib/member'

export const metadata: Metadata = { title: 'My account', robots: { index: false } }
export const dynamic = 'force-dynamic'

const TABS = [
  ['profile', 'My profile'],
  ['saved', 'Saved stories'],
  ['comments', 'My comments'],
  ['alerts', 'Email settings'],
  ['celebrate', 'Send a celebration'],
  ['password', 'Password'],
] as const
type Tab = (typeof TABS)[number][0]

type Props = { searchParams: Promise<{ tab?: string; welcome?: string; reset?: string }> }

export default async function AccountPage({ searchParams }: Props) {
  const member = await getMember()
  const sp = await searchParams
  if (!member) redirect(`/login?next=${encodeURIComponent(`/account${sp.tab ? `?tab=${sp.tab}` : ''}`)}`)
  const tab: Tab = (TABS.find(([t]) => t === sp.tab)?.[0] ?? 'profile') as Tab
  const p = await payload()

  const photo = member.photo ? mediaUrl((await p.findByID({ collection: 'media', id: typeof member.photo === 'object' ? member.photo.id : member.photo }).catch(() => null)) ?? null, 'thumb') : null

  let content: React.ReactNode = null
  if (tab === 'profile') {
    content = (
      <ProfileForm
        data={{
          name: member.name,
          memberType: member.memberType ?? 'student',
          faculty: member.faculty ?? '',
          department: member.department ?? '',
          level: member.level ?? '',
          bio: member.bio ?? '',
          photo,
        }}
      />
    )
  } else if (tab === 'saved') {
    const ids = (member.savedStories ?? []).map((s) => (typeof s === 'object' ? s.id : s))
    const res = ids.length
      ? await p.find({ collection: 'posts', where: { and: [liveStories(), { id: { in: ids } }] }, limit: 200, depth: 1 })
      : { docs: [] }
    const order = new Map(ids.map((id, i) => [id, i]))
    const docs = res.docs.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)).map((d) => ({ ...d, viewCount: null }))
    content = docs.length ? (
      <div className="row-grid row-grid--1">
        {docs.map((d) => (
          <StoryRow key={d.id} post={d} />
        ))}
      </div>
    ) : (
      <p className="empty">Nothing saved yet. Use the Save button on any story to keep it here.</p>
    )
  } else if (tab === 'comments') {
    const res = await p.find({
      collection: 'comments',
      where: { and: [{ member: { equals: member.id } }, { status: { not_equals: 'hidden' } }] },
      sort: '-createdAt',
      limit: 100,
      depth: 1,
    })
    content = res.docs.length ? (
      <ul className="my-comments">
        {res.docs.map((c) => {
          const post = typeof c.post === 'object' ? c.post : null
          return (
            <li key={c.id}>
              <p>“{c.body.length > 240 ? `${c.body.slice(0, 240)}…` : c.body}”</p>
              <span className="meta">
                {post ? (
                  <>
                    On <Link href={`/${post.slug}#comment-${c.id}`}>{post.title}</Link>
                  </>
                ) : null}{' '}
                · {formatDate(c.createdAt)}
                {c.status === 'pending' ? ' · waiting for review' : ''}
              </span>
            </li>
          )
        })}
      </ul>
    ) : (
      <p className="empty">You haven&apos;t commented yet.</p>
    )
  } else if (tab === 'alerts') {
    content = <AlertsForm alerts={member.alerts ?? 'digest'} magazineEmails={member.magazineEmails !== false} replyEmails={member.replyEmails !== false} />
  } else if (tab === 'celebrate') {
    const mine = await p.find({ collection: 'celebrations', where: { member: { equals: member.id } }, sort: '-createdAt', limit: 10, depth: 1 })
    content = (
      <>
        <p className="body-text">
          Share a birthday, wedding, graduation, promotion, anniversary or retirement. An editor approves every notice before it&apos;s published on the{' '}
          <Link href="/celebrations">Celebrations</Link> page.
        </p>
        {member.blocked ? <p className="note">Your account can&apos;t send celebrations. Contact us if you think this is a mistake.</p> : <CelebrationForm />}
        {mine.docs.length > 0 && (
          <div className="my-celebrations">
            <h3 className="hd hd-s">Sent by you</h3>
            <ul>
              {mine.docs.map((c) => {
                const story = typeof c.story === 'object' ? c.story : null
                return (
                  <li key={c.id}>
                    <span>{c.headline}</span>
                    <span className={`status status--${c.status}`}>
                      {c.status === 'approved' ? 'Published' : c.status === 'declined' ? 'Declined' : 'Waiting for approval'}
                    </span>
                    {story?.slug && <Link href={`/${story.slug}`}>View</Link>}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </>
    )
  } else if (tab === 'password') {
    content = <PasswordForm />
  }

  return (
    <div className="wrap account">
      <aside className="account__side panel" aria-label="Account">
        <div className="account__me">
          <span className="avatar avatar--lg" aria-hidden="true">
            {photo && <img src={photo} alt="" />}
          </span>
          <span>
            <strong>{member.name}</strong>
            {member.username && (
              <Link href={`/members/${member.username}`} className="meta">
                View public profile
              </Link>
            )}
          </span>
        </div>
        <nav className="account__tabs">
          {TABS.map(([t, label]) => (
            <Link key={t} href={`/account?tab=${t}`} aria-current={t === tab ? 'page' : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <form action={logOut}>
          <button type="submit" className="link-btn link-btn--danger">
            Log out
          </button>
        </form>
      </aside>
      <section className="account__main panel" aria-labelledby="acc-h">
        {sp.welcome && (
          <p role="status" className="banner banner--ok">
            Welcome to LASU Champion! Add a photo and a short bio so readers know who&apos;s commenting.
          </p>
        )}
        {sp.reset && (
          <p role="status" className="banner banner--ok">
            Your new password is saved and you&apos;re logged in.
          </p>
        )}
        {member.mustSetPassword && tab !== 'password' && (
          <p className="banner">
            Your account came across from the old site. <Link href="/account?tab=password">Choose a new password</Link> when you have a moment.
          </p>
        )}
        <h1 id="acc-h" className="hd hd-l">
          {TABS.find(([t]) => t === tab)?.[1]}
        </h1>
        {content}
      </section>
    </div>
  )
}
