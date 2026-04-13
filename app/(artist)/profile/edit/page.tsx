"use client";

import Link from "next/link";
import { useState } from "react";
import { DUMMY_ARTISTS } from "@/lib/dummy-artists";
import SpecialityPicker from "@/components/speciality-picker";

// Demo: the logged-in artist is always Lakshmi Narayanan
const CURRENT_ARTIST = DUMMY_ARTISTS[0];

// Reviews this artist has written for others
const MY_GIVEN_REVIEWS = DUMMY_ARTISTS
  .filter(a => a.slug !== CURRENT_ARTIST.slug)
  .flatMap(a => a.reviews
    .filter(r => r.reviewerSlug === CURRENT_ARTIST.slug)
    .map(r => ({ artistSlug: a.slug, artistName: a.name, review: r }))
  );

const ALL_SPECIALITIES = [
  { name: "Vocal",             color: "#7C3AED" },
  { name: "Violin",            color: "#B45309" },
  { name: "Mridangam",         color: "#B91C1C" },
  { name: "Veena",             color: "#047857" },
  { name: "Flute",             color: "#0369A1" },
  { name: "Ghatam",            color: "#92400E" },
  { name: "Kanjira",           color: "#BE185D" },
  { name: "Thavil",            color: "#7E22CE" },
  { name: "Nadaswaram",        color: "#C2410C" },
  { name: "Violin (Carnatic)", color: "#A16207" },
  { name: "Morsing",           color: "#065F46" },
  { name: "Tavil",             color: "#1D4ED8" },
];

const NL_PROVINCES = [
  "Drenthe","Flevoland","Friesland","Gelderland","Groningen",
  "Limburg","Noord-Brabant","Noord-Holland","Overijssel",
  "Utrecht","Zeeland","Zuid-Holland",
];

export default function EditProfilePage() {
  const [fullName,       setFullName]       = useState(CURRENT_ARTIST.name);
  const [email,          setEmail]          = useState(CURRENT_ARTIST.email);
  const [contactNumber,  setContactNumber]  = useState(CURRENT_ARTIST.contactNumber);
  const [contactType,    setContactType]    = useState<"whatsapp"|"mobile">(
    CURRENT_ARTIST.contactType as "whatsapp"|"mobile"
  );
  const [province,       setProvince]       = useState(CURRENT_ARTIST.province);
  const [specialities,   setSpecialities]   = useState(CURRENT_ARTIST.specialities.map(s => s.name));
  const [saved,          setSaved]          = useState(false);
  const [errors,         setErrors]         = useState<Record<string, string>>({});

  const primaryColor = ALL_SPECIALITIES.find(s => s.name === specialities[0])?.color ?? "#92400E";

  function validate() {
    const e: Record<string, string> = {};
    if (!fullName.trim())      e.fullName      = "Full name is required";
    if (!email.trim())         e.email         = "Email is required";
    if (!contactNumber.trim()) e.contactNumber = "Contact number is required";
    if (!province)             e.province      = "Province is required";
    if (specialities.length === 0) e.specialities = "At least one speciality is required";
    return e;
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <main className="min-h-screen bg-amber-50 px-4 py-8 sm:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-amber-700 hover:text-amber-900 mb-2 inline-block">← Dashboard</Link>
          <h1 className="text-3xl font-bold text-stone-800">Edit Profile</h1>
          <p className="text-stone-500 mt-1 text-sm">Changes are visible on your public profile immediately.</p>
        </div>

        {saved && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 px-5 py-4 text-green-800 text-sm font-medium">
            ✓ Profile saved successfully!
          </div>
        )}

        <form onSubmit={handleSave} noValidate className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-6">

          {/* Profile preview strip */}
          <div className="rounded-xl overflow-hidden border border-stone-100">
            <div className="h-14 flex items-end px-5 pb-2"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}bb)` }}>
              <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-lg font-bold translate-y-5 flex-shrink-0"
                style={{ backgroundColor: primaryColor, color: "#FFFFFF" }}>
                {fullName[0] ?? "?"}
              </div>
            </div>
            <div className="pt-7 px-5 pb-4 bg-stone-50">
              <p className="font-semibold text-stone-800">{fullName || "Your name"}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {specialities.map(s => {
                  const c = ALL_SPECIALITIES.find(x => x.name === s)?.color ?? "#92400E";
                  return <span key={s} className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: c + "22", color: c }}>{s}</span>;
                })}
              </div>
              <p className="text-xs text-stone-400 mt-1">📍 {province || "Province"}</p>
            </div>
          </div>

          {/* Full name */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]" />
            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]" />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* Contact number + type */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">
              Contact Number <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="text" value={contactNumber} onChange={e => setContactNumber(e.target.value)}
                placeholder="+31 6 12345678"
                className="flex-1 border border-stone-200 rounded-lg px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]" />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                  <input type="radio" value="whatsapp" checked={contactType === "whatsapp"}
                    onChange={() => setContactType("whatsapp")} className="accent-amber-600" />
                  <span className="text-sm text-stone-700">WhatsApp</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                  <input type="radio" value="mobile" checked={contactType === "mobile"}
                    onChange={() => setContactType("mobile")} className="accent-amber-600" />
                  <span className="text-sm text-stone-700">Mobile only</span>
                </label>
              </div>
            </div>
            {errors.contactNumber && <p className="text-xs text-red-500 mt-1">{errors.contactNumber}</p>}
          </div>

          {/* Province */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">
              Province <span className="text-red-500">*</span>
            </label>
            <select value={province} onChange={e => setProvince(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]">
              <option value="">Select province…</option>
              {NL_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {errors.province && <p className="text-xs text-red-500 mt-1">{errors.province}</p>}
          </div>

          {/* Specialities */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">
              Specialities <span className="text-red-500">*</span>
              <span className="font-normal text-stone-400 ml-1">(1–3)</span>
            </label>
            <SpecialityPicker
              selected={specialities}
              onChange={setSpecialities}
              error={errors.specialities}
            />
          </div>

          {/* Availability shortcut */}
          <div className="rounded-xl bg-stone-50 border border-stone-100 px-4 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-700">Availability Calendar</p>
              <p className="text-xs text-stone-400 mt-0.5">
                {CURRENT_ARTIST.availabilityDates.length > 0
                  ? `${CURRENT_ARTIST.availabilityDates.length} window${CURRENT_ARTIST.availabilityDates.length > 1 ? "s" : ""} marked`
                  : "No availability marked yet"}
              </p>
            </div>
            <Link href="/profile/availability"
              className="text-sm text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2">
              Manage →
            </Link>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="submit"
              className="flex-1 py-3 bg-amber-700 text-white font-semibold rounded-lg hover:bg-amber-800 transition-colors min-h-[44px]">
              Save Changes
            </button>
            <Link href="/dashboard"
              className="px-6 py-3 border border-stone-200 text-stone-600 font-semibold rounded-lg hover:bg-stone-50 transition-colors min-h-[44px] flex items-center">
              Cancel
            </Link>
          </div>
        </form>

        {/* My reviews given */}
        <div className="mt-8 bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-stone-800 mb-4">Reviews I&apos;ve Written</h2>
          {MY_GIVEN_REVIEWS.length === 0
            ? <p className="text-stone-400 text-sm italic">No reviews written yet.</p>
            : (
              <div className="flex flex-col gap-3">
                {MY_GIVEN_REVIEWS.map(({ artistSlug, artistName, review: r }) => (
                  <div key={r.id} className="border border-stone-100 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <Link href={`/artists/${artistSlug}#${r.id}`}
                          className="text-sm font-semibold text-stone-800 hover:text-amber-800 transition-colors">
                          {artistName}
                        </Link>
                        <p className="text-xs text-stone-400 mt-0.5">{r.collab} · {r.date}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <span key={i} className={`text-sm ${i <= r.rating ? "text-amber-500" : "text-stone-200"}`}>★</span>
                          ))}
                        </div>
                        <Link href={`/artists/${artistSlug}#${r.id}`}
                          className="text-xs text-amber-600 hover:text-amber-800 font-medium border border-amber-200 rounded px-2 py-0.5 hover:bg-amber-50 transition-colors">
                          Edit
                        </Link>
                      </div>
                    </div>
                    {r.comment && <p className="text-sm text-stone-600 italic">&ldquo;{r.comment}&rdquo;</p>}
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>
    </main>
  );
}
