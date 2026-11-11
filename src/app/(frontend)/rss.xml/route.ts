import { getStories, sectionOf } from '@/lib/data'

export const revalidate = 3600

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] as string)

export async function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const { docs } = await getStories({ limit: 40, views: false })
  const items = docs
    .map((p) => {
      const section = sectionOf(p)
      return `<item>
  <title>${esc(p.title)}</title>
  <link>${site}/${p.slug}</link>
  <guid>${site}/${p.slug}</guid>
  <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
  ${section ? `<category>${esc(section.name)}</category>` : ''}
  <description>${esc(p.excerpt)}</description>
</item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>LASU Champion</title>
  <link>${site}</link>
  <description>The Foremost Inter-Campus News Magazine: news and features from LASU Champion Press Club.</description>
  <language>en</language>
${items}
</channel>
</rss>`
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
