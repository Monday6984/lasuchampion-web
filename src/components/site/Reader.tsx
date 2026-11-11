'use client'

import dynamic from 'next/dynamic'

import type { ReaderProps } from './MagazineReader'

// PDF.js only runs in the browser, so the reader is loaded client-side.
const MagazineReader = dynamic(() => import('./MagazineReader'), {
  ssr: false,
  loading: () => (
    <div className="reader-stage" style={{ marginBottom: 72 }}>
      <p style={{ color: '#D5DCE6' }}>Loading the magazine…</p>
    </div>
  ),
})

export function Reader(props: ReaderProps) {
  return <MagazineReader {...props} />
}
