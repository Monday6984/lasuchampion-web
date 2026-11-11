import Link from 'next/link'

import { getSections, getSettings } from '@/lib/data'
import { telHref } from '@/lib/text'

import { FooterSignup } from './FooterSignup'

export async function Footer() {
  const [settings, sections] = await Promise.all([getSettings(), getSections()])
  return (
    <footer className="site-footer">
      <div className="wrap footer-top">
        <FooterSignup />
      </div>
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <span className="wordmark" aria-label="LASU Champion">
            <span className="wordmark__a">LASU</span> <span className="wordmark__b">CHAMPION</span>
          </span>
          <span>A publication of LASU Champion Press Club · © {new Date().getFullYear()}</span>
          {(settings.contactEmail || settings.phones?.length) && (
            <address className="footer-contact">
              {settings.contactEmail && <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>}
              {(settings.phones ?? []).map((p) => (
                <a key={p.id ?? p.number} href={`tel:${telHref(p.number)}`}>
                  {p.number}
                  {p.label && <span className="footer-phone-label">{p.label}</span>}
                </a>
              ))}
            </address>
          )}
        </div>
        <nav aria-label="Sections" className="footer-col">
          <span className="footer-label">Sections</span>
          {sections.map((s) => (
            <Link key={s.id} href={`/${s.slug}`}>
              {s.name}
            </Link>
          ))}
        </nav>
        <nav aria-label="LASU Champion" className="footer-col">
          <span className="footer-label">LASU Champion</span>
          <Link href="/magazine">Magazine</Link>
          <Link href="/tv">Champion TV</Link>
          <Link href="/about">About</Link>
          <Link href="/ambassadors">Ambassadors</Link>
          <Link href="/reporters">Our Reporters</Link>
          <Link href="/advertise">Advertise</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <nav aria-label="Follow" className="footer-col">
          <span className="footer-label">Follow</span>
          {(settings.social ?? []).map((s) => (
            <a key={s.id ?? s.url} href={s.url} target="_blank" rel="noreferrer">
              {s.label}
            </a>
          ))}
          <a href="/rss.xml">RSS</a>
          <a href="/admin">Staff login</a>
        </nav>
      </div>
    </footer>
  )
}
