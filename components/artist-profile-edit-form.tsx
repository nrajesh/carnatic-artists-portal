"use client";

import Link from "next/link";
import { useState, FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import SpecialityPicker from "@/components/speciality-picker";
import { RegistrationPrefixedUrlInput } from "@/components/registration-prefixed-url-input";
import { BioRichTextEditor } from "@/components/bio-rich-text-editor";
import {
  REGISTRATION_FACEBOOK_PREFIX,
  REGISTRATION_HTTPS_PREFIX,
  REGISTRATION_INSTAGRAM_PREFIX,
  REGISTRATION_LINKEDIN_PREFIX,
  REGISTRATION_TWITTER_PREFIX,
  REGISTRATION_YOUTUBE_PREFIX,
  facebookSuffixFromStored,
  instagramSuffixFromStored,
  linkedinSuffixFromStored,
  mergeFacebookUrl,
  mergeInstagramUrl,
  mergeLinkedinUrl,
  mergeTwitterUrl,
  mergeWebsitePath,
  mergeYoutubeUrl,
  twitterSuffixFromStored,
  websitePathSuffixFromStored,
  youtubeSuffixFromStored,
} from "@/lib/registration-input-normalize";
import type { ArtistEditView } from "@/lib/queries/artists";
import type { ArtistProfileEditInput } from "@/lib/artist-profile-update-schema";
import { updateArtistProfile } from "@/app/(artist)/profile/edit/actions";
import { updateAdminArtistProfile } from "@/app/(admin)/admin/artists/[id]/edit/actions";

type Variant = "artist" | "admin";

type ArtistProfileEditFormProps = {
  variant: Variant;
  initial: ArtistEditView;
  allSpecialities: { name: string; color: string }[];
  provinces: string[];
  /** Admin edits another artist; ignored when variant is artist. */
  targetArtistId?: string;
};

export function ArtistProfileEditForm({
  variant,
  initial,
  allSpecialities,
  provinces,
  targetArtistId,
}: ArtistProfileEditFormProps) {
  const router = useRouter();
  const posthog = usePostHog();
  const [fullName, setFullName] = useState(initial.fullName);
  const [email, setEmail] = useState(initial.email);
  const [contactNumber, setContactNumber] = useState(initial.contactNumber);
  const [contactType, setContactType] = useState<"whatsapp" | "mobile">(initial.contactType);
  const [province, setProvince] = useState(initial.province);
  const [specialities, setSpecialities] = useState<string[]>(initial.specialities);
  const [openToCollab, setOpenToCollab] = useState(initial.openToCollab);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(initial.profilePhotoUrl);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(initial.backgroundImageUrl);
  const [bioHtml, setBioHtml] = useState(initial.bioRichText);
  const [linkedinUrl, setLinkedinUrl] = useState(initial.linkedinUrl);
  const [instagramUrl, setInstagramUrl] = useState(initial.instagramUrl);
  const [facebookUrl, setFacebookUrl] = useState(initial.facebookUrl);
  const [twitterUrl, setTwitterUrl] = useState(initial.twitterUrl);
  const [youtubeUrl, setYoutubeUrl] = useState(initial.youtubeUrl);
  const [websiteUrls, setWebsiteUrls] = useState<{ url: string }[]>(
    initial.websiteUrls.length > 0 ? initial.websiteUrls : [{ url: "" }],
  );

  const [errors, setErrors] = useState<Partial<Record<keyof ArtistProfileEditInput, string>>>({});
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const primaryColor =
    allSpecialities.find((s) => s.name === specialities[0])?.color ?? "#92400E";

  function addWebsiteRow() {
    if (websiteUrls.length >= 3) return;
    setWebsiteUrls((w) => [...w, { url: "" }]);
  }

  function removeWebsiteRow(index: number) {
    setWebsiteUrls((w) => (w.length <= 1 ? [{ url: "" }] : w.filter((_, i) => i !== index)));
  }

  function setWebsiteUrlAt(index: number, url: string) {
    setWebsiteUrls((rows) => rows.map((row, i) => (i === index ? { url } : row)));
  }

  function buildPayload(): ArtistProfileEditInput {
    return {
      fullName,
      email,
      contactNumber,
      contactType,
      province,
      specialities,
      openToCollab,
      profilePhotoUrl: profilePhotoUrl.trim() || undefined,
      backgroundImageUrl: backgroundImageUrl.trim() || undefined,
      bioRichText: bioHtml,
      websiteUrls,
      linkedinUrl,
      instagramUrl,
      facebookUrl,
      twitterUrl,
      youtubeUrl,
    };
  }

  function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setServerError(null);
    setSaved(false);

    const payload = buildPayload();

    startTransition(async () => {
      const result =
        variant === "artist"
          ? await updateArtistProfile(payload)
          : await updateAdminArtistProfile(targetArtistId ?? initial.id, payload);

      if (result.ok) {
        setSaved(true);
        if (variant === "artist") posthog?.capture("profile_edit_saved");
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      } else {
        setServerError(result.error);
        setErrors(result.fieldErrors ?? {});
      }
    });
  }

  const ring = "focus:ring-amber-400";

  return (
    <>
      {saved && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">
          ✓ Profile saved successfully!
        </div>
      )}
      {serverError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
          {serverError}
        </div>
      )}

      <form
        onSubmit={handleSave}
        noValidate
        className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <div className="overflow-hidden rounded-xl border border-stone-100">
          <div
            className="flex h-14 items-end px-5 pb-2"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}bb)` }}
          >
            <div
              className="flex h-10 w-10 flex-shrink-0 translate-y-5 items-center justify-center rounded-full border-2 border-white text-lg font-bold"
              style={{ backgroundColor: primaryColor, color: "#FFFFFF" }}
            >
              {fullName[0] ?? "?"}
            </div>
          </div>
          <div className="bg-stone-50 px-5 pb-4 pt-7">
            <p className="font-semibold text-stone-800">{fullName || "Your name"}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {specialities.map((s) => {
                const c = allSpecialities.find((x) => x.name === s)?.color ?? "#92400E";
                return (
                  <span
                    key={s}
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: `${c}22`, color: c }}
                  >
                    {s}
                  </span>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-stone-400">📍 {province || "Province"}</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-stone-700">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={`min-h-[44px] w-full rounded-lg border border-stone-200 px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 ${ring}`}
          />
          {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-stone-700">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`min-h-[44px] w-full rounded-lg border border-stone-200 px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 ${ring}`}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-stone-700">
            Contact Number <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="+31 6 12345678"
              className={`min-h-[44px] flex-1 rounded-lg border border-stone-200 px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 ${ring}`}
            />
            <div className="flex items-center gap-4">
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  value="whatsapp"
                  checked={contactType === "whatsapp"}
                  onChange={() => setContactType("whatsapp")}
                  className="accent-amber-600"
                />
                <span className="text-sm text-stone-700">WhatsApp</span>
              </label>
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
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
          {errors.contactNumber && <p className="mt-1 text-xs text-red-500">{errors.contactNumber}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-stone-700">
            Province <span className="text-red-500">*</span>
          </label>
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className={`min-h-[44px] w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 ${ring}`}
          >
            <option value="">Select province…</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {errors.province && <p className="mt-1 text-xs text-red-500">{errors.province}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-stone-700">
            Specialities <span className="text-red-500">*</span>
            <span className="ml-1 font-normal text-stone-400">(1–3)</span>
          </label>
          <SpecialityPicker
            selected={specialities}
            onChange={setSpecialities}
            catalog={allSpecialities}
            allowCustom={false}
            error={errors.specialities}
          />
        </div>

        <div className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={openToCollab}
              onChange={(e) => setOpenToCollab(e.target.checked)}
              className="mt-1 accent-amber-600"
            />
            <span>
              <span className="text-sm font-semibold text-stone-800">Open to collaborations</span>
              <span className="mt-0.5 block text-xs text-stone-500">
                When enabled, you appear in “open to collaborate” counts and can be discovered for new
                projects.
              </span>
            </span>
          </label>
          {errors.openToCollab && <p className="mt-2 text-xs text-red-500">{errors.openToCollab}</p>}
        </div>

        <div>
          <RegistrationPrefixedUrlInput
            id="profilePhotoUrl"
            label="Profile photo URL"
            helperText="Optional. Must be HTTPS. Shown on your public profile."
            prefix={REGISTRATION_HTTPS_PREFIX}
            suffixPlaceholder="cdn.example.com/photo.jpg"
            suffixFromStored={websitePathSuffixFromStored}
            merge={mergeWebsitePath}
            field={{
              value: profilePhotoUrl,
              onChange: setProfilePhotoUrl,
              onBlur: () => {},
            }}
            error={errors.profilePhotoUrl}
          />
        </div>

        <div>
          <RegistrationPrefixedUrlInput
            id="backgroundImageUrl"
            label="Background image URL"
            helperText="Optional. Wide banner for your public profile hero."
            prefix={REGISTRATION_HTTPS_PREFIX}
            suffixPlaceholder="example.com/banner.jpg"
            suffixFromStored={websitePathSuffixFromStored}
            merge={mergeWebsitePath}
            field={{
              value: backgroundImageUrl,
              onChange: setBackgroundImageUrl,
              onBlur: () => {},
            }}
            error={errors.backgroundImageUrl}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-stone-700">Bio / Musical journey</label>
          <BioRichTextEditor initialHtml={initial.bioRichText} onHtmlChange={setBioHtml} disabled={isPending} />
          {errors.bioRichText && <p className="mt-1 text-xs text-red-500">{errors.bioRichText}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-stone-700">
            Website URLs <span className="font-normal text-stone-400">(up to 3)</span>
          </label>
          <div className="space-y-2">
            {websiteUrls.map((row, index) => (
              <div key={index} className="min-w-0 max-w-full">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <div
                    className={`flex w-full min-w-0 max-w-full flex-col rounded-lg border border-stone-200 bg-white focus-within:ring-2 sm:flex-row sm:overflow-hidden ${ring}`}
                  >
                    <span className="select-none break-all border-b border-stone-200 bg-stone-50 px-2 py-1.5 text-[11px] font-medium leading-snug text-stone-700 sm:border-b-0 sm:border-r sm:py-2 sm:text-xs">
                      {REGISTRATION_HTTPS_PREFIX}
                    </span>
                    <input
                      type="text"
                      inputMode="url"
                      autoComplete="off"
                      value={websitePathSuffixFromStored(row.url ?? "")}
                      onChange={(e) => setWebsiteUrlAt(index, mergeWebsitePath(e.target.value))}
                      placeholder="yourwebsite.com"
                      className="min-h-[48px] min-w-0 w-full flex-1 border-0 bg-transparent px-2 py-2 text-base text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-0 sm:min-h-[44px]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeWebsiteRow(index)}
                    className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50 sm:self-start"
                    aria-label="Remove website URL"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            {websiteUrls.length < 3 && (
              <button
                type="button"
                onClick={addWebsiteRow}
                className="min-h-[44px] text-sm text-amber-700 underline hover:text-amber-900"
              >
                + Add website URL
              </button>
            )}
          </div>
          {errors.websiteUrls && (
            <p className="mt-1 text-xs text-red-500" role="alert">
              {String((errors.websiteUrls as { message?: string }).message ?? "Check website URLs.")}
            </p>
          )}
        </div>

        {(
          [
            {
              id: "linkedinUrl",
              label: "LinkedIn",
              prefix: REGISTRATION_LINKEDIN_PREFIX,
              merge: mergeLinkedinUrl,
              suffixFrom: linkedinSuffixFromStored,
              placeholder: "your-profile-id",
              value: linkedinUrl,
              set: setLinkedinUrl,
              err: errors.linkedinUrl,
            },
            {
              id: "instagramUrl",
              label: "Instagram",
              prefix: REGISTRATION_INSTAGRAM_PREFIX,
              merge: mergeInstagramUrl,
              suffixFrom: instagramSuffixFromStored,
              placeholder: "yourhandle",
              value: instagramUrl,
              set: setInstagramUrl,
              err: errors.instagramUrl,
            },
            {
              id: "facebookUrl",
              label: "Facebook",
              prefix: REGISTRATION_FACEBOOK_PREFIX,
              merge: mergeFacebookUrl,
              suffixFrom: facebookSuffixFromStored,
              placeholder: "profile or page path",
              value: facebookUrl,
              set: setFacebookUrl,
              err: errors.facebookUrl,
            },
            {
              id: "twitterUrl",
              label: "X (Twitter)",
              prefix: REGISTRATION_TWITTER_PREFIX,
              merge: mergeTwitterUrl,
              suffixFrom: twitterSuffixFromStored,
              placeholder: "handle",
              value: twitterUrl,
              set: setTwitterUrl,
              err: errors.twitterUrl,
            },
            {
              id: "youtubeUrl",
              label: "YouTube",
              prefix: REGISTRATION_YOUTUBE_PREFIX,
              merge: mergeYoutubeUrl,
              suffixFrom: youtubeSuffixFromStored,
              placeholder: "@channel or path",
              value: youtubeUrl,
              set: setYoutubeUrl,
              err: errors.youtubeUrl,
            },
          ] as const
        ).map((row) => (
          <div key={row.id}>
            <RegistrationPrefixedUrlInput
              id={row.id}
              label={row.label}
              prefix={row.prefix}
              suffixPlaceholder={row.placeholder}
              suffixFromStored={row.suffixFrom}
              merge={row.merge}
              field={{
                value: row.value,
                onChange: row.set,
                onBlur: () => {},
              }}
              error={row.err}
            />
          </div>
        ))}

        <div className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-stone-700">Availability calendar</p>
              <p className="mt-0.5 text-xs text-stone-400">
                {initial.availabilityWindowCount > 0
                  ? `${initial.availabilityWindowCount} window${
                      initial.availabilityWindowCount > 1 ? "s" : ""
                    } marked`
                  : "No availability marked yet"}
              </p>
            </div>
            <Link
              href="/profile/availability"
              className="text-sm font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
            >
              Manage →
            </Link>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="min-h-[44px] flex-1 rounded-lg bg-amber-700 py-3 font-semibold text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
          <Link
            href={variant === "artist" ? "/dashboard" : `/admin/artists/${initial.id}`}
            className="flex min-h-[44px] items-center rounded-lg border border-stone-200 px-6 py-3 font-semibold text-stone-600 transition-colors hover:bg-stone-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
