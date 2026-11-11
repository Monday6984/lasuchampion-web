import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { ImportClient } from './ImportClient'
import { MembersImportClient } from './MembersImportClient'
import { OldViewsClient } from './OldViewsClient'

/** Admin page at /admin/import: bring members, stories (with comments) and view counts across from the old WordPress site. */
export function ImportView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, locale, permissions, visibleEntities } = initPageResult
  const user = req.user as { role?: string; collection?: string } | null
  if (!user) redirect('/admin/login?redirect=/admin/import')

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <div style={{ maxWidth: 860, paddingTop: 24, paddingBottom: 64 }}>
          <h1 style={{ marginBottom: 8 }}>Import from WordPress</h1>
          {user?.role === 'admin' && user.collection === 'users' ? (
            <>
              <p style={{ marginTop: 0 }}>
                Do it in this order: <strong>1. Members</strong>, then <strong>2. Stories</strong> (so old comments are linked to their writers&apos; new
                accounts), then <strong>3. Old view counts</strong>.
              </p>
              <h2 id="members" style={{ marginTop: 32, marginBottom: 8 }}>
                1. Members
              </h2>
              <MembersImportClient />
              <h2 id="stories" style={{ marginTop: 56, marginBottom: 8 }}>
                2. Stories
              </h2>
              <ImportClient />
              <h2 id="old-views" style={{ marginTop: 56, marginBottom: 8 }}>
                3. Old view counts
              </h2>
              <OldViewsClient />
            </>
          ) : (
            <p>Only admins can import from the old site.</p>
          )}
        </div>
      </Gutter>
    </DefaultTemplate>
  )
}

/** Sidebar link to the Import page. */
export function ImportNavLink() {
  return (
    <a href="/admin/import" className="nav__link" style={{ display: 'block', padding: '6px 0', textDecoration: 'none' }}>
      <span className="nav__link-label">Import from WordPress</span>
    </a>
  )
}
