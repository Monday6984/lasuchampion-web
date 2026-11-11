'use client'

import { useState } from 'react'

type Item = { name: string; title: string; quote: string; photo: string | null }

/** One ambassador quote at a time, with previous / next. */
export function AmbassadorQuotes({ items }: { items: Item[] }) {
  const [i, setI] = useState(0)
  const a = items[i % items.length]
  if (!a) return null
  return (
    <figure className="amb-quote">
      <div className="amb-quote__photo" aria-hidden="true">
        {a.photo && <img src={a.photo} alt="" />}
      </div>
      <div className="amb-quote__body">
        <blockquote aria-live="polite">“{a.quote}”</blockquote>
        <figcaption>
          <strong>{a.name}</strong>
          {a.title ? ` · ${a.title}` : ''}
        </figcaption>
        {items.length > 1 && (
          <div className="btn-row">
            <button type="button" className="btn ghost icon" aria-label="Previous ambassador" onClick={() => setI((n) => (n + items.length - 1) % items.length)}>
              ‹
            </button>
            <button type="button" className="btn ghost icon" aria-label="Next ambassador" onClick={() => setI((n) => (n + 1) % items.length)}>
              ›
            </button>
          </div>
        )}
      </div>
    </figure>
  )
}
