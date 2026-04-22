import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDeploymentRegistrationDate } from "@/lib/format-deployment-datetime";
import { decryptRegistrationStoredContact } from "@/lib/artist-pii";
import { getDb } from "@/lib/db";
import { PortalSectionHeading } from "@/components/portal-section-heading";
import { normalizeBioHtmlForDisplay } from "@/lib/bio-html-display";

const LINK_LABELS: Record<string, string> = { linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook", twitter: "Twitter/X", youtube: "YouTube", website: "Website" };

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = { pending: "bg-amber-100 text-amber-800 border border-amber-300", approved: "bg-green-100 text-green-800 border border-green-300", rejected: "bg-red-100 text-red-800 border border-red-300" };
  const labels: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
  return <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${styles[status] ?? "bg-stone-100 text-stone-600"}`}>{labels[status] ?? status}</span>;
}

export default async function ReviewRegistrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string; error?: string; email_warning?: string }>;
}) {
  const { id } = await params;
  const { done, error: queryError, email_warning: emailWarning } = await searchParams;
  const commentUpdated = done === "comment_updated";
  const emailDeliveryWarning = emailWarning === "1";
  const [reg, catalogueRows] = await Promise.all([
    getDb().registrationRequest.findUnique({
      where: { id },
      include: {
        specialities: {
          orderBy: { specialityName: "asc" },
        },
        links: {
          orderBy: { linkType: "asc" },
        },
        reviewer: {
          select: { fullName: true },
        },
      },
    }),
    getDb().speciality.findMany({ select: { name: true } }),
  ]);
  if (!reg) notFound();

  const regContact = decryptRegistrationStoredContact(reg);

  const catalogueLower = new Set(catalogueRows.map((c) => c.name.toLowerCase()));

  const canApprove = reg.status === "pending" || reg.status === "rejected";
  const canReject = reg.status === "pending";
  const canSendLoginLink = reg.status === "approved";

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8">
      <Link href="/admin/registrations" className="mb-6 inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 font-medium">← Back to registrations</Link>

      {done === "approved" ? (
        <div className="mx-auto mb-6 max-w-3xl space-y-3">
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-950">
            Registration approved. The artist account was created
            {emailDeliveryWarning ? "." : " and a login link was emailed to the applicant."}
          </div>
          {emailDeliveryWarning ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Resend did not accept the sign-in email (often an invalid <code className="rounded bg-amber-100/80 px-1">RESEND_API_KEY</code> or an unverified{" "}
              <code className="rounded bg-amber-100/80 px-1">RESEND_FROM_EMAIL</code> domain). A token was still created; after fixing env vars, the artist can use
              the public login page to request a new magic link.
            </div>
          ) : null}
        </div>
      ) : null}
      {done === "login_link_sent" ? (
        <div className="mx-auto mb-6 max-w-3xl space-y-3">
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-950">
            {emailDeliveryWarning
              ? "A new sign-in link token was created (email was not delivered)."
              : "A sign-in link email was sent to the applicant."}
          </div>
          {emailDeliveryWarning ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Check <code className="rounded bg-amber-100/80 px-1">RESEND_API_KEY</code> and{" "}
              <code className="rounded bg-amber-100/80 px-1">RESEND_FROM_EMAIL</code>. The artist can also use the public login page to request a link.
            </div>
          ) : null}
        </div>
      ) : null}
      {done === "rejected" ? (
        <div className="mx-auto mb-6 max-w-3xl rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800">
          Registration rejected.
        </div>
      ) : null}
      {commentUpdated ? (
        <div className="mx-auto mb-6 max-w-3xl rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-950">
          Review note saved.
        </div>
      ) : null}
      {queryError === "already_processed" ? (
        <div className="mx-auto mb-6 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          This request was already reviewed; nothing was changed.
        </div>
      ) : null}
      {queryError === "reject_comment_required" ? (
        <div className="mx-auto mb-6 max-w-3xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          Rejection requires a comment. Please explain why this application is being rejected.
        </div>
      ) : null}
      {queryError === "invalid_comment" ? (
        <div className="mx-auto mb-6 max-w-3xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          The review comment could not be saved (too long or invalid). Please try again.
        </div>
      ) : null}
      {queryError === "comment_amend_pending" ? (
        <div className="mx-auto mb-6 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          This registration is still pending. Use Approve or Reject below instead of updating the note only.
        </div>
      ) : null}
      {queryError === "send_link_not_approved" ? (
        <div className="mx-auto mb-6 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Sign-in link emails are only available after this registration is approved.
        </div>
      ) : null}
      {queryError === "send_link_no_artist" ? (
        <div className="mx-auto mb-6 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          No artist account was found for this registration email, so a sign-in link could not be generated.
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">{reg.fullName}</h1>
            <p className="text-stone-500 text-sm mt-1">
              Submitted {formatDeploymentRegistrationDate(reg.submittedAt)}
            </p>
          </div>
          <StatusBadge status={reg.status} />
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Profile Photo</span>
            {reg.profilePhotoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={reg.profilePhotoUrl}
                alt={`${reg.fullName} profile`}
                className="h-28 w-28 rounded-xl border border-stone-200 object-cover"
              />
            ) : (
              <p className="text-sm text-stone-500 italic">No profile photo URL provided.</p>
            )}
          </div>
          {reg.backgroundImageUrl && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Background Image</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={reg.backgroundImageUrl}
                alt={`${reg.fullName} background`}
                className="h-28 w-full rounded-xl border border-stone-200 object-cover"
              />
            </div>
          )}
          {reg.reviewedAt && (
            <div className="sm:col-span-2 text-xs text-stone-500">
              Reviewed{" "}
              {formatDeploymentRegistrationDate(reg.reviewedAt)}
              {reg.reviewer?.fullName ? ` by ${reg.reviewer.fullName}` : ""}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm mb-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Email</dt><dd className="text-stone-800">{regContact.email}</dd></div>
            <div><dt className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Contact</dt><dd className="text-stone-800">{regContact.contactNumber} <span className="text-xs text-stone-400">({reg.contactType === "whatsapp" ? "WhatsApp" : "Mobile only"})</span></dd></div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Specialities</dt>
              <dd className="flex flex-wrap gap-2">
                {reg.specialities.map((spec) => {
                  const known = catalogueLower.has(spec.specialityName.trim().toLowerCase());
                  return (
                    <span
                      key={spec.specialityName}
                      className={`rounded-full border px-3 py-0.5 text-sm font-medium ${
                        known
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-amber-500 bg-amber-100 text-amber-950"
                      }`}
                    >
                      {spec.specialityName}
                      {!known ? <span className="ml-1 text-xs font-normal">(not in catalogue)</span> : null}
                    </span>
                  );
                })}
              </dd>
              <p className="mt-3 text-xs text-stone-500">
                <Link href="/admin/specialities" className="font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900">
                  Manage specialities
                </Link>{" "}
                to add missing names and colours before approval. If you approve first, new names are created automatically with default colours and can be edited later.
              </p>
            </div>
          </dl>
        </div>

        {/* Bio */}
        {reg.bioRichText && (
          <div className="mb-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <PortalSectionHeading variant="label" className="mb-4">
              Biographical Write-up
            </PortalSectionHeading>
            <div
              className="max-w-measure text-left font-sans prose prose-sm prose-stone sm:prose-base [text-wrap:pretty]"
              dangerouslySetInnerHTML={{ __html: normalizeBioHtmlForDisplay(reg.bioRichText) }}
            />
          </div>
        )}

        {/* Links */}
        {reg.links.length > 0 && (
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm mb-6">
            <PortalSectionHeading variant="label" className="mb-3">
              External Links
            </PortalSectionHeading>
            <ul className="flex flex-col gap-2">
              {reg.links.map((link, i) => (
                <li key={i} className="min-w-0">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-sm font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
                  >
                    <span className="mr-2 text-xs text-stone-400">{LINK_LABELS[link.linkType] ?? link.linkType}</span>
                    {link.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-8">
          {canApprove || canReject ? (
            <div className="space-y-8">
              {canApprove ? (
                <form action={`/api/admin/registrations/${reg.id}/approve`} method="POST" className="rounded-xl border border-green-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-3 text-sm font-semibold text-stone-800">Approve</h2>
                  {reg.status === "rejected" ? (
                    <p className="mb-3 text-sm text-stone-600">
                      This application was previously rejected. Approving will create the artist account and email a login link, same as for a new pending request.
                    </p>
                  ) : null}
                  <label htmlFor="approve-comment" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Review note <span className="font-normal normal-case text-stone-400">(optional)</span>
                  </label>
                  <textarea
                    id="approve-comment"
                    name="comment"
                    rows={3}
                    maxLength={2000}
                    placeholder="Leave blank to store as “Approved”, or add a short internal note."
                    className="mb-4 w-full max-w-xl rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button type="submit" className="rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 min-h-[44px]">
                    Approve application
                  </button>
                </form>
              ) : null}
              {canReject ? (
                <form action={`/api/admin/registrations/${reg.id}/reject`} method="POST" className="rounded-xl border border-red-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-3 text-sm font-semibold text-stone-800">Reject</h2>
                  <label htmlFor="reject-comment" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Reason for rejection <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="reject-comment"
                    name="comment"
                    required
                    rows={4}
                    maxLength={2000}
                    placeholder="Explain why this application is being rejected (visible in admin history and notification emails)."
                    className="mb-4 w-full max-w-xl rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button type="submit" className="rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 min-h-[44px]">
                    Reject application
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}

          {canSendLoginLink ? (
            <div className="space-y-6">
              <form
                action={`/api/admin/registrations/${reg.id}/send-login-link`}
                method="POST"
                className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
              >
                <h2 className="mb-2 text-sm font-semibold text-stone-800">Send sign-in link</h2>
                <p className="mb-4 text-sm text-stone-600">
                  This is separate from approval: it only emails a short sign-in message with a new link. It does not change status or review history. Previous unused links
                  stop working when a new one is issued.
                </p>
                <button type="submit" className="rounded-lg bg-stone-800 px-6 py-3 text-sm font-semibold text-white hover:bg-stone-900 min-h-[44px]">
                  Email sign-in link
                </button>
              </form>
              <div className="rounded-lg border border-stone-200 bg-stone-50 px-5 py-4 text-stone-600 text-sm space-y-3">
                <div className="border-b border-stone-200 pb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">Review comment</p>
                  {reg.reviewComment ? (
                    <p className="text-stone-800 whitespace-pre-wrap">{reg.reviewComment}</p>
                  ) : (
                    <p className="text-stone-500 italic">No comment was stored for this decision.</p>
                  )}
                </div>
              </div>
              <form
                action={`/api/admin/registrations/${reg.id}/review-comment`}
                method="POST"
                className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
              >
                <h2 className="mb-1 text-sm font-semibold text-stone-800">Update review note</h2>
                <p className="mb-3 text-xs text-stone-500">
                  Add or edit the internal note shown here. Submit with an empty field to clear the stored comment.
                </p>
                <label htmlFor="amend-comment" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Review note
                </label>
                <textarea
                  id="amend-comment"
                  name="comment"
                  rows={4}
                  maxLength={2000}
                  defaultValue={reg.reviewComment ?? ""}
                  placeholder="Optional internal note."
                  className="mb-4 w-full max-w-xl rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button type="submit" className="rounded-lg bg-stone-800 px-6 py-3 text-sm font-semibold text-white hover:bg-stone-900 min-h-[44px]">
                  Save review note
                </button>
              </form>
            </div>
          ) : null}

          {!canApprove && !canReject && !canSendLoginLink ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-stone-200 bg-stone-50 px-5 py-4 text-stone-600 text-sm space-y-3">
                <p>
                  This request has already been <strong className="text-stone-800">{reg.status}</strong>. Approve and
                  reject are no longer available.
                </p>
                <div className="border-t border-stone-200 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">Review comment</p>
                  {reg.reviewComment ? (
                    <p className="text-stone-800 whitespace-pre-wrap">{reg.reviewComment}</p>
                  ) : (
                    <p className="text-stone-500 italic">No comment was stored for this decision.</p>
                  )}
                </div>
              </div>
              <form
                action={`/api/admin/registrations/${reg.id}/review-comment`}
                method="POST"
                className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
              >
                <h2 className="mb-1 text-sm font-semibold text-stone-800">Update review note</h2>
                <p className="mb-3 text-xs text-stone-500">
                  Add or edit the internal note shown here. Submit with an empty field to clear the stored comment.
                </p>
                <label htmlFor="amend-comment-legacy" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Review note
                </label>
                <textarea
                  id="amend-comment-legacy"
                  name="comment"
                  rows={4}
                  maxLength={2000}
                  defaultValue={reg.reviewComment ?? ""}
                  placeholder={
                    reg.status === "rejected"
                      ? "Reason for rejection (for admin records; was missing on this request)."
                      : "Optional internal note."
                  }
                  className="mb-4 w-full max-w-xl rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button type="submit" className="rounded-lg bg-stone-800 px-6 py-3 text-sm font-semibold text-white hover:bg-stone-900 min-h-[44px]">
                  Save review note
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
