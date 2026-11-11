import type { SerializedUploadNode } from '@payloadcms/richtext-lexical'
import { RichText, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'

import type React from 'react'

import type { Media, Post } from '@/payload-types'

/**
 * Images in a post body use one full, uncropped picture (the 1600px "hero" copy when it exists).
 * The default renderer offers every stored size, including the portrait 720×960 magazine-cover crop,
 * which phones would pick and which cuts landscape photos.
 */
const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  upload: ({ node }: { node: SerializedUploadNode }) => {
    const media = node.value as Media | number | string
    if (!media || typeof media !== 'object') return null
    if (!media.mimeType?.startsWith('image/')) {
      return (
        <p>
          <a href={media.url ?? '#'} target="_blank" rel="noreferrer">
            {media.filename ?? 'Download file'}
          </a>
        </p>
      )
    }
    const src = media.sizes?.hero?.url || media.url || ''
    const width = media.sizes?.hero?.url ? media.sizes.hero.width : media.width
    const height = media.sizes?.hero?.url ? media.sizes.hero.height : media.height
    return (
      <figure className="post-image">
        <img src={src} alt={media.alt ?? ''} width={width ?? undefined} height={height ?? undefined} loading="lazy" />
        {(media.caption || media.credit) && (
          <figcaption>{[media.caption, media.credit && `Photo: ${media.credit}`].filter(Boolean).join(' · ')}</figcaption>
        )}
      </figure>
    )
  },
})

type Body = Post['body']

/** Splits the body after `count` top-level blocks, so something (the advert) can sit between the halves. */
const split = (body: Body, count: number): [Body, Body] => {
  const children = body.root.children
  return [
    { ...body, root: { ...body.root, children: children.slice(0, count) } },
    { ...body, root: { ...body.root, children: children.slice(count) } },
  ]
}

/**
 * The post text. `insert` (the advert) is placed after the third paragraph of a longer post,
 * where readers actually see it, or at the end of a short one.
 */
export function PostBody({ body, insert }: { body: Body; insert?: React.ReactNode }) {
  const children = body?.root?.children ?? []
  let paragraphs = 0
  let at = -1
  for (let i = 0; i < children.length; i++) {
    if (children[i].type === 'paragraph') paragraphs++
    if (paragraphs === 3) {
      at = i + 1
      break
    }
  }
  const longEnough = at > 0 && children.length - at >= 3
  if (!insert || !longEnough) {
    return (
      <>
        <RichText data={body} converters={converters} />
        {insert && <div className="post-insert">{insert}</div>}
      </>
    )
  }
  const [before, after] = split(body, at)
  return (
    <>
      <RichText data={before} converters={converters} />
      <div className="post-insert">{insert}</div>
      <RichText data={after} converters={converters} />
    </>
  )
}
