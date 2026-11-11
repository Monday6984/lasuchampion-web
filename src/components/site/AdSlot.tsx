import Link from 'next/link'

import { getActiveAds, mediaUrl } from '@/lib/data'

type Placement = 'home' | 'article' | 'sidebar'

/**
 * An advert slot. Shows a paid ad from Site settings → Ad slots when one is running for this
 * placement (several running ads take turns), otherwise LASU Champion's own "advertise with us" banner.
 */
export async function AdSlot({ placement }: { placement: Placement }) {
  const ads = await getActiveAds(placement)
  const ad = ads.length ? ads[Math.floor(Math.random() * ads.length)] : null
  const desktop = ad ? mediaUrl(ad.image, 'hero') : null
  const mobile = ad ? mediaUrl(ad.mobileImage, 'hero') : null

  return (
    <aside aria-label="Advertisement" className={`ad ad--${placement}`}>
      <span className="ad-label">Advertisement</span>
      {ad && desktop ? (
        <a href={ad.link} target="_blank" rel="sponsored noopener noreferrer" className="ad-paid">
          <picture>
            {mobile && <source media="(max-width: 640px)" srcSet={mobile} />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={desktop} alt={`Advertisement: ${ad.advertiser}`} loading="lazy" />
          </picture>
        </a>
      ) : (
        <HouseAd placement={placement} />
      )}
    </aside>
  )
}

/** LASU Champion's own banner: fills the slot until an advertiser books it. */
function HouseAd({ placement }: { placement: Placement }) {
  return (
    <Link href="/advertise" className={`house-ad house-ad--${placement}`}>
      <span className="house-ad__copy">
        <span className="house-ad__kicker">Advertise with LASU Champion</span>
        <span className="house-ad__title">
          {placement === 'home' ? 'Reach students, staff and alumni across LASU' : 'Your brand could be here'}
        </span>
        {placement !== 'article' && <span className="house-ad__sub">Website · Magazine · Champion TV · Celebrations</span>}
      </span>
      <span className="house-ad__cta">See ad options →</span>
    </Link>
  )
}
