import { getSections, getSettings, getStories } from '@/lib/data'

import { HeaderClient } from './HeaderClient'

/** Top bar, masthead and section menu on every page. */
export async function Header() {
  const [sections, settings, latest] = await Promise.all([getSections(), getSettings(), getStories({ limit: 6, views: false })])
  return (
    <HeaderClient
      sections={sections.map((s) => ({ name: s.name, slug: s.slug ?? '', main: s.inMainMenu !== false }))}
      ticker={settings.showTicker === false ? [] : latest.docs.map((p) => ({ title: p.title, slug: p.slug ?? '' }))}
    />
  )
}
