# LASU Champion

The website and newsroom for LASU Champion, the publication of the LASU Champion Press Club. Built with Next.js and Payload CMS, it runs on free plans: Vercel Hobby, Neon Postgres, Cloudflare R2 and Resend.

## What's on the site

| Page | Address | What it is |
| --- | --- | --- |
| Home | `/` | Lead story, latest stories, three section columns, celebrations, Champion TV, the current magazine, ambassador quotes and sign-up |
| Sections | `/campus`, `/campus/sports`, `/campus/page/2` | Each section, filtered by its tags |
| Stories | `/story-slug` | Stories live at the site root, as they did on WordPress, so old links keep working |
| Magazine | `/magazine`, `/magazine/<issue>` | Read each issue online, or download the PDF |
| Champion TV | `/tv` | Newest videos from the YouTube channel (Site settings → Champion TV) |
| About | `/about` | Mission, history, the current Press Club Excos and past sessions |
| Ambassadors | `/ambassadors` | Photos, short profiles and what each says about LASU Champion |
| Reporters | `/reporters`, `/reporters/<slug>` | Every reporter and their stories |
| Advertise, Contact | `/advertise`, `/contact` | Enquiry forms (emailed to the team, kept in the admin) |
| Members | `/signup`, `/login`, `/account`, `/members/<username>` | Reader accounts: profile, saved stories, comments, story alerts, celebration notices |
| Search, RSS | `/search`, `/rss.xml` | |

## Who does what

- **Admins** (staff accounts with role Admin) manage everything: sections and tags, settings, Excos, Ambassadors, magazine issues, comments, celebrations and members.
- **Reporters** (staff accounts with role Reporter) write, edit and publish their own stories. They can't change other people's stories. Untick **Active** to stop someone signing in; their stories stay up.
- **Members** are readers with an account. They can comment, save stories, choose story alerts and send celebration notices, which wait for an admin to approve. Members never see the admin.

The first staff account created becomes an admin.

## Sections and tags

The old site's 60+ categories become 8 sections, each with a few tags (`src/lib/defaults.ts`). They are created on the first start and can be edited under **Sections** and **Tags**. Each section and tag lists the old category slugs it replaces, so `/category/<old-slug>/` redirects to the right place.

## Emails

Resend's free plan allows 100 emails a day. The site shares one daily allowance (`DAILY_EMAIL_LIMIT`, default 90) across:

- **Instant alerts** sent when a story is published, to members who chose "Every new story" (untick *Email members* on a story to skip it).
- **The daily job** (`vercel.json`, 17:00 UTC, which is 6pm in Lagos). It sends alerts that didn't fit earlier, new-magazine notices, and the daily digest to members on "Daily digest" and to email-only subscribers.
- Password resets, celebration decisions, comment-reply notices and enquiry alerts.

Anything that doesn't fit today waits for tomorrow.

## Moving from WordPress

Use **Admin → Import from WordPress** in this order.

1. **Members.** Export users from the old site with a plugin such as "Export Users to CSV", including the BuddyPress profile fields. Passwords can't be copied, so members choose new ones. The import page sends set-password emails in daily batches, and anyone can use "Forgot your password?" at any time.
2. **Stories.** Upload the WordPress export (Tools → Export, .xml) or the saved `/wp-json/wp/v2/posts` pages. Categories map to sections and tags, authors become reporter accounts (inactive, with placeholder emails to update), images are copied, and comments come with them, linked to imported members by email.
3. **Old view counts** from Jetpack Stats, if the old site used it.

Old addresses keep working. Story slugs stay at the root; `/2024/05/slug/`, `/category/x/`, `/tag/x/`, `/author/x/` and `/feed/` are redirected by the catch-all route. BuddyPress pages (`/members/…`, `/activity`, `/register`, `/wp-login.php`) are redirected in `next.config.ts`.

## Run it locally

Needs Node 20.18+, pnpm and Postgres (`docker compose up -d` starts one).

```bash
pnpm install
cp .env.example .env      # fill DATABASE_URL, PAYLOAD_SECRET, NEXT_PUBLIC_SITE_URL=http://localhost:3000
pnpm dev                  # http://localhost:3000
```

Open `http://localhost:3000/admin` and create the first admin. Without R2 settings, uploads are stored in the `media/` folder.

## Deploy (all free plans)

1. **Neon.** Create a project and copy the pooled connection string into `DATABASE_URL`.
2. **Cloudflare R2.** Create a bucket (e.g. `lasuchampion-media`), turn on public access (r2.dev or a custom domain such as `media.lasuchampion.com`), and create an API token with Object Read & Write on it. Add this CORS rule so the admin can upload straight to R2 and the magazine reader can load PDFs:
   ```json
   [{ "AllowedOrigins": ["https://lasuchampion-web.vercel.app", "https://lasuchampion.com", "https://www.lasuchampion.com"], "AllowedMethods": ["GET", "HEAD", "PUT"], "AllowedHeaders": ["*"] }]
   ```
3. **Resend.** Verify a sending domain (e.g. `mail.lasuchampion.com`) and create an API key.
4. **Vercel.** Import this repo, add every variable from `.env.example`, and deploy. On the first start the tables are created (`src/migrations`) and the starting sections, tags and settings are added.
5. Open `/admin`, create the first admin, then fill in **Site settings** (About text, Exco session, contact details, social links).
6. Import from WordPress (above), then point the domain at Vercel.

Vercel's Hobby plan allows one scheduled job a day, which is all this site uses.

## Making changes to the content model

Edit `src/collections` or `src/globals`, then:

```bash
export R2_BUCKET=x R2_ACCESS_KEY_ID=x R2_SECRET_ACCESS_KEY=x R2_ACCOUNT_ID=x   # storage on, as in production
pnpm generate:types
pnpm payload migrate:create <short-name>   # commit the new file in src/migrations
```

Always generate with the R2 variables set: the storage adapter adds a column to `media`. Production applies new migrations on its next start. To regenerate the admin import map, use the same variables with `pnpm generate:importmap`.

## Staying inside the free limits

- Pages are cached, and refreshed every 5 minutes or as soon as a story is published. Member details load separately so pages stay cached.
- Images are resized once on upload and served from R2, so Vercel never transfers them.
- Export magazine PDFs for screen (about 150 dpi), ideally under 40 MB.

## Project layout

```
src/
  app/(frontend)/      public pages, member pages and actions, [...path] (sections, stories, old links), APIs
  app/(payload)/       the admin (generated by Payload)
  collections/         Posts (Stories), Sections, Tags, Issues, Media, Comments, Celebrations,
                       Users (staff), Members, Excos, Ambassadors, Enquiries, Subscribers, DailyViews
  globals/             Site settings, TV cache, email allowance
  components/site/     header, footer, story cards, comments, magazine reader, forms
  components/pages/    section and story pages
  components/admin/    admin Overview, logo, WordPress import
  lib/                 data queries, member sessions, email and alerts, old-link lookup, imports
  migrations/          database migrations applied in production
```
