import type { Metadata } from 'next'

import { MagazineView } from '@/components/site/MagazineView'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Magazine',
  description: 'Read the LASU Champion magazine online or download it, and browse every past issue.',
}

export default function MagazinePage() {
  return <MagazineView issue={null} />
}
