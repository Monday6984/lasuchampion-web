'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type SectionLink = { name: string; slug: string; main: boolean }
type Headline = { title: string; slug: string }
type Me = { name: string; username: string } | null

const lagosDate = () =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date())

/** "Latest" headlines in the top bar, one at a time. Pauses on hover and for reduced motion. */
function Ticker({ items }: { items: Headline[] }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (items.length < 2 || paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI((n) => (n + 1) % items.length), 5000)
    return () => clearInterval(t)
  }, [items.length, paused])
  if (!items.length) return null
  const item = items[i % items.length]
  return (
    <div className="ticker" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <span className="ticker__label">Latest</span>
      <Link key={item.slug} href={`/${item.slug}`} className="ticker__item">
        {item.title}
      </Link>
      {items.length > 1 && (
        <button type="button" className="ticker__next" aria-label="Next headline" onClick={() => setI((n) => (n + 1) % items.length)}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      )}
    </div>
  )
}

export function HeaderClient({ sections, ticker }: { sections: SectionLink[]; ticker: Headline[] }) {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const [more, setMore] = useState(false)
  const [me, setMe] = useState<Me | undefined>(undefined)
  const [date, setDate] = useState('')
  const moreRef = useRef<HTMLDivElement>(null)

  const main = sections.filter((s) => s.main)
  const extra = sections.filter((s) => !s.main)
  const isActive = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`))

  // Who's logged in is checked in the browser, so every page can stay cached for everyone.
  useEffect(() => {
    setDate(lagosDate())
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.member ?? null))
      .catch(() => setMe(null))
  }, [path])

  useEffect(() => {
    setOpen(false)
    setMore(false)
  }, [path])

  useEffect(() => {
    if (!open && !more) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setMore(false)
      }
    }
    const onClick = (e: MouseEvent) => {
      if (more && moreRef.current && !moreRef.current.contains(e.target as Node)) setMore(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('click', onClick)
    if (open) document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('click', onClick)
      document.body.style.overflow = ''
    }
  }, [open, more])

  const account =
    me === undefined ? null : me ? (
      <Link href="/account" className="topbar__link topbar__strong">
        {me.name.split(' ')[0]}
      </Link>
    ) : (
      <>
        <Link href={`/login?next=${encodeURIComponent(path)}`} className="topbar__link">
          Log in
        </Link>
        <Link href="/signup" className="topbar__link topbar__strong">
          Sign up
        </Link>
      </>
    )

  return (
    <header className={`site-header${open ? ' menu-open' : ''}`}>
      <div className="topbar">
        <div className="wrap topbar__row">
          <span className="topbar__date" suppressHydrationWarning>
            {date}
          </span>
          <Ticker items={ticker} />
          <div className="topbar__account">{account}</div>
        </div>
      </div>

      <div className="wrap masthead">
        <Link href="/search" className="masthead__search">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <span>Search</span>
        </Link>
        <Link href="/" className="masthead__logo" aria-label="LASU Champion, home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/lasu-champion-logo.png" alt="" width={140} height={150} />
        </Link>
        <div className="masthead__cta">
          <Link className="btn" href={me ? '/account?tab=alerts' : '/signup'}>
            Get story alerts
          </Link>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      <nav aria-label="Sections" className="secnav">
        <div className="wrap secnav__row">
          <Link href="/" className="secnav__link" aria-current={isActive('/') ? 'page' : undefined}>
            Home
          </Link>
          {main.map((s) => (
            <Link key={s.slug} href={`/${s.slug}`} className="secnav__link" aria-current={isActive(`/${s.slug}`) ? 'page' : undefined}>
              {s.name}
            </Link>
          ))}
          {extra.length > 0 && (
            <div className="secnav__more" ref={moreRef}>
              <button type="button" className="secnav__link" aria-expanded={more} aria-haspopup="true" onClick={() => setMore((m) => !m)}>
                More
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {more && (
                <div className="secnav__menu">
                  {extra.map((s) => (
                    <Link key={s.slug} href={`/${s.slug}`} aria-current={isActive(`/${s.slug}`) ? 'page' : undefined}>
                      {s.name}
                    </Link>
                  ))}
                  <Link href="/reporters">Our Reporters</Link>
                  <Link href="/ambassadors">Ambassadors</Link>
                </div>
              )}
            </div>
          )}
          <Link href="/magazine" className="secnav__link" aria-current={isActive('/magazine') ? 'page' : undefined}>
            Magazine
          </Link>
          <Link href="/tv" className="secnav__link" aria-current={isActive('/tv') ? 'page' : undefined}>
            Champion TV
          </Link>
          <Link href="/about" className="secnav__link" aria-current={isActive('/about') ? 'page' : undefined}>
            About
          </Link>
        </div>
      </nav>

      <div id="mobile-menu" className="mobile-menu" hidden={!open}>
        <nav aria-label="Main" className="wrap">
          <Link href="/" aria-current={isActive('/') ? 'page' : undefined}>
            Home
          </Link>
          {sections.map((s) => (
            <Link key={s.slug} href={`/${s.slug}`} aria-current={isActive(`/${s.slug}`) ? 'page' : undefined}>
              {s.name}
            </Link>
          ))}
          <Link href="/magazine">Magazine</Link>
          <Link href="/tv">Champion TV</Link>
          <Link href="/about">About</Link>
          <Link href="/ambassadors">Ambassadors</Link>
          <Link href="/reporters">Our Reporters</Link>
          <Link href="/advertise">Advertise</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/search">Search</Link>
          <div className="mobile-menu__account">
            {me ? (
              <Link className="btn lg" href="/account">
                My account
              </Link>
            ) : (
              <>
                <Link className="btn lg" href="/signup">
                  Sign up
                </Link>
                <Link className="btn lg ghost" href="/login">
                  Log in
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
