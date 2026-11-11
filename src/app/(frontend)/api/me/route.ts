import { NextResponse } from 'next/server'

import { getMember } from '@/lib/member'

export const dynamic = 'force-dynamic'

/** The logged-in member's display details (or null), read by the header and story pages in the browser. */
export async function GET() {
  const m = await getMember()
  const member = m
    ? {
        id: m.id,
        name: m.name,
        username: m.username ?? '',
        saved: (m.savedStories ?? []).map((s) => (typeof s === 'object' ? s.id : s)),
        blocked: Boolean(m.blocked),
      }
    : null
  return NextResponse.json({ member }, { headers: { 'Cache-Control': 'private, no-store' } })
}
