'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { thumb, type Video } from '@/lib/youtube'

import { track } from './TrackView'

const formatCount = (n: number) => n.toLocaleString('en-GB')

const date = (iso: string) =>
  iso ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date(iso)) : ''

/**
 * The Champion TV player: the chosen video large at the top (the newest by default, or the one
 * in the link, e.g. /tv#v=VIDEO_ID), and the rest as a grid below. The YouTube player only loads
 * when a video is played, so the page stays fast. Each play started here is counted in the admin.
 */
export function TvPlayer({ videos }: { videos: Video[] }) {
  const [current, setCurrent] = useState(videos[0]?.id ?? '')
  const [playing, setPlaying] = useState(false)
  const [hiRes, setHiRes] = useState(true)
  const playerRef = useRef<HTMLDivElement>(null)
  const video = videos.find((v) => v.id === current) ?? videos[0]

  // Opened from a link to one video (e.g. the homepage strip): start on that one.
  useEffect(() => {
    const id = window.location.hash.match(/v=([\w-]{11})/)?.[1]
    if (id && videos.some((v) => v.id === id)) setCurrent(id)
  }, [videos])

  const play = useCallback((id: string) => {
    setCurrent(id)
    setPlaying(true)
    setHiRes(true)
    track('video', id)
    try {
      history.replaceState(null, '', `#v=${id}`)
    } catch {
      // the address just doesn't update
    }
  }, [])

  if (!video) return null

  return (
    <div className="tv">
      <div className="tv-main" ref={playerRef}>
        <div className="tv-frame">
          {playing ? (
            <iframe
              key={video.id}
              src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <button type="button" className="tv-poster" onClick={() => play(video.id)} aria-label={`Play: ${video.title}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={video.id + hiRes}
                src={thumb(video.id, hiRes ? 'maxres' : 'hq')}
                alt=""
                // maxresdefault doesn't exist for every video; YouTube then returns a 120px placeholder.
                onLoad={(e) => hiRes && e.currentTarget.naturalWidth < 200 && setHiRes(false)}
                onError={(e) => (hiRes ? setHiRes(false) : (e.currentTarget.style.visibility = 'hidden'))}
              />
              <span className="tv-play" aria-hidden="true">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          )}
        </div>
        <div className="tv-info">
          <h2 className="h-m">{video.title}</h2>
          <p className="tv-meta">
            {date(video.published)}
            {video.views !== null && ` · ${formatCount(video.views)} views on YouTube`}
          </p>
          {video.description && <p className="tv-desc">{video.description}</p>}
        </div>
      </div>

      {videos.length > 1 && (
        <div className="tv-grid">
          {videos.map((v) => (
            <button
              key={v.id}
              type="button"
              className="tv-card"
              aria-current={v.id === video.id ? 'true' : undefined}
              onClick={() => {
                play(v.id)
                playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            >
              <span className="tv-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb(v.id)} alt="" loading="lazy" />
                {v.id === video.id && <span className="tv-now">{playing ? 'Playing' : 'Up next'}</span>}
              </span>
              <span className="tv-card-title">{v.title}</span>
              <span className="tv-meta">{date(v.published)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
