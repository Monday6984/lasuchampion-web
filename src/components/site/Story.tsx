import Link from 'next/link'

import { bylineOf, formatCount, formatDate, kickerOf, mediaUrl, type Story } from '@/lib/data'

import { EyeIcon } from './Icons'

const cover = (post: Story, size: 'thumb' | 'card' | 'hero') => ({
  src: mediaUrl(post.cover, size),
  alt: typeof post.cover === 'object' ? (post.cover?.alt ?? '') : '',
})

export function Views({ count }: { count: number | null }) {
  if (count === null) return null
  return (
    <span className="views">
      <EyeIcon />
      {formatCount(count)} {count === 1 ? 'view' : 'views'}
    </span>
  )
}

/** The big story at the top of the homepage or a section page. */
export function LeadStory({ post, h = 'h1' }: { post: Story; h?: 'h1' | 'h2' }) {
  const img = cover(post, 'hero')
  const H = h
  return (
    <Link className="story story--lead" href={`/${post.slug}`}>
      <div className="ph ph--wide">{img.src && <img src={img.src} alt={img.alt} />}</div>
      <span className="kick">{kickerOf(post)}</span>
      <H className="hd hd-xl">{post.title}</H>
      <p className="standfirst">{post.excerpt}</p>
      <span className="meta">
        By {bylineOf(post)} · {formatDate(post.publishedAt)}
        {post.readingTime ? ` · ${post.readingTime} min read` : ''}
      </span>
    </Link>
  )
}

/** A medium card: image, label, headline, date. */
export function StoryCard({ post, image = true, h = 'h3' }: { post: Story; image?: boolean; h?: 'h2' | 'h3' }) {
  const img = cover(post, 'card')
  const H = h
  return (
    <Link className="story" href={`/${post.slug}`}>
      {image && <div className="ph ph--card">{img.src && <img src={img.src} alt={img.alt} loading="lazy" />}</div>}
      <span className="kick">{kickerOf(post)}</span>
      <H className="hd hd-m">{post.title}</H>
      <span className="meta">
        {formatDate(post.publishedAt)}
        {post.viewCount !== null && post.viewCount !== undefined ? ' · ' : ''}
        <Views count={post.viewCount ?? null} />
      </span>
    </Link>
  )
}

/** A compact row: small picture beside the headline. Used for lists so pages stay short. */
export function StoryRow({ post, showBy = false, h = 'h3' }: { post: Story; showBy?: boolean; h?: 'h2' | 'h3' }) {
  const img = cover(post, 'thumb')
  const H = h
  return (
    <Link className="story story--row" href={`/${post.slug}`}>
      <div className="ph ph--thumb">{img.src && <img src={img.src} alt={img.alt} loading="lazy" />}</div>
      <span className="story__text">
        <span className="kick kick--sm">{kickerOf(post)}</span>
        <H className="hd hd-s">{post.title}</H>
        <span className="meta">
          {showBy ? `By ${bylineOf(post)} · ` : ''}
          {formatDate(post.publishedAt)}
        </span>
      </span>
    </Link>
  )
}

/** Headline only, for rails and ranked lists. */
export function StoryLine({ post, n, time = true }: { post: Story; n?: number; time?: boolean }) {
  return (
    <Link className={`story-line${n ? ' story-line--ranked' : ''}`} href={`/${post.slug}`}>
      {n ? <span className="story-line__n">{n}</span> : null}
      <span className="story-line__text">
        {time && <span className="story-line__time">{formatDate(post.publishedAt, { year: undefined })}</span>}
        <span className="story-line__title">{post.title}</span>
      </span>
    </Link>
  )
}
