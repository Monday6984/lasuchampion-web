/**
 * The founder's account of how LASU Champion began, and the people who launched it.
 * Text from "About LASU Champion" by Adetunji S. Adeyanju. Photos live in /public/about.
 */

export const founder = {
  name: 'Adetunji S. Adeyanju',
  title: 'Founder, LASU Champion Press Club',
  photo: '/about/adetunji-adeyanju.jpg',
}

export const story: string[] = [
  'The LASU Champion Press Club (LCPC), publishers of LASU Champion Magazine and owners of LASU Champion TV, is the realization of a vision I conceived as far back as 1987.',
  "The vision began with the publication of my first articles in prominent Nigerian newspapers, including the Daily Times, The Punch, and Daily Champion. One of these articles called for the lifting of the ban on student unionism at Lagos State University (LASU). My appeal was particularly significant because I believed that restoring student unionism would be a fitting way to commemorate the university's first convocation.",
  "The encouraging response to my articles inspired me to become more actively involved in campus journalism. I committed myself to writing and publishing articles about developments at LASU's Ojo campus at least twice a week. Within a short period, my confidence grew, and my name became increasingly associated with public discourse on important issues affecting the university.",
  "Some of my notable articles included LASUites Anticipate Good Harvest, Restore Student Unionism to LASU, Appoint VC for LASU, Task for LASU VC, My Dream for LASU, and Barry's Newest Award, among others.",
  "These self-imposed responsibilities, driven by my passion for writing and advocacy, contributed immensely to my personal growth and self-discovery as a student. They also complemented my leadership experience as President of my departmental association, NAPHERLASU, from 1987 to 1988, and President of my faculty association, NUESALASU, then the university's most populous faculty association, from 1989 to 1990.",
  'The climax of my campus journalism journey came with the launch of two publications: The Cries of LASUites in 1989 and LASU Champion Magazine in 1990.',
  'The Cries of LASUites was launched by the late Akran of Badagry, De Wheno Aholu Menu Toyi I, while LASU Champion Magazine was launched by the first Executive Governor of Lagos State, His Excellency, the late Alhaji Lateef Kayode Jakande, who was ably represented by the late Professor Femi Agbalajobi, the Social Democratic Party (SDP) governorship candidate for Lagos State.',
  'Both launch ceremonies took place at the LASU auditorium near Badagry Gate, a facility now occupied by Theatre Arts students.',
  "Among the many experiences that shaped my years at LASU, two remain particularly memorable: my unlawful disqualification from contesting the presidency of the Lagos State University Students' Union (LASUSU) and the rare privilege of receiving a personal invitation from the then Vice-Chancellor, Professor Jadesola Akande, of blessed memory, to discuss developments at the university in her office.",
  'Approximately 35 years after graduating from the prestigious Lagos State University, I returned to revive a vision that had remained close to my heart.',
  'I sincerely appreciate the Dean of Student Affairs, Professor Abiodun Fatai Abatan, and his team for their visionary leadership, encouragement, and support, which facilitated the revival of LASU Champion Magazine and the formal registration of the LASU Champion Press Club.',
  'Official approval was granted on March 19, 2025, marking a significant milestone in the rebirth of a vision conceived nearly four decades earlier.',
]

/** Closing lines, shown under the story as the sign-off. */
export const signOff = ['LASU Champion: Priding in the company of World Changers!', 'To Make LASU Great Is a Task That Must Be Done!']

/** The opening paragraphs shown before "Read the full story". */
export const storyIntroCount = 3

type Milestone = { year: string; title: string; text: string; person?: { name: string; role: string; photo: string } }

export const milestones: Milestone[] = [
  { year: '1987', title: 'The vision', text: 'First articles in the Daily Times, The Punch and Daily Champion, including a call to restore student unionism at LASU.' },
  { year: '1989', title: 'The Cries of LASUites', text: 'Launched by the late Akran of Badagry at the LASU auditorium near Badagry Gate.' },
  { year: '1990', title: 'LASU Champion Magazine', text: 'Launched by the late Alhaji Lateef Kayode Jakande, first Executive Governor of Lagos State.' },
  {
    year: '2025',
    title: 'The revival',
    text: 'LASU Champion Press Club officially approved on 19 March 2025, with the support of the Dean of Student Affairs and his team.',
    person: { name: 'Professor Abiodun Fatai Abatan', role: 'Dean of Student Affairs', photo: '/about/abiodun-fatai-abatan.jpg' },
  },
]

export const patrons = [
  {
    name: 'His Royal Majesty, the late De Wheno Aholu Menu-Toyi I',
    role: 'The Akran of Badagry',
    note: 'Launched The Cries of LASUites in 1989.',
    photo: '/about/akran-of-badagry.jpg',
  },
  {
    name: 'His Excellency, the late Alhaji Lateef Kayode Jakande',
    role: 'First Civilian Governor of Lagos State',
    note: 'Launched LASU Champion Magazine in 1990, represented by the late Professor Femi Agbalajobi.',
    photo: '/about/lateef-jakande.jpg',
  },
  {
    name: 'Professor Jadesola Akande, of blessed memory',
    role: 'Vice-Chancellor, Lagos State University',
    note: 'Invited the founder to her office to discuss developments at the university.',
    photo: '/about/jadesola-akande.jpg',
  },
]
