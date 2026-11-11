'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

import { toggleSave } from '@/app/(frontend)/member-actions'

/** Save / unsave a story. Visitors who aren't logged in are sent to log in first. */
export function SaveButton({ postId }: { postId: number }) {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [pending, start] = useTransition()

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setSaved(Boolean(d?.member?.saved?.includes(postId))))
      .catch(() => null)
  }, [postId])

  return (
    <button
      type="button"
      className={`btn ghost sm${saved ? ' is-on' : ''}`}
      aria-pressed={saved}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await toggleSave(postId)
          if (res.needLogin) router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`)
          else if (res.ok) setSaved(Boolean(res.saved))
        })
      }
    >
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M6 3h12v18l-6-4-6 4z" />
      </svg>
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}
