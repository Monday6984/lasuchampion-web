import { NextResponse, type NextRequest } from 'next/server'

import { payload } from '@/lib/data'
import { fromRestPost, normaliseSiteUrl, type RestPost } from '@/lib/wp-rest'

export const maxDuration = 60

const PER_PAGE = 20

const blocked =
  "Your WordPress site refused to share its posts (often a security plugin such as Wordfence, iThemes or All-In-One Security turning off the REST API for visitors). Allow the REST API in that plugin for a while, or use the .json file option instead."

/**
 * Reads one page of published posts from an old WordPress site's built-in API (/wp-json/wp/v2/posts),
 * so posts can be imported without the Tools → Export file. Admins only.
 */
export async function GET(req: NextRequest) {
  const p = await payload()
  const { user } = await p.auth({ headers: req.headers })
  if (!user || (user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can import posts.' }, { status: 403 })
  }

  let site: string
  try {
    site = normaliseSiteUrl(req.nextUrl.searchParams.get('site') ?? '')
  } catch {
    return NextResponse.json({ error: 'That doesn’t look like a website address.' }, { status: 400 })
  }
  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) || 1)
  const query = `per_page=${PER_PAGE}&page=${page}&_embed=1&orderby=date&order=asc`

  // Pretty permalinks first, then the form that works on every WordPress site.
  const candidates = [`${site}/wp-json/wp/v2/posts?${query}`, `${site}/?rest_route=/wp/v2/posts&${query}`]
  let lastStatus = 0
  for (const url of candidates) {
    let res: Response
    try {
      res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; LASUChampionImporter/1.0)' },
        signal: AbortSignal.timeout(30_000),
        redirect: 'follow',
      })
    } catch {
      return NextResponse.json({ error: `Couldn’t reach ${site}. Check the address and that the site is online.` }, { status: 502 })
    }
    lastStatus = res.status
    if (res.status === 401 || res.status === 403) return NextResponse.json({ error: blocked }, { status: 502 })
    if (res.status === 400 && page > 1) return NextResponse.json({ posts: [], total: 0, totalPages: page - 1, site })
    if (!res.ok) continue
    const type = res.headers.get('content-type') ?? ''
    if (!type.includes('json')) continue
    const data = (await res.json().catch(() => null)) as RestPost[] | null
    if (!Array.isArray(data)) continue
    return NextResponse.json({
      site,
      total: Number(res.headers.get('x-wp-total')) || data.length,
      totalPages: Number(res.headers.get('x-wp-totalpages')) || 1,
      posts: data.map((d) => fromRestPost(d, site)),
    })
  }
  return NextResponse.json(
    {
      error:
        lastStatus === 404
          ? 'No WordPress posts API found at that address. Check it is the WordPress site’s main address.'
          : `The site answered with an error (${lastStatus || 'no response'}).`,
    },
    { status: 502 },
  )
}
