import Link from "next/link";
import { getArtistBySlug, listArtistsForDirectory } from "@/lib/queries/artists";
import { getThemeForSpecialities } from "@/lib/speciality-theme";

export const dynamic = "force-dynamic";

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
  const [allArtists, lakshmi] = await Promise.all([
    listArtistsForDirectory(),
    getArtistBySlug("lakshmi-narayanan"),
  ]);
  const sampleArtists = allArtists.slice(0, 6);
  const demoReviews = lakshmi?.reviews ?? [];

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-amber-700 text-white px-6 py-20 text-center">
        <p className="text-amber-300 text-sm font-semibold uppercase tracking-widest mb-3">Maintainer Reference</p>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Carnatic Artist Portal</h1>
        <p className="text-amber-200 text-lg max-w-2xl mx-auto mb-6">
          A platform built for Carnatic musicians in The Netherlands - connecting singers,
          violinists, percussionists and more through beautiful, accessible, multilingual design.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {["Speciality colour theming","Indic script support","PWA-ready","NLP-free search","Magic-link auth","Multi-region config"].map(u => (
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
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">Contents</h2>
          <ol className="grid sm:grid-cols-2 gap-2 text-sm">
            {[
              ["#colour-theming",   "1. Speciality-based colour theming"],
              ["#unicode",          "2. Indic script & Unicode support"],
              ["#search",           "3. Structured artist search"],
              ["#auth",             "4. Magic-link authentication"],
              ["#collab",           "5. Collab lifecycle management"],
              ["#reviews",          "6. Feedback & review system"],
              ["#pwa",              "7. PWA & mobile-first design"],
              ["#multiregion",      "8. Multi-region extensibility"],
              ["#admin",            "9. Admin moderation tools"],
              ["#tech",             "10. Tech stack at a glance"],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="text-amber-700 hover:text-amber-900 hover:underline underline-offset-2 transition-colors">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* 1. Colour theming */}
        <Section id="colour-theming" title="1. Speciality-based colour theming"
          subtitle="Every artist profile is visually themed by their instrument - instantly recognisable at a glance.">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {sampleArtists.map(artist => {
              const theme = getThemeForSpecialities(artist.specialities.map(s => s.name));
              return (
                <Link key={artist.id} href={`/artists/${artist.slug}`}
                  className="group rounded-2xl overflow-hidden border border-stone-200 hover:shadow-lg transition-all">
                  <div className="h-16 flex items-end px-4 pb-2" style={{ background: theme.background }}>
                    <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-lg font-bold translate-y-5"
                      style={{ backgroundColor: theme.accentColor, color: "#fff" }}>
                      {artist.name[0]}
                    </div>
                  </div>
                  <div className="pt-7 px-4 pb-4 bg-white">
                    <p className="font-semibold text-stone-800 text-sm group-hover:text-amber-800 transition-colors leading-tight">{artist.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {artist.specialities.map(s => (
                        <span key={s.name} className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: s.color + "22", color: s.color }}>{s.name}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
            <strong>How it works:</strong> Each speciality (Vocal, Violin, Mridangam, Veena…) has a unique hex colour in the palette.
            Single-speciality artists get a solid colour header. Multi-speciality artists get a CSS <code>linear-gradient</code> blending all their colours.
            All text colours are WCAG AA compliant (≥4.5:1 contrast ratio - verified by property-based tests).
          </div>
        </Section>

        {/* 2. Unicode / Indic scripts */}
        <Section id="unicode" title="2. Indic script & Unicode support"
          subtitle="Artists can write their bio, chat messages, and reviews in any Indic script - Tamil, Kannada, Telugu, Malayalam, Devanagari and more.">
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {[
              { lang: "Tamil",      sample: "கர்நாடக இசை என் உயிர். சிறு வயதிலிருந்தே வீணை வாசிக்கக் கற்றுக்கொண்டேன்.", script: "ta" },
              { lang: "Malayalam",  sample: "കർണ്ണാടക സംഗീതം എന്റെ ജീവിതത്തിന്റെ ഭാഗമാണ്. ഞാൻ ചെറുപ്പം മുതൽ മൃദംഗം പഠിച്ചു.", script: "ml" },
              { lang: "Telugu",     sample: "కర్ణాటక సంగీతం నా జీవితంలో అంతర్భాగం. నేను చిన్నప్పటి నుండి వీణ నేర్చుకున్నాను.", script: "te" },
              { lang: "Kannada",    sample: "ಕರ್ನಾಟಕ ಸಂಗೀತ ನನ್ನ ಜೀವನದ ಭಾಗ. ನಾನು ಚಿಕ್ಕಂದಿನಿಂದ ವೀಣೆ ಕಲಿತೆ.", script: "kn" },
              { lang: "Hindi",      sample: "कर्नाटक संगीत मेरे जीवन का अभिन्न अंग है। मैंने बचपन से मृदंगम सीखा।", script: "hi" },
              { lang: "Mixed",      sample: "My journey in Carnatic music - கர்நாடக இசை - began in Chennai and continues in Amsterdam.", script: "mixed" },
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
          subtitle="No passwords. Artists log in via a secure, time-limited link sent to their registered email.">
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {[
              { step: "1", icon: "📧", title: "Request link", desc: "Artist enters their email at /auth/login. The portal sends a signed JWT link valid for 72 hours." },
              { step: "2", icon: "🔗", title: "Click link", desc: "Clicking the link verifies the JWT, creates a 30-day session cookie, and redirects to /dashboard." },
              { step: "3", icon: "🔒", title: "Session active", desc: "Edge middleware validates the JWT on every protected route - no database round-trip needed." },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="bg-white rounded-xl border border-stone-200 p-5">
                <div className="text-3xl mb-3">{icon}</div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Step {step}</p>
                <p className="font-semibold text-stone-800 mb-2">{title}</p>
                <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
            <strong>Security:</strong> Tokens are stored as SHA-256 hashes. Prior unused tokens are invalidated on re-issue.
            Sessions are signed JWTs (HS256) - the Edge middleware can validate them without a DB call, keeping latency minimal.
            Admin role is determined by matching the artist&apos;s email against the <code>ADMIN_EMAILS</code> env var.
          </div>
        </Section>

        {/* 5. Collab lifecycle */}
        <Section id="collab" title="5. Collab lifecycle management"
          subtitle="Group chats for upcoming performances, with a full lifecycle from creation to outcome recording.">
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
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
            <strong>Key rule:</strong> Feedback is only prompted when a collab closes as <em>Completed</em> or <em>Completed via other channels</em>.
            Incomplete collabs never trigger feedback - this is the incentive for artists to mark outcomes honestly.
            All chat history is retained and visible to admins (artists are notified of this).
          </div>
        </Section>

        {/* 6. Reviews */}
        <Section id="reviews" title="6. Feedback & review system"
          subtitle="Star ratings (mandatory) + optional rich-text comments, paginated with stable per-review URLs.">
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
            <strong>Design:</strong> Each review has a stable ID (e.g. <code>rv-lakshmi-ravi-rotterdam</code>) encoding the reviewed artist,
            reviewer, and collab. This makes URLs like <code>/artists/lakshmi-narayanan#rv-lakshmi-ravi-rotterdam</code> shareable and
            bookmarkable. Reviews are paginated 5 per page via URL search params. Edit is shown only to the reviewer or an admin.
          </div>
        </Section>

        {/* 7. PWA */}
        <Section id="pwa" title="7. PWA & mobile-first design"
          subtitle="Installable on iOS and Android. Offline-capable. All touch targets ≥44×44px.">
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {[
              { icon: "📱", title: "Installable",    desc: "Web App Manifest with standalone display mode. Add to home screen on iOS and Android." },
              { icon: "📶", title: "Offline-capable", desc: "Service Worker caches the app shell and previously loaded artist profiles. Offline indicator shown." },
              { icon: "🔔", title: "Push notifications", desc: "VAPID-based Web Push for collab invitations and new feedback received." },
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

        {/* 8. Multi-region */}
        <Section id="multiregion" title="8. Multi-region extensibility"
          subtitle="Deploy for Belgium, Singapore, or any country by swapping a config file - zero code changes.">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-6 font-mono text-sm">
            <p className="text-stone-400 text-xs mb-3"># .env.local - Netherlands deployment</p>
            {[
              ["DEPLOYMENT_REGION",          "NL"],
              ["DEPLOYMENT_NAME",            "Carnatic Artist Portal"],
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

        {/* 9. Admin */}
        <Section id="admin" title="9. Admin moderation tools"
          subtitle="Full CRUD on artists, specialities, and collabs - plus chat moderation and account suspension.">
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {[
              { icon: "📋", title: "Registration review",    desc: "Approve or reject applicants. Approved artists receive a magic-link login email automatically." },
              { icon: "🎵", title: "Artist management",      desc: "Edit any artist profile, suspend accounts, delete with cascade (availability, links, collabs)." },
              { icon: "💬", title: "Collab moderation",      desc: "Browse all chat history. Delete individual messages. Close collabs as Incomplete if content is inappropriate." },
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
            In dev, use <Link href="/api/dev/login?role=admin" className="underline underline-offset-2">/api/dev/login?role=admin</Link> to get an instant admin session.
          </div>
        </Section>

        {/* 10. Tech stack */}
        <Section id="tech" title="10. Tech stack at a glance"
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
                  ["Framework",      "Next.js 14 (App Router)",        "SSR/SSG, API routes, Edge middleware, PWA-friendly"],
                  ["Hosting",        "Cloudflare Workers + OpenNext",  "Production app on Workers via @opennextjs/cloudflare; Wrangler CI"],
                  ["Language",       "TypeScript",                     "Full-stack type safety"],
                  ["Styling",        "Tailwind CSS",                   "Utility-first, dynamic theming via CSS variables"],
                  ["Database",       "PostgreSQL via Neon",            "Serverless, git-like branching, no connection exhaustion"],
                  ["ORM",            "Prisma",                         "Type-safe DB access, migrations"],
                  ["Auth",           "Custom magic-link (JWT + Resend)","No passwords, email-only"],
                  ["File storage",   "Cloudflare R2",                  "S3-compatible, zero egress fees"],
                  ["Cache/sessions", "Cloudflare KV (optional)",      "Edge-native when enabled; colocated with Workers"],
                  ["Rich text",      "Tiptap",                         "ProseMirror-based, Unicode-safe, extensible"],
                  ["Maps",           "D3.js + GeoJSON",                "Configurable, no external map API"],
                  ["i18n",           "next-intl",                      "File-based JSON translations, locale switching"],
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
              {[
                ["/api/dev/login?role=admin",  "🔑 Dev admin login"],
                ["/api/dev/login?role=artist", "🎵 Dev artist login"],
                ["/admin/dashboard",           "🛠 Admin dashboard"],
                ["/artists",                   "👥 Artist directory"],
                ["/register",                  "📝 Registration form"],
                ["/auth/login",                "🔗 Magic link login"],
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
        <div className="text-center pt-8 border-t border-stone-200">
          <p className="text-stone-400 text-sm">
            Carnatic Artist Portal · Built with Next.js 14, Tailwind CSS, Neon PostgreSQL, Cloudflare R2 & KV
          </p>
          <p className="text-stone-300 text-xs mt-1">
            Spec-driven development · 18 requirements · 28 correctness properties · Property-based tests via fast-check
          </p>
          <Link href="/" className="inline-block mt-4 text-amber-700 hover:text-amber-900 text-sm font-medium underline underline-offset-2">
            ← Back to portal
          </Link>
        </div>
      </div>
    </main>
  );
}
