import React from 'react'

/* eslint-disable @next/next/no-img-element */

/** Login screen logo. */
export const Logo = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
    <span style={{ background: '#FFFFFF', borderRadius: 12, padding: 8, display: 'inline-flex' }}>
      <img src="/brand/lasu-champion-logo-sm.png" alt="LASU Champion" width={140} height={150} />
    </span>
    <span style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--theme-elevation-500)' }}>
      Newsroom
    </span>
  </div>
)

/** Small mark in the admin's top bar. */
export const Icon = () => (
  <span style={{ background: '#FFFFFF', borderRadius: 4, padding: 2, display: 'inline-flex' }}>
    <img src="/brand/lasu-champion-logo-sm.png" alt="LASU Champion" width={26} height={28} />
  </span>
)
