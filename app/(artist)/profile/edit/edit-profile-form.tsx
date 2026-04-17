"use client";

import Link from "next/link";
import { useState, FormEvent, useTransition } from "react";
import { usePostHog } from "posthog-js/react";
import SpecialityPicker from "@/components/speciality-picker";
import { updateArtistProfile } from "./actions";
import type { ArtistEditView } from "@/lib/queries/artists";

interface EditProfileFormProps {
  initial: ArtistEditView;
  allSpecialities: { name: string; color: string }[];
  provinces: string[];
}

export function EditProfileForm({ initial, allSpecialities, provinces }: EditProfileFormProps) {
  const posthog = usePostHog();
  const [fullName, setFullName] = useState(initial.fullName);
  const [email, setEmail] = useState(initial.email);
  const [contactNumber, setContactNumber] = useState(initial.contactNumber);
  const [contactType, setContactType] = useState<"whatsapp" | "mobile">(initial.contactType);
  const [province, setProvince] = useState(initial.province);
  const [specialities, setSpecialities] = useState<string[]>(initial.specialities);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const primaryColor =
    allSpecialities.find((s) => s.name === specialities[0])?.color ?? "#92400E";

  function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setServerError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateArtistProfile({
        fullName,
        email,
        contactNumber,
        contactType,
        province,
        specialities,
      });
      if (result.ok) {
        setSaved(true);
        posthog.capture("profile_edit_saved");
        setTimeout(() => setSaved(false), 3000);
      } else {
        setServerError(result.error);
        setErrors(result.fieldErrors ?? {});
      }
    });
  }

  return (
    <>
      {saved && (
        <div className="mb-6 rounded-xl bg-green-50 border border-green-200 px-5 py-4 text-green-800 text-sm font-medium">
          ✓ Profile saved successfully!
        </div>
      )}
      {serverError && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-red-800 text-sm font-medium">
          {serverError}
        </div>
      )}

      <form
        onSubmit={handleSave}
        noValidate
        className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-6"
      >
        {/* Profile preview strip */}
        <div className="rounded-xl overflow-hidden border border-stone-100">
          <div
            className="h-14 flex items-end px-5 pb-2"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}bb)` }}
          >
            <div
              className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-lg font-bold translate-y-5 flex-shrink-0"
              style={{ backgroundColor: primaryColor, color: "#FFFFFF" }}
            >
              {fullName[0] ?? "?"}
            </div>
          </div>
          <div className="pt-7 px-5 pb-4 bg-stone-50">
            <p className="font-semibold text-stone-800">{fullName || "Your name"}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {specialities.map((s) => {
                const c = allSpecialities.find((x) => x.name === s)?.color ?? "#92400E";
                return (
                  <span
                    key={s}
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: c + "22", color: c }}
                  >
                    {s}
                  </span>
                );
              })}
            </div>
            <p className="text-xs text-stone-400 mt-1">📍 {province || "Province"}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
          />
          {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">
            Contact Number <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="+31 6 12345678"
              className="flex-1 border border-stone-200 rounded-lg px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                <input
                  type="radio"
                  value="whatsapp"
                  checked={contactType === "whatsapp"}
                  onChange={() => setContactType("whatsapp")}
                  className="accent-amber-600"
                />
                <span className="text-sm text-stone-700">WhatsApp</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                <input
                  type="radio"
                  value="mobile"
                  checked={contactType === "mobile"}
                  onChange={() => setContactType("mobile")}
                  className="accent-amber-600"
                />
                <span className="text-sm text-stone-700">Mobile only</span>
              </label>
            </div>
          </div>
          {errors.contactNumber && (
            <p className="text-xs text-red-500 mt-1">{errors.contactNumber}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">
            Province <span className="text-red-500">*</span>
          </label>
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
          >
            <option value="">Select province…</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {errors.province && <p className="text-xs text-red-500 mt-1">{errors.province}</p>}
        </div>

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

        <div className="rounded-xl bg-stone-50 border border-stone-100 px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-700">Availability Calendar</p>
            <p className="text-xs text-stone-400 mt-0.5">
              {initial.availabilityWindowCount > 0
                ? `${initial.availabilityWindowCount} window${
                    initial.availabilityWindowCount > 1 ? "s" : ""
                  } marked`
                : "No availability marked yet"}
            </p>
          </div>
          <Link
            href="/profile/availability"
            className="text-sm text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2"
          >
            Manage →
          </Link>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 py-3 bg-amber-700 text-white font-semibold rounded-lg hover:bg-amber-800 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Saving…" : "Save Changes"}
          </button>
          <Link
            href="/dashboard"
            className="px-6 py-3 border border-stone-200 text-stone-600 font-semibold rounded-lg hover:bg-stone-50 transition-colors min-h-[44px] flex items-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
