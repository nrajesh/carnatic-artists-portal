---
inclusion: manual
---

# PostHog Analytics - Admin Guide

This guide is for portal admins and operators using the PostHog analytics integration. It covers what to expect, how to get value from the data, and what to avoid.

---

## What you'll see in PostHog

### Events feed (Activity tab)
Every tracked interaction flows in as a named event. You'll see things like `artist_profile_viewed`, `registration_submitted`, `artist_login`, `registration_approved` etc. Each event has a timestamp, the `distinct_id` (either an anonymous UUID for visitors or an `artistId` for logged-in artists), and any attached properties (e.g. `artist_slug`, `speciality_count`).

### Persons
Once an artist logs in, PostHog stitches their anonymous pre-login activity to their `artistId`. You'll see a person record with:
- `role: artist`
- `province: <their province>`

No email, no name - just the opaque ID and those two properties. This is intentional for GDPR compliance.

### Session replay
When recording is enabled for a build, **Recordings** in PostHog can show reconstructed sessions (clicks, navigation, timing). The app sets **text masking** in the SDK, but replay is still a sensitive surface: use PostHog project settings (sampling, URL triggers, retention) and keep `/privacy` aligned with what you actually ship. Disable recording entirely with `NEXT_PUBLIC_POSTHOG_ENABLE_RECORDING=false` at build time if you do not want replays.

### Dashboards & Insights
The main value of PostHog. Useful charts to build:
- "How many `artist_profile_viewed` events per day?"
- Funnel: `artist_listing_viewed` → `artist_profile_viewed` → `cta_join_clicked` → `registration_submitted`
- "Which provinces have the most active artists?" (using the `province` person property)
- "How long does it take from registration to first `dashboard_viewed`?"

---

## What this integration does NOT do

- **No autocapture** - only the 17 explicitly named events are tracked. If you want to track something new, a code change is needed.
- **Session replay**  -  can be **on** in production builds when the project key is set and `NEXT_PUBLIC_POSTHOG_ENABLE_RECORDING` is not a false-ish value; **`mask_all_text: true`** reduces visible text in the replay DOM. **Off by default in `next dev`** unless `NEXT_PUBLIC_POSTHOG_RECORDING_IN_DEV` is enabled. Treat replay like any other personal-data processing activity in your jurisdiction.
- **No heatmaps** - these rely on autocapture, which is off.
- **No feature flags or A/B testing** - not in scope, but PostHog supports them and they can be added later.

---

## Day-to-day usage tips

### Finding your events
Go to **Activity → Events** in the PostHog UI. Filter by event name to focus on a specific event. The `$pageview` event will be the most frequent - filter it out when looking for action events.

### Building a registration funnel
**Insights → Funnels.** The most useful funnel for this app:
```
cta_join_clicked → registration_submitted
```
Drop-off here shows how many people start but don't finish registering.

### Checking admin workload
Filter server-side events (`registration_approved`, `registration_rejected`) by date range. This gives a sense of how many registrations admins are processing per week.

### Identifying inactive artists
Use **Cohorts** to find artists who have a `dashboard_viewed` event but no `profile_edit_saved` or `collab_created` in the last 30 days. These are artists who log in but don't engage.

---

## Things to be careful about

### Never add PII to events
The privacy policy states no PII in **event properties**, and explains replay separately. If you add a new `posthog.capture()` call, double-check the properties object doesn't include email, name, phone, or other identifiers you should not ship to PostHog.

### The dev badge is local-only
An amber floating badge showing the PostHog admin path appears in the bottom-right corner when running locally (`NODE_ENV=development`). It will never appear in production.

### The admin UI URL is a secret
`POSTHOG_ADMIN_PATH` is a 32+ character random string - treat it like a password:
- Don't share it in Slack or email
- Don't commit it to version control
- Don't put it in a README or wiki
- If it leaks, generate a new one and update the reverse proxy config

### Analytics failures are silent by design
If PostHog is unreachable, the app keeps working normally - events are just lost. If event counts drop to zero unexpectedly, check:
1. Your PostHog project or self-hosted instance is up (Cloud status page / your Docker host)
2. `POSTHOG_HOST` matches the ingest URL your project expects (EU vs US Cloud, or self-hosted)
3. The `/api/ph` proxy returns 200s in the browser Network tab (production)

### Opt-out is honoured
Users with **Do Not Track** enabled, or the `ph_opt_out=1` cookie, won't generate any events. The public **`/privacy/opt-out`** route sets that cookie and redirects to `/privacy` - the privacy page shows the full sample URL for each deployment (and documents `http://localhost:3000/privacy/opt-out` for local dev).

---

## Obtaining the PostHog API key

**PostHog Cloud:** create a project in [PostHog](https://posthog.com/), open **Project settings → Project API Key**, copy the key (begins with `phc_`), set `NEXT_PUBLIC_POSTHOG_KEY` and `POSTHOG_HOST` (e.g. `https://eu.i.posthog.com`) in your environment.

**Self-hosted:** after your instance is running, log into the PostHog web UI (optionally via `POSTHOG_ADMIN_PATH` if you front it through this app), then **Settings → Project → Project API Key** as above.

This key is safe to expose to the browser - it is a write-only ingestion key, not an admin credential.

---

## Event reference

| Event | Where it fires | Key properties |
|---|---|---|
| `$pageview` | Every route change | `$current_url` |
| `artist_listing_viewed` | `/artists` page | - |
| `artist_profile_viewed` | `/artists/[slug]` page | `artist_slug` |
| `cta_join_clicked` | Home page CTA | - |
| `registration_submitted` | Registration form | `speciality_count` |
| `artist_login` | Login API (server) | - |
| `artist_logout` | Logout API (server) | - |
| `dashboard_viewed` | Artist dashboard | - |
| `profile_edit_started` | Edit profile click | - |
| `profile_edit_saved` | Profile save success | - |
| `collab_created` | New collab submit | - |
| `availability_updated` | Availability save | `window_count` |
| `artist_search_performed` | Search results | `result_count` |
| `admin_dashboard_viewed` | Admin dashboard | - |
| `registration_approved` | Approve API (server) | `registration_id` |
| `registration_rejected` | Reject API (server) | `registration_id` |
| `artist_suspension_changed` | Suspension API (server) | `artist_id`, `suspended` |
