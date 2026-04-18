import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDeploymentRegistrationDate } from "@/lib/format-deployment-datetime";
import { getDb } from "@/lib/db";

const LINK_LABELS: Record<string, string> = { linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook", twitter: "Twitter/X", youtube: "YouTube", website: "Website" };

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = { pending: "bg-amber-100 text-amber-800 border border-amber-300", approved: "bg-green-100 text-green-800 border border-green-300", rejected: "bg-red-100 text-red-800 border border-red-300" };
  const labels: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
  return <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${styles[status] ?? "bg-stone-100 text-stone-600"}`}>{labels[status] ?? status}</span>;
}

export default async function ReviewRegistrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const catalogueLower = new Set(catalogueRows.map((c) => c.name.toLowerCase()));

  const isProcessed = reg.status !== "pending";

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8">
      <Link href="/admin/registrations" className="mb-6 inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 font-medium">← Back to registrations</Link>

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={reg.profilePhotoUrl}
              alt={`${reg.fullName} profile`}
              className="h-28 w-28 rounded-xl border border-stone-200 object-cover"
            />
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
            <div><dt className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Email</dt><dd className="text-stone-800">{reg.email}</dd></div>
            <div><dt className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Contact</dt><dd className="text-stone-800">{reg.contactNumber} <span className="text-xs text-stone-400">({reg.contactType === "whatsapp" ? "WhatsApp" : "Mobile only"})</span></dd></div>
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
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm mb-6">
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Biographical Write-up</h2>
            <div className="prose prose-stone max-w-none text-stone-700" dangerouslySetInnerHTML={{ __html: reg.bioRichText }} />
          </div>
        )}

        {/* Links */}
        {reg.links.length > 0 && (
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm mb-6">
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">External Links</h2>
            <ul className="flex flex-col gap-2">
              {reg.links.map((link, i) => (
                <li key={i}><a href={link.url} target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:text-amber-900 text-sm font-medium underline underline-offset-2"><span className="text-stone-400 text-xs mr-2">{LINK_LABELS[link.linkType] ?? link.linkType}</span>{link.url}</a></li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        {!isProcessed ? (
          <div className="flex flex-wrap gap-4">
            <form action={`/api/admin/registrations/${reg.id}/approve`} method="POST">
              <button type="submit" className="rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 min-w-[120px]">Approve</button>
            </form>
            <form action={`/api/admin/registrations/${reg.id}/reject`} method="POST">
              <button type="submit" className="rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 min-w-[120px]">Reject</button>
            </form>
          </div>
        ) : (
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-5 py-4 text-stone-500 text-sm">
            This request has already been <strong className="text-stone-700">{reg.status}</strong>. No further actions available.
          </div>
        )}
      </div>
    </main>
  );
}
