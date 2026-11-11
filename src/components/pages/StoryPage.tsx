import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AdSlot } from '@/components/site/AdSlot'
import { Comments, type CommentItem } from '@/components/site/Comments'
import { EyeIcon } from '@/components/site/Icons'
import { PostBody } from '@/components/site/PostBody'
import { SaveButton } from '@/components/site/SaveButton'
import { ShareButtons } from '@/components/site/ShareButtons'
import { StoryRow } from '@/components/site/Story'
import { TrackPost } from '@/components/site/TrackView'
import {
  authorOf,
  bylineOf,
  formatCount,
  formatDate,
  getRelated,
  getStoryBySlug,
  mediaUrl,
  payload,
  sectionOf,
  STORY_TYPES,
  tagsOf,
} from '@/lib/data'

async function getComments(postId: number): Promise<CommentItem[]> {
  const p = await payload()
  const res = await p.find({
    collection: 'comments',
    where: { and: [{ post: { equals: postId } }, { status: { equals: 'visible' } }] },
    sort: 'createdAt',
    limit: 500,
    depth: 2,
    populate: { members: { name: true, username: true, photo: true, memberType: true, faculty: true, level: true } },
  })
  return res.docs.map((c) => {
    const m = c.member && typeof c.member === 'object' ? c.member : null
    const who = m
      ? [m.memberType === 'alumni' ? 'Alumnus' : m.memberType === 'staff' ? 'LASU staff' : '', m.faculty, m.level].filter(Boolean).join(' · ')
      : ''
    return {
      id: c.id,
      parent: c.parent ? (typeof c.parent === 'object' ? c.parent.id : c.parent) : null,
      body: c.body,
      createdAt: c.createdAt,
      memberId: m?.id ?? null,
      name: m?.name ?? c.guestName ?? 'Reader',
      username: m?.username ?? null,
      who,
      photo: m ? mediaUrl(m.photo, 'thumb') : null,
    }
  })
}

export async function StoryPage({ slug }: { slug: string }) {
  const post = await getStoryBySlug(slug)
  if (!post) notFound()

  const [related, comments] = await Promise.all([getRelated(post, 3), getComments(post.id)])
  const section = sectionOf(post)
  const tags = tagsOf(post)
  const author = authorOf(post)
  const cover = typeof post.cover === 'object' ? post.cover : null
  const heroImg = mediaUrl(cover, 'hero')
  const avatar = author && !post.bylineName ? mediaUrl(author.photo, 'thumb') : null
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/${post.slug}`
  const kicker = [tags[0]?.name ?? section?.name, post.storyType && post.storyType !== 'news' ? STORY_TYPES[post.storyType] : ''].filter(Boolean).join(' · ')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    image: heroImg ? [heroImg] : undefined,
    author: { '@type': 'Person', name: bylineOf(post) },
    publisher: { '@type': 'Organization', name: 'LASU Champion', logo: { '@type': 'ImageObject', url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/brand/lasu-icon-512.png` } },
    mainEntityOfPage: url,
  }

  return (
    <>
      <TrackPost id={post.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <article>
        <header className="wrap narrow article-head">
          <nav aria-label="Breadcrumb" className="crumbs">
            <Link href="/">Home</Link>
            {section && (
              <>
                {' '}
                / <Link href={`/${section.slug}`}>{section.name}</Link>
              </>
            )}
            {section && tags[0] && (
              <>
                {' '}
                / <Link href={`/${section.slug}/${tags[0].slug}`}>{tags[0].name}</Link>
              </>
            )}
          </nav>
          {kicker && <span className="kick">{kicker}</span>}
          <h1 className="hd hd-xxl">{post.title}</h1>
          <p className="standfirst standfirst--italic">{post.excerpt}</p>
          <div className="byline">
            {author && !post.bylineName && author.slug ? (
              <Link href={`/reporters/${author.slug}`} className="byline__who">
                <span className="avatar" aria-hidden="true">
                  {avatar && <img src={avatar} alt="" />}
                </span>
                <span className="byline__text">
                  <strong>By {author.name}</strong>
                  <span className="meta">
                    {[author.faculty, formatDate(post.publishedAt), post.readingTime ? `${post.readingTime} min read` : ''].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </Link>
            ) : (
              <span className="byline__who">
                <span className="byline__text">
                  <strong>By {bylineOf(post)}</strong>
                  <span className="meta">
                    {[formatDate(post.publishedAt), post.readingTime ? `${post.readingTime} min read` : ''].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </span>
            )}
            <div className="byline__actions">
              {post.viewCount !== null && (
                <span className="view-badge">
                  <EyeIcon size={16} />
                  {formatCount(post.viewCount)} views
                </span>
              )}
              <SaveButton postId={post.id} />
              <a className="btn ghost sm" href="#comments">
                {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
              </a>
            </div>
          </div>
        </header>

        {heroImg && (
          <figure className="wrap article-hero">
            <div className="ph ph--hero">
              <img src={heroImg} alt={cover?.alt ?? ''} />
            </div>
            {(cover?.caption || cover?.credit) && (
              <figcaption className="meta">{[cover.caption, cover.credit && `Photo: ${cover.credit}`].filter(Boolean).join(' · ')}</figcaption>
            )}
          </figure>
        )}

        <div className="wrap read prose">
          <PostBody body={post.body} insert={<AdSlot placement="article" />} />
        </div>

        <footer className="wrap read article-foot">
          {section && tags.length > 0 && (
            <div className="chips chips--sm">
              {tags.map((t) => (
                <Link key={t.id} href={`/${section.slug}/${t.slug}`} className="chip">
                  {t.name}
                </Link>
              ))}
            </div>
          )}
          <ShareButtons url={url} title={post.title} />
          {author && !post.bylineName && (
            <div className="author-box">
              <span className="avatar avatar--lg" aria-hidden="true">
                {avatar && <img src={avatar} alt="" />}
              </span>
              <div>
                <strong>{author.name}</strong>
                {(author.position || author.faculty) && <span className="meta"> · {[author.position, author.faculty].filter(Boolean).join(', ')}</span>}
                {author.bio && <p>{author.bio}</p>}
                {author.slug && (
                  <Link href={`/reporters/${author.slug}`} className="text-link">
                    More from {author.name.split(' ')[0]} →
                  </Link>
                )}
              </div>
            </div>
          )}
        </footer>
      </article>

      <Comments postId={post.id} items={comments} />

      {related.length > 0 && (
        <section aria-labelledby="rel-h" className="wrap section">
          <div className="band-head">
            <h2 id="rel-h">{section ? `More from ${section.name}` : 'Keep reading'}</h2>
          </div>
          <div className="row-grid row-grid--3">
            {related.map((r) => (
              <StoryRow key={r.id} post={r} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
