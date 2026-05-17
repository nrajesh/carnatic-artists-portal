# Screenshots for documentation

Add or update PNGs here when UX changes ship, then reference them from the root **`README.md`** if you want images in the GitHub readme (use relative paths e.g. `docs/screenshots/directory-multi-speciality.png`).

## Recommended captures

| File (suggested)                    | What to show                                                         | Route / action                              |
| ----------------------------------- | -------------------------------------------------------------------- | ------------------------------------------- |
| `home-hero.png`                     | Hero, stats row, spotlight block                                     | `/`                                         |
| `home-map-province-selected.png`    | NL map + side panel with artist cards                                | `/` - tap a province with artists           |
| `home-map-province-empty.png`       | Province with **0** artists - body copy + footer **Join the portal** | `/` - tap an empty province                 |
| `directory-multi-speciality.png`    | Card with gradient header + two speciality pills                     | `/artists` - pick a multi-instrument artist |
| `profile-hero-multi.png`            | Profile hero gradient + coloured speciality pills                    | `/artists/[slug]`                           |
| `about-colour-examples.png`         | Section 1 illustrative 2- and 3-speciality cards                     | `/about` - scroll to colour theming         |
| `about-analytics-section.png`       | Section 10 PostHog / privacy summary                                 | `/about` - scroll to analytics              |
| `profile-notifications.png`         | Email vs push toggles                                                | `/profile/notifications` (signed-in artist) |
| `privacy-analytics.png`             | Analytics disclosure + opt-in / opt-out                              | `/privacy`                                  |
| `admin-reported-profiles-queue.png` | Bulk moderation queue with report counts and clear / suspend actions | `/admin/reported-profiles`                  |
| `admin-collab-detail.png`           | Thread + moderation affordances                                      | `/admin/collabs/[id]`                       |

## Conventions

- Width: aim for **~1200px** viewport or crop consistently.
- Hide personal data if using production; dev seed data is fine.
- Prefer **PNG** or **WebP**; keep files under **400 KB** when possible (compress).

Git does not track empty directories. After you commit the first image file, this folder appears in version control automatically.
