/**
 * Champion TV: the newest videos from the YouTube channel, read from YouTube's public feed
 * (no API key, no cost). The feed lists the channel's latest ~15 uploads.
 *
 * - Pages read it through Next's fetch cache, refreshed about every hour.
 * - The daily job saves a copy (the tv-cache global); pages fall back to it if YouTube can't be
 *   reached, so the TV page and homepage strip never go blank.
 */
import type { Payload } from 'payload'

export type Video = {
  id: string
  title: string
  published: string
  description: string
  views: number | null
  short: boolean
}

const FEED = (channelId: string) => `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
const REFRESH_SECONDS = 3600
export const VIDEO_ID = /^[\w-]{11}$/
const CHANNEL_ID = /UC[\w-]{22}/

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()

const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`))
  return m ? decode(m[1]) : ''
}

/** Reads YouTube's channel feed (Atom XML) into a list of videos, newest first. */
export function parseFeed(xml: string): Video[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? []
  const videos: Video[] = []
  for (const e of entries) {
    const id = tag(e, 'yt:videoId')
    if (!VIDEO_ID.test(id)) continue
    const views = e.match(/<media:statistics[^>]*\sviews="(\d+)"/)
    const link = e.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/)?.[1] ?? ''
    videos.push({
      id,
      title: tag(e, 'title') || tag(e, 'media:title'),
      published: tag(e, 'published'),
      description: tag(e, 'media:description'),
      views: views ? Number(views[1]) : null,
      short: link.includes('/shorts/'),
    })
  }
  return videos.sort((a, b) => Date.parse(b.published) - Date.parse(a.published))
}

async function fetchFeed(channelId: string, fresh = false) {
  const res = await fetch(FEED(channelId), fresh ? { cache: 'no-store' } : { next: { revalidate: REFRESH_SECONDS, tags: ['youtube'] } })
  if (!res.ok) throw new Error(`YouTube feed ${res.status}`)
  const xml = await res.text()
  if (!xml.includes('<feed')) throw new Error('YouTube feed: unexpected response')
  return parseFeed(xml)
}

const channelOf = async (payload: Payload) => {
  const s = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  let id = s.youtubeChannelId || ''
  // The channel's ID is looked up from its link once (on first start the lookup may not have run).
  if (!id && s.youtubeChannel) {
    id = (await resolveChannelId(s.youtubeChannel)) ?? ''
    if (id) await payload.updateGlobal({ slug: 'site-settings', data: { youtubeChannelId: id } }).catch(() => null)
  }
  return {
    id,
    url: s.youtubeChannel || (s.youtubeChannelId ? `https://www.youtube.com/channel/${s.youtubeChannelId}` : ''),
    onHomepage: s.tvOnHomepage !== false,
  }
}

/** The newest videos for the site; falls back to the saved copy when YouTube can't be reached. */
export async function getVideos(payload: Payload) {
  const channel = await channelOf(payload)
  if (!channel.id) return { channel, videos: [] as Video[] }
  try {
    return { channel, videos: await fetchFeed(channel.id) }
  } catch (err) {
    console.error('[tv] YouTube feed unavailable, using the saved copy', err)
    const saved = await payload.findGlobal({ slug: 'tv-cache', depth: 0 })
    const videos = saved.channelId === channel.id && Array.isArray(saved.videos) ? (saved.videos as Video[]) : []
    return { channel, videos }
  }
}

/** Saves a fresh copy of the video list (run by the daily job). */
export async function saveVideoCopy(payload: Payload) {
  const channel = await channelOf(payload)
  if (!channel.id) return { saved: 0 }
  const videos = await fetchFeed(channel.id, true)
  await payload.updateGlobal({
    slug: 'tv-cache',
    data: { channelId: channel.id, videos, savedAt: new Date().toISOString() },
  })
  return { saved: videos.length }
}

/** Works out a channel's ID (UC…) from any channel link: /channel/UC…, /@handle, /c/name or /user/name. */
export async function resolveChannelId(link: string): Promise<string | null> {
  const direct = link.match(/\/channel\/(UC[\w-]{22})/)
  if (direct) return direct[1]
  let url: URL
  try {
    url = new URL(link.startsWith('http') ? link : `https://www.youtube.com/${link.replace(/^\/+/, '')}`)
  } catch {
    return null
  }
  if (!/(^|\.)youtube\.com$/.test(url.hostname)) return null
  try {
    // Cached for a day so a failed lookup never turns cached pages into per-request pages.
    const res = await fetch(url, { next: { revalidate: 86400 }, headers: { 'Accept-Language': 'en' } })
    if (!res.ok) return null
    const html = await res.text()
    const m =
      html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/) ??
      html.match(/"externalId":"(UC[\w-]{22})"/) ??
      html.match(/"channelId":"(UC[\w-]{22})"/)
    return m && CHANNEL_ID.test(m[1]) ? m[1] : null
  } catch {
    return null
  }
}

/** Thumbnails served by YouTube. */
export const thumb = (id: string, size: 'mq' | 'hq' | 'maxres' = 'mq') =>
  `https://i.ytimg.com/vi/${id}/${size === 'maxres' ? 'maxresdefault' : `${size}default`}.jpg`
