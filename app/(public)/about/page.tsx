import Link from "next/link";
import { getArtistBySlug, listArtistsForDirectory } from "@/lib/queries/artists";
import {
  SPECIALITY_PALETTE,
  getThemeFromArtistSpecialities,
} from "@/lib/speciality-theme";
import { DevUrlReveal } from "@/components/dev-url-reveal";
import { PortalSectionHeading } from "@/components/portal-section-heading";
import { isArtistCollabsRatingsEnabledServer } from "@/lib/feature-flags-server";

export const dynamic = "force-dynamic";

/** Matches public directory cards (`/artists`) so maintainer screenshots match production. */
function stylesForSpecialityCard(specialities: { name: string; color: string }[]) {
  const theme = getThemeFromArtistSpecialities(specialities);
  const headerBg = theme.background.startsWith("linear-gradient")
    ? theme.background
    : `linear-gradient(135deg, ${theme.background}, ${theme.background}cc)`;
  const avatarBg = theme.background.startsWith("linear-gradient") ? theme.background : theme.accentColor;
  return { headerBg, avatarBg };
}

function ColourThemePreviewCard({
  caption,
  name,
  initial,
  specialities,
}: {
  caption: string;
  name: string;
  initial: string;
  specialities: { name: string; color: string }[];
}) {
  const { headerBg, avatarBg } = stylesForSpecialityCard(specialities);
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <p className="border-b border-stone-100 bg-stone-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
        {caption}
      </p>
      <div className="overflow-hidden">
        <div className="flex h-20 items-end px-5 pb-3" style={{ background: headerBg }}>
          <div
            className="flex h-12 w-12 translate-y-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-white text-xl font-bold"
            style={{ background: avatarBg, color: "#FFFFFF" }}
          >
            {initial}
          </div>
        </div>
        <div className="px-5 pb-5 pt-8">
          <p className="leading-tight font-semibold text-stone-800">{name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {specialities.map((s) => (
              <span
                key={s.name}
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: s.color + "22", color: s.color }}
              >
                {s.name}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs italic text-stone-400">Fictional example - palette only</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Section({ id, title, subtitle, children }: {
  id: string; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-20 scroll-mt-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-800">{title}</h2>
        {subtitle && <p className="text-stone-500 mt-1 text-sm">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function USPBadge({ label }: { label: string }) {
  return (
    <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full border border-amber-200">
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AboutPage() {
  const collabsRatingsEnabled = await isArtistCollabsRatingsEnabledServer();
  const allArtists = await listArtistsForDirectory();
  const lakshmi = collabsRatingsEnabled ? await getArtistBySlug("lakshmi-narayanan") : null;
  const sampleArtists = allArtists.slice(0, 6);
  const demoReviews = lakshmi?.reviews ?? [];

  const colourExampleTwoSpecs = [
    { name: "Violin", color: SPECIALITY_PALETTE.Violin.primaryColor },
    { name: "Morsing", color: SPECIALITY_PALETTE.Morsing.primaryColor },
  ];
  const colourExampleThreeSpecs = [
    { name: "Vocal", color: SPECIALITY_PALETTE.Vocal.primaryColor },
    { name: "Violin", color: SPECIALITY_PALETTE.Violin.primaryColor },
    { name: "Mridangam", color: SPECIALITY_PALETTE.Mridangam.primaryColor },
  ];

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-amber-700 text-white px-6 py-20 text-center">
        <p className="text-amber-300 text-sm font-semibold uppercase tracking-widest mb-3">Maintainer Reference</p>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Artist Discovery Portal</h1>
        <p className="text-amber-200 text-lg max-w-2xl mx-auto mb-6">
          An artist discovery portal - connecting singers and instrumentalists
          through a beautiful, accessible and multilingual platform.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {["Speciality colour theming","Indic script support","PWA-ready","NLP-free search","Magic-link auth","Multi-region config","Privacy-aware analytics"].map(u => (
            <USPBadge key={u} label={u} />
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <Link href="/" className="px-5 py-2.5 bg-white text-amber-900 font-semibold rounded-lg hover:bg-amber-50 transition-colors text-sm">
            ← Back to portal
          </Link>
          <a href="#colour-theming" className="px-5 py-2.5 border border-white/40 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors text-sm">
            Explore USPs ↓
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">

        {/* TOC */}
        <nav className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-16">
          <PortalSectionHeading variant="label" className="mb-4">
            Contents
          </PortalSectionHeading>
          <ol className="grid sm:grid-cols-2 gap-2 text-sm">
            {[
              ["#colour-theming",   "1. Speciality-based colour theming"],
              ["#unicode",          "2. Indic script & Unicode support"],
              ["#search",           "3. Structured artist search"],
              ["#auth",             "4. Magic-link authentication"],
              ["#collab-reviews",   "5. Collaborations & peer feedback (optional)"],
              ["#pwa",              "6. PWA & mobile-first design"],
              ["#multiregion",      "7. Multi-region extensibility"],
              ["#home-spotlight",   "8. Home spotlight & featured artist"],
              ["#admin",            "9. Admin moderation tools"],
              ["#analytics",        "10. Product analytics & privacy (PostHog)"],
              ["#tech",             "11. Tech stack at a glance"],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="text-amber-700 hover:text-amber-900 hover:underline underline-offset-2 transition-colors">
                  {label}
                </a>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-stone-100 pt-4 text-xs text-stone-500">
            In the repository: <code className="text-stone-600">docs/README.md</code> indexes maintainer documentation and points to the
            screenshot checklist in <code className="text-stone-600">docs/screenshots/README.md</code>.
          </p>
        </nav>

        {/* 1. Colour theming */}
        <Section id="colour-theming" title="1. Speciality-based colour theming"
          subtitle="Every artist profile is visually themed by their instrument - instantly recognisable at a glance.">
          <p className="mb-3 text-sm font-semibold text-stone-700">Illustrative cards (palette + directory layout)</p>
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <ColourThemePreviewCard
              caption="Two specialities"
              name="Example: multi-instrumentalist"
              initial="E"
              specialities={colourExampleTwoSpecs}
            />
            <ColourThemePreviewCard
              caption="Three specialities (maximum)"
              name="Example: trio of roles"
              initial="T"
              specialities={colourExampleThreeSpecs}
            />
          </div>
          <p className="mb-3 text-sm font-semibold text-stone-700">Registered artists from the directory</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-6">
            {sampleArtists.map((artist) => {
              const { headerBg, avatarBg } = stylesForSpecialityCard(artist.specialities);
              return (
                <Link
                  key={artist.id}
                  href={`/artists/${artist.slug}`}
                  className="group overflow-hidden rounded-2xl border border-stone-200 transition-all hover:shadow-lg"
                >
                  <div className="flex h-20 items-end px-5 pb-3" style={{ background: headerBg }}>
                    <div
                      className="flex h-12 w-12 translate-y-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-white text-xl font-bold"
                      style={{ background: avatarBg, color: "#FFFFFF" }}
                    >
                      {artist.name[0]}
                    </div>
                  </div>
                  <div className="bg-white px-5 pb-5 pt-8">
                    <p className="text-sm font-semibold leading-tight text-stone-800 transition-colors group-hover:text-amber-800">
                      {artist.name}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {artist.specialities.map((s) => (
                        <span
                          key={s.name}
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: s.color + "22", color: s.color }}
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            <strong>How it works:</strong> Each speciality (Vocal, Violin, Mridangam, Veena…) has a unique hex colour in the admin-managed
            palette (mirrored in <code className="text-amber-950">lib/speciality-theme.ts</code> for tests). Artists can pick up to{" "}
            <strong>three</strong> specialities on registration; each tag uses its stored colour, and the card header uses those same values
            (solid for one colour, diagonal <code>linear-gradient</code> when several distinct colours apply). Single-speciality artists get
            a solid colour header.
            All text colours are WCAG AA compliant (≥4.5:1 contrast ratio - verified by property-based tests).
          </div>
        </Section>

        {/* 2. Unicode / Indic scripts */}
        <Section id="unicode" title="2. Indic script & Unicode support"
          subtitle="Artists can write their bio and other profile text in any Indic script - Tamil, Kannada, Telugu, Malayalam, Devanagari and more.">
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {[
              { lang: "Tamil",      sample: "கர்நாடக இசை என் உயிர். சிறு வயதிலிருந்தே வீணை வாசிக்கக் கற்றுக்கொண்டேன்.", script: "ta" },
              { lang: "Malayalam",  sample: "കർണ്ണാടക സംഗീതം എന്റെ ജീവിതത്തിന്റെ ഭാഗമാണ്. ഞാൻ ചെറുപ്പം മുതൽ മൃദംഗം പഠിച്ചു.", script: "ml" },
              { lang: "Telugu",     sample: "కర్ణాటక సంగీతం నా జీవితంలో అంతర్భాగం. నేను చిన్నప్పటి నుండి వీణ నేర్చుకున్నాను.", script: "te" },
              { lang: "Kannada",    sample: "ಕರ್ನಾಟಕ ಸಂಗೀತ ನನ್ನ ಜೀವನದ ಭಾಗ. ನಾನು ಚಿಕ್ಕಂದಿನಿಂದ ವೀಣೆ ಕಲಿತೆ.", script: "kn" },
              { lang: "Hindi",      sample: "कर्नाटक संगीत मेरे जीवन का अभिन्न अंग है। मैंने बचपन से मृदंगम सीखा।", script: "hi" },
              { lang: "Mixed",      sample: "My journey in music began in Chennai and continues in Amsterdam - classical vocals remain my anchor.", script: "mixed" },
            ].map(({ lang, sample, script }) => (
              <div key={lang} className="bg-white rounded-xl border border-stone-200 p-4">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">{lang}</p>
                <p lang={script === "mixed" ? "en" : script}
                  className="text-stone-700 leading-relaxed text-sm"
                  style={{ fontFamily: "'Noto Sans', 'Noto Sans Tamil', 'Noto Sans Malayalam', 'Noto Sans Telugu', 'Noto Sans Kannada', 'Noto Sans Devanagari', sans-serif" }}>
                  {sample}
                </p>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800">
            <strong>How it works:</strong> The Tiptap rich-text editor accepts direct Unicode keyboard input for all Indic scripts.
            The Google Fonts Noto family (loaded with <code>font-display: swap</code>) provides full glyph coverage with no tofu (□) characters.
            Correct <code>lang</code> attributes are set on all user-generated content elements for screen readers and browser shaping engines.
            Mixed-script content (English + Tamil + Malayalam in the same paragraph) renders cleanly.
          </div>
        </Section>

        {/* 3. Search */}
        <Section id="search" title="3. Structured artist search"
          subtitle="Logged-in artists can find collaborators by name, speciality, and availability dates - no LLM required.">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">🔍</span>
                <div className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-stone-200 text-stone-400 text-sm bg-stone-50 min-h-[44px] flex items-center">
                  Search by name…
                </div>
              </div>
              <div className="sm:w-44 px-3 py-2.5 rounded-lg border border-stone-200 text-stone-400 text-sm bg-stone-50 min-h-[44px] flex items-center">
                All specialities ▾
              </div>
              <div className="sm:w-44 px-3 py-2.5 rounded-lg border border-stone-200 text-stone-400 text-sm bg-stone-50 min-h-[44px] flex items-center">
                All provinces ▾
              </div>
            </div>
            <p className="text-xs text-stone-400 italic">
              Live demo at <Link href="/artists" className="text-amber-700 underline underline-offset-2">/artists</Link> (public) and
              <Link href="/search" className="text-amber-700 underline underline-offset-2 ml-1">/search</Link> (logged-in artists, with date filters)
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-sm text-green-800">
            <strong>Design decision:</strong> We deliberately avoided LLM-based NLP search to preserve user trust and keep the platform
            fully self-contained. The typeahead speciality dropdown is populated dynamically from approved artists in the DB -
            only specialities with at least one active artist are shown. All filtering is server-side SQL with no external API calls.
          </div>
        </Section>

        {/* 4. Auth */}
        <Section id="auth" title="4. Magic-link authentication"
          subtitle="No passwords to remember. We email you a time-limited link instead.">
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "1",
                icon: "📧",
                title: "Enter your email",
                body: (
                  <p className="text-sm text-stone-600 leading-relaxed">
                    Open{" "}
                    <Link href="/auth/login" className="font-medium text-amber-800 underline underline-offset-2 hover:text-amber-950">
                      the sign-in page
                    </Link>{" "}
                    and type the same email you used when you registered. We send a single-use sign-in link to that inbox.
                  </p>
                ),
              },
              {
                step: "2",
                icon: "✉️",
                title: "Use the link in your email",
                body: (
                  <p className="text-sm text-stone-600 leading-relaxed">
                    Tap the link in the message from us. If nothing shows up within a minute, check{" "}
                    <strong>Spam</strong>, <strong>Promotions</strong>, or similar folders in your mail app.
                  </p>
                ),
              },
              {
                step: "3",
                icon: "✅",
                title: "Tap Continue to finish",
                body: (
                  <p className="text-sm text-stone-600 leading-relaxed">
                    Your browser opens a short confirmation screen. Press <strong>Continue</strong> once to complete sign-in. Use{" "}
                    <strong>Log out</strong> in the header or dashboard when you finish on a shared device.
                  </p>
                ),
              },
            ].map(({ step, icon, title, body }) => (
              <div key={step} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="text-3xl mb-3">{icon}</div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-1">Step {step}</p>
                <p className="font-semibold text-stone-800 mb-2">{title}</p>
                {body}
              </div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
            <strong>Security (technical):</strong> Magic-link tokens are stored as SHA-256 hashes; issuing a new link invalidates older unused
            ones. The email points at <code className="text-amber-950">/auth/verify?token=…</code>; the page loads on <strong>GET</strong> only
            and the browser submits a <strong>POST</strong> to consume the token so mail previews and prefetch cannot burn the link. Links
            expire after 72 hours. Successful sign-in sets a 30-day <strong>session cookie</strong> backed by an <strong>HS256 JWT</strong>;
            Edge middleware validates it without a database round-trip on every request. Logout uses{" "}
            <code className="text-amber-950">POST /api/auth/logout</code>. Admin access matches the signed-in email against the{" "}
            <code className="text-amber-950">ADMIN_EMAILS</code> environment list. While signed in, a line <strong>above the
            site footer</strong> can show your <strong>profile display name</strong>, session expiry, and for admins{" "}
            <code className="text-amber-950">(admin)</code> after the name.
          </div>
        </Section>

        {/* 5. Collabs & reviews (optional) */}
        <Section
          id="collab-reviews"
          title="5. Collaborations & peer feedback (optional)"
          subtitle="Group planning and star ratings after gigs can be enabled per deployment."
        >
          {!collabsRatingsEnabled ? (
            <div className="rounded-xl border border-stone-200 bg-stone-100 p-6 text-sm text-stone-700">
              <p className="leading-relaxed">
                On this site, <strong>collaboration chats</strong> and <strong>peer star ratings</strong> are turned off. The experience stays
                focused on discovering artists, reading profiles, and registering - without group threads or post-concert reviews in the UI.
              </p>
              <p className="mt-4 text-xs text-stone-500">
                Operators can turn the area back on with the PostHog boolean flag <code className="text-stone-800">artist-collabs-ratings</code>{" "}
                or the <code className="text-stone-800">POSTHOG_FLAG_ARTIST_COLLABS_RATINGS</code> /{" "}
                <code className="text-stone-800">NEXT_PUBLIC_POSTHOG_FLAG_ARTIST_COLLABS_RATINGS</code> env overrides (see{" "}
                <code className="text-stone-800">env.example</code>).
              </p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm leading-relaxed text-stone-600">
                When enabled, artists can open group threads for upcoming performances, close them with an honest outcome, and optionally
                leave short star ratings for each other afterward.
              </p>
              <div className="grid sm:grid-cols-4 gap-3 mb-6">
                {[
                  { status: "Active",                   color: "bg-green-50 border-green-200 text-green-700",  desc: "Artists are coordinating" },
                  { status: "Completed",                color: "bg-blue-50 border-blue-200 text-blue-700",    desc: "Performance happened, audio/video can be attached" },
                  { status: "Completed via other channels", color: "bg-purple-50 border-purple-200 text-purple-700", desc: "Coordinated outside the portal" },
                  { status: "Incomplete",               color: "bg-stone-100 border-stone-200 text-stone-500", desc: "Did not happen - no feedback prompted" },
                ].map(({ status, color, desc }) => (
                  <div key={status} className={`rounded-xl border p-4 ${color}`}>
                    <p className="font-semibold text-sm mb-1">{status}</p>
                    <p className="text-xs opacity-80">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="mb-10 bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
                <strong>Key rule (technical):</strong> Feedback prompts appear only when a collab closes as <em>Completed</em> or{" "}
                <em>Completed via other channels</em>. Incomplete collabs never trigger feedback. Chat history is retained and visible to admins
                (artists are informed in-product).
              </div>
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-stone-800">Peer ratings & comments</h3>
                <p className="mt-1 text-sm text-stone-500">Example layout from a seeded profile (stable anchors in real URLs).</p>
              </div>
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-6">
                <div className="flex flex-col gap-4">
                  {demoReviews.map(r => (
                    <div key={r.id} id={r.id} className="border border-stone-100 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-sm font-semibold text-stone-800">{r.from}</p>
                          <p className="text-xs text-stone-400 mt-0.5">{r.collab} · {r.date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => (
                              <span key={i} className={`text-base ${i <= r.rating ? "text-amber-500" : "text-stone-200"}`}>★</span>
                            ))}
                          </div>
                          <a href={`#${r.id}`} className="text-xs text-stone-300 hover:text-stone-500" title="Permalink">
                            #
                          </a>
                        </div>
                      </div>
                      {r.comment && <p className="text-sm text-stone-600 italic">&ldquo;{r.comment}&rdquo;</p>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-sm text-green-800">
                <strong>Design (technical):</strong> Each review has a stable ID (e.g. <code>rv-lakshmi-ravi-rotterdam</code>) encoding the reviewed
                artist, reviewer, and collab. URLs like <code>/artists/lakshmi-narayanan#rv-lakshmi-ravi-rotterdam</code> are shareable.
                Reviews paginate five per page via search params; edit is limited to the reviewer or an admin.
              </div>
            </>
          )}
        </Section>

        {/* 6. PWA */}
        <Section id="pwa" title="6. PWA & mobile-first design"
          subtitle="Installable on iOS and Android. Offline-capable. All touch targets ≥44×44px.">
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {[
              { icon: "📱", title: "Installable",    desc: "Web App Manifest with standalone display mode. Add to home screen on iOS and Android." },
              { icon: "📶", title: "Offline-capable", desc: "Service Worker caches the app shell and previously loaded artist profiles. Offline indicator shown." },
              {
                icon: "🔔",
                title: "Push notifications",
                desc: collabsRatingsEnabled
                  ? "VAPID-based Web Push for collab invitations and new feedback. Artists can tune email vs push under /profile/notifications."
                  : "VAPID-based Web Push when your operator enables browser notifications. Email vs push preferences live under /profile/notifications.",
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl border border-stone-200 p-5">
                <div className="text-3xl mb-3">{icon}</div>
                <p className="font-semibold text-stone-800 mb-2">{title}</p>
                <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
            <strong>Targets:</strong> Lighthouse PWA ≥90 · Performance ≥85 · Accessibility ≥90 (all on mobile profile).
            All interactive elements have a minimum 44×44 CSS pixel touch target. Semantic HTML throughout.
          </div>
        </Section>

        {/* 7. Multi-region */}
        <Section id="multiregion" title="7. Multi-region extensibility"
          subtitle="Deploy for Belgium, Singapore, or any country by swapping a config file - zero code changes.">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-6 font-mono text-sm">
            <p className="text-stone-400 text-xs mb-3"># .env.local - Netherlands deployment</p>
            {[
              ["DEPLOYMENT_REGION",          "NL"],
              ["DEPLOYMENT_NAME",            "Artist Discovery Portal"],
              ["DEPLOYMENT_LOCALE_PRIMARY",  "en"],
              ["DEPLOYMENT_LOCALE_SECONDARY","nl"],
              ["DEPLOYMENT_MAP_GEOJSON_URL", "/geo/netherlands-provinces.geojson"],
              ["DEPLOYMENT_BRANDING_LOGO_URL","/assets/logo.svg"],
            ].map(([key, val]) => (
              <div key={key} className="flex gap-3 py-1 border-b border-stone-50 last:border-0">
                <span className="text-amber-700 flex-shrink-0">{key}</span>
                <span className="text-stone-400">=</span>
                <span className="text-green-700">{val}</span>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800">
            <strong>To deploy for Belgium:</strong> swap <code>netherlands-provinces.geojson</code> for a Belgian provinces GeoJSON,
            set <code>DEPLOYMENT_LOCALE_SECONDARY=fr</code> (or <code>nl</code>), and add French translations to <code>messages/fr.json</code>.
            The home page map, language switcher, and date formats all update automatically. No application code changes needed.
          </div>
        </Section>

        {/* 8. Home spotlight */}
        <Section
          id="home-spotlight"
          title="8. Home spotlight & featured artist"
          subtitle="The landing page highlights one vocalist each local calendar day, with room for discovery without crowding the layout."
        >
          <div className="grid gap-6 sm:grid-cols-2 mb-6">
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <p className="font-semibold text-stone-800 mb-3">Daily rotation</p>
              <p className="text-sm text-stone-600 leading-relaxed">
                The featured slot prefers <strong>Vocal</strong> artists and falls back to the full directory when needed. Which artist
                appears advances deterministically by <strong>calendar day</strong> in the deployment country&apos;s timezone (derived from{" "}
                <code>DEPLOYMENT_REGION</code> unless <code>DEPLOYMENT_TIMEZONE</code> is set). Ops can pin a vocalist for a given day via
                the <code>DailyFeatured</code> table.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <p className="font-semibold text-stone-800 mb-3">
                {collabsRatingsEnabled ? "Profile photo & collab teasers" : "Profile photo"}
              </p>
              <p className="text-sm text-stone-600 leading-relaxed">
                {collabsRatingsEnabled ? (
                  <>
                    The card loads each artist&apos;s <strong>public profile photo URL</strong> (HTTPS link on their profile), with a coloured
                    initial if the image cannot load. A side column can list up to four <strong>active collabs</strong> they own or join so
                    visitors see social proof at a glance; artists with none still get the photo and headline.
                  </>
                ) : (
                  <>
                    The card loads each artist&apos;s <strong>public profile photo URL</strong> (the HTTPS link they saved on their profile),
                    with a coloured initial if the image cannot load. Collab teasers stay hidden while collaborations are turned off for this
                    deployment.
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-900">
            <strong>Implementation:</strong> <code className="text-amber-950">getDailyFeaturedArtistForHome()</code> in{" "}
            <code className="text-amber-950">lib/queries/artists.ts</code>, local-day helpers in{" "}
            <code className="text-amber-950">lib/local-day.ts</code>, deployment timezone in{" "}
            <code className="text-amber-950">deployment.config.ts</code>.
          </div>
        </Section>

        {/* 9. Admin */}
        <Section id="admin" title="9. Admin moderation tools"
          subtitle="Full CRUD on artists and specialities, plus registration review and account suspension.">
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {[
              { icon: "📋", title: "Registration review",    desc: "Approve or reject applicants with review comments, filters, and clear status handling. Approved artists receive a magic-link login email automatically." },
              { icon: "🎵", title: "Artist management",      desc: "Edit any artist profile, suspend accounts with validation and audit context, delete with cascade (availability, links, collabs)." },
              {
                icon: "💬",
                title: "Collab moderation",
                desc: collabsRatingsEnabled
                  ? "Browse collabs, open /admin/collabs/[id] for full thread context, participant messaging, and feedback controls. Delete individual messages or close as Incomplete when needed."
                  : "Collab and chat moderation UIs stay hidden while the collaboration feature pack is disabled for this deployment.",
              },
              { icon: "🎨", title: "Speciality management",  desc: "Add/edit/delete specialities and their colour palette. Delete guard prevents removing specialities in use." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl border border-stone-200 p-5 flex gap-4">
                <span className="text-3xl flex-shrink-0">{icon}</span>
                <div>
                  <p className="font-semibold text-stone-800 mb-1">{title}</p>
                  <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
            <strong>Access:</strong> Admin routes (<code>/admin/*</code>) are protected by Edge middleware.
            Admin role is granted by listing the artist&apos;s email in the <code>ADMIN_EMAILS</code> env var (comma-separated).
            <span className="ml-1">
              In dev, use
              {" "}
              <span className="text-amber-900">
                <DevUrlReveal
                  path="/api/dev/login?role=admin"
                  label="/api/dev/login?role=admin"
                  variant="inline"
                />
              </span>
              {" "}
              to get an instant admin session.
            </span>
          </div>
        </Section>

        {/* 10. Analytics */}
        <Section
          id="analytics"
          title="10. Product analytics & privacy (PostHog)"
          subtitle="Optional telemetry with conservative defaults - see /privacy for end-user language."
        >
          <div className="grid gap-6 sm:grid-cols-2 mb-6">
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <p className="font-semibold text-stone-800 mb-3">What is captured</p>
              <ul className="text-sm text-stone-600 leading-relaxed list-disc pl-5 space-y-2">
                <li>Explicit product events plus <strong>manual</strong> page views (autocapture stays off).</li>
                <li>Browser traffic in production uses a <strong>same-origin</strong> <code className="text-stone-800">/api/ph</code> proxy so ingest hosts are not embedded in the client bundle.</li>
                <li>Server routes can emit events with <code className="text-stone-800">artistId</code> as the PostHog distinct id - not email.</li>
                <li>
                  Post-login redirects add <code className="text-stone-800">?ph_identify=1</code> once to the artist or
                  admin dashboard URL so the client can <code className="text-stone-800">posthog.identify(artistId, …)</code>{" "}
                  and align browser analytics with the same id (query param is stripped on the next navigation; local{" "}
                  <code className="text-stone-800">/api/dev/login</code> does the same in non-production).
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <p className="font-semibold text-stone-800 mb-3">Session Replay &amp; choice</p>
              <ul className="text-sm text-stone-600 leading-relaxed list-disc pl-5 space-y-2">
                <li>Session Replay is gated by environment variables; SDK text masking is enabled.</li>
                <li>Do Not Track and the <code className="text-stone-800">ph_opt_out</code> cookie are respected on the client.</li>
                <li>Visitors can use <Link href="/privacy" className="text-amber-700 underline underline-offset-2">/privacy</Link> (opt-in / opt-out) for the full disclosure.</li>
              </ul>
            </div>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-100 p-5 text-sm text-stone-700">
            <strong>Maintainer docs:</strong> repository specs under <code className="text-stone-900">.kiro/specs/posthog-analytics/</code> and the operator guide{" "}
            <code className="text-stone-900">.kiro/steering/posthog-admin-guide.md</code>. Env template: <code className="text-stone-900">env.example</code> (PostHog block).
          </div>
        </Section>

        {/* 11. Tech stack */}
        <Section id="tech" title="11. Tech stack at a glance"
          subtitle="Modern, open-source, no usage-limit surprises.">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Layer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Technology</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide hidden sm:table-cell">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {[
                  ["Framework",      "Next.js 16 (App Router)",        "SSR/SSG, API routes, Edge middleware, PWA-friendly"],
                  ["Hosting",        "Cloudflare Workers + OpenNext",  "Production app on Workers via @opennextjs/cloudflare; Wrangler CI"],
                  ["Language",       "TypeScript",                     "Full-stack type safety"],
                  ["Styling",        "Tailwind CSS",                   "Utility-first, dynamic theming via CSS variables"],
                  ["Database",       "PostgreSQL via Neon",            "Serverless, git-like branching, no connection exhaustion"],
                  ["ORM",            "Prisma",                         "Type-safe DB access, migrations"],
                  ["Auth",           "Custom magic-link (JWT + Resend)","No passwords; verify flow resists mail-client prefetch"],
                  ["Media",          "HTTPS profile assets",           "Artists supply vetted HTTPS URLs for photos; optional storage adapters in code when operators wire them"],
                  ["Cache/sessions", "Cloudflare KV (optional)",      "Edge-native when enabled; colocated with Workers"],
                  ["Rich text",      "Tiptap",                         "ProseMirror-based, Unicode-safe, extensible"],
                  ["Maps",           "D3.js + GeoJSON",                "Configurable, no external map API"],
                  ["i18n",           "next-intl",                      "File-based JSON translations, locale switching"],
                  ["Analytics",      "PostHog (optional)",             "Explicit events, manual pageviews, /api/ph proxy, Session Replay env-gated"],
                  ["Testing",        "Vitest + fast-check",            "Unit + property-based tests (28 correctness properties)"],
                ].map(([layer, tech, why]) => (
                  <tr key={layer} className="hover:bg-stone-50">
                    <td className="px-5 py-3 text-stone-500 font-medium">{layer}</td>
                    <td className="px-5 py-3 text-stone-800 font-semibold">{tech}</td>
                    <td className="px-5 py-3 text-stone-500 hidden sm:table-cell">{why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick links for maintainers */}
          <div className="bg-stone-800 rounded-2xl p-6 text-white">
            <h3 className="font-bold mb-4 text-sm uppercase tracking-widest text-stone-400">Maintainer quick links</h3>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {/* Dev-only paths  -  no navigation, no prefetch. Click to reveal the final URL. */}
              <DevUrlReveal path="/api/dev/login?role=admin" label="🔑 Dev admin login" />
              <DevUrlReveal path="/api/dev/login?role=artist" label="🎵 Dev artist login" />
              {[
                ["/admin/dashboard", "🛠 Admin dashboard"],
                ["/artists",        "👥 Artist directory"],
                ["/register",       "📝 Registration form"],
                ["/auth/login",     "🔗 Magic link login"],
              ].map(([href, label]) => (
                <Link key={href} href={href}
                  className="flex items-center gap-2 px-4 py-2.5 bg-stone-700 hover:bg-stone-600 rounded-lg transition-colors font-medium">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </Section>

        {/* Footer */}
        <div className="pt-8 border-t border-stone-200">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              ["Next.js",   "https://nextjs.org"],
              ["Tailwind CSS", "https://tailwindcss.com"],
              ["Neon",      "https://neon.tech"],
              ["Prisma",    "https://www.prisma.io"],
              ["Cloudflare Workers", "https://developers.cloudflare.com/workers"],
              ["PostHog",   "https://posthog.com"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600 transition-colors hover:border-amber-300 hover:text-amber-800"
              >
                {label}
              </a>
            ))}
          </div>
          <div className="mt-5 text-center">
            <Link href="/" className="text-sm font-medium text-amber-700 underline-offset-2 hover:text-amber-900 hover:underline">
              ← Back to portal
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
