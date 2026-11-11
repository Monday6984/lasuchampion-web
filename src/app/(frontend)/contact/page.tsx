import type { Metadata } from 'next'

import { EnquiryForm } from '@/components/site/EnquiryForm'
import { getSettings } from '@/lib/data'
import { telHref } from '@/lib/text'

export const revalidate = 300
export const metadata: Metadata = {
  title: 'Contact us',
  description: 'Get in touch with LASU Champion Press Club, or send us a story tip.',
}

export default async function ContactPage() {
  const s = await getSettings()
  return (
    <>
      <section className="wrap page-head">
        <h1 className="page-title">Contact us</h1>
        <p className="standfirst">Questions, corrections or a story we should know about? Send us a message.</p>
      </section>
      <section className="wrap section contact-layout" aria-label="Contact">
        <div className="contact-layout__side">
          {s.contactEmail && (
            <p>
              <span className="footer-label">Email</span>
              <br />
              <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>
            </p>
          )}
          {(s.phones ?? []).map((p) => (
            <p key={p.id ?? p.number}>
              <span className="footer-label">{p.label || 'Phone'}</span>
              <br />
              <a href={`tel:${telHref(p.number)}`}>{p.number}</a>
            </p>
          ))}
          {s.address && (
            <p style={{ whiteSpace: 'pre-line' }}>
              <span className="footer-label">Office</span>
              <br />
              {s.address}
            </p>
          )}
          {(s.social ?? []).length > 0 && (
            <p className="btn-row">
              {(s.social ?? []).map((x) => (
                <a key={x.id ?? x.url} className="btn ghost sm" href={x.url} target="_blank" rel="noreferrer">
                  {x.label}
                </a>
              ))}
            </p>
          )}
        </div>
        <div className="contact-layout__form">
          <EnquiryForm />
        </div>
      </section>
    </>
  )
}
