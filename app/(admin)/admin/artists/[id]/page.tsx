import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  formatDeploymentCalendarDate,
  formatDeploymentDate,
} from "@/lib/format-deployment-datetime";
import { getArtistProfileForAdmin } from "@/lib/queries/admin-artists";
import { verifySession } from "@/lib/session-jwt";
import { PortalSectionHeading } from "@/components/portal-section-heading";
import { normalizeBioHtmlForDisplay } from "@/lib/bio-html-display";
import { isArtistCollabsRatingsEnabledServer } from "@/lib/feature-flags-server";
import { ArtistPhoneContactInline } from "@/components/artist-visible-phone-contact";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`text-base ${i <= rating ? "text-amber-500" : "text-stone-200"}`}>
          ★
        </span>
      ))}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:mb-6 sm:p-6">
      <PortalSectionHeading variant="label" className="mb-3">
        {title}
      </PortalSectionHeading>
      {children}
    </div>
  );
}

function collabBadgeClass(status: string) {
  if (status === "active") return "border-green-200 bg-green-50 text-green-700";
  if (status === "completed") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "completed_other") return "border-indigo-200 bg-indigo-50 text-indigo-800";
  return "border-stone-200 bg-stone-100 text-stone-500";
}

function collabBadgeLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "completed") return "Completed";
  if (status === "completed_other") return "Completed (other)";
  if (status === "incomplete") return "Incomplete";
  return status;
}

export default async function AdminArtistDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string; error?: string; email_warning?: string }>;
}) {
  const { id } = await params;
  const { done, error: queryError, email_warning: emailWarning } = await searchParams;
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  const artist = await getArtistProfileForAdmin(id);
  if (!artist) notFound();

  const collabsRatingsEnabled = await isArtistCollabsRatingsEnabledServer({
    distinctId: session?.artistId ?? "anonymous",
  });

  const completedCollabs = artist.collabs.filter(
    (c) => c.status === "completed" || c.status === "completed_other",
  );
  const activeCollabs = artist.collabs.filter((c) => c.status === "active");
  const avgRating = artist.reviews.length
    ? (artist.reviews.reduce((s, r) => s + r.rating, 0) / artist.reviews.length).toFixed(1)
    : null;
  const canSendLoginLink = artist.email.trim().length > 0;
  const emailDeliveryWarning = emailWarning === "1";

  const primaryTint = artist.specialities[0]?.color ?? "#92400E";
  const joinedLabel = formatDeploymentDate(artist.createdAt);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        {done === "login_link_sent" ? (
          <div className="mb-6 space-y-3">
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-950">
              {emailDeliveryWarning
                ? "A new sign-in link token was created for this artist (email was not delivered)."
                : "A sign-in link email was sent to this artist."}
            </div>
            {emailDeliveryWarning ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                Check <code className="rounded bg-amber-100/80 px-1">RESEND_API_KEY</code> and{" "}
                <code className="rounded bg-amber-100/80 px-1">RESEND_FROM_EMAIL</code>. The artist
                can also request a link from the public login page.
              </div>
            ) : null}
          </div>
        ) : null}
        {queryError === "send_link_no_email" ? (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            This artist does not have an email address on file, so a sign-in link could not be
            generated.
          </div>
        ) : null}
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/admin/artists"
            className="text-sm font-medium text-amber-700 hover:text-amber-900"
          >
            ← Artists
          </Link>
          <span className="text-stone-300">/</span>
          <span className="text-sm text-stone-500">{artist.name}</span>
        </div>

        <div className="mb-5 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div
            className="flex h-24 items-end px-5 pb-4 sm:px-6"
            style={{
              background: `linear-gradient(135deg, ${primaryTint}, ${primaryTint}99)`,
            }}
          >
            <div
              className="flex h-16 w-16 flex-shrink-0 translate-y-8 items-center justify-center rounded-full border-4 border-white text-2xl font-bold text-white"
              style={{ backgroundColor: primaryTint }}
            >
              {artist.name[0]}
            </div>
          </div>
          <div className="px-5 pb-5 pt-10 sm:px-6 sm:pb-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start gap-3">
                  <h1 className="text-2xl font-bold text-stone-800">{artist.name}</h1>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                      artist.isSuspended
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-green-200 bg-green-50 text-green-700"
                    }`}
                  >
                    {artist.isSuspended ? "Suspended" : "Active"}
                  </span>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-500">
                  <span className="ph-no-capture">{artist.email}</span>
                  {artist.contactNumber.trim() ? (
                    <>
                      <span className="text-stone-300" aria-hidden>
                        ·
                      </span>
                      <ArtistPhoneContactInline
                        contactNumber={artist.contactNumber}
                        contactType={artist.contactType}
                      />
                    </>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-stone-400">
                  {artist.province.trim() ? `📍 ${artist.province} · ` : ""}Joined {joinedLabel}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {artist.specialities.map((s) => (
                    <span
                      key={s.name}
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ backgroundColor: s.color + "22", color: s.color }}
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:max-w-xs lg:justify-end">
                <Link
                  href={`/admin/artists/${artist.id}/edit`}
                  className="text-sm font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
                >
                  Edit profile
                </Link>
                {canSendLoginLink ? (
                  <form action={`/api/admin/artists/${artist.id}/send-login-link`} method="POST">
                    <button
                      type="submit"
                      className="cursor-pointer border-0 bg-transparent p-0 text-sm font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
                    >
                      Send sign-in link
                    </button>
                  </form>
                ) : (
                  <span className="text-sm text-stone-400">No email on file</span>
                )}
              </div>
            </div>

            {collabsRatingsEnabled && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-stone-50 p-3 text-center">
                  <div className="text-xl font-bold text-stone-800">{activeCollabs.length}</div>
                  <div className="mt-0.5 text-xs text-stone-500">Active collabs</div>
                </div>
                <div className="rounded-lg bg-stone-50 p-3 text-center">
                  <div className="text-xl font-bold text-stone-800">{completedCollabs.length}</div>
                  <div className="mt-0.5 text-xs text-stone-500">Completed collabs</div>
                </div>
                <div className="rounded-lg bg-stone-50 p-3 text-center">
                  <div className="text-xl font-bold text-amber-600">{avgRating ?? "-"}</div>
                  <div className="mt-0.5 text-xs text-stone-500">
                    Avg rating {artist.reviews.length > 0 && `(${artist.reviews.length})`}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {artist.bio ? (
          <SectionCard title="About">
            <div
              className="max-w-measure text-left font-sans prose prose-sm prose-stone sm:prose-base [text-wrap:pretty]"
              dangerouslySetInnerHTML={{ __html: normalizeBioHtmlForDisplay(artist.bio) }}
            />
          </SectionCard>
        ) : null}

        <SectionCard title="Availability Calendar">
          {artist.availabilityDates.length === 0 ? (
            <p className="text-sm italic text-stone-400">No availability marked.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {artist.availabilityDates.map((d, i) => (
                <div
                  key={`${d.from}-${d.to}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5"
                >
                  <span className="text-sm text-green-600">📅</span>
                  <span className="text-sm font-medium text-green-800">
                    {formatDeploymentCalendarDate(d.from)}
                    {" → "}
                    {formatDeploymentCalendarDate(d.to)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {collabsRatingsEnabled && (
          <SectionCard title={`Collabs (${artist.collabs.length})`}>
            {artist.collabs.length === 0 ? (
              <p className="text-sm italic text-stone-400">No collabs yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {artist.collabs.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col gap-3 rounded-lg border border-stone-100 px-4 py-3 transition-colors hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{c.name}</p>
                      <p className="mt-0.5 text-xs text-stone-400">
                        {c.role}
                        {c.closedAt ? ` · Closed ${c.closedAt}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:flex-shrink-0">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${collabBadgeClass(c.status)}`}
                      >
                        {collabBadgeLabel(c.status)}
                      </span>
                      <Link
                        href={`/admin/collabs/${c.id}`}
                        className="text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {collabsRatingsEnabled && (
          <SectionCard title={`Reviews received (${artist.reviews.length})`}>
            {artist.reviews.length === 0 ? (
              <p className="text-sm italic text-stone-400">No reviews yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {artist.reviews.map((r) => (
                  <div key={r.id} className="rounded-lg border border-stone-100 p-4">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-800">{r.from}</p>
                        <p className="mt-0.5 text-xs text-stone-400">
                          {r.collab} · {r.date}
                        </p>
                      </div>
                      <StarRating rating={r.rating} />
                    </div>
                    {r.comment ? (
                      <p className="text-sm italic leading-relaxed text-stone-600">
                        &ldquo;{r.comment}&rdquo;
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {artist.links.length > 0 ? (
          <SectionCard title="External Links">
            <div className="flex flex-wrap gap-3">
              {artist.links.map((l, i) => (
                <a
                  key={`${l.url}-${i}`}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
                >
                  {l.type}
                </a>
              ))}
            </div>
          </SectionCard>
        ) : null}
      </div>
    </main>
  );
}
