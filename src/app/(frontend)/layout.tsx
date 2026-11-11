import type { Metadata } from 'next'
import Script from 'next/script'
import React from 'react'

import { Footer } from '@/components/site/Footer'
import { Header } from '@/components/site/Header'
import { PageViewTracker } from '@/components/site/TrackView'

import './styles.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'LASU Champion — The Foremost Inter-Campus News Magazine', template: '%s · LASU Champion' },
  description: 'News, features and the magazine of LASU Champion Press Club: campus, unions, special reports, politics and celebrations at Lagos State University.',
  openGraph: { siteName: 'LASU Champion', type: 'website', images: ['/brand/og-default.jpg'] },
  twitter: { card: 'summary_large_image', site: '@LASUChampion' },
  icons: { apple: '/brand/apple-touch-icon.png' },
  alternates: { types: { 'application/rss+xml': '/rss.xml' } },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const umami = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Loaded as a stylesheet (not next/font) so builds never depend on fetching fonts. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Libre+Franklin:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&display=swap"
        />
      </head>
      <body>
        <a href="#content" className="sr-only">
          Skip to content
        </a>
        <div className="page">
          <Header />
          <main id="content">{children}</main>
          <Footer />
        </div>
        <PageViewTracker />
        {umami && <Script src="https://cloud.umami.is/script.js" data-website-id={umami} strategy="afterInteractive" />}
      </body>
    </html>
  )
}
