# 🎵 Carnatic Artist Portal

A portfolio and collaboration platform for Carnatic musicians in The Netherlands - built mobile-first as a Progressive Web App with speciality-based colour theming, full Indic script support, and a clean admin moderation layer.

> **Live demo:** visit `/about` after starting the dev server for a full maintainer walkthrough with live examples.  
> **Docs index:** see [`docs/README.md`](docs/README.md) (specs, screenshot checklist, copy style).  
> **Screenshots:** add captures under [`docs/screenshots/`](docs/screenshots/) (see [`docs/screenshots/README.md`](docs/screenshots/README.md)) and link them here for release notes or the GitHub readme.

---

## What it does

| Audience | Capabilities |
|---|---|
| **Visitors** | Browse artist profiles, daily featured vocalist on the home page, bios, collab stats, and reviews |
| **Artists** | Manage portfolio, mark availability, search collaborators, create group chats (collabs), leave feedback |
| **Admins** | Approve/reject registrations, moderate chats, manage artists/specialities/collabs |

---

## Key USPs

### 🎨 Speciality-based colour theming
Every artist profile is visually themed by their **stored** speciality colours (same values as admin-seeded palette). **One** speciality: solid header. **Several** specialities with **distinct** colours: diagonal `linear-gradient` so multi-instrumentalists do not look identical to peers who share only the same first instrument. Directory cards, profile hero, home featured-artist fallback, and mini-cards all use `getThemeFromArtistSpecialities()` in `lib/speciality-theme.ts`. Public **profile** speciality pills use each row’s colour (not a single frosted style). The **`/about`** page includes **illustrative** example cards for **two** and **three** specialities (the **maximum** per artist). Tests cover `getThemeFromArtistSpecialities` alongside the name-based `getThemeForSpecialities()` helper. All combinations target WCAG AA contrast, verified by property-based tests.

### 🌐 Indic script & Unicode support
Artists can write their bio, chat messages, and reviews in Tamil, Kannada, Telugu, Malayalam, Hindi/Devanagari, or any combination - including mixed-script paragraphs. The Tiptap rich-text editor accepts direct Unicode input. Google Fonts Noto family provides full glyph coverage with `font-display: swap` so rendering is beautiful without hurting performance.

### 🔒 Magic-link authentication
No passwords. Artists log in via a signed JWT link sent to their email (valid 72 hours). Sessions are 30-day signed JWTs validated by Edge middleware - no database round-trip on every request. Admin role is granted by listing an email in `ADMIN_EMAILS`.

### ✨ Home spotlight

The landing page showcases **one vocalist per local calendar day** (timezone follows `DEPLOYMENT_REGION` / optional `DEPLOYMENT_TIMEZONE`). The card uses their **R2 profile photo** (letter fallback if the URL fails), links to their profile, and lists **active collabs** they own or join - up to four titles - with a short message when they have none. Optional `DailyFeatured` rows can override the automatic pick for a given day.

### 🔍 Transparent search (no LLM)
Artist search uses a typeahead speciality picker + province dropdown + optional date range - all server-side SQL, no external API calls. Deliberately avoids LLM-based NLP to preserve user trust and keep the platform self-contained.

### 🌍 Multi-region extensibility
Deploy for Belgium, Singapore, or any country by swapping a GeoJSON file and a few env vars. No code changes needed. The home page **Netherlands** province map (`components/artists-province-map.tsx`), language switcher, and date formats all update automatically. When a province has **no** listed artists, the side panel promotes **Join the portal** instead of an empty directory browse link.

### 🏠 Home marketing bundle
Homepage aggregates (totals, featured artist, province map inputs, preview grid) are loaded in **`lib/cache/home-marketing.ts`**. On **Cloudflare Workers** (OpenNext), `unstable_cache` is not used: it can break when incremental cache is not fully bound, so the module runs the DB bundle per request and uses **`revalidatePath("/")`** from **`revalidateHomeMarketing()`** after mutations (approvals, profile saves, collabs) to refresh the next view.

### 📱 PWA-ready
Designed for Lighthouse PWA ≥90, Performance ≥85, Accessibility ≥90 on mobile. All touch targets ≥44×44px. Service Worker, Web App Manifest, and push notifications (VAPID) are in the implementation plan.

### 🧪 Property-based testing
28 formal correctness properties verified with `fast-check` (≥100 iterations each) covering auth token expiry, WCAG contrast ratios, search result correctness, feedback uniqueness, Unicode round-trips, and more.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Hosting & deploy | [Cloudflare Workers](https://workers.cloudflare.com/) + [OpenNext](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`), [Wrangler](https://developers.cloudflare.com/workers/wrangler/) |
| Styling | Tailwind CSS |
| Database | PostgreSQL via [Neon](https://neon.tech) (serverless, no connection exhaustion) |
| ORM | Prisma with `@neondatabase/serverless` adapter |
| Auth | Custom magic-link (JWT via `jose` + Resend email) |
| File storage | Cloudflare R2 (S3-compatible, zero egress fees) |
| Cache/sessions | Cloudflare KV (optional; colocated on Cloudflare) |
| Rich text | Tiptap (ProseMirror-based, Unicode-safe) |
| Maps | D3.js + configurable GeoJSON |
| i18n | next-intl (JSON locale files) |
| Testing | Vitest + fast-check (property-based) + Playwright (E2E) |

---

## Local setup

### Prerequisites

- Node.js ≥18
- npm ≥9
- A [Neon](https://neon.tech) account (free tier is fine) - or any PostgreSQL instance

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/carnatic-artist-portal.git
cd carnatic-artist-portal
npm install
```

### 2. Configure environment variables

Copy `env.example` to `.env.local` and fill in the values:

```bash
cp env.example .env.local
```

Open `.env.local` and set at minimum:

```bash
# Required - get from your Neon project dashboard
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:password@host/dbname?sslmode=require

# Deployment config (these defaults work for local dev)
DEPLOYMENT_REGION=NL
DEPLOYMENT_NAME="Carnatic Artist Portal"
DEPLOYMENT_LOCALE_PRIMARY=en
DEPLOYMENT_LOCALE_SECONDARY=nl
DEPLOYMENT_MAP_GEOJSON_URL=/geo/netherlands-provinces.geojson
DEPLOYMENT_BRANDING_LOGO_URL=/assets/logo.svg

# Session signing secret - any random string ≥32 chars
SESSION_SECRET=change-me-to-a-random-32-char-string-in-production

# Admin emails - comma-separated list of emails that get admin role
ADMIN_EMAILS=your@email.com

# App URL (used in magic link emails)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# These can be left as placeholders for local browsing
# (only needed when the actual features are used)
RESEND_API_KEY=re_placeholder
VAPID_PUBLIC_KEY=placeholder
VAPID_PRIVATE_KEY=placeholder
VAPID_SUBJECT=mailto:admin@example.com
R2_ACCOUNT_ID=placeholder
R2_ACCESS_KEY_ID=placeholder
R2_SECRET_ACCESS_KEY=placeholder
R2_BUCKET_NAME=carnatic-artist-portal
R2_PUBLIC_URL=https://placeholder.example.com
KV_REST_API_URL=https://placeholder.example.com
KV_REST_API_TOKEN=placeholder
```

### 3. Set up the database

Generate the Prisma client and run migrations:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Seed the specialities table (12 Carnatic instruments with WCAG-compliant colours):

```bash
npx prisma db seed
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Dev shortcuts

Since magic-link email requires Resend to be configured, use these shortcuts for local development:

| URL | What it does |
|---|---|
| `/api/dev/login?role=admin` | Sets an admin session cookie → redirects to `/admin/dashboard` |
| `/api/dev/login?role=artist` | Sets an artist session cookie → redirects to `/dashboard` |

> These routes return 404 in production (`NODE_ENV === 'production'`).

---

## Key pages

| Path | Description |
|---|---|
| `/` | Home - stats, daily featured vocalist (photo + gradient fallback + active collab teasers), NL province map, preview grid |
| `/artists` | Artist directory with search (name, speciality, province) |
| `/artists/[slug]` | Artist profile - bio, collab stats, reviews, availability |
| `/register` | Artist registration form |
| `/auth/login` | Request magic link |
| `/dashboard` | Artist dashboard (auth required) |
| `/profile/edit` | Edit profile (auth required) |
| `/admin/dashboard` | Admin home (admin role required) |
| `/admin/registrations` | Review pending registrations |
| `/admin/artists` | Manage all artists |
| `/admin/collabs` | Moderate group chats |
| `/admin/specialities` | Manage speciality colour palette |
| `/about` | Maintainer showcase - USPs, speciality **colour examples** (2 and 3 instruments), Unicode samples, tech stack, live demos |

---

## Running tests

```bash
# Unit + property-based tests (Vitest + fast-check)
npm test

# Watch mode
npm run test:watch

# E2E tests (requires dev server running)
npm run test:e2e
```

Run `npm test` for the current count; unit and property-based tests live under `lib/__tests__/`.

---

## Project structure

```
app/
├── (public)/          # Unauthenticated routes
│   ├── page.tsx       # Home
│   ├── artists/       # Directory + [slug] profile
│   ├── register/      # Registration form
│   ├── auth/          # Login + verify
│   └── about/         # Maintainer showcase
├── (artist)/          # Auth-protected artist routes
│   ├── dashboard/
│   ├── profile/       # edit + availability
│   ├── search/
│   └── collabs/
├── (admin)/           # Admin-protected routes
│   └── admin/         # dashboard, registrations, artists, collabs, specialities
└── api/               # Route handlers

lib/
├── auth.ts              # Magic-link issuance + verification
├── session-jwt.ts       # JWT sign/verify (Edge-compatible)
├── db.ts                # Prisma singleton (Neon adapter)
├── storage.ts           # Cloudflare R2 helpers
├── speciality-theme.ts  # getThemeFromArtistSpecialities() + getThemeForSpecialities()
├── cache/
│   └── home-marketing.ts # Home page DB bundle + revalidatePath via revalidateHomeMarketing()
├── dummy-artists.ts     # Shared dummy data (12 artists)
└── admin-approval.ts    # Approve/reject + filterRegistrations()

components/
├── artists-province-map.tsx  # NL map, province side panel (empty-state Join CTA)
├── artist-mini-card.tsx       # Compact cards (multi-speciality chips + theme)
├── featured-artist-photo.tsx  # Spotlight photo + gradient initial fallback
├── speciality-picker.tsx      # Typeahead speciality selector
└── sortable-table.tsx         # Reusable sortable table

prisma/
├── schema.prisma      # 16-entity schema
└── seed.ts            # Speciality colour palette seed

public/
└── geo/
    └── netherlands-provinces.geojson  # NL map data
```

---

## Deploying to Cloudflare (OpenNext + Workers)

The app is built for production with **Next.js** (`npm run build`, `output: "standalone"`), then packaged and deployed with the **OpenNext Cloudflare** adapter to **Cloudflare Workers**. Configuration lives in `wrangler.jsonc` and `open-next.config.ts`.

### Workers Builds (Git-connected)

1. Connect the repo in the [Cloudflare dashboard](https://dash.cloudflare.com/) (Workers & Pages → your project → Builds).
2. **Build command:** `npm run build`
3. **Deploy command:** `npm run deploy:cf`  
   This runs `opennextjs-cloudflare build --skipNextBuild` (consumes the `.next` output from the build step) and then `opennextjs-cloudflare deploy` with **`--keep-vars`** so Wrangler does not remove [runtime variables](https://developers.cloudflare.com/workers/configuration/environment-variables/) you set only in the dashboard.
4. **PostHog:** `POSTHOG_HOST` is set in `wrangler.jsonc` (`vars`) so the `/api/ph` proxy always has an ingest URL at runtime. For **PostHog Cloud US**, change it to `https://us.i.posthog.com`. If you rely on dashboard-only vars for other secrets, keep using `--keep-vars` (already in the npm scripts).
5. **Non-production uploads (optional):** e.g. `opennextjs-cloudflare build --skipNextBuild && opennextjs-cloudflare upload` for version uploads / preview pipelines.
6. Add variables from `env.example` under **Build variables and secrets** for the Next.js build (`NEXT_PUBLIC_*`, etc.).
7. **`DEPLOYMENT_*` branding:** Netherlands defaults (`DEPLOYMENT_REGION`, `DEPLOYMENT_NAME`, locales, GeoJSON path, logo URL) are declared in **`wrangler.jsonc`** (`vars`) so Workers runtime gets them - Cloudflare does **not** inject your laptop `.env` into the Worker. Override in the dashboard for another country or forked branding.
8. Under the Worker’s **Variables and secrets** (runtime), set **`DATABASE_URL`** (Neon **pooled** string), `SESSION_SECRET`, and any other secrets the app reads at request time. If runtime `DATABASE_URL` is missing, database-backed routes return **500**. Wrangler deploy without `--keep-vars` can delete dashboard-only secrets - the deploy scripts pass **`--keep-vars`** so re-add secrets once if needed.
9. **R2 uploads (registration, profile photos):** The app expects `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` as plaintext **vars** and `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` as **Secrets**, all on **this** Worker. Put plaintext in **`wrangler.jsonc`** (`vars`) and use `wrangler secret put` for keys so CLI deploys match the dashboard. **`lib/storage.ts`** reads `process.env` first, then the Workers virtual module **`cloudflare:workers`** (`env`) so API routes see **Secrets** even when they do not appear on `process.env` inside OpenNext’s Node-compat isolate.
10. Use the **direct** (non-pooled) URL for `prisma migrate deploy` in CI or locally (`DATABASE_URL_UNPOOLED` / `directUrl` in Prisma).
11. Ensure Prisma client is generated during install/build (`npx prisma generate` in postinstall or build if needed).

### Local preview (Workers runtime)

```bash
npm run build
npm run preview:cf
```

### One-shot full build + deploy (CLI)

```bash
npm run deploy:cf:full
```

Requires Wrangler authentication (`wrangler login` or `CLOUDFLARE_API_TOKEN` in CI).

---


## Deploying for a different country

To deploy for Belgium or Singapore, only config changes are needed:

```bash
DEPLOYMENT_REGION=BE
DEPLOYMENT_NAME="Carnatic Artist Portal Belgium"
DEPLOYMENT_LOCALE_PRIMARY=en
DEPLOYMENT_LOCALE_SECONDARY=fr   # or nl
DEPLOYMENT_MAP_GEOJSON_URL=/geo/belgium-provinces.geojson
```

Then add `public/geo/belgium-provinces.geojson` with Belgian province boundaries and `messages/fr.json` with French translations. No application code changes required.

---

## Spec documentation

Full requirements, design, and implementation plan are in `.kiro/specs/carnatic-artist-portal/`:

- `requirements.md` - 19 requirements with EARS-pattern acceptance criteria
- `design.md` - architecture, ERD, Prisma schema, speciality theming contracts, 28 correctness properties, testing strategy
- `tasks.md` - 28 implementation tasks with progress tracking

Shorter entry points: [`docs/README.md`](docs/README.md) and in-app **`/about`**.

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Run tests before committing: `npm test`
4. Open a pull request

---

## Licence

MIT
