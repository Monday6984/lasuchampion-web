'use client'

import { useState } from 'react'

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(title)
  return (
    <div className="share">
      <span style={{ fontSize: 14, fontWeight: 600, marginRight: 6 }}>Share</span>
      <a href={`https://wa.me/?text=${t}%20${u}`} target="_blank" rel="noreferrer">
        WhatsApp
      </a>
      <a href={`https://x.com/intent/post?text=${t}&url=${u}`} target="_blank" rel="noreferrer">
        X
      </a>
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${u}`} target="_blank" rel="noreferrer">
        LinkedIn
      </a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${u}`} target="_blank" rel="noreferrer">
        Facebook
      </a>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(url).then(() => setCopied(true), () => {})
        }}
      >
        <span aria-live="polite">{copied ? 'Link copied' : 'Copy link'}</span>
      </button>
    </div>
  )
}
