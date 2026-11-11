import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { MagazineView } from '@/components/site/MagazineView'
import { getIssueBySlug, mediaUrl } from '@/lib/data'

export const revalidate = 300

export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const issue = await getIssueBySlug((await params).slug)
  if (!issue) return {}
  const img = mediaUrl(issue.cover, 'cover')
  return {
    title: `Issue ${issue.issueNumber}: ${issue.title}`,
    description: issue.summary ?? undefined,
    openGraph: { title: issue.title, description: issue.summary ?? undefined, images: img ? [img] : [] },
  }
}

export default async function IssuePage({ params }: Props) {
  const issue = await getIssueBySlug((await params).slug)
  if (!issue) notFound()
  return <MagazineView issue={issue} />
}
