import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

export type ViewKind = 'page' | 'post' | 'issue' | 'video'

const TIMEZONE = 'Africa/Lagos'

/** Today's date as YYYY-MM-DD in Lagos time, so a day's views line up with the newsroom's day. */
export const today = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)

export const daysAgo = (n: number) => today(new Date(Date.now() - n * 864e5))

// The Postgres adapter exposes Drizzle; raw SQL keeps the increment atomic under concurrent visits.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (payload: Payload) => (payload.db as any).drizzle as { execute: (q: unknown) => Promise<{ rows: any[] }> }

/** Adds one view for an item today. */
export async function recordView(payload: Payload, kind: ViewKind, docId: string | number) {
  await db(payload).execute(sql`
    insert into daily_views (kind, doc_id, day, count, updated_at, created_at)
    values (${kind}, ${String(docId)}, ${today()}, 1, now(), now())
    on conflict (kind, doc_id, day) do update set count = daily_views.count + 1, updated_at = now()
  `)
}

/** All-time totals for a set of items, as a map of id → views. */
export async function getViewTotals(payload: Payload, kind: ViewKind, ids: (string | number)[]) {
  const map = new Map<string, number>()
  if (!ids.length) return map
  const list = ids.map(String)
  const { rows } = await db(payload).execute(sql`
    select doc_id, sum(count)::int as total from daily_views
    where kind = ${kind} and doc_id in ${list}
    group by doc_id
  `)
  for (const row of rows) map.set(String(row.doc_id), Number(row.total))
  return map
}

/** Most viewed items over the last `days` days. */
export async function getTopViewed(payload: Payload, kind: ViewKind, days: number, limit: number) {
  const { rows } = await db(payload).execute(sql`
    select doc_id, sum(count)::int as total from daily_views
    where kind = ${kind} and day >= ${daysAgo(days - 1)}
    group by doc_id order by total desc limit ${limit}
  `)
  return rows.map((r) => ({ docId: String(r.doc_id), total: Number(r.total) }))
}

/** Total views of one kind over the last `days` days. */
export async function getViewsInPeriod(payload: Payload, kind: ViewKind, days: number, offsetDays = 0) {
  const { rows } = await db(payload).execute(sql`
    select coalesce(sum(count), 0)::int as total from daily_views
    where kind = ${kind} and day >= ${daysAgo(days - 1 + offsetDays)} and day <= ${daysAgo(offsetDays)}
  `)
  return Number(rows[0]?.total ?? 0)
}

/** Views per day for the last `days` days, oldest first, zero-filled. */
export async function getDailySeries(payload: Payload, kind: ViewKind, days: number) {
  const { rows } = await db(payload).execute(sql`
    select day, sum(count)::int as total from daily_views
    where kind = ${kind} and day >= ${daysAgo(days - 1)}
    group by day
  `)
  const byDay = new Map(rows.map((r) => [String(r.day), Number(r.total)]))
  return Array.from({ length: days }, (_, i) => {
    const day = daysAgo(days - 1 - i)
    return { day, value: byDay.get(day) ?? 0 }
  })
}
