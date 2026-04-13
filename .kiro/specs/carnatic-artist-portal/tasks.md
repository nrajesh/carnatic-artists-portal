# Implementation Plan: Carnatic Artist Portal

## Overview

Implement the Carnatic Artist Portal as a Next.js 14 (App Router) TypeScript PWA. Tasks are ordered to build foundational infrastructure first, then core data models, authentication, public-facing features, artist-authenticated features, admin features, and finally PWA/i18n/accessibility polish. Each task builds on the previous and ends with all code wired together.

## Tasks

- [x] 1. Project scaffolding and deployment configuration
  - Initialise Next.js 14 App Router project with TypeScript and Tailwind CSS
  - Create `deployment.config.ts` and load all deployment-specific values (region, name, locales, map GeoJSON URL, branding) from environment variables - no hard-coded values
  - Add `.env.example` documenting all required environment variables (`DATABASE_URL`, `RESEND_API_KEY`, `VAPID_*`, `R2_*`, `KV_*`, etc.)
  - Set up ESLint, Prettier, and Vitest with `fast-check` for property-based testing
  - Configure Playwright for E2E tests
  - _Requirements: 16.1, 16.7_

- [x] 2. Database schema and migrations
  - [x] 2.1 Write Prisma schema covering all entities: `Artist`, `Speciality`, `ArtistSpeciality`, `ExternalLink`, `RegistrationRequest`, `RegistrationSpeciality`, `RegistrationLink`, `MagicLinkToken`, `Session`, `AvailabilityEntry`, `Collab`, `CollabMember`, `CollabMessage`, `Feedback`, `Notification`, `DailyFeatured`
    - Include all fields, types, relations, and unique constraints as specified in the design ERD and Prisma schema
    - Configure Prisma with `@neondatabase/serverless` adapter; use pooled endpoint for serverless functions and direct endpoint for migrations
    - _Requirements: 1.2, 1.3, 3.1, 6.1, 8.1, 9.1, 11.1, 15.9_
  - [x] 2.2 Create seed script populating `Speciality` table with all named specialities (Vocal, Violin, Mridangam, Veena, Flute, Ghatam, Kanjira, Thavil, Nadaswaram, and others) with `primaryColor` and contrast-safe `textColor` values
    - _Requirements: 5.1_
  - [x]* 2.3 Write property test for speciality colour contrast invariant
    - **Property 11: Speciality colour contrast invariant**
    - **Validates: Requirements 5.5**
    - For every seeded Speciality, assert WCAG relative luminance contrast ratio between `textColor` and `primaryColor` is ≥ 4.5:1

- [x] 3. Speciality theming service
  - [x] 3.1 Implement `getThemeForSpecialities(specialities: string[])` pure function returning CSS gradient/solid background, text colour, and accent colour
    - Single speciality → solid primary colour; multiple → CSS gradient blending all primary colours
    - _Requirements: 4.5, 4.6, 5.2, 5.3, 5.4_
  - [x]* 3.2 Write property test for speciality colour theme correctness
    - **Property 10: Speciality colour theme correctness**
    - **Validates: Requirements 4.5, 4.6, 5.2, 5.3, 5.4**
    - Generate random single and multi-speciality combinations; assert dominant colour and gradient references match all listed specialities

- [x] 4. File storage service (Cloudflare R2)
  - Implement upload, download, and delete helpers using `@aws-sdk/client-s3` pointed at the R2 endpoint
  - Enforce 5 MB size limit and accepted MIME type list for photos; return structured errors (413, 415, 503) on failure
  - _Requirements: 1.2, 3.4_

- [x] 5. Authentication service - magic link
  - [x] 5.1 Implement `issueMagicLink(email)`: generate cryptographically random token, store hashed in `MagicLinkToken` with `expiresAt = now + 72 h`, send email via Resend, and call `invalidatePriorTokens(artistId)` to invalidate all prior unused tokens for that artist
    - _Requirements: 2.3, 2.5, 12.1, 12.2_
  - [x] 5.2 Implement `verifyMagicLink(token)`: look up token hash, reject if expired or already used, mark as used, create `Session` with `expiresAt = now + 30 days`, return session
    - _Requirements: 2.6, 2.7, 12.3_
  - [x] 5.3 Implement Edge Middleware (`middleware.ts`) to validate session cookie on all `(artist)` and `(admin)` routes; redirect unauthenticated requests to `/auth/login`
    - _Requirements: 12.4, 12.5_
  - [x]* 5.4 Write property test for magic link token expiry invariant
    - **Property 6: Magic link token expiry invariant**
    - **Validates: Requirements 2.5**
    - Generate random issuance timestamps; assert `expiresAt === issuedAt + 72 h` for every issued token
  - [x]* 5.5 Write property test for magic link invalidation on re-issue
    - **Property 20: Magic link invalidation on re-issue**
    - **Validates: Requirements 12.2**
    - Generate artists with multiple prior unused tokens; assert all prior tokens are invalidated before new token is issued
  - [x]* 5.6 Write property test for session expiry invariant
    - **Property 21: Session expiry invariant**
    - **Validates: Requirements 12.3**
    - Generate random session creation timestamps; assert `expiresAt === createdAt + 30 days`

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Registration request feature
  - [x] 7.1 Build `app/(public)/register/page.tsx` registration form with all mandatory fields (full name, email, contact number, contact-type toggle/radio alongside contact number, profile photo, 1–3 specialities) and optional fields (background image, website URLs, LinkedIn, Instagram, Facebook, Twitter/X, YouTube, bio rich text via Tiptap)
    - Hide/disable "Add Speciality" control once 3 specialities are selected
    - Display field-level validation errors without submitting when mandatory fields are missing or invalid
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8_
  - [x] 7.2 Implement `POST /api/registrations` server action: validate all mandatory fields, upload profile photo and background image to R2, persist `RegistrationRequest` + `RegistrationSpeciality` + `RegistrationLink` rows, create `Notification` records for all Admin accounts, return confirmation
    - _Requirements: 1.6, 1.7, 1.9_
  - [x]* 7.3 Write property test for registration mandatory-field validation
    - **Property 1: Registration mandatory-field validation**
    - **Validates: Requirements 1.2, 1.7**
    - Generate random subsets of missing mandatory fields; assert every such submission is rejected with field-level errors and no data is persisted
  - [x]* 7.4 Write property test for registration data round-trip
    - **Property 2: Registration data round-trip**
    - **Validates: Requirements 1.6, 1.8**
    - Generate random valid registration payloads; assert stored record contains exactly the submitted values with no field loss or corruption
  - [x]* 7.5 Write property test for admin notification on registration
    - **Property 3: Admin notification on registration**
    - **Validates: Requirements 1.9**
    - Generate random admin counts; assert every admin has a notification record for each successfully submitted registration

- [x] 8. Admin approval workflow
  - [x] 8.1 Build `app/(admin)/registrations/page.tsx` listing all pending `RegistrationRequest` records with search/filter by status (pending, approved, rejected) and submission date
    - _Requirements: 2.1, 2.2, 2.8_
  - [x] 8.2 Build `app/(admin)/registrations/[id]/page.tsx` showing full applicant details with Approve and Reject actions
    - _Requirements: 2.2_
  - [x] 8.3 Implement approve action: create `Artist` record from registration data, call `issueMagicLink`, mark request as approved
    - _Requirements: 2.3_
  - [x] 8.4 Implement reject action: mark request as rejected, do not create Artist record
    - _Requirements: 2.4_
  - [x] 8.5 Build `app/(public)/auth/login/page.tsx` (request new login link) and `app/(public)/auth/verify/page.tsx` (magic link verification landing page); handle expired/used/invalid token states with appropriate UI messages and "Request new link" CTA
    - _Requirements: 2.6, 2.7_
  - [x]* 8.6 Write property test for approval creates artist and token
    - **Property 4: Approval creates artist and token**
    - **Validates: Requirements 2.3**
    - Generate random pending requests; assert approval creates exactly one Artist and one valid non-expired non-used MagicLinkToken
  - [x]* 8.7 Write property test for rejection does not create artist
    - **Property 5: Rejection does not create artist**
    - **Validates: Requirements 2.4**
    - Generate random pending requests; assert rejection sets status to "rejected" and creates no Artist record
  - [x]* 8.8 Write property test for registration request filter correctness
    - **Property 7: Registration request filter correctness**
    - **Validates: Requirements 2.8**
    - Generate random request sets with varying statuses and dates; assert every result satisfies all applied filter criteria and no matching result is omitted

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Artist profile management
  - [x] 10.1 Build `app/(artist)/profile/edit/page.tsx` with all editable fields: full name, email, contact number, contact-type toggle, profile photo, background image, province (mandatory), 1–3 specialities via `SpecialityPicker` typeahead, bio rich text (Tiptap), external links. Live profile preview strip. "Reviews I've Written" section with edit links.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 10.2 `PUT /api/profile` server action designed; client-side save with validation and success toast implemented (DB wiring pending)
    - _Requirements: 3.6, 3.7, 3.8_
  - [ ]* 10.3 Write property test for profile update round-trip
    - **Property 8: Profile update round-trip**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 3.8**
    - Generate random valid profile update payloads; assert updated values are immediately retrievable from both the profile management interface and the public profile page
  - [ ]* 10.4 Write property test for profile mandatory-field validation on save
    - **Property 9: Profile mandatory-field validation on save**
    - **Validates: Requirements 3.7**
    - Generate profile updates with random mandatory fields cleared or with >3 specialities; assert rejection with field-level validation error and no data persisted

- [x] 11. Public artist directory and profile pages
  - [x] 11.1 Build `app/(public)/artists/page.tsx` - URL-based search (name, speciality typeahead, province), filter chips, results count, "Open to collab" badge, empty state
    - _Requirements: 4.1, 4.2, 4.7, 4.8, 4.9_
  - [x] 11.2 Build `app/(public)/artists/[slug]/page.tsx` - hero gradient, collab stats, bio, collab history, availability (gated for visitors), paginated reviews (5/page) with stable anchor IDs (`rv-{reviewed}-{reviewer}-{collab}`), edit button for reviewer/admin, external links
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 5.2, 14.3, 18.5, 18.6, 18.8_
  - [x] 11.3 `SpecialityPicker` typeahead component and `SortableTable` component built and reused across the app
    - _Requirements: 4.5, 5.2_

- [x] 12. Availability calendar - UI stub complete; API wiring pending
  - [x] 12.1 Availability dates shown on artist dashboard and public profile (gated)
    - _Requirements: 6.1, 6.2_
  - [ ] 12.2 Implement availability CRUD API endpoints
  - [ ]* 12.3 Write property test for availability calendar round-trip

- [x] 13. Artist search - public directory with client-side filtering complete; DB-backed search ready to wire
  - [x] 13.1–13.3 `/artists` page with name, speciality typeahead, province filters; URL-based (shareable); `ArtistsSearch` client component
    - _Requirements: 7.1–7.11_
  - [ ]* 13.4–13.5 Property tests pending

- [x] 14. Checkpoint - 50 tests passing (6 test files)

- [x] 15. Collab - UI and dummy data complete; API wiring pending
  - [x] 15.1–15.5 Collab list, detail, message history pages; slug-based URLs; status badges
    - _Requirements: 8.1–8.9_
  - [ ] 15.6 API endpoints and property tests pending

- [x] 16. Collab chat interface - UI complete; SSE/real-time pending
  - [x] 16.1 Admin collab detail with message history, member list, admin-visibility notice
    - _Requirements: 8.5, 10.3_
  - [ ] 16.2–16.4 SSE endpoint, message persistence, property tests pending

- [x] 17. Collab lifecycle - status display complete; close/feedback API pending
  - [x] 17.1–17.3 Status badges throughout; lifecycle rules documented
  - [ ] 17.4 API endpoints and property tests pending

- [x] 18. Artist feedback system - display complete; submission API pending
  - [x] 18.1–18.4 Reviews on public profiles: stable anchor IDs, pagination, permalink `#`, edit button for reviewer/admin
    - _Requirements: 11.1–11.4_
  - [ ] 18.5–18.7 Feedback submission API and property tests pending

- [x] 19. Checkpoint - All tests pass

- [x] 20. Admin dashboard and moderation - all pages built with dummy data; DB wiring pending
  - [x] 20.1 Admin dashboard (`/admin/dashboard`) with navigation cards
  - [x] 20.2 Collab moderation (`/admin/collabs`) - sortable table, message history detail
  - [x] 20.3–20.4 Message delete and artist suspend - UI stubs; API pending
  - [x] 20.5 Speciality management (`/admin/specialities`) - colour-coded cards, artist counts
  - [x] 20.6 Artist management (`/admin/artists`) - sortable table; artist detail page with bio, availability, collab history, reviews
  - [x] 20.7 Artist deletion - UI confirmation prompt; API pending
  - [x] 20.8 Collab management - sortable table with owner, member count, message count, status

- [x] 21. Home page - built with dummy data; D3 map and daily rotation pending
  - [x] 21.1 Stats (total artists, seeking collab, active collabs), Singer/Instrumentalist of the Day, artist grid, collab list, dev shortcuts
    - _Requirements: 15.1–15.8_
  - [ ] 21.2 Daily featured artist rotation (DB cron) pending
  - [ ] 21.3–21.5 Property tests pending

- [ ] 22. Push notifications - pending

- [ ] 23. i18n and localisation - `messages/en.json` and `messages/nl.json` scaffolded; next-intl wiring pending

- [ ] 24. Indic script and Unicode support - Tiptap configured with `immediatelyRender: false`; Noto font loading pending

- [ ] 25. PWA implementation - pending

- [ ] 26. Accessibility and SEO - pending

- [ ] 27. Multi-region extensibility - `deployment.config.ts` and all env vars implemented; NL GeoJSON stub in place

- [ ] 28. Final checkpoint - pending

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints at tasks 6, 9, 14, 19, and 28 ensure incremental validation
- Property tests (P1–P28) validate universal correctness properties using `fast-check` with ≥100 iterations each
- Unit tests validate specific flows (auth, offline behaviour, admin actions, language switcher)
- Integration tests cover DB migrations, R2 upload/download, Resend email, SSE streaming, and structured search
- All code is TypeScript; framework is Next.js 14 App Router with Tailwind CSS

## Additional work completed (beyond original task plan)

- [x] `lib/dummy-artists.ts` - shared dummy data for all 12 artists with rich bios, availability dates, collab history, and reviews with stable IDs (`rv-{reviewed}-{reviewer}-{collab}`)
- [x] `lib/session-jwt.ts` - JWT-based session signing/verification (works in Edge middleware without shared memory store)
- [x] `app/api/dev/login/route.ts` - dev-only login shortcut (`/api/dev/login?role=admin|artist`), disabled in production
- [x] `app/api/auth/logout/route.ts` - logout endpoint (clears session cookie, redirects to home)
- [x] `app/(public)/about/page.tsx` - maintainer showcase page at `/about` with 10 USP sections, live demos, tech stack table, and quick links
- [x] `components/speciality-picker.tsx` - reusable typeahead speciality picker with `onMouseDown` fix for dropdown blur issue; used in registration form and edit profile
- [x] `components/sortable-table.tsx` - reusable sortable table with ascending/descending sort indicators; used in all admin tables
- [x] Artist dashboard (`/dashboard`) - notifications (clickable links to relevant pages), collab list, availability preview, quick links, session info
- [x] Slug-based URLs for all artist and collab pages - no sequential numeric IDs exposed in public URLs
