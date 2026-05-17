# Maintainer documentation

## Specs

Full requirements, design (architecture, ERD, correctness properties, moderation flows), and tasks live under `.kiro/specs/artist-discovery-portal/`:

- `requirements.md`
- `design.md` - system architecture, data model, speciality theming, reported-photo moderation flow, testing strategy
- `tasks.md`

**PostHog** (client + server capture, `/api/ph` proxy, Session Replay, privacy): `.kiro/specs/posthog-analytics/` and operator notes in `.kiro/steering/posthog-admin-guide.md`.

## Product walkthrough (live)

After `npm run dev`, open **`/about`** for a maintainer-facing tour: USPs, illustrative colour cards, Unicode samples, plain-language sign-in steps, PostHog / privacy summary, admin notes, and links into the live app.

## Recent admin additions

- `/admin/reported-profiles` - moderation queue for open profile reports
- Durable `ProfilePhotoReport` records back the queue and repeat-offender counters
- Feature flag `admin-profile-photo-report-sorting` enables count-based triage

## Screenshots

See **`docs/screenshots/README.md`** for recommended captures, file naming, and when to refresh images in the repo (for release notes or the main `README.md`).

## Typography in docs

Use a spaced hyphen for asides in prose: `-` (ASCII hyphen). Do not use Unicode em dashes (`U+2014`).
