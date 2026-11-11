import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="wrap narrow section" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <span className="kicker">Page not found</span>
      <h1 className="display h-xl">We couldn&apos;t find that page.</h1>
      <p style={{ margin: 0, fontSize: 18, color: 'var(--ink-2)' }}>It may have moved, or the link may be mistyped.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link className="btn" href="/">
          Go to the homepage
        </Link>
        <Link className="btn ghost" href="/blog">
          Browse the blog
        </Link>
      </div>
    </section>
  )
}
