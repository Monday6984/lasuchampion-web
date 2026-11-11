/** One WordPress post as the importer receives it, whether read from an export file, a .json file or the site's API. */
export type WpPost = {
  wpId: string
  title: string
  slug: string
  date: string // ISO
  status: string // publish | draft | private | future | pending
  link: string
  html: string
  excerpt: string
  author: string
  categories: { name: string; slug: string }[]
  tags: string[]
  featuredUrl: string | null
  siteUrl: string
  /** Approved comments, when read from an export file. From the site's address they are fetched during the import. */
  comments?: WpComment[]
}

export type WpComment = {
  id: string
  parentId: string
  author: string
  email: string
  date: string // ISO
  content: string
}
