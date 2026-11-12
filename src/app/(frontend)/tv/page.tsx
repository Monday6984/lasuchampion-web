import type { Metadata } from 'next'

import { TvPlayer } from '@/components/site/TvPlayer'
import { payload } from '@/lib/data'
import { getVideos } from '@/lib/youtube'

// New uploads appear within about an hour (the YouTube feed is re-read hourly).
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Champion TV',
  description: 'The newest videos from LASU Champion TV on YouTube: campus reports, interviews and events.',
  alternates: { canonical: '/tv' },
}

export default async function TvPage() {
  const { channel, videos } = await getVideos(await payload())
  const subscribe = channel.url ? `${channel.url.replace(/\/+$/, '')}?sub_confirmation=1` : null

  return (
    <div className="tv-page">
      <section aria-labelledby="tv-h" className="wrap" style={{ paddingTop: 44, paddingBottom: 28, display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640 }}>
          <span className="kicker" style={{ color: 'var(--accent-light)' }}>
            On YouTube
          </span>
          <h1 id="tv-h" className="hd hd-xl">
            Champion TV
          </h1>
          <p className="standfirst" style={{ color: '#D5DCE6' }}>
            Campus reports, interviews and events from the LASU Champion team. New videos appear here as soon as they&apos;re on the channel.
          </p>
        </div>
        {subscribe && (
          <a className="btn" href={subscribe} target="_blank" rel="noreferrer">
            Subscribe on YouTube
          </a>
        )}
      </section>

      <div className="wrap" style={{ paddingBottom: 80 }}>
        {videos.length ? (
          <TvPlayer videos={videos} />
        ) : (
          <p className="standfirst" style={{ color: '#D5DCE6' }}>
            The videos couldn&apos;t load just now.{' '}
            {channel.url && (
              <a href={channel.url} target="_blank" rel="noreferrer">
                Watch on YouTube
              </a>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
