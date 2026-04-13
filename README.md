# 🎵 Carnatic Artist Portal

A portfolio and collaboration platform for Carnatic musicians in The Netherlands - built mobile-first as a Progressive Web App with speciality-based colour theming, full Indic script support, and a clean admin moderation layer.

> **Live demo:** visit `/about` after starting the dev server for a full maintainer walkthrough with live examples.

---

## What it does

| Audience | Capabilities |
|---|---|
| **Visitors** | Browse artist profiles, view bios, collab stats, and reviews |
| **Artists** | Manage portfolio, mark availability, search collaborators, create group chats (collabs), leave feedback |
| **Admins** | Approve/reject registrations, moderate chats, manage artists/specialities/collabs |

---

## Key USPs

### 🎨 Speciality-based colour theming
Every artist profile is visually themed by their instrument. Vocal → purple, Mridangam → red, Veena → green, Flute → blue, and so on. Multi-instrument artists get a CSS gradient blending all their colours. All colour combinations are WCAG AA compliant (≥4.5:1 contrast ratio), verified by property-based tests.

### 🌐 Indic script & Unicode support
Artists can write their bio, chat messages, and reviews in Tamil, Kannada, Telugu, Malayalam, Hindi/Devanagari, or any combination - including mixed-script paragraphs. The Tiptap rich-text editor accepts direct Unicode input. Google Fonts Noto family provides full glyph coverage with `font-display: swap` so rendering is beautiful without hurting performance.

### 🔒 Magic-link authentication
No passwords. Artists log in via a signed JWT link sent to their email (valid 72 hours). Sessions are 30-day signed JWTs validated by Edge middleware - no database round-trip on every request. Admin role is granted by listing an email in `ADMIN_EMAILS`.

### 🔍 Transparent search (no LLM)
Artist search uses a typeahead speciality picker + province dropdown + optional date range - all server-side SQL, no external API calls. Deliberately avoids LLM-based NLP to preserve user trust and keep the platform self-contained.

### 🌍 Multi-region extensibility
Deploy for Belgium, Singapore, or any country by swapping a GeoJSON file and a few env vars. No code changes needed. The home page map, language switcher, and date formats all update automatically.

### 📱 PWA-ready
Designed for Lighthouse PWA ≥90, Performance ≥85, Accessibility ≥90 on mobile. All touch targets ≥44×44px. Service Worker, Web App Manifest, and push notifications (VAPID) are in the implementation plan.

### 🧪 Property-based testing
28 formal correctness properties verified with `fast-check` (≥100 iterations each) covering auth token expiry, WCAG contrast ratios, search result correctness, feedback uniqueness, Unicode round-trips, and more.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL via [Neon](https://neon.tech) (serverless, no connection exhaustion) |
| ORM | Prisma with `@neondatabase/serverless` adapter |
| Auth | Custom magic-link (JWT via `jose` + Resend email) |
| File storage | Cloudflare R2 (S3-compatible, zero egress fees) |
| Cache/sessions | Cloudflare KV / Vercel KV |
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

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
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
| `/` | Home - stats, Singer/Instrumentalist of the Day, artist grid, active collabs |
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
| `/about` | Maintainer showcase - USPs, tech stack, live demos |

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

Current test coverage: **50 tests across 6 files** - all passing.

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
├── auth.ts            # Magic-link issuance + verification
├── session-jwt.ts     # JWT sign/verify (Edge-compatible)
├── db.ts              # Prisma singleton (Neon adapter)
├── storage.ts         # Cloudflare R2 helpers
├── speciality-theme.ts # getThemeForSpecialities() pure function
├── dummy-artists.ts   # Shared dummy data (12 artists)
└── admin-approval.ts  # Approve/reject + filterRegistrations()

components/
├── speciality-picker.tsx  # Typeahead speciality selector
└── sortable-table.tsx     # Reusable sortable table

prisma/
├── schema.prisma      # 16-entity schema
└── seed.ts            # Speciality colour palette seed

public/
└── geo/
    └── netherlands-provinces.geojson  # NL map data
```

---

## Deploying to Vercel

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add all env vars from `.env.example` in the Vercel dashboard
4. Set `DATABASE_URL` to your Neon **pooled** connection string
5. Set `DATABASE_URL_UNPOOLED` to the **direct** connection string (used by Prisma migrations)
6. Deploy - Prisma client is generated automatically during build

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
- `design.md` - architecture, ERD, Prisma schema, 28 correctness properties, testing strategy
- `tasks.md` - 28 implementation tasks with progress tracking

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Run tests before committing: `npm test`
4. Open a pull request

---

## Licence

MIT
