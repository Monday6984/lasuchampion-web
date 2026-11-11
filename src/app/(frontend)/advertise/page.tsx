import type { Metadata } from 'next'

import { EnquiryForm } from '@/components/site/EnquiryForm'
import { getSettings } from '@/lib/data'
import { telHref } from '@/lib/text'

export const revalidate = 300
export const metadata: Metadata = {
  title: 'Advertise with LASU Champion',
  description: 'Reach students, staff, alumni and the community around Lagos State University on the website, in the magazine and on Champion TV.',
}

export default async function AdvertisePage() {
  const s = await getSettings()
  const kit = s.mediaKit && typeof s.mediaKit === 'object' ? s.mediaKit.url : null
  return (
    <>
      <section className="wrap page-head">
        <span className="kick">Advertise</span>
        <h1 className="page-title">Reach the LASU community</h1>
        {s.partnerIntro && <p className="standfirst">{s.partnerIntro}</p>}
        {(s.audience ?? []).length > 0 && (
          <div className="stats">
            {(s.audience ?? []).map((a) => (
              <div key={a.id ?? a.label}>
                <strong>{a.value}</strong>
                <span>{a.label}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {(s.adOptions ?? []).length > 0 && (
        <section className="soft-band" aria-labelledby="ways-h">
          <div className="wrap section">
            <div className="band-head">
              <h2 id="ways-h">Ways to advertise</h2>
            </div>
            <div className="option-grid">
              {(s.adOptions ?? []).map((o) => (
                <div key={o.id ?? o.title} className="option">
                  <h3 className="hd hd-s">{o.title}</h3>
                  <p>{o.blurb}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="wrap section contact-layout" aria-labelledby="enq-h">
        <div className="contact-layout__side">
          <h2 id="enq-h" className="hd hd-l">
            Talk to us about advertising
          </h2>
          <p>Tell us what you&apos;d like to promote and when. We reply within {s.replyTime || '2 working days'}.</p>
          {s.whatsapp && (
            <a className="btn" href={`https://wa.me/${telHref(s.whatsapp).replace('+', '')}`} target="_blank" rel="noreferrer">
              Chat on WhatsApp
            </a>
          )}
          {s.partnersEmail && (
            <p>
              Or email <a href={`mailto:${s.partnersEmail}`}>{s.partnersEmail}</a>
            </p>
          )}
          {kit && (
            <p>
              <a href={kit} target="_blank" rel="noreferrer">
                Download the rate card (PDF)
              </a>
            </p>
          )}
        </div>
        <div className="contact-layout__form">
          <EnquiryForm types={['advertising']} />
        </div>
      </section>
    </>
  )
}
