import type { Payload } from 'payload'

/**
 * Starting content: the eight sections and their tags (the old site's 60+ categories, consolidated),
 * plus starting settings. Loaded the first time the site starts on an empty database, then never
 * again, so anything the club edits or deletes stays that way.
 *
 * Each section and tag lists the old WordPress category slugs it replaces, so old category links
 * redirect to the right place and the importer files old posts correctly.
 */
type TagDef = [name: string, slug: string, legacy?: string[]]
type SectionDef = {
  name: string
  slug: string
  description: string
  menu: boolean
  home: boolean
  legacy: string[]
  tags: TagDef[]
}

export const SECTIONS: SectionDef[] = [
  {
    name: 'Campus',
    slug: 'campus',
    description: "Academics, student life, sports, culture and events across LASU's campuses.",
    menu: true,
    home: true,
    legacy: ['news', 'campus-events', 'uncategorized', 'uncategorised'],
    tags: [
      ['Academic', 'academic'],
      ['Student Affairs', 'student-affairs'],
      ['Sports', 'sports', ['sports-lasu-news']],
      ['Religion', 'religion', ['religion-news']],
      ['Social', 'social'],
      ['Culture', 'culture'],
      ['Campus Politics', 'campus-politics', ['political']],
      ['Faculty Week', 'faculty-week', ['faculty-department-association-week']],
      ['Matriculation & Convocation', 'matriculation-convocation'],
      ['Seminars', 'seminars', ['seminar-symposium']],
    ],
  },
  {
    name: 'Aluta',
    slug: 'aluta',
    description: 'Unions, student government and the alumni: SU, ASUU, NASU, SSANU, NAAT, NANS.',
    menu: true,
    home: true,
    legacy: ['aluta-unionism'],
    tags: [
      ['Student Union', 'student-union'],
      ['ASUU', 'asuu'],
      ['NASU', 'nasu'],
      ['SSANU', 'ssanu'],
      ['NAAT', 'naat'],
      ['NANS', 'nans'],
      ['Alumni', 'alumni'],
    ],
  },
  {
    name: 'Special Reports',
    slug: 'special-reports',
    description: "In-depth reporting on the university's offices, services and facilities.",
    menu: true,
    home: true,
    legacy: ['special-reports'],
    tags: [
      ["VC's Office", 'office-of-the-vc', ['office-of-the-vice-chancellor']],
      ['Registrar', 'registrar', ['office-of-the-registrar']],
      ['Senate', 'senate'],
      ['Deans', 'deans', ['dean-of-faculties']],
      ['HODs', 'hods', ['head-of-departments']],
      ['Library', 'library'],
      ['Bookshop', 'bookshop'],
      ['Health', 'health', ['health-special-reports']],
      ['School Maintenance', 'school-maintenance'],
      ['Security', 'security', ['security-special-reports']],
    ],
  },
  {
    name: 'Politics',
    slug: 'politics',
    description: 'Federal, state and local government, the courts and traditional institutions.',
    menu: true,
    home: false,
    legacy: ['politics'],
    tags: [
      ['Federal Government', 'federal-government'],
      ['State Government', 'state-government'],
      ['Local Government', 'local-government', ['local-government-areas']],
      ['Judiciary', 'judiciary', ['judiciary-state-government']],
      ['Legislature', 'legislature'],
      ['State House of Assembly', 'state-house-of-assembly'],
      ['Traditional Institutions', 'traditional-institutions'],
    ],
  },
  {
    name: 'Celebrations',
    slug: 'celebrations',
    description: 'Birthdays, weddings, graduations, promotions, anniversaries and retirements across the LASU family.',
    menu: true,
    home: false,
    legacy: ['celebration'],
    tags: [
      ['Birthday', 'birthday'],
      ['Wedding', 'wedding', ['wedding-celebration']],
      ['Graduation', 'graduation'],
      ['Promotion', 'promotion'],
      ['Anniversary', 'anniversary'],
      ['Retirement', 'retirement'],
      ['Tributes', 'tributes', ['funeral']],
    ],
  },
  {
    name: 'Community',
    slug: 'community',
    description: 'The communities around LASU: housing, transport, markets, schools, culture and festivals.',
    menu: false,
    home: false,
    legacy: ['community'],
    tags: [
      ['Government Agencies', 'government-agencies'],
      ['Clubs & Associations', 'clubs-associations'],
      ['Housing', 'housing'],
      ['Trade & Investments', 'trade-and-investments'],
      ['Market', 'market'],
      ['Transportation', 'transportation'],
      ['Religious Organisations', 'religious-organisations', ['religious-organizations']],
      ['Schools', 'schools'],
      ['Culture & Traditions', 'culture-and-traditions'],
      ['Festivals', 'festivals'],
    ],
  },
  {
    name: 'Careers',
    slug: 'careers',
    description: 'Jobs, vacancies, NYSC and life after school.',
    menu: false,
    home: false,
    legacy: ['career'],
    tags: [
      ['Jobs & Vacancies', 'jobs', ['job-vacancies']],
      ['NYSC', 'nysc'],
    ],
  },
  {
    name: 'Lifestyle',
    slug: 'lifestyle',
    description: 'The world, travel, celebrities and technology.',
    menu: false,
    home: false,
    legacy: [],
    tags: [
      ['World', 'world'],
      ['Travel', 'travel', ['travel-world']],
      ['Celebrity', 'celebrity'],
      ['Technology', 'technology'],
    ],
  },
]

const adOptions = [
  { title: 'Website banners', blurb: 'Your banner on the homepage, inside stories or beside section pages.' },
  { title: 'Sponsored stories', blurb: 'A story about your business, event or programme, clearly labelled as sponsored.' },
  { title: 'Magazine pages', blurb: 'A full or half page in the LASU Champion magazine, read online and downloaded.' },
  { title: 'Celebration announcements', blurb: 'Birthdays, weddings, graduations and more, featured on the Celebrations page.' },
]

const social = [
  { label: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61572923066310' },
  { label: 'Instagram', url: 'https://www.instagram.com/lasu_champion' },
  { label: 'YouTube', url: 'https://www.youtube.com/@LASUChampionTV' },
  { label: 'X', url: 'https://x.com/LASUChampion' },
]

export async function loadSections(payload: Payload) {
  for (const [i, s] of SECTIONS.entries()) {
    const found = await payload.find({ collection: 'sections', where: { slug: { equals: s.slug } }, limit: 1, depth: 0 })
    const section =
      found.docs[0] ??
      (await payload.create({
        collection: 'sections',
        data: { name: s.name, slug: s.slug, description: s.description, menuOrder: i + 1, inMainMenu: s.menu, onHomepage: s.home, legacySlugs: s.legacy },
      }))
    for (const [name, slug, legacy] of s.tags) {
      const tag = await payload.find({
        collection: 'tags',
        where: { and: [{ section: { equals: section.id } }, { slug: { equals: slug } }] },
        limit: 1,
        depth: 0,
      })
      if (!tag.docs.length) await payload.create({ collection: 'tags', data: { name, slug, section: section.id, legacySlugs: legacy ?? [] } })
    }
  }
}

export async function loadDefaults(payload: Payload) {
  const settings = await payload.findGlobal({ slug: 'site-settings' })
  if (settings.defaultsLoaded) return

  await loadSections(payload)
  await payload.updateGlobal({
    slug: 'site-settings',
    context: { loadingDefaults: true },
    data: {
      adOptions: settings.adOptions?.length ? settings.adOptions : adOptions,
      social: settings.social?.length ? settings.social : social,
      contactEmail: settings.contactEmail || 'lasuchampion@gmail.com',
      partnersEmail: settings.partnersEmail || 'lasuchampion@gmail.com',
      replyTime: settings.replyTime || '2 working days',
      defaultsLoaded: true,
    },
  })
  payload.logger.info('Loaded starting content: sections, tags and settings.')
}
