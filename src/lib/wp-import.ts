/**
 * Imports one WordPress post (already read from the export file in the browser) into Payload:
 * categories, author, featured and inline images (downloaded into Media / R2), and the body
 * converted from WordPress HTML to the editor's format. Re-running skips posts already imported.
 */
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { parseHTML } from 'linkedom'
import { randomBytes } from 'crypto'
import path from 'path'
import type { Payload } from 'payload'

import { slugify } from '../fields/slug'
import { RESERVED_SLUGS } from './reserved'
import type { WpPost } from './wp-import-types'

export type { WpPost } from './wp-import-types'

export type ImportResult = {
  status: 'imported' | 'skipped' | 'failed'
  title: string
  id?: number | string
  slug?: string
  imagesOk?: number
  imagesFailed?: number
  comments?: number
  message?: string
}

const MAX_IMAGE_BYTES = 20 * 1024 * 1024

// ---------- HTML parsing ----------

/**
 * A small stand-in for jsdom's JSDOM class built on linkedom, which is pure JavaScript and works in
 * serverless functions (jsdom needs extra files at runtime that Vercel deployments don't include).
 */
class DOM {
  window: { document: Document }
  constructor(html: string) {
    const page = /<html[\s>]/i.test(html) ? html : `<!doctype html><html><head></head><body>${html.replace(/^\s*<body>|<\/body>\s*$/gi, '')}</body></html>`
    this.window = parseHTML(page) as unknown as { document: Document }
  }
}

// ---------- HTML clean-up ----------

const BLOCK = /^<(p|div|h[1-6]|ul|ol|li|blockquote|figure|table|pre|hr|img|iframe|section|article|header|footer)\b/i

/** WordPress stores classic-editor posts without <p> tags; this recreates its automatic paragraphs. */
function autoParagraphs(html: string) {
  if (/<p[\s>]/i.test(html)) return html
  return html
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => (BLOCK.test(chunk) ? chunk : `<p>${chunk.replace(/\n/g, '<br>')}</p>`))
    .join('\n')
}

const SHORTCODES =
  /\[\/?(gallery|embed|video|audio|playlist|button|column|columns|row|one_half|one_third|two_third|contact-form-7|vc_[a-z_]+|et_pb_[a-z_]+|fusion_[a-z_]+|su_[a-z_]+)\b[^\]]*\]/gi

function cleanWordPressHtml(raw: string) {
  let html = raw
    .replace(/<!--\s*\/?wp:[\s\S]*?-->/g, '') // block editor markers
    .replace(/\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/gi, (_m, inner: string) => {
      const img = inner.match(/<a[^>]*>\s*<img[^>]*>\s*<\/a>|<img[^>]*>/i)?.[0] ?? ''
      const caption = inner.replace(img, '').trim()
      return `<figure>${img}${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`
    })
    .replace(SHORTCODES, '')
  html = autoParagraphs(html)
  // Embedded videos can't live in the editor; keep them as a link.
  html = html.replace(/<iframe[^>]*src=["']([^"']+)["'][^>]*>\s*<\/iframe>/gi, (_m, src: string) => {
    const url = (src.startsWith('//') ? `https:${src}` : src).replace(
      /^https?:\/\/(www\.)?youtube(-nocookie)?\.com\/embed\/([\w-]+).*$/,
      'https://www.youtube.com/watch?v=$3',
    )
    return `<p><a href="${url}">Watch the video</a></p>`
  })
  return html
}

// ---------- images ----------

const absolute = (url: string, siteUrl: string) => {
  try {
    return new URL(url.startsWith('//') ? `https:${url}` : url, siteUrl).toString()
  } catch {
    return null
  }
}

/** WordPress inserts resized copies (photo-300x200.jpg); try the full-size original first. */
const originalOf = (url: string) => url.replace(/-\d{2,5}x\d{2,5}(?=\.[a-z0-9]+(\?|$))/i, '')

async function download(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(25_000), redirect: 'follow', headers: { 'User-Agent': 'LASUChampionImporter/1.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const type = (res.headers.get('content-type') ?? '').split(';')[0].trim()
  if (!type.startsWith('image/')) throw new Error(`not an image (${type || 'unknown type'})`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > MAX_IMAGE_BYTES) throw new Error('image larger than 20 MB')
  return { buf, type }
}

async function importImage(payload: Payload, rawUrl: string, siteUrl: string, alt: string, caption = '') {
  const url = absolute(rawUrl, siteUrl)
  if (!url) throw new Error('bad image address')

  const existing = await payload.find({ collection: 'media', where: { sourceUrl: { equals: url } }, limit: 1, depth: 0 })
  if (existing.docs[0]) return existing.docs[0].id

  let file: { buf: Buffer; type: string } | null = null
  const full = originalOf(url)
  if (full !== url) {
    try {
      file = await download(full)
    } catch {
      file = null
    }
  }
  file ??= await download(url)

  const base = path.basename(new URL(full !== url && file ? full : url).pathname) || 'image'
  const name = decodeURIComponent(base).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120)
  const doc = await payload.create({
    collection: 'media',
    data: { alt: alt || undefined, caption: caption || undefined, sourceUrl: url },
    file: { data: file.buf, mimetype: file.type, name, size: file.buf.length },
  })
  return doc.id
}

// ---------- editor conversion ----------

let editorConfigPromise: ReturnType<typeof editorConfigFactory.default> | null = null

type LexNode = { type?: string; value?: unknown; pending?: unknown; children?: LexNode[]; [k: string]: unknown }

/** Upload ids come back as strings, and images that failed to download come back as "pending": tidy both. */
function tidyUploads(node: LexNode): LexNode | null {
  if (node.type === 'upload') {
    if (node.pending || node.value == null) return null
    if (typeof node.value === 'string' && /^\d+$/.test(node.value)) node.value = Number(node.value)
    delete node.pending
  }
  if (Array.isArray(node.children)) {
    node.children = node.children.map(tidyUploads).filter((n): n is LexNode => n !== null)
  }
  return node
}

const isEmptyParagraph = (n: LexNode) =>
  n.type === 'paragraph' &&
  (!n.children?.length ||
    n.children.every((c) => c.type === 'linebreak' || (c.type === 'text' && !String(c.text ?? '').trim())))

/**
 * Images must sit at the top level of the body, not inside a paragraph, and blank paragraphs
 * left over from WordPress spacing are dropped.
 */
function liftUploads(root: LexNode) {
  const out: LexNode[] = []
  for (const node of root.children ?? []) {
    if (node.type === 'paragraph' && node.children?.some((c) => c.type === 'upload')) {
      let buffer: LexNode[] = []
      const flush = () => {
        const para = { ...node, children: buffer }
        if (!isEmptyParagraph(para)) out.push(para)
        buffer = []
      }
      for (const child of node.children) {
        if (child.type === 'upload') {
          flush()
          out.push(child)
        } else buffer.push(child)
      }
      flush()
    } else if (!isEmptyParagraph(node)) out.push(node)
  }
  root.children = out
}

// ---------- helpers ----------

const text = (html: string) => {
  // Space out block elements so "<li>One</li><li>Two</li>" reads "One Two".
  const spaced = html.replace(/<\/(p|li|h[1-6]|blockquote|div|figcaption|td|th)>|<br\s*\/?>/gi, '$& ')
  const dom = new DOM(spaced)
  return (dom.window.document.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

const excerptFrom = (wpExcerpt: string, html: string) => {
  const source = text(wpExcerpt) || text(html)
  if (source.length <= 260) return source || ' '
  return `${source.slice(0, 257).replace(/\s+\S*$/, '')}…`
}

/** Old WordPress categories → one section and its tags (old category slugs are listed on each, see lib/defaults.ts). */
async function sectionAndTags(payload: Payload, categories: { name: string; slug: string }[]) {
  const [sections, tags] = await Promise.all([
    payload.find({ collection: 'sections', limit: 100, depth: 0 }),
    payload.find({ collection: 'tags', limit: 1000, depth: 0 }),
  ])
  const sectionId = (t: { section: unknown }) => (typeof t.section === 'object' && t.section ? (t.section as { id: number }).id : (t.section as number))
  const slugs = categories.map((c) => slugify(c.slug || c.name)).filter(Boolean)

  const matchedTags = slugs
    .map((slug) => tags.docs.find((t) => t.slug === slug || (t.legacySlugs ?? []).includes(slug)))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
  // The section: the first matched tag's section, else a section named by the category, else Campus.
  let section =
    (matchedTags[0] && sections.docs.find((s) => s.id === sectionId(matchedTags[0]))) ||
    slugs.map((slug) => sections.docs.find((s) => s.slug === slug || (s.legacySlugs ?? []).includes(slug))).find(Boolean) ||
    sections.docs.find((s) => s.slug === 'campus') ||
    sections.docs[0]
  if (!section) throw new Error('No sections exist yet. Restart the site once so the starting sections are created.')
  const tagIds = [...new Set(matchedTags.filter((t) => sectionId(t) === section!.id).map((t) => t.id))]
  return { sectionId: section.id, tagIds }
}

/** The old post's author becomes a reporter (staff account) so the story keeps its byline and author page. */
async function findOrCreateReporter(payload: Payload, name: string) {
  const clean = text(name)
  if (!clean) return undefined
  const slug = slugify(clean) || 'reporter'
  const found = await payload.find({
    collection: 'users',
    where: { or: [{ name: { equals: clean } }, { slug: { equals: slug } }, { wpAuthorId: { equals: clean } }] },
    limit: 1,
    depth: 0,
  })
  if (found.docs[0]) return found.docs[0].id
  // A placeholder login: an admin adds the person's real email under Staff when they want them to log in.
  return (
    await payload.create({
      collection: 'users',
      data: {
        name: clean,
        slug,
        role: 'reporter',
        active: true,
        position: 'Reporter',
        wpAuthorId: clean,
        email: `${slug}-${Date.now().toString(36)}@imported.invalid`,
        password: randomBytes(24).toString('base64url'),
      },
    })
  ).id
}

/** Old comments: approved ones come across with their replies; a commenter with a member account is linked to it. */
async function importComments(payload: Payload, postId: number | string, post: WpPost) {
  let comments = post.comments
  if (!comments) {
    comments = []
    try {
      for (let page = 1; page <= 10; page++) {
        const res = await fetch(`${post.siteUrl}/wp-json/wp/v2/comments?post=${post.wpId}&per_page=100&page=${page}&order=asc`, {
          headers: { Accept: 'application/json', 'User-Agent': 'LASUChampionImporter/1.0' },
          signal: AbortSignal.timeout(20_000),
        })
        if (!res.ok) break
        const list = (await res.json()) as { id: number; parent: number; author_name?: string; date_gmt?: string; content?: { rendered?: string } }[]
        if (!Array.isArray(list) || !list.length) break
        comments.push(
          ...list.map((c) => ({
            id: String(c.id),
            parentId: String(c.parent ?? 0),
            author: c.author_name ?? '',
            email: '',
            date: c.date_gmt ? `${c.date_gmt}Z` : new Date().toISOString(),
            content: c.content?.rendered ?? '',
          })),
        )
        if (list.length < 100) break
      }
    } catch {
      // Comments are a bonus: the story still imports without them.
    }
  }
  const idMap = new Map<string, number | string>()
  let count = 0
  for (const c of comments) {
    const body = text(c.content).slice(0, 3000)
    if (!body) continue
    const existing = await payload.find({ collection: 'comments', where: { wpCommentId: { equals: c.id } }, limit: 1, depth: 0 })
    if (existing.docs[0]) {
      idMap.set(c.id, existing.docs[0].id)
      continue
    }
    const member = c.email
      ? (await payload.find({ collection: 'members', where: { email: { equals: c.email.toLowerCase() } }, limit: 1, depth: 0 })).docs[0]
      : undefined
    const created = await payload.create({
      collection: 'comments',
      data: {
        post: postId as number,
        member: member?.id,
        guestName: member ? undefined : text(c.author) || 'Reader',
        parent: (c.parentId && c.parentId !== '0' ? idMap.get(c.parentId) : undefined) as number | undefined,
        body,
        status: 'visible',
        wpCommentId: c.id,
        createdAt: c.date,
      } as never,
    })
    idMap.set(c.id, created.id)
    count++
  }
  return count
}

async function freeSlug(payload: Payload, wanted: string) {
  let base = slugify(wanted) || 'story'
  // Stories live at the site root, so they can't take a fixed page's or a section's address.
  const section = await payload.count({ collection: 'sections', where: { slug: { equals: base } } })
  if (RESERVED_SLUGS.has(base) || section.totalDocs) base = `${base}-story`
  for (let i = 1; i < 50; i++) {
    const candidate = i === 1 ? base : `${base}-${i}`
    const taken = await payload.find({ collection: 'posts', where: { slug: { equals: candidate } }, limit: 1, depth: 0, draft: true })
    if (!taken.docs.length) return candidate
  }
  return `${base}-${Date.now()}`
}

// ---------- main ----------

export async function importWordPressPost(payload: Payload, post: WpPost): Promise<ImportResult> {
  const title = text(post.title) || '(untitled)'

  const already = await payload.find({ collection: 'posts', where: { wpId: { equals: post.wpId } }, limit: 1, depth: 0, draft: true })
  if (already.docs[0]) return { status: 'skipped', title, id: already.docs[0].id, slug: already.docs[0].slug ?? undefined, message: 'Already imported' }

  let imagesOk = 0
  let imagesFailed = 0

  // Inline images: download each into Media and point the <img> at it.
  const dom = new DOM(cleanWordPressHtml(post.html))
  const doc = dom.window.document
  let firstImageId: number | string | null = null
  for (const img of Array.from(doc.querySelectorAll('img'))) {
    const src = img.getAttribute('src') ?? ''
    // Unwrap images that link to their own full-size file.
    const parent = img.parentElement
    if (parent?.tagName === 'A' && /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(parent.getAttribute('href') ?? '')) parent.replaceWith(img)
    // Images are blocks in the editor, so lift any image out of the paragraph it sits in.
    const para = img.closest('p')
    if (para) {
      para.parentNode?.insertBefore(img, para)
      if (!(para.textContent ?? '').trim() && !para.querySelector('img')) para.remove()
    }
    // A WordPress caption becomes the image's own caption, shown under it on the site.
    const figcaption = img.closest('figure')?.querySelector('figcaption')
    const caption = (figcaption?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 300)
    figcaption?.remove()
    try {
      const id = await importImage(payload, src, post.siteUrl, img.getAttribute('alt') ?? '', caption)
      firstImageId ??= id
      for (const attr of Array.from(img.attributes)) img.removeAttribute(attr.name)
      img.setAttribute('data-lexical-upload-relation-to', 'media')
      img.setAttribute('data-lexical-upload-id', String(id))
      imagesOk++
    } catch {
      img.remove()
      imagesFailed++
    }
  }

  let coverId: number | string | null = null
  if (post.featuredUrl) {
    try {
      coverId = await importImage(payload, post.featuredUrl, post.siteUrl, title)
      imagesOk++
    } catch {
      imagesFailed++
    }
  }
  coverId ??= firstImageId

  editorConfigPromise ??= editorConfigFactory.default({ config: payload.config })
  const editorConfig = await editorConfigPromise
  const body = convertHTMLToLexical({ editorConfig, html: doc.body.innerHTML, JSDOM: DOM })
  tidyUploads(body.root as unknown as LexNode)
  liftUploads(body.root as unknown as LexNode)

  const [{ sectionId, tagIds }, authorId, slug] = await Promise.all([
    sectionAndTags(payload, post.categories),
    findOrCreateReporter(payload, post.author),
    freeSlug(payload, post.slug || title),
  ])

  let legacyPath: string | undefined
  try {
    legacyPath = new URL(post.link).pathname.replace(/\/+$/, '') || undefined
  } catch {
    legacyPath = undefined
  }

  const published = post.status === 'publish' || post.status === 'future'
  const created = await payload.create({
    collection: 'posts',
    draft: !published,
    data: {
      title,
      excerpt: excerptFrom(post.excerpt, post.html),
      cover: coverId ?? undefined,
      body: body as never,
      slug,
      publishedAt: post.date,
      section: sectionId,
      tags: tagIds,
      storyType: 'news',
      author: authorId,
      legacyPath,
      notifyMembers: false,
      alertsSent: true,
      wpId: post.wpId,
      _status: published ? 'published' : 'draft',
    },
  })

  const comments = published ? await importComments(payload, created.id, post) : 0
  return { status: 'imported', title, id: created.id, slug: created.slug ?? slug, imagesOk, imagesFailed, comments }
}
