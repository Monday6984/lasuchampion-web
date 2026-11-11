'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export const track = (kind: 'page' | 'post' | 'issue' | 'video', id: string) => {
  const body = JSON.stringify({ kind, id })
  // sendBeacon survives the visitor leaving the page; fetch is the fallback.
  if (navigator.sendBeacon?.('/api/views', new Blob([body], { type: 'application/json' }))) return
  fetch('/api/views', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
}

/** Counts a page view for every page the visitor opens. Lives in the site layout. */
export function PageViewTracker() {
  const path = usePathname()
  useEffect(() => {
    track('page', path)
  }, [path])
  return null
}

/** Counts one view of a post (placed on the post page). */
export function TrackPost({ id }: { id: string | number }) {
  useEffect(() => {
    track('post', String(id))
  }, [id])
  return null
}
