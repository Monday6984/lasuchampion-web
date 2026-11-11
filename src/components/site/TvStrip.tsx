import Link from 'next/link'

import { payload } from '@/lib/data'
import { getVideos, thumb } from '@/lib/youtube'

/** Homepage: the three newest Champion TV videos, on a dark band (can be switched off in Site settings). */
export async function TvStrip() {
  const { channel, videos } = await getVideos(await payload())
  if (!channel.onHomepage || !videos.length) return null
  const latest = videos.slice(0, 3)

  return (
    <section aria-labelledby="tv-strip-h" className="tv-band">
      <div className="wrap">
      <div className="band-head band-head--light">
        <h2 id="tv-strip-h">Champion TV</h2>
        <Link href="/tv" className="band-head__more">
          Watch more →
        </Link>
      </div>
      <div className="tv-strip">
        {latest.map((v) => (
          <Link key={v.id} href={`/tv#v=${v.id}`} className="tv-strip-card">
            <span className="tv-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(v.id)} alt="" loading="lazy" />
              <span className="tv-play sm" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
            <span className="tv-card-title">{v.title}</span>
          </Link>
        ))}
      </div>
      </div>
    </section>
  )
}
