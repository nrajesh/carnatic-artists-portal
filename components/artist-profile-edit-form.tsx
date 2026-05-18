"use client";

import Link from "next/link";
import { useEffect, useState, FormEvent, useMemo, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { usePostHog } from "posthog-js/react";
import SpecialityPicker from "@/components/speciality-picker";
import { RegistrationPrefixedUrlInput } from "@/components/registration-prefixed-url-input";
import { FormFieldNotice } from "@/components/form-field-notice";
import { CityAutocomplete } from "@/components/city-autocomplete";
import { StickyFormActions } from "@/components/sticky-form-actions";
import { useTimedFieldNotice } from "@/hooks/use-timed-field-notice";
import {
  contactNumberRestrictedHandlers,
  emailFieldRestrictedHandlers,
  personNameRestrictedHandlers,
  slugLiveRestrictedHandlers,
  urlSuffixRestrictedHandlers,
} from "@/lib/restricted-input-handlers";
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
import {
  BACKGROUND_IMAGE_FOCUS_DEFAULTS,
  MAX_BACKGROUND_IMAGE_ZOOM,
  MIN_BACKGROUND_IMAGE_ZOOM,
  getBackgroundImageObjectPosition,
  getBackgroundImageScale,
  normalizeBackgroundImageFocus,
  type BackgroundImageFocus,
} from "@/lib/background-image-focus";
import { stripHtmlForSearch } from "@/lib/artist-directory-search";
import { getThemeFromArtistSpecialities } from "@/lib/speciality-theme";
import { showError, showSuccess } from "@/lib/toast";
import type { ArtistEditView } from "@/lib/queries/artists";
import type { ArtistProfileEditInput } from "@/lib/artist-profile-update-schema";
import type { MentionableArtist } from "@/lib/artist-mentions";
import { updateArtistProfile } from "@/app/(artist)/profile/edit/actions";
import { updateAdminArtistProfile } from "@/app/(admin)/admin/artists/[id]/edit/actions";

const BioRichTextEditor = dynamic(
  () => import("@/components/bio-rich-text-editor").then((mod) => mod.BioRichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border border-stone-300 bg-white px-4 py-5 text-sm text-stone-600">
        Loading editor...
      </div>
    ),
  },
);

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
  backgroundImageFocusX: number;
  backgroundImageFocusY: number;
  backgroundImageZoom: number;
  bioRichText: string;
  websiteUrls: { url: string }[];
  linkedinUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
};

const IMAGE_INPUT_MAX_BYTES = 5 * 1024 * 1024;
const PROFILE_PHOTO_OUTPUT_SIZE = 320;
const BACKGROUND_IMAGE_MAX_DIMENSION = 1600;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function loadImageForCanvas(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  }

  const image = new Image();
  image.decoding = "async";
  image.src = URL.createObjectURL(file);
  try {
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(image.src);
  }
}

async function processImageFile(params: {
  file: File;
  outputWidth: number;
  outputHeight: number;
  outputName: string;
}): Promise<File> {
  const { file, outputWidth, outputHeight, outputName } = params;
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (file.size > IMAGE_INPUT_MAX_BYTES) {
    throw new Error("Choose an image smaller than 5 MB.");
  }

  const source = await loadImageForCanvas(file);
  const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  const sourceAspectRatio = sourceWidth / sourceHeight;
  const targetAspectRatio = outputWidth / outputHeight;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceAspectRatio > targetAspectRatio) {
    cropWidth = sourceHeight * targetAspectRatio;
    sourceX = Math.max(0, (sourceWidth - cropWidth) / 2);
  } else if (sourceAspectRatio < targetAspectRatio) {
    cropHeight = sourceWidth / targetAspectRatio;
    sourceY = Math.max(0, (sourceHeight - cropHeight) / 2);
  }

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare the image.");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, sourceX, sourceY, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight);
  if ("close" in source && typeof source.close === "function") source.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.86),
  );
  if (!blob) throw new Error("Could not prepare the image.");
  return new File([blob], outputName, { type: "image/jpeg", lastModified: Date.now() });
}

async function processProfilePhotoFile(file: File): Promise<File> {
  return processImageFile({
    file,
    outputWidth: PROFILE_PHOTO_OUTPUT_SIZE,
    outputHeight: PROFILE_PHOTO_OUTPUT_SIZE,
    outputName: "profile-photo.jpg",
  });
}

async function processBackgroundImageFile(file: File): Promise<File> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (file.size > IMAGE_INPUT_MAX_BYTES) {
    throw new Error("Choose an image smaller than 5 MB.");
  }

  const source = await loadImageForCanvas(file);
  const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  const scale = Math.min(1, BACKGROUND_IMAGE_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
  const outputWidth = Math.max(1, Math.round(sourceWidth * scale));
  const outputHeight = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare the image.");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);
  if ("close" in source && typeof source.close === "function") source.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.84),
  );
  if (!blob) throw new Error("Could not prepare the image.");
  return new File([blob], "background-image.jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

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
  const phoneTrim = fields.contactNumber.trim();
  return {
    slug: fields.slug,
    fullName: fields.fullName,
    email: fields.email,
    contactNumber: fields.contactNumber,
    contactType: phoneTrim ? fields.contactType : undefined,
    emailVisibility: fields.emailVisibility,
    contactVisibility: fields.contactVisibility,
    province: fields.province,
    specialities: fields.specialities,
    openToCollab: collabsRatingsEnabled ? fields.openToCollab : openToCollabWhenCollabsDisabled,
    profilePhotoUrl: fields.profilePhotoUrl.trim() || undefined,
    backgroundImageUrl: fields.backgroundImageUrl.trim() || undefined,
    backgroundImageFocusX: fields.backgroundImageFocusX,
    backgroundImageFocusY: fields.backgroundImageFocusY,
    backgroundImageZoom: fields.backgroundImageZoom,
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
    contactType: p.contactNumber.trim() ? p.contactType : undefined,
    emailVisibility: p.emailVisibility,
    contactVisibility: p.contactVisibility,
    province: p.province.trim(),
    specialities: [...p.specialities],
    openToCollab: p.openToCollab,
    profilePhotoUrl: (p.profilePhotoUrl ?? "").trim(),
    backgroundImageUrl: (p.backgroundImageUrl ?? "").trim(),
    backgroundImageFocusX: p.backgroundImageFocusX,
    backgroundImageFocusY: p.backgroundImageFocusY,
    backgroundImageZoom: p.backgroundImageZoom,
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
    contactType: initial.contactType ?? "mobile",
    emailVisibility: initial.emailVisibility,
    contactVisibility: initial.contactVisibility,
    province: initial.province,
    specialities: [...initial.specialities],
    openToCollab: initial.openToCollab,
    profilePhotoUrl: initial.profilePhotoUrl,
    backgroundImageUrl: initial.backgroundImageUrl,
    backgroundImageFocusX: initial.backgroundImageFocusX,
    backgroundImageFocusY: initial.backgroundImageFocusY,
    backgroundImageZoom: initial.backgroundImageZoom,
    bioRichText: initial.bioRichText,
    websiteUrls:
      initial.websiteUrls.length > 0
        ? initial.websiteUrls.map((w) => ({ url: w.url }))
        : [{ url: "" }],
    linkedinUrl: initial.linkedinUrl,
    instagramUrl: initial.instagramUrl,
    facebookUrl: initial.facebookUrl,
    twitterUrl: initial.twitterUrl,
    youtubeUrl: initial.youtubeUrl,
  };
}

type BackgroundFocusEditorProps = {
  imageUrl: string;
  focus: BackgroundImageFocus;
  onChange: (next: BackgroundImageFocus) => void;
  title: string;
  subtitle: string;
};

function BackgroundFocusEditor({
  imageUrl,
  focus,
  onChange,
  title,
  subtitle,
}: BackgroundFocusEditorProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    focus: BackgroundImageFocus;
  } | null>(null);

  function setFocusPatch(patch: Partial<BackgroundImageFocus>) {
    onChange(normalizeBackgroundImageFocus({ ...focus, ...patch }));
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!imageUrl.trim()) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      focus,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !frame) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const motionFactor = Math.max(0.55, 100 / drag.focus.backgroundImageZoom);
    const nextFocus = normalizeBackgroundImageFocus({
      backgroundImageFocusX:
        drag.focus.backgroundImageFocusX + (dx / frame.clientWidth) * 100 * motionFactor,
      backgroundImageFocusY:
        drag.focus.backgroundImageFocusY + (dy / frame.clientHeight) * 100 * motionFactor,
      backgroundImageZoom: drag.focus.backgroundImageZoom,
    });
    onChange(nextFocus);
  }

  function stopDragging(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="space-y-3">
      <div
        ref={frameRef}
        className="relative aspect-[16/7] overflow-hidden rounded-2xl border border-stone-200 bg-stone-900 shadow-inner touch-none sm:aspect-[16/6]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- artist-uploaded image URLs vary by storage host */}
        <img
          src={imageUrl}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-cover"
          style={{
            objectPosition: getBackgroundImageObjectPosition(focus),
            transform: `scale(${getBackgroundImageScale(focus)})`,
            transformOrigin: getBackgroundImageObjectPosition(focus),
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/15 to-black/45" />
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/60 to-transparent px-4 py-3 text-white">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-white/75">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(normalizeBackgroundImageFocus(BACKGROUND_IMAGE_FOCUS_DEFAULTS))}
            className="rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
          >
            Reset focus
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
            Horizontal
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={focus.backgroundImageFocusX}
            onChange={(event) =>
              setFocusPatch({ backgroundImageFocusX: Number(event.target.value) })
            }
            className="block w-full accent-amber-700"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
            Vertical
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={focus.backgroundImageFocusY}
            onChange={(event) =>
              setFocusPatch({ backgroundImageFocusY: Number(event.target.value) })
            }
            className="block w-full accent-amber-700"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
            Zoom
          </span>
          <input
            type="range"
            min={MIN_BACKGROUND_IMAGE_ZOOM}
            max={MAX_BACKGROUND_IMAGE_ZOOM}
            value={focus.backgroundImageZoom}
            onChange={(event) => setFocusPatch({ backgroundImageZoom: Number(event.target.value) })}
            className="block w-full accent-amber-700"
          />
        </label>
      </div>
    </div>
  );
}

type ArtistProfileEditFormProps = {
  variant: Variant;
  initial: ArtistEditView;
  allSpecialities: { name: string; color: string }[];
  locationAreaLabel: string;
  locationOptions: string[];
  /** Admin edits another artist; ignored when variant is artist. */
  targetArtistId?: string;
  /** PostHog `artist-collabs-ratings`; when false, hide collaboration opt-in UI. */
  collabsRatingsEnabled?: boolean;
  mentionTargets?: MentionableArtist[];
};

export function ArtistProfileEditForm({
  variant,
  initial,
  allSpecialities,
  locationAreaLabel,
  locationOptions,
  targetArtistId,
  collabsRatingsEnabled = true,
  mentionTargets = [],
}: ArtistProfileEditFormProps) {
  const router = useRouter();
  const posthog = usePostHog();
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundImageInputRef = useRef<HTMLInputElement | null>(null);
  const [slug, setSlug] = useState(initial.slug);
  const [fullName, setFullName] = useState(initial.fullName);
  const [email, setEmail] = useState(initial.email);
  const [contactNumber, setContactNumber] = useState(initial.contactNumber);
  const [contactType, setContactType] = useState<"whatsapp" | "mobile">(
    initial.contactType ?? "mobile",
  );
  const [emailVisibility, setEmailVisibility] = useState(initial.emailVisibility);
  const [contactVisibility, setContactVisibility] = useState(initial.contactVisibility);
  const [province, setProvince] = useState(initial.province);
  const [specialities, setSpecialities] = useState<string[]>(initial.specialities);
  const [openToCollab, setOpenToCollab] = useState(initial.openToCollab);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(initial.profilePhotoUrl);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(initial.backgroundImageUrl);
  const [backgroundImageFocusX, setBackgroundImageFocusX] = useState(initial.backgroundImageFocusX);
  const [backgroundImageFocusY, setBackgroundImageFocusY] = useState(initial.backgroundImageFocusY);
  const [backgroundImageZoom, setBackgroundImageZoom] = useState(initial.backgroundImageZoom);
  const [bioHtml, setBioHtml] = useState(initial.bioRichText);
  const [linkedinUrl, setLinkedinUrl] = useState(initial.linkedinUrl);
  const [instagramUrl, setInstagramUrl] = useState(initial.instagramUrl);
  const [facebookUrl, setFacebookUrl] = useState(initial.facebookUrl);
  const [twitterUrl, setTwitterUrl] = useState(initial.twitterUrl);
  const [youtubeUrl, setYoutubeUrl] = useState(initial.youtubeUrl);
  const [websiteUrls, setWebsiteUrls] = useState<{ url: string }[]>(
    initial.websiteUrls.length > 0 ? initial.websiteUrls : [{ url: "" }],
  );
  const [baselineSnapshot, setBaselineSnapshot] = useState<FormFieldsSnapshot>(() =>
    snapshotFromEditView(initial),
  );
  const [pendingProfilePhotoFile, setPendingProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoRightsConfirmed, setProfilePhotoRightsConfirmed] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [pendingBackgroundImageFile, setPendingBackgroundImageFile] = useState<File | null>(null);
  const pendingBackgroundPreviewUrl = useMemo(() => {
    if (!pendingBackgroundImageFile) return null;
    return URL.createObjectURL(pendingBackgroundImageFile);
  }, [pendingBackgroundImageFile]);

  const [backgroundImageRightsConfirmed, setBackgroundImageRightsConfirmed] = useState(false);
  const [backgroundUploadError, setBackgroundUploadError] = useState<string | null>(null);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);

  const [errors, setErrors] = useState<Partial<Record<keyof ArtistProfileEditInput, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formatNote = useTimedFieldNotice();
  const locationAreaLabelLower = locationAreaLabel.toLowerCase();

  useEffect(() => {
    return () => {
      if (pendingBackgroundPreviewUrl) {
        URL.revokeObjectURL(pendingBackgroundPreviewUrl);
      }
    };
  }, [pendingBackgroundPreviewUrl]);

  const baselineFingerprint = useMemo(
    () =>
      fingerprintArtistProfileInput(
        toArtistProfileEditInput(baselineSnapshot, collabsRatingsEnabled, initial.openToCollab),
      ),
    [baselineSnapshot, collabsRatingsEnabled, initial.openToCollab],
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
          backgroundImageFocusX,
          backgroundImageFocusY,
          backgroundImageZoom,
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
    backgroundImageFocusX,
    backgroundImageFocusY,
    backgroundImageZoom,
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
  const backgroundImagePreviewUrl = pendingBackgroundPreviewUrl ?? backgroundImageUrl.trim();
  const backgroundImageFocus = useMemo(
    () =>
      normalizeBackgroundImageFocus({
        backgroundImageFocusX,
        backgroundImageFocusY,
        backgroundImageZoom,
      }),
    [backgroundImageFocusX, backgroundImageFocusY, backgroundImageZoom],
  );

  const previewCardTheme = useMemo(() => {
    const specs = specialities
      .map((name) => {
        const meta = allSpecialities.find((s) => s.name === name);
        return meta ? { name: meta.name, color: meta.color } : null;
      })
      .filter((x): x is { name: string; color: string } => x !== null);
    const theme = getThemeFromArtistSpecialities(specs);
    const avatarAccent = theme.background.startsWith("linear-gradient")
      ? theme.background
      : theme.accentColor;
    return { headerBg: theme.background, avatarAccent };
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
        backgroundImageFocusX,
        backgroundImageFocusY,
        backgroundImageZoom,
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

    const payload = buildPayload();

    startTransition(async () => {
      const result =
        variant === "artist"
          ? await updateArtistProfile(payload)
          : await updateAdminArtistProfile(targetArtistId ?? initial.id, payload);

      if (result.ok) {
        if (variant === "artist") posthog?.capture("profile_edit_saved");
        showSuccess(variant === "artist" ? "Profile saved." : "Profile updated.");
        router.refresh();
      } else {
        setServerError(result.error);
        setErrors(result.fieldErrors ?? {});
        showError(result.error);
      }
    });
  }

  async function handleProfilePhotoUpload() {
    setPhotoUploadError(null);

    if (!pendingProfilePhotoFile) {
      const message = "Choose a photo first.";
      setPhotoUploadError(message);
      showError(message);
      return;
    }
    if (!profilePhotoRightsConfirmed) {
      const message = "Confirm that you have rights to use this profile photo.";
      setPhotoUploadError(message);
      showError(message);
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const processedFile = await processProfilePhotoFile(pendingProfilePhotoFile);
      const formData = new FormData();
      formData.append("profilePhotoFile", processedFile);
      formData.append("profilePhotoRightsConfirmed", "true");

      const response = await fetch(`/api/artists/${targetArtistId ?? initial.id}/profile-photo`, {
        method: "POST",
        body: formData,
      });
      const body = (await response.json().catch(() => null)) as {
        message?: string;
        fields?: Record<string, string>;
        profilePhotoUrl?: string;
      } | null;

      if (!response.ok || !body?.profilePhotoUrl) {
        const message =
          body?.fields?.profilePhotoFile ??
          body?.fields?.profilePhotoRightsConfirmed ??
          body?.message ??
          "Profile photo upload failed.";
        setPhotoUploadError(message);
        showError(message);
        return;
      }

      setProfilePhotoUrl(body.profilePhotoUrl);
      setBaselineSnapshot((current) => ({ ...current, profilePhotoUrl: body.profilePhotoUrl! }));
      setPendingProfilePhotoFile(null);
      setProfilePhotoRightsConfirmed(false);
      if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = "";
      showSuccess("Profile photo uploaded.", "The public card preview is now up to date.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Profile photo upload failed unexpectedly.";
      setPhotoUploadError(message);
      showError(message);
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleBackgroundImageUpload() {
    setBackgroundUploadError(null);

    if (!pendingBackgroundImageFile) {
      const message = "Choose a Header Image first.";
      setBackgroundUploadError(message);
      showError(message);
      return;
    }
    if (!backgroundImageRightsConfirmed) {
      const message = "Confirm that you have rights to use this Header Image.";
      setBackgroundUploadError(message);
      showError(message);
      return;
    }

    setIsUploadingBackground(true);
    try {
      const processedFile = await processBackgroundImageFile(pendingBackgroundImageFile);
      const formData = new FormData();
      formData.append("backgroundImageFile", processedFile);
      formData.append("backgroundImageRightsConfirmed", "true");
      formData.append("backgroundImageFocusX", String(backgroundImageFocus.backgroundImageFocusX));
      formData.append("backgroundImageFocusY", String(backgroundImageFocus.backgroundImageFocusY));
      formData.append("backgroundImageZoom", String(backgroundImageFocus.backgroundImageZoom));

      const response = await fetch(
        `/api/artists/${targetArtistId ?? initial.id}/background-image`,
        {
          method: "POST",
          body: formData,
        },
      );
      const body = (await response.json().catch(() => null)) as {
        message?: string;
        fields?: Record<string, string>;
        backgroundImageUrl?: string;
        backgroundImageFocusX?: number;
        backgroundImageFocusY?: number;
        backgroundImageZoom?: number;
      } | null;

      if (!response.ok || !body?.backgroundImageUrl) {
        const message =
          body?.fields?.backgroundImageFile ??
          body?.fields?.backgroundImageRightsConfirmed ??
          body?.message ??
          "Header Image upload failed.";
        setBackgroundUploadError(message);
        showError(message);
        return;
      }

      setBackgroundImageUrl(body.backgroundImageUrl);
      const nextFocus = normalizeBackgroundImageFocus({
        backgroundImageFocusX: body.backgroundImageFocusX,
        backgroundImageFocusY: body.backgroundImageFocusY,
        backgroundImageZoom: body.backgroundImageZoom,
      });
      setBackgroundImageFocusX(nextFocus.backgroundImageFocusX);
      setBackgroundImageFocusY(nextFocus.backgroundImageFocusY);
      setBackgroundImageZoom(nextFocus.backgroundImageZoom);
      setBaselineSnapshot((current) => ({
        ...current,
        backgroundImageUrl: body.backgroundImageUrl!,
        backgroundImageFocusX: nextFocus.backgroundImageFocusX,
        backgroundImageFocusY: nextFocus.backgroundImageFocusY,
        backgroundImageZoom: nextFocus.backgroundImageZoom,
      }));
      setPendingBackgroundImageFile(null);
      setBackgroundImageRightsConfirmed(false);
      if (backgroundImageInputRef.current) backgroundImageInputRef.current.value = "";
      showSuccess(
        "Header Image uploaded.",
        "The hero preview is now centered on your chosen focal point.",
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Header Image upload failed unexpectedly.";
      setBackgroundUploadError(message);
      showError(message);
    } finally {
      setIsUploadingBackground(false);
    }
  }

  function handleClearProfilePhoto() {
    setPendingProfilePhotoFile(null);
    setProfilePhotoRightsConfirmed(false);
    setPhotoUploadError(null);
    if (variant === "admin") {
      setProfilePhotoUrl("");
    }
    if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = "";
  }

  function handleClearBackgroundImage() {
    setPendingBackgroundImageFile(null);
    setBackgroundImageRightsConfirmed(false);
    setBackgroundUploadError(null);
    setBackgroundImageUrl("");
    setBackgroundImageFocusX(BACKGROUND_IMAGE_FOCUS_DEFAULTS.backgroundImageFocusX);
    setBackgroundImageFocusY(BACKGROUND_IMAGE_FOCUS_DEFAULTS.backgroundImageFocusY);
    setBackgroundImageZoom(BACKGROUND_IMAGE_FOCUS_DEFAULTS.backgroundImageZoom);
    if (backgroundImageInputRef.current) backgroundImageInputRef.current.value = "";
  }

  const ring = "focus:ring-amber-400";

  return (
    <>
      {serverError ? (
        <FormFieldNotice tone="error" className="mb-6 font-medium">
          {serverError}
        </FormFieldNotice>
      ) : null}

      <form
        onSubmit={handleSave}
        noValidate
        className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        {formatNote.message ? (
          <FormFieldNotice tone="warning" className="-mt-1">
            {formatNote.message}
          </FormFieldNotice>
        ) : null}
        <div className="overflow-hidden rounded-xl border border-stone-100">
          <div
            className="relative flex h-20 items-end px-5 pb-3"
            style={
              !backgroundImagePreviewUrl ? { background: previewCardTheme.headerBg } : undefined
            }
          >
            {backgroundImagePreviewUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- artist-uploaded image URLs vary by storage host */}
                <img
                  src={backgroundImagePreviewUrl}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    objectPosition: getBackgroundImageObjectPosition(backgroundImageFocus),
                    transform: `scale(${getBackgroundImageScale(backgroundImageFocus)})`,
                    transformOrigin: getBackgroundImageObjectPosition(backgroundImageFocus),
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/45" />
              </>
            ) : null}
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
              {province.trim()
                ? `📍 ${province}`
                : `No ${locationAreaLabelLower} listed on your public profile`}
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="artist-profile-slug"
            className="mb-1 block text-sm font-semibold text-stone-700"
          >
            Public profile URL <span className="text-red-500">*</span>
          </label>
          <p className="mb-2 text-xs text-stone-500">
            Lowercase letters, numbers, and hyphens. Spaces become hyphens; other symbols are
            removed when you save.
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
              {...slugLiveRestrictedHandlers(formatNote.show, setSlug)}
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
            name="fullName"
            autoComplete="name"
            value={fullName}
            {...personNameRestrictedHandlers(formatNote.show, setFullName)}
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
            name="email"
            autoComplete="email"
            value={email}
            {...emailFieldRestrictedHandlers(formatNote.show, setEmail)}
            className={`ph-no-capture min-h-[44px] w-full rounded-lg border border-stone-200 px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 ${ring}`}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-stone-700">
            Contact Number <span className="font-normal text-stone-500">(optional)</span>
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="tel"
              inputMode="numeric"
              name="contactNumber"
              autoComplete="tel"
              value={contactNumber}
              {...contactNumberRestrictedHandlers(formatNote.show, setContactNumber)}
              placeholder="+31612345678"
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
          {errors.contactNumber && (
            <p className="mt-1 text-xs text-red-500">{errors.contactNumber}</p>
          )}
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-4 space-y-4">
          <p className="text-sm font-semibold text-stone-800">Who can see your email & phone</p>
          <p className="text-xs text-stone-600 leading-relaxed">
            Login always uses your email privately. These settings only control what other artists
            and visitors can see.
          </p>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-600">
              Email visibility
            </label>
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
            <label className="mb-1 block text-xs font-semibold text-stone-600">
              Phone / WhatsApp visibility
            </label>
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
            {locationAreaLabel}
          </label>
          <CityAutocomplete
            value={province}
            onChange={setProvince}
            localOptions={locationOptions}
            placeholder={`Type a ${locationAreaLabelLower}`}
            className={`min-h-[44px] w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 ${ring}`}
          />
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
                  When enabled, you appear in “open to collaborate” counts and can be discovered for
                  new projects.
                </span>
              </span>
            </label>
            {errors.openToCollab && (
              <p className="mt-2 text-xs text-red-500">{errors.openToCollab}</p>
            )}
          </div>
        )}

        <section className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-stone-800">Images</p>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">
              Each upload is converted to a managed JPEG, metadata is stripped, and the result is
              served from object storage. You can also keep using a direct HTTPS URL when that fits
              better.
            </p>
          </div>

          <div className="grid gap-4 border-b border-stone-200 pb-4 md:grid-cols-2">
            <div className="min-w-0 space-y-3">
              <div className="flex items-center gap-3">
                <FeaturedArtistPhoto
                  photoUrl={profilePhotoUrl}
                  initial={(fullName.trim()[0] ?? "?").toUpperCase()}
                  accentColor={previewCardTheme.avatarAccent}
                  alt=""
                  sizeClassName="h-14 w-14 text-xl"
                  imgClassName="border border-stone-200 shadow-sm"
                />
                <div>
                  <p className="text-sm font-semibold text-stone-800">Profile photo upload</p>
                  <p className="text-xs text-stone-500">Square crop, ideal for avatars.</p>
                </div>
              </div>
              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setPendingProfilePhotoFile(nextFile);
                  setPhotoUploadError(null);
                }}
                className={`block min-h-[40px] w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 ${ring}`}
              />
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={profilePhotoRightsConfirmed}
                  onChange={(event) => setProfilePhotoRightsConfirmed(event.target.checked)}
                  className="mt-0.5 accent-amber-600"
                />
                <span className="text-xs leading-relaxed text-stone-600">
                  I have the rights to use this profile photo.
                </span>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleProfilePhotoUpload}
                  disabled={isUploadingPhoto}
                  className="min-h-[40px] rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUploadingPhoto ? "Uploading..." : "Upload"}
                </button>
                <button
                  type="button"
                  onClick={handleClearProfilePhoto}
                  disabled={
                    variant === "admin"
                      ? !profilePhotoUrl && !pendingProfilePhotoFile
                      : !pendingProfilePhotoFile
                  }
                  className="min-h-[40px] rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
              <p className="text-xs text-stone-500">
                {pendingProfilePhotoFile
                  ? `Selected: ${pendingProfilePhotoFile.name}`
                  : "JPEG, PNG, or WebP up to 5 MB."}
              </p>
              {photoUploadError ? (
                <FormFieldNotice tone="error">{photoUploadError}</FormFieldNotice>
              ) : null}
            </div>

            <div className="min-w-0 border-t border-stone-200 pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0">
              {variant === "admin" ? (
                <RegistrationPrefixedUrlInput
                  id="profilePhotoUrl"
                  label="Profile photo URL"
                  helperText="Fallback HTTPS URL. Managed upload is preferred."
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
                  onFormatNote={formatNote.show}
                />
              ) : (
                <div className="rounded-lg border border-dashed border-stone-300 bg-white px-4 py-4 text-sm text-stone-600">
                  Profile photo URLs stay admin-managed here. Use the upload option on the left for
                  artists.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 pt-4 md:grid-cols-2">
            <div className="min-w-0 space-y-3">
              <div className="space-y-2">
                {backgroundImagePreviewUrl ? (
                  <BackgroundFocusEditor
                    imageUrl={backgroundImagePreviewUrl}
                    focus={backgroundImageFocus}
                    onChange={(next) => {
                      setBackgroundImageFocusX(next.backgroundImageFocusX);
                      setBackgroundImageFocusY(next.backgroundImageFocusY);
                      setBackgroundImageZoom(next.backgroundImageZoom);
                    }}
                    title="Header Image focus"
                    subtitle="Drag to pan, then fine-tune with the sliders below."
                  />
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 text-center text-xs text-stone-500">
                    Upload a Header Image to adjust the hero focus.
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-stone-800">Header Image upload</p>
                  <p className="text-xs text-stone-500">
                    Upload keeps the image compact and lets you save the exact focal point later.
                  </p>
                  <p className="mt-1 text-xs font-medium text-amber-700">
                    After panning or zooming, use Save below to keep this crop.
                  </p>
                </div>
              </div>
              <input
                ref={backgroundImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setPendingBackgroundImageFile(nextFile);
                  setBackgroundUploadError(null);
                }}
                className={`block min-h-[40px] w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 ${ring}`}
              />
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={backgroundImageRightsConfirmed}
                  onChange={(event) => setBackgroundImageRightsConfirmed(event.target.checked)}
                  className="mt-0.5 accent-amber-600"
                />
                <span className="text-xs leading-relaxed text-stone-600">
                  I have the rights to use this Header Image.
                </span>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleBackgroundImageUpload}
                  disabled={isUploadingBackground}
                  className="min-h-[40px] rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUploadingBackground ? "Uploading..." : "Upload"}
                </button>
                <button
                  type="button"
                  onClick={handleClearBackgroundImage}
                  disabled={!backgroundImageUrl && !pendingBackgroundImageFile}
                  className="min-h-[40px] rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
              <p className="text-xs text-stone-500">
                {pendingBackgroundImageFile
                  ? `Selected: ${pendingBackgroundImageFile.name}`
                  : "Wide JPEG, PNG, or WebP up to 5 MB."}
              </p>
              {backgroundUploadError ? (
                <FormFieldNotice tone="error">{backgroundUploadError}</FormFieldNotice>
              ) : null}
            </div>

            <div className="min-w-0 border-t border-stone-200 pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0">
              <RegistrationPrefixedUrlInput
                id="backgroundImageUrl"
                label="Header Image URL"
                helperText="Optional fallback HTTPS URL for the hero banner."
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
                onFormatNote={formatNote.show}
              />
            </div>
          </div>
        </section>

        <div id="profile-bio" className="scroll-mt-28">
          <label className="mb-1 block text-sm font-semibold text-stone-700">
            Bio / Musical journey
          </label>
          <BioRichTextEditor
            initialHtml={initial.bioRichText}
            onHtmlChange={setBioHtml}
            disabled={isPending}
            mentionTargets={mentionTargets}
          />
          {errors.bioRichText && <p className="mt-1 text-xs text-red-500">{errors.bioRichText}</p>}
        </div>

        <div id="profile-social" className="scroll-mt-28">
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
                      {...urlSuffixRestrictedHandlers(mergeWebsitePath, formatNote.show, (full) =>
                        setWebsiteUrlAt(index, full),
                      )}
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
              {String(
                (errors.websiteUrls as { message?: string }).message ?? "Check website URLs.",
              )}
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
              onFormatNote={formatNote.show}
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

        <StickyFormActions className="mt-2">
          <div className="space-y-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <button
                type="submit"
                disabled={isPending || !isDirty}
                className="min-h-[44px] flex-1 rounded-lg bg-amber-700 py-3 font-semibold text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Saving…" : "Save"}
              </button>
              <Link
                href={variant === "artist" ? "/dashboard" : `/admin/artists/${initial.id}`}
                className="flex min-h-[44px] items-center justify-center rounded-lg border border-stone-200 px-6 py-3 font-semibold text-stone-600 transition-colors hover:bg-stone-50 sm:px-8"
              >
                Cancel
              </Link>
            </div>
            {!isDirty && !isPending ? (
              <p className="text-xs text-stone-400">Make a change above to enable save.</p>
            ) : null}
          </div>
        </StickyFormActions>
      </form>
    </>
  );
}
