import Link from "next/link";
import { notFound } from "next/navigation";

const DUMMY_REGISTRATIONS: Record<string, {
  id: string; fullName: string; email: string; contactNumber: string;
  contactType: string; specialities: string[]; status: string;
  submittedAt: Date; bio: string;
  links: { linkType: string; url: string }[];
}> = {
  r1: { id: "r1", fullName: "Arjun Natarajan",    email: "arjun@example.com",  contactNumber: "+31612345678", contactType: "whatsapp", specialities: ["Vocal","Violin"],   status: "pending",  submittedAt: new Date("2025-03-10"), bio: "<p>Trained under Smt. Suguna Varadachari for 12 years. Performs regularly at sabhas in Amsterdam and Rotterdam.</p>", links: [{ linkType: "youtube", url: "https://youtube.com/@arjunnatarajan" }] },
  r2: { id: "r2", fullName: "Deepa Krishnaswamy", email: "deepa@example.com",  contactNumber: "+31698765432", contactType: "mobile",   specialities: ["Mridangam"],        status: "pending",  submittedAt: new Date("2025-03-12"), bio: "<p>Student of Shri Umayalpuram K. Sivaraman. Has accompanied leading vocalists across Europe.</p>", links: [] },
  r3: { id: "r3", fullName: "Ramesh Sundaram",    email: "ramesh@example.com", contactNumber: "+31611223344", contactType: "whatsapp", specialities: ["Flute"],            status: "approved", submittedAt: new Date("2025-02-20"), bio: "<p>Disciple of Shri N. Ramani. Known for meditative Carnatic flute performances.</p>", links: [{ linkType: "instagram", url: "https://instagram.com/rameshflute" }] },
  r4: { id: "r4", fullName: "Geetha Pillai",      email: "geetha@example.com", contactNumber: "+31655443322", contactType: "mobile",   specialities: ["Veena"],            status: "rejected", submittedAt: new Date("2025-02-15"), bio: "<p>Trained in the Mysore bani of Veena playing. Performs solo and in ensemble settings.</p>", links: [] },
  r5: { id: "r5", fullName: "Mohan Venkatesh",    email: "mohan@example.com",  contactNumber: "+31677889900", contactType: "whatsapp", specialities: ["Ghatam","Kanjira"], status: "pending",  submittedAt: new Date("2025-03-18"), bio: "<p>Specialist in both Ghatam and Kanjira. Has performed at major Carnatic festivals in The Netherlands and Belgium.</p>", links: [{ linkType: "linkedin", url: "https://linkedin.com/in/mohanvenkatesh" }] },
};

const LINK_LABELS: Record<string, string> = { linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook", twitter: "Twitter/X", youtube: "YouTube", website: "Website" };

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = { pending: "bg-amber-100 text-amber-800 border border-amber-300", approved: "bg-green-100 text-green-800 border border-green-300", rejected: "bg-red-100 text-red-800 border border-red-300" };
  const labels: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
  return <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${styles[status] ?? "bg-stone-100 text-stone-600"}`}>{labels[status] ?? status}</span>;
}

export default function ReviewRegistrationPage({ params }: { params: { id: string } }) {
  const reg = DUMMY_REGISTRATIONS[params.id];
  if (!reg) notFound();

  const isProcessed = reg.status !== "pending";

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8">
      <Link href="/admin/registrations" className="mb-6 inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 font-medium">← Back to registrations</Link>

      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">{reg.fullName}</h1>
            <p className="text-stone-500 text-sm mt-1">Submitted {reg.submittedAt.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
          <StatusBadge status={reg.status} />
        </div>

        {/* Avatar placeholder */}
        <div className="mb-6 flex gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Profile Photo</span>
            <div className="h-24 w-24 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-3xl font-bold text-amber-700">
              {reg.fullName[0]}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm mb-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Email</dt><dd className="text-stone-800">{reg.email}</dd></div>
            <div><dt className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Contact</dt><dd className="text-stone-800">{reg.contactNumber} <span className="text-xs text-stone-400">({reg.contactType === "whatsapp" ? "WhatsApp" : "Mobile only"})</span></dd></div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Specialities</dt>
              <dd className="flex flex-wrap gap-2">
                {reg.specialities.map(s => <span key={s} className="rounded-full bg-amber-50 border border-amber-200 px-3 py-0.5 text-sm text-amber-700 font-medium">{s}</span>)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Bio */}
        {reg.bio && (
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm mb-6">
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Biographical Write-up</h2>
            <div className="prose prose-stone max-w-none text-stone-700" dangerouslySetInnerHTML={{ __html: reg.bio }} />
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
