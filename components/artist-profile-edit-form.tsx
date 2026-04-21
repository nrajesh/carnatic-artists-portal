"use client";

import Link from "next/link";
import { useState, FormEvent, useMemo, useTransition } from "react";
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
import { FeaturedArtistPhoto } from "@/components/featured-artist-photo";
import { stripHtmlForSearch } from "@/lib/artist-directory-search";
import { getThemeFromArtistSpecialities } from "@/lib/speciality-theme";
import type { ArtistEditView } from "@/lib/queries/artists";
import type { ArtistProfileEditInput } from "@/lib/artist-profile-update-schema";
import { updateArtistProfile } from "@/app/(artist)/profile/edit/actions";
import { updateAdminArtistProfile } from "@/app/(admin)/admin/artists/[id]/edit/actions";

type Variant = "artist" | "admin";

type FormFieldsSnapshot = {
  slug: string;
  fullName: string;
  email: string;
  contactNumber: string;
  contactType: "whatsapp" | "mobile";
  emailVisibility: ArtistProfileEditInput["emailVisibility"];
  contactVisibility: ArtistProfileEditInput["contactVisibility"];
  province: string;
  specialities: string[];
  openToCollab: boolean;
  profilePhotoUrl: string;
  backgroundImageUrl: string;
  bioRichText: string;
  websiteUrls: { url: string }[];
  linkedinUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
};

/** TipTap empty doc is often `<p></p>` while the DB may store `""` - treat both as empty for dirty checks only. */
function normalizeBioRichTextForFingerprint(html: string | undefined): string {
  const t = (html ?? "").trim();
  if (stripHtmlForSearch(t) === "") return "";
  return t;
}

function toArtistProfileEditInput(
  fields: FormFieldsSnapshot,
  collabsRatingsEnabled: boolean,
  openToCollabWhenCollabsDisabled: boolean,
): ArtistProfileEditInput {
  return {
    slug: fields.slug,
    fullName: fields.fullName,
    email: fields.email,
    contactNumber: fields.contactNumber,
    contactType: fields.contactType,
    emailVisibility: fields.emailVisibility,
    contactVisibility: fields.contactVisibility,
    province: fields.province,
    specialities: fields.specialities,
    openToCollab: collabsRatingsEnabled ? fields.openToCollab : openToCollabWhenCollabsDisabled,
    profilePhotoUrl: fields.profilePhotoUrl.trim() || undefined,
    backgroundImageUrl: fields.backgroundImageUrl.trim() || undefined,
    bioRichText: fields.bioRichText,
    websiteUrls: fields.websiteUrls,
    linkedinUrl: fields.linkedinUrl,
    instagramUrl: fields.instagramUrl,
    facebookUrl: fields.facebookUrl,
    twitterUrl: fields.twitterUrl,
    youtubeUrl: fields.youtubeUrl,
  };
}

function fingerprintArtistProfileInput(p: ArtistProfileEditInput): string {
  const sites = (p.websiteUrls ?? []).map((r) => r.url.trim()).filter((u) => u.length > 0);
  return JSON.stringify({
    slug: p.slug.trim().toLowerCase(),
    fullName: p.fullName.trim(),
    email: p.email.trim().toLowerCase(),
    contactNumber: p.contactNumber.trim(),
    contactType: p.contactType,
    emailVisibility: p.emailVisibility,
    contactVisibility: p.contactVisibility,
    province: p.province.trim(),
    specialities: [...p.specialities],
    openToCollab: p.openToCollab,
    profilePhotoUrl: (p.profilePhotoUrl ?? "").trim(),
    backgroundImageUrl: (p.backgroundImageUrl ?? "").trim(),
    bioRichText: normalizeBioRichTextForFingerprint(p.bioRichText),
    websiteUrls: sites,
    linkedinUrl: p.linkedinUrl.trim(),
    instagramUrl: p.instagramUrl.trim(),
    facebookUrl: p.facebookUrl.trim(),
    twitterUrl: p.twitterUrl.trim(),
    youtubeUrl: p.youtubeUrl.trim(),
  });
}

function snapshotFromEditView(initial: ArtistEditView): FormFieldsSnapshot {
  return {
    slug: initial.slug,
    fullName: initial.fullName,
    email: initial.email,
    contactNumber: initial.contactNumber,
    contactType: initial.contactType,
    emailVisibility: initial.emailVisibility,
    contactVisibility: initial.contactVisibility,
    province: initial.province,
    specialities: [...initial.specialities],
    openToCollab: initial.openToCollab,
    profilePhotoUrl: initial.profilePhotoUrl,
    backgroundImageUrl: initial.backgroundImageUrl,
    bioRichText: initial.bioRichText,
    websiteUrls:
      initial.websiteUrls.length > 0 ? initial.websiteUrls.map((w) => ({ url: w.url })) : [{ url: "" }],
    linkedinUrl: initial.linkedinUrl,
    instagramUrl: initial.instagramUrl,
    facebookUrl: initial.facebookUrl,
    twitterUrl: initial.twitterUrl,
    youtubeUrl: initial.youtubeUrl,
  };
}

type ArtistProfileEditFormProps = {
  variant: Variant;
  initial: ArtistEditView;
  allSpecialities: { name: string; color: string }[];
  provinces: string[];
  /** Admin edits another artist; ignored when variant is artist. */
  targetArtistId?: string;
  /** PostHog `artist-collabs-ratings`; when false, hide collaboration opt-in UI. */
  collabsRatingsEnabled?: boolean;
};

export function ArtistProfileEditForm({
  variant,
  initial,
  allSpecialities,
  provinces,
  targetArtistId,
  collabsRatingsEnabled = true,
}: ArtistProfileEditFormProps) {
  const router = useRouter();
  const posthog = usePostHog();
  const [slug, setSlug] = useState(initial.slug);
  const [fullName, setFullName] = useState(initial.fullName);
  const [email, setEmail] = useState(initial.email);
  const [contactNumber, setContactNumber] = useState(initial.contactNumber);
  const [contactType, setContactType] = useState<"whatsapp" | "mobile">(initial.contactType);
  const [emailVisibility, setEmailVisibility] = useState(initial.emailVisibility);
  const [contactVisibility, setContactVisibility] = useState(initial.contactVisibility);
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

  const baselineFingerprint = useMemo(
    () =>
      fingerprintArtistProfileInput(
        toArtistProfileEditInput(
          snapshotFromEditView(initial),
          collabsRatingsEnabled,
          initial.openToCollab,
        ),
      ),
    // `profileRevision` bumps when the server sends a new saved snapshot for this form.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- same revision keeps one logical baseline
    [initial.profileRevision, collabsRatingsEnabled],
  );

  const currentFingerprint = useMemo(() => {
    return fingerprintArtistProfileInput(
      toArtistProfileEditInput(
        {
          slug,
          fullName,
          email,
          contactNumber,
          contactType,
          emailVisibility,
          contactVisibility,
          province,
          specialities,
          openToCollab,
          profilePhotoUrl,
          backgroundImageUrl,
          bioRichText: bioHtml,
          websiteUrls,
          linkedinUrl,
          instagramUrl,
          facebookUrl,
          twitterUrl,
          youtubeUrl,
        },
        collabsRatingsEnabled,
        initial.openToCollab,
      ),
    );
  }, [
    slug,
    fullName,
    email,
    contactNumber,
    contactType,
    emailVisibility,
    contactVisibility,
    province,
    specialities,
    openToCollab,
    profilePhotoUrl,
    backgroundImageUrl,
    bioHtml,
    websiteUrls,
    linkedinUrl,
    instagramUrl,
    facebookUrl,
    twitterUrl,
    youtubeUrl,
    collabsRatingsEnabled,
    initial.openToCollab,
  ]);

  const isDirty = baselineFingerprint !== currentFingerprint;

  const previewCardTheme = useMemo(() => {
    const specs = specialities
      .map((name) => {
        const meta = allSpecialities.find((s) => s.name === name);
        return meta ? { name: meta.name, color: meta.color } : null;
      })
      .filter((x): x is { name: string; color: string } => x !== null);
    const theme = getThemeFromArtistSpecialities(specs);
    const headerBg = theme.background.startsWith("linear-gradient")
      ? theme.background
      : `linear-gradient(135deg, ${theme.background}, ${theme.background}cc)`;
    const avatarAccent = theme.background.startsWith("linear-gradient")
      ? theme.background
      : theme.accentColor;
    return { headerBg, avatarAccent };
  }, [specialities, allSpecialities]);

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
    return toArtistProfileEditInput(
      {
        slug,
        fullName,
        email,
        contactNumber,
        contactType,
        emailVisibility,
        contactVisibility,
        province,
        specialities,
        openToCollab,
        profilePhotoUrl,
        backgroundImageUrl,
        bioRichText: bioHtml,
        websiteUrls,
        linkedinUrl,
        instagramUrl,
        facebookUrl,
        twitterUrl,
        youtubeUrl,
      },
      collabsRatingsEnabled,
      initial.openToCollab,
    );
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
            className="flex h-20 items-end px-5 pb-3"
            style={
              backgroundImageUrl.trim()
                ? {
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.38), rgba(0,0,0,0.48)), url(${backgroundImageUrl.trim()})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : { background: previewCardTheme.headerBg }
            }
          >
            <div className="translate-y-6 flex-shrink-0">
              <FeaturedArtistPhoto
                photoUrl={profilePhotoUrl}
                initial={(fullName.trim()[0] ?? "?").toUpperCase()}
                accentColor={previewCardTheme.avatarAccent}
                alt=""
                sizeClassName="h-12 w-12 text-xl"
                imgClassName="!ring-white border-2 border-white shadow-md"
              />
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
            <p className="mt-1 text-xs text-stone-400">
              {province.trim() ? `📍 ${province}` : "No province listed on your public profile"}
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="artist-profile-slug" className="mb-1 block text-sm font-semibold text-stone-700">
            Public profile URL <span className="text-red-500">*</span>
          </label>
          <p className="mb-2 text-xs text-stone-500">
            Lowercase letters, numbers, and hyphens. Spaces become hyphens; other symbols are removed when you
            save.
          </p>
          <div
            className={`flex w-full min-w-0 max-w-full flex-col rounded-lg border border-stone-200 bg-white focus-within:ring-2 sm:flex-row sm:items-stretch sm:overflow-hidden ${ring}`}
          >
            <span className="flex min-h-[48px] shrink-0 select-none items-center break-all border-b border-stone-200 bg-stone-50 px-3 text-sm font-medium leading-normal text-stone-600 sm:min-h-0 sm:border-b-0 sm:border-r">
              /artists/
            </span>
            <input
              id="artist-profile-slug"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="min-h-[48px] min-w-0 w-full flex-1 border-0 bg-transparent px-3 py-2 text-sm leading-normal text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-0 sm:min-h-[44px] sm:py-2.5"
              placeholder="your-name"
            />
          </div>
          {errors.slug && <p className="mt-1 text-xs text-red-500">{errors.slug}</p>}
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
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`ph-no-capture min-h-[44px] w-full rounded-lg border border-stone-200 px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 ${ring}`}
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
              autoComplete="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="+31 6 12345678"
              className={`ph-no-capture min-h-[44px] flex-1 rounded-lg border border-stone-200 px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 ${ring}`}
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

        <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-4 space-y-4">
          <p className="text-sm font-semibold text-stone-800">Who can see your email & phone</p>
          <p className="text-xs text-stone-600 leading-relaxed">
            Login always uses your email privately. These settings only control what other artists and visitors can see.
          </p>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-600">Email visibility</label>
            <select
              value={emailVisibility}
              onChange={(e) =>
                setEmailVisibility(e.target.value as ArtistProfileEditInput["emailVisibility"])
              }
              className={`min-h-[44px] w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 ${ring}`}
            >
              <option value="PRIVATE">Only you and portal admins</option>
              <option value="COLLABORATORS_ONLY">Fellow collaborators (shared projects)</option>
              <option value="PUBLIC_PROFILE">Public on your artist profile & directory</option>
            </select>
            {errors.emailVisibility && (
              <p className="mt-1 text-xs text-red-500">{errors.emailVisibility}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-600">Phone / WhatsApp visibility</label>
            <select
              value={contactVisibility}
              onChange={(e) =>
                setContactVisibility(e.target.value as ArtistProfileEditInput["contactVisibility"])
              }
              className={`min-h-[44px] w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 ${ring}`}
            >
              <option value="PRIVATE">Only you and portal admins</option>
              <option value="COLLABORATORS_ONLY">Fellow collaborators (shared projects)</option>
              <option value="PUBLIC_PROFILE">Public on your artist profile & directory</option>
            </select>
            {errors.contactVisibility && (
              <p className="mt-1 text-xs text-red-500">{errors.contactVisibility}</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-stone-700">
            Province <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className={`min-h-[44px] w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 ${ring}`}
          >
            <option value="">No province listed</option>
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
            <span className="ml-1 font-normal text-stone-400">(1-3)</span>
          </label>
          <SpecialityPicker
            selected={specialities}
            onChange={setSpecialities}
            catalog={allSpecialities}
            allowCustom={false}
            error={errors.specialities}
          />
        </div>

        {collabsRatingsEnabled && (
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
        )}

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

        <div id="profile-bio" className="scroll-mt-28">
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
                    className={`flex w-full min-w-0 max-w-full flex-col rounded-lg border border-stone-200 bg-white focus-within:ring-2 sm:flex-row sm:items-stretch sm:overflow-hidden ${ring}`}
                  >
                    <span className="flex min-h-[48px] shrink-0 select-none items-center break-all border-b border-stone-200 bg-stone-50 px-3 text-sm font-medium leading-normal text-stone-700 sm:min-h-0 sm:border-b-0 sm:border-r">
                      {REGISTRATION_HTTPS_PREFIX}
                    </span>
                    <input
                      type="text"
                      inputMode="url"
                      autoComplete="off"
                      value={websitePathSuffixFromStored(row.url ?? "")}
                      onChange={(e) => setWebsiteUrlAt(index, mergeWebsitePath(e.target.value))}
                      placeholder="yourwebsite.com"
                      className="min-h-[48px] min-w-0 w-full flex-1 border-0 bg-transparent px-3 py-2 text-sm leading-normal text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-0 sm:min-h-[44px] sm:py-2.5"
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
              href={
                variant === "admin"
                  ? `/admin/artists/${initial.id}/availability`
                  : "/profile/availability"
              }
              className="text-sm font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
            >
              Manage →
            </Link>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <button
              type="submit"
              disabled={isPending || !isDirty}
              className="min-h-[44px] flex-1 rounded-lg bg-amber-700 py-3 font-semibold text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Submitting…" : "Submit"}
            </button>
            <Link
              href={variant === "artist" ? "/dashboard" : `/admin/artists/${initial.id}`}
              className="flex min-h-[44px] items-center justify-center rounded-lg border border-stone-200 px-6 py-3 font-semibold text-stone-600 transition-colors hover:bg-stone-50 sm:px-8"
            >
              Cancel
            </Link>
          </div>
          {!isDirty && !isPending && (
            <p className="text-xs text-stone-400">Make a change above to enable submit.</p>
          )}
        </div>
      </form>
    </>
  );
}
