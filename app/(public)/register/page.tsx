"use client";

/**
 * Registration form page for Artist Discovery Portal.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8
 */

import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import { usePostHog } from "posthog-js/react";
import SpecialityPicker, { type SpecialityCatalogItem } from "@/components/speciality-picker";
import { RegistrationPrefixedUrlInput } from "@/components/registration-prefixed-url-input";
import { FormFieldNotice } from "@/components/form-field-notice";
import { SiteBrandMark } from "@/components/site-brand-mark";
import { CityAutocomplete } from "@/components/city-autocomplete";
import { useTimedFieldNotice } from "@/hooks/use-timed-field-notice";
import {
  contactNumberRestrictedHandlers,
  emailFieldRestrictedHandlers,
  personNameRestrictedHandlers,
  urlSuffixRestrictedHandlers,
} from "@/lib/restricted-input-handlers";
import {
  facebookSuffixFromStored,
  instagramSuffixFromStored,
  isPlausibleContactNumber,
  linkedinSuffixFromStored,
  mergeFacebookUrl,
  mergeInstagramUrl,
  mergeLinkedinUrl,
  mergeTwitterUrl,
  mergeWebsitePath,
  mergeYoutubeUrl,
  REGISTRATION_FACEBOOK_PREFIX,
  REGISTRATION_HTTPS_PREFIX,
  REGISTRATION_INSTAGRAM_PREFIX,
  REGISTRATION_LINKEDIN_PREFIX,
  REGISTRATION_TWITTER_PREFIX,
  REGISTRATION_YOUTUBE_PREFIX,
  sanitizeContactNumberInput,
  twitterSuffixFromStored,
  websitePathSuffixFromStored,
  youtubeSuffixFromStored,
} from "@/lib/registration-input-normalize";
import { getPublicDeploymentLocationInputConfig } from "@/lib/deployment-location-public";

const BioRichTextEditor = dynamic(
  () => import("@/components/bio-rich-text-editor").then((mod) => mod.BioRichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border border-amber-300 bg-white px-4 py-5 text-sm text-amber-900">
        Loading editor...
      </div>
    ),
  },
);

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

/** Empty → omitted. When set, must be HTTPS (image URL you host). */
const optionalHttpsPhotoUrlSchema = z.preprocess(
  (val: unknown) => {
    if (val === undefined || val === null) return undefined;
    if (typeof val !== "string") return undefined;
    const t = val.trim();
    if (t === "") return undefined;
    return mergeWebsitePath(t);
  },
  z.union([
    z.undefined(),
    z
      .string()
      .url("Must be a valid URL")
      .refine((u) => /^https:\/\//i.test(u), "Must use HTTPS"),
  ]),
);

function optMergedSocialField(merge: (s: string) => string) {
  return z.preprocess(
    (val) => (typeof val === "string" ? merge(val.trim()) : ""),
    z.union([z.literal(""), z.string().url("Must be a valid URL")]),
  );
}

const websiteRowUrlSchema = z.preprocess(
  (val) => (typeof val === "string" ? mergeWebsitePath(val.trim()) : ""),
  z.union([z.literal(""), z.string().url("Must be a valid URL")]),
);

const registrationSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Valid email address is required"),
    province: z.string().trim().min(1, "City is required").max(120),
    contactNumber: z.preprocess(
      (v) => (typeof v === "string" ? sanitizeContactNumberInput(v) : ""),
      z.string(),
    ),
    contactType: z.enum(["whatsapp", "mobile"]),
    profilePhotoUrl: optionalHttpsPhotoUrlSchema,
    specialities: z
      .array(z.string().min(2).max(80))
      .min(1, "At least one speciality is required")
      .max(3, "Maximum 3 specialities allowed")
      .refine(
        (arr) => new Set(arr.map((s) => s.trim().toLowerCase())).size === arr.length,
        "Each speciality must be unique",
      ),
    backgroundImageUrl: optionalHttpsPhotoUrlSchema,
    bioRichText: z.string().optional(),
    websiteUrls: z.array(z.object({ url: websiteRowUrlSchema })).optional(),
    linkedinUrl: optMergedSocialField(mergeLinkedinUrl),
    instagramUrl: optMergedSocialField(mergeInstagramUrl),
    facebookUrl: optMergedSocialField(mergeFacebookUrl),
    twitterUrl: optMergedSocialField(mergeTwitterUrl),
    youtubeUrl: optMergedSocialField(mergeYoutubeUrl),
  })
  .superRefine((data, ctx) => {
    const phone = data.contactNumber.trim();
    if (!phone) return;
    if (!isPlausibleContactNumber(phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use 7-15 digits. Optional + only at the start.",
        path: ["contactNumber"],
      });
    }
  });

type RegistrationFormData = z.infer<typeof registrationSchema>;
const registrationResolver = zodResolver(
  registrationSchema,
) as unknown as Resolver<RegistrationFormData>;

const registrationSteps = [
  {
    eyebrow: "Step 1 of 3",
    title: "Start with the basics",
    description: "A few contact details so admins know who is joining the community.",
  },
  {
    eyebrow: "Step 2 of 3",
    title: "Shape your artist card",
    description: "Add the image, specialities, and story that help people recognize your art.",
  },
  {
    eyebrow: "Step 3 of 3",
    title: "Where can people find you?",
    description: "Drop in your site and socials if you want them shown on your public profile.",
  },
] as const;

const finalRequiredFieldLabels = {
  fullName: "Full name",
  email: "Email address",
  province: "City",
  specialities: "Specialities",
} as const;

const IMAGE_INPUT_MAX_BYTES = 5 * 1024 * 1024;
const PROFILE_PHOTO_OUTPUT_SIZE = 320;
const BACKGROUND_IMAGE_OUTPUT_WIDTH = 1600;
const BACKGROUND_IMAGE_OUTPUT_HEIGHT = 900;
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
  return processImageFile({
    file,
    outputWidth: BACKGROUND_IMAGE_OUTPUT_WIDTH,
    outputHeight: BACKGROUND_IMAGE_OUTPUT_HEIGHT,
    outputName: "background-image.jpg",
  });
}

// Main component
// ---------------------------------------------------------------------------

export default function RegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionState, setSessionState] = useState<{
    loading: boolean;
    authenticated: boolean;
    role: "artist" | "admin" | null;
  }>({
    loading: true,
    authenticated: false,
    role: null,
  });
  const [registeringSomeoneElse, setRegisteringSomeoneElse] = useState(false);
  const [specialityCatalog, setSpecialityCatalog] = useState<SpecialityCatalogItem[]>([]);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreviewUrl, setProfilePhotoPreviewUrl] = useState<string | null>(null);
  const [profilePhotoRightsConfirmed, setProfilePhotoRightsConfirmed] = useState(false);
  const [profilePhotoError, setProfilePhotoError] = useState<string | null>(null);
  const [profilePhotoProcessing, setProfilePhotoProcessing] = useState(false);
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [backgroundImagePreviewUrl, setBackgroundImagePreviewUrl] = useState<string | null>(null);
  const [backgroundImageRightsConfirmed, setBackgroundImageRightsConfirmed] = useState(false);
  const [backgroundImageError, setBackgroundImageError] = useState<string | null>(null);
  const [backgroundImageProcessing, setBackgroundImageProcessing] = useState(false);
  const posthog = usePostHog();

  const formatNote = useTimedFieldNotice();
  const locationConfig = getPublicDeploymentLocationInputConfig();
  const locationAreaLabel = "City";
  const activeStep = registrationSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isFinalStep = currentStep === registrationSteps.length - 1;
  const submitBlockedBySession = sessionState.authenticated && !registeringSomeoneElse;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormData>({
    resolver: registrationResolver,
    defaultValues: {
      fullName: "",
      email: "",
      province: "",
      contactType: "whatsapp",
      contactNumber: "",
      profilePhotoUrl: "",
      backgroundImageUrl: "",
      specialities: [],
      websiteUrls: [],
      linkedinUrl: "",
      instagramUrl: "",
      facebookUrl: "",
      twitterUrl: "",
      youtubeUrl: "",
    },
  });
  const finalRequiredFieldErrors = (
    Object.entries(finalRequiredFieldLabels) as Array<
      [keyof typeof finalRequiredFieldLabels, string]
    >
  ).filter(([field]) => Boolean(errors[field]));

  const goToNextStep = async () => {
    const stepFields: Array<Array<keyof RegistrationFormData>> = [
      ["fullName", "email", "contactNumber", "contactType", "province"],
      ["specialities", "backgroundImageUrl", "bioRichText"],
      [],
    ];
    if (currentStep === 1) {
      if (profilePhotoProcessing) {
        setProfilePhotoError("Please wait until the profile photo is ready.");
        return;
      }
      if (backgroundImageProcessing) {
        setBackgroundImageError("Please wait until the Header Image is ready.");
        return;
      }
      if ((profilePhotoFile || profilePhotoUrlValue.trim()) && !profilePhotoRightsConfirmed) {
        setProfilePhotoError("Confirm that you have rights to use the profile photo.");
        return;
      }
      if (backgroundImageFile && !backgroundImageRightsConfirmed) {
        setBackgroundImageError("Confirm that you have rights to use the Header Image.");
        return;
      }
    }
    const fieldsToValidate = stepFields[currentStep] ?? [];
    const canContinue = fieldsToValidate.length === 0 || (await trigger(fieldsToValidate));
    if (!canContinue) return;
    setCurrentStep((step) => Math.min(step + 1, registrationSteps.length - 1));
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const goToPreviousStep = () => {
    setCurrentStep((step) => Math.max(step - 1, 0));
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const {
    fields: websiteFields,
    append: appendWebsite,
    remove: removeWebsite,
  } = useFieldArray({
    control,
    name: "websiteUrls",
  });
  const fullNameValue = useWatch({ control, name: "fullName" }) ?? "";
  const emailValue = useWatch({ control, name: "email" }) ?? "";
  const profilePhotoUrlValue = useWatch({ control, name: "profilePhotoUrl" }) ?? "";

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const data = (await res.json()) as {
          authenticated?: boolean;
          role?: "artist" | "admin";
        };
        if (!active) return;
        setSessionState({
          loading: false,
          authenticated: data.authenticated === true,
          role: data.role ?? null,
        });
      } catch {
        if (!active) return;
        setSessionState({ loading: false, authenticated: false, role: null });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const clearTransientSubmitError = () => {
      setSubmitError(null);
    };

    window.addEventListener("pageshow", clearTransientSubmitError);
    return () => {
      window.removeEventListener("pageshow", clearTransientSubmitError);
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/specialities");
        if (!res.ok) return;
        const data = (await res.json()) as Array<{ name: string; primaryColor: string }>;
        if (!active) return;
        setSpecialityCatalog(data.map((r) => ({ name: r.name, color: r.primaryColor })));
      } catch {
        if (!active) return;
        setSpecialityCatalog([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (profilePhotoPreviewUrl) URL.revokeObjectURL(profilePhotoPreviewUrl);
    };
  }, [profilePhotoPreviewUrl]);

  useEffect(() => {
    return () => {
      if (backgroundImagePreviewUrl) URL.revokeObjectURL(backgroundImagePreviewUrl);
    };
  }, [backgroundImagePreviewUrl]);

  async function handleProfilePhotoChange(file: File | null) {
    setProfilePhotoError(null);
    setProfilePhotoRightsConfirmed(false);
    setProfilePhotoFile(null);
    setProfilePhotoPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });

    if (!file) return;
    setProfilePhotoProcessing(true);
    try {
      const processed = await processProfilePhotoFile(file);
      setProfilePhotoFile(processed);
      setProfilePhotoPreviewUrl(URL.createObjectURL(processed));
    } catch (err) {
      setProfilePhotoError(err instanceof Error ? err.message : "Could not prepare the image.");
    } finally {
      setProfilePhotoProcessing(false);
    }
  }

  async function handleBackgroundImageChange(file: File | null) {
    setBackgroundImageError(null);
    setBackgroundImageRightsConfirmed(false);
    setBackgroundImageFile(null);
    setBackgroundImagePreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });

    if (!file) return;
    setBackgroundImageProcessing(true);
    try {
      const processed = await processBackgroundImageFile(file);
      setBackgroundImageFile(processed);
      setBackgroundImagePreviewUrl(URL.createObjectURL(processed));
    } catch (err) {
      setBackgroundImageError(err instanceof Error ? err.message : "Could not prepare the image.");
    } finally {
      setBackgroundImageProcessing(false);
    }
  }

  const onSubmit = async (data: RegistrationFormData) => {
    setSubmitError(null);
    if (sessionState.authenticated && !registeringSomeoneElse) {
      setSubmitError(
        'You are already signed in. Check "I am registering someone else" to continue.',
      );
      return;
    }
    if (profilePhotoProcessing) {
      setCurrentStep(1);
      setSubmitError("Please wait until the profile photo is ready.");
      return;
    }
    if (backgroundImageProcessing) {
      setCurrentStep(1);
      setSubmitError("Please wait until the Header Image is ready.");
      return;
    }
    if ((profilePhotoFile || profilePhotoUrlValue.trim()) && !profilePhotoRightsConfirmed) {
      setCurrentStep(1);
      setProfilePhotoError("Confirm that you have rights to use the profile photo.");
      setSubmitError("Confirm that you have rights to use the profile photo.");
      return;
    }
    if (backgroundImageFile && !backgroundImageRightsConfirmed) {
      setCurrentStep(1);
      setBackgroundImageError("Confirm that you have rights to use the Header Image.");
      setSubmitError("Confirm that you have rights to use the Header Image.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("fullName", data.fullName);
      formData.append("email", data.email);
      formData.append("province", data.province?.trim() ?? "");
      formData.append("contactNumber", data.contactNumber.trim());
      if (data.contactNumber.trim()) {
        formData.append("contactType", data.contactType);
      }
      if (profilePhotoFile) {
        formData.append("profilePhotoFile", profilePhotoFile);
        formData.append("profilePhotoRightsConfirmed", "true");
      } else if (data.profilePhotoUrl) {
        formData.append("profilePhotoUrl", data.profilePhotoUrl);
        formData.append("profilePhotoRightsConfirmed", "true");
      }
      if (backgroundImageFile) {
        formData.append("backgroundImageFile", backgroundImageFile);
        formData.append("backgroundImageRightsConfirmed", "true");
      }
      data.specialities.forEach((s) => formData.append("specialities", s));

      if (data.backgroundImageUrl && !backgroundImageFile) {
        formData.append("backgroundImageUrl", data.backgroundImageUrl);
      }
      const bioRichText = data.bioRichText ?? "";
      if (bioRichText) formData.append("bioRichText", bioRichText);
      if (data.linkedinUrl) formData.append("linkedinUrl", data.linkedinUrl);
      if (data.instagramUrl) formData.append("instagramUrl", data.instagramUrl);
      if (data.facebookUrl) formData.append("facebookUrl", data.facebookUrl);
      if (data.twitterUrl) formData.append("twitterUrl", data.twitterUrl);
      if (data.youtubeUrl) formData.append("youtubeUrl", data.youtubeUrl);
      data.websiteUrls?.forEach((w) => {
        if (w.url) formData.append("websiteUrls", w.url);
      });

      const res = await fetch("/api/registrations", { method: "POST", body: formData });
      const json = await res.json();

      if (json.success) {
        posthog.capture("registration_submitted", {
          speciality_count: data.specialities.length,
        });
        setSubmitted(true);
      } else {
        if (json.fields && typeof json.fields === "object") {
          const fieldErrors = json.fields as Partial<Record<string, string>>;
          for (const [field, message] of Object.entries(fieldErrors)) {
            if (message && field in finalRequiredFieldLabels) {
              setError(field as keyof RegistrationFormData, { type: "server", message });
            }
          }
          if (fieldErrors.province) setCurrentStep(0);
          if (
            fieldErrors.profilePhotoFile ||
            fieldErrors.profilePhotoRightsConfirmed ||
            fieldErrors.profilePhotoUrl
          ) {
            setCurrentStep(1);
            setProfilePhotoError(
              fieldErrors.profilePhotoFile ??
                fieldErrors.profilePhotoRightsConfirmed ??
                fieldErrors.profilePhotoUrl ??
                "Check the profile photo.",
            );
          }
          if (fieldErrors.backgroundImageFile || fieldErrors.backgroundImageRightsConfirmed) {
            setCurrentStep(1);
            setBackgroundImageError(
              fieldErrors.backgroundImageFile ??
                fieldErrors.backgroundImageRightsConfirmed ??
                "Check the Header Image.",
            );
          }
        }
        setSubmitError(
          (typeof json.message === "string" && json.message) ||
            (json.fields ? "Please fix the highlighted fields." : undefined) ||
            (typeof json.error === "string" && json.error) ||
            "Submission failed. Please try again.",
        );
      }
    } catch {
      setSubmitError("An unexpected error occurred. Please try again.");
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-amber-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-amber-200">
          <div className="mb-4 flex justify-center">
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_12px_22px_rgba(154,52,18,0.18)] ring-1 ring-amber-100">
              <SiteBrandMark className="h-16 w-16" />
            </span>
          </div>
          <h1 className="mb-3 font-display text-2xl font-bold tracking-tight text-amber-900">
            Request Submitted!
          </h1>
          <p className="text-amber-800 leading-relaxed">
            Your registration request has been submitted. An admin will review it and you&apos;ll
            receive an email once approved.
          </p>
          <p className="mt-3 font-semibold text-amber-950">
            Please expect an email from the <strong>imaginest.nl</strong> domain once your
            registration is approved, and make sure it does not end up in your spam folder.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen min-w-0 overflow-hidden bg-[#fff7df] px-4 py-8">
      <div className="pointer-events-none absolute -left-24 top-16 h-56 w-56 rounded-full bg-orange-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-72 h-72 w-72 rounded-full bg-yellow-300/40 blur-3xl" />
      <div className="relative mx-auto max-w-2xl min-w-0">
        {/* Back link */}
        <div className="mb-6">
          <NextLink
            href="/"
            className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 font-medium transition-colors"
          >
            ← Back to home
          </NextLink>
        </div>

        {/* Header */}
        <div className="mb-8 rounded-[2rem] border border-amber-200/80 bg-white/80 p-6 text-center shadow-lg shadow-amber-900/5 backdrop-blur">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-orange-600">
            Artist sign-up
          </p>
          <h1 className="mb-2 font-display text-4xl font-bold tracking-tight text-amber-950">
            Let&apos;s get you on the map
          </h1>
          <p className="mx-auto max-w-lg text-sm leading-6 text-amber-800 sm:text-base">
            Three quick stops: who you are, what you make, and where people can follow your art.
          </p>
        </div>
        {!sessionState.loading && sessionState.authenticated && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            You are currently signed in as {sessionState.role}. By default, registration is intended
            for new artists.
            <div className="mt-2 flex items-center gap-2">
              <input
                id="registering-someone-else"
                type="checkbox"
                checked={registeringSomeoneElse}
                onChange={(e) => setRegisteringSomeoneElse(e.target.checked)}
                className="accent-amber-700"
              />
              <label htmlFor="registering-someone-else" className="text-xs font-semibold">
                I am registering someone else.
              </label>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="touch-manipulation rounded-[2rem] border border-amber-200 bg-white/90 p-4 shadow-2xl shadow-amber-900/10 sm:p-6"
        >
          {formatNote.message ? (
            <FormFieldNotice tone="warning" className="mb-2">
              {formatNote.message}
            </FormFieldNotice>
          ) : null}

          <div className="mb-6 rounded-[1.5rem] bg-gradient-to-br from-amber-100 via-orange-50 to-white p-4">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {registrationSteps.map((step, index) => (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => setCurrentStep(index)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                    index === currentStep
                      ? "bg-amber-900 text-white shadow-sm"
                      : "bg-white/80 text-amber-800 hover:bg-white"
                  }`}
                  aria-current={index === currentStep ? "step" : undefined}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
              {activeStep.eyebrow}
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-amber-950">
              {activeStep.title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-amber-800">{activeStep.description}</p>
          </div>

          <div className="space-y-6">
            {currentStep === 0 ? (
              <>
                {/* ── Full Name ── */}
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-semibold text-amber-900 mb-1"
                  >
                    Full Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullNameValue}
                    {...personNameRestrictedHandlers(formatNote.show, (v) =>
                      setValue("fullName", v, {
                        shouldDirty: true,
                        shouldValidate: true,
                        shouldTouch: true,
                      }),
                    )}
                    className="w-full border border-amber-300 rounded-lg px-3 py-2 text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                    placeholder="Your full name"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {errors.fullName.message}
                    </p>
                  )}
                </div>

                {/* ── Email ── */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-amber-900 mb-1"
                  >
                    Email Address <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={emailValue}
                    {...emailFieldRestrictedHandlers(formatNote.show, (v) =>
                      setValue("email", v, {
                        shouldDirty: true,
                        shouldValidate: true,
                        shouldTouch: true,
                      }),
                    )}
                    className="ph-no-capture w-full border border-amber-300 rounded-lg px-3 py-2 text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                    placeholder="you@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* ── Contact Number + Contact Type ── */}
                <div>
                  <label className="block text-sm font-semibold text-amber-900 mb-1">
                    Contact Number <span className="font-normal text-amber-600">(optional)</span>
                  </label>
                  <p className="mb-2 text-xs text-amber-600">
                    Optional. Digits only (7-15). You may start with <strong>+</strong> for country
                    code. Then pick WhatsApp or mobile.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Controller
                      name="contactNumber"
                      control={control}
                      render={({ field }) => (
                        <input
                          id="contactNumber"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          value={field.value ?? ""}
                          {...contactNumberRestrictedHandlers(formatNote.show, field.onChange)}
                          className="ph-no-capture min-h-[44px] flex-1 rounded-lg border border-amber-300 px-3 py-2 text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          placeholder="+31612345678"
                        />
                      )}
                    />
                    <div className="flex items-center gap-4 sm:gap-3">
                      <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                        <input
                          type="radio"
                          value="whatsapp"
                          {...register("contactType")}
                          className="w-4 h-4 accent-amber-600"
                        />
                        <span className="text-sm text-amber-900">WhatsApp</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                        <input
                          type="radio"
                          value="mobile"
                          {...register("contactType")}
                          className="w-4 h-4 accent-amber-600"
                        />
                        <span className="text-sm text-amber-900">Mobile only</span>
                      </label>
                    </div>
                  </div>
                  {errors.contactNumber && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {errors.contactNumber.message}
                    </p>
                  )}
                  {errors.contactType && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {errors.contactType.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-amber-900 mb-1">
                    {locationAreaLabel} <span className="text-red-600">*</span>
                  </label>
                  <p className="mb-2 text-xs text-amber-700">
                    Examples: Hilversum or Chennai, India.
                  </p>
                  <Controller
                    name="province"
                    control={control}
                    render={({ field }) => (
                      <CityAutocomplete
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        localOptions={locationConfig.areaOptions}
                        placeholder="Type a city"
                        className="ph-no-capture w-full rounded-lg border border-amber-300 px-3 py-2 text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                      />
                    )}
                  />
                  {errors.province && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {errors.province.message}
                    </p>
                  )}
                </div>
              </>
            ) : null}

            {currentStep === 1 ? (
              <>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                  <p className="text-sm font-semibold text-amber-900">Images</p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-700">
                    Profile photos and Header Images can use either managed upload or a direct HTTPS
                    URL. Remote profile-photo URLs are ingested into managed storage before review.
                  </p>

                  <div className="mt-4 grid gap-4 border-b border-amber-200 pb-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {profilePhotoPreviewUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={profilePhotoPreviewUrl}
                            alt="Profile photo preview"
                            className="h-16 w-16 rounded-xl border border-amber-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-amber-300 bg-white text-xs font-semibold text-amber-700">
                            Photo
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-amber-900">
                            Profile photo upload
                          </p>
                          <p className="text-xs text-amber-700">Cropped to a square avatar.</p>
                        </div>
                      </div>
                      <input
                        id="profilePhotoFile"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) =>
                          void handleProfilePhotoChange(e.currentTarget.files?.[0] ?? null)
                        }
                        className="block w-full text-sm text-amber-900 file:mr-3 file:min-h-[38px] file:rounded-lg file:border-0 file:bg-amber-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-amber-800"
                      />
                      {profilePhotoProcessing ? (
                        <p className="text-xs text-amber-700">Preparing image…</p>
                      ) : null}
                      {profilePhotoFile || profilePhotoUrlValue.trim() ? (
                        <label className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-amber-900">
                          <input
                            type="checkbox"
                            checked={profilePhotoRightsConfirmed}
                            onChange={(e) => {
                              setProfilePhotoRightsConfirmed(e.target.checked);
                              if (e.target.checked) setProfilePhotoError(null);
                            }}
                            className="mt-0.5 accent-amber-700"
                          />
                          <span>I confirm I have the right to use this profile photo.</span>
                        </label>
                      ) : null}
                      {profilePhotoFile ? (
                        <button
                          type="button"
                          onClick={() => void handleProfilePhotoChange(null)}
                          className="min-h-[36px] text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900"
                        >
                          Remove selected photo
                        </button>
                      ) : null}
                      {profilePhotoError ? (
                        <p className="text-sm text-red-600" role="alert">
                          {profilePhotoError}
                        </p>
                      ) : null}
                    </div>

                    <div className="border-t border-amber-200 pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0">
                      <Controller
                        name="profilePhotoUrl"
                        control={control}
                        render={({ field }) => (
                          <RegistrationPrefixedUrlInput
                            id="profilePhotoUrl"
                            label="Profile photo URL"
                            helperText="Optional fallback HTTPS URL for an avatar image."
                            prefix={REGISTRATION_HTTPS_PREFIX}
                            suffixPlaceholder="example.com/photo.jpg"
                            suffixFromStored={websitePathSuffixFromStored}
                            merge={mergeWebsitePath}
                            field={field}
                            error={errors.profilePhotoUrl?.message as string | undefined}
                            onFormatNote={formatNote.show}
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        {backgroundImagePreviewUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={backgroundImagePreviewUrl}
                            alt="Header Image preview"
                            className="h-20 w-full rounded-xl border border-amber-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-20 w-full items-center justify-center rounded-xl border border-dashed border-amber-300 bg-white text-xs font-semibold text-amber-700">
                            Header Image
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-amber-900">
                            Header Image upload
                          </p>
                          <p className="text-xs text-amber-700">Cropped to a wide hero banner.</p>
                        </div>
                      </div>
                      <input
                        id="backgroundImageFile"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) =>
                          void handleBackgroundImageChange(e.currentTarget.files?.[0] ?? null)
                        }
                        className="block w-full text-sm text-amber-900 file:mr-3 file:min-h-[38px] file:rounded-lg file:border-0 file:bg-amber-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-amber-800"
                      />
                      {backgroundImageProcessing ? (
                        <p className="text-xs text-amber-700">Preparing image…</p>
                      ) : null}
                      {backgroundImageFile ? (
                        <label className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-amber-900">
                          <input
                            type="checkbox"
                            checked={backgroundImageRightsConfirmed}
                            onChange={(e) => {
                              setBackgroundImageRightsConfirmed(e.target.checked);
                              if (e.target.checked) setBackgroundImageError(null);
                            }}
                            className="mt-0.5 accent-amber-700"
                          />
                          <span>I confirm I have the right to use this Header Image.</span>
                        </label>
                      ) : null}
                      {backgroundImageFile ? (
                        <button
                          type="button"
                          onClick={() => void handleBackgroundImageChange(null)}
                          className="min-h-[36px] text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900"
                        >
                          Remove selected Header Image
                        </button>
                      ) : null}
                      {backgroundImageError ? (
                        <p className="text-sm text-red-600" role="alert">
                          {backgroundImageError}
                        </p>
                      ) : null}
                    </div>

                    <div className="border-t border-amber-200 pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0">
                      <Controller
                        name="backgroundImageUrl"
                        control={control}
                        render={({ field }) => (
                          <RegistrationPrefixedUrlInput
                            id="backgroundImageUrl"
                            label="Header Image URL"
                            helperText="Optional fallback HTTPS URL for your hero banner."
                            prefix={REGISTRATION_HTTPS_PREFIX}
                            suffixPlaceholder="example.com/banner.jpg"
                            suffixFromStored={websitePathSuffixFromStored}
                            merge={mergeWebsitePath}
                            field={field}
                            error={errors.backgroundImageUrl?.message as string | undefined}
                            onFormatNote={formatNote.show}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Specialities ── */}
                <div>
                  <label className="block text-sm font-semibold text-amber-900 mb-1">
                    Specialities <span className="text-red-600">*</span>{" "}
                    <span className="font-normal text-amber-600">(1-3)</span>
                  </label>
                  <p className="mb-2 text-xs text-amber-700">
                    Pick from the list or <strong>add your own</strong> if it&apos;s missing - an
                    admin can add it to the catalogue when reviewing your request.
                  </p>
                  <Controller
                    name="specialities"
                    control={control}
                    render={({ field }) => (
                      <SpecialityPicker
                        selected={field.value ?? []}
                        onChange={field.onChange}
                        catalog={specialityCatalog}
                        allowCustom
                        error={
                          errors.specialities?.message ??
                          (errors.specialities as { root?: { message?: string } } | undefined)?.root
                            ?.message
                        }
                      />
                    )}
                  />
                </div>

                {/* ── Divider: Optional fields ── */}
                <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-4">
                  <p className="text-sm font-semibold text-amber-700 mb-4">Optional extras</p>

                  {/* Bio / Artistic Journey  -  min-height on ProseMirror (editorProps) so the whole box is clickable */}
                  <div className="mb-4 min-w-0 max-w-full">
                    <label className="block text-sm font-semibold text-amber-900 mb-1">
                      Bio / Artistic Journey
                    </label>
                    <BioRichTextEditor
                      initialHtml=""
                      onHtmlChange={(html) =>
                        setValue("bioRichText", html, { shouldDirty: true, shouldValidate: false })
                      }
                    />
                  </div>
                </div>
              </>
            ) : null}

            {currentStep === 2 ? (
              <>
                {/* Website URLs */}
                <div>
                  <label className="block text-sm font-semibold text-amber-900 mb-1">
                    Website URLs <span className="font-normal text-amber-600">(up to 3)</span>
                  </label>
                  <div className="space-y-2">
                    {websiteFields.map((field, index) => (
                      <div key={field.id} className="min-w-0 max-w-full">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                          <Controller
                            name={`websiteUrls.${index}.url`}
                            control={control}
                            render={({ field: urlField }) => (
                              <div className="flex w-full min-w-0 max-w-full flex-col rounded-lg border border-amber-300 bg-white focus-within:ring-2 focus-within:ring-amber-500 sm:flex-row sm:items-stretch sm:overflow-hidden">
                                <span className="flex min-h-[48px] shrink-0 select-none items-center break-all border-b border-amber-200 bg-amber-50 px-3 text-sm font-medium leading-normal text-amber-900 sm:min-h-0 sm:border-b-0 sm:border-r">
                                  {REGISTRATION_HTTPS_PREFIX}
                                </span>
                                <input
                                  type="text"
                                  inputMode="url"
                                  autoComplete="off"
                                  name={urlField.name}
                                  ref={urlField.ref}
                                  onBlur={urlField.onBlur}
                                  value={websitePathSuffixFromStored(urlField.value ?? "")}
                                  {...urlSuffixRestrictedHandlers(
                                    mergeWebsitePath,
                                    formatNote.show,
                                    (full) => urlField.onChange(full),
                                  )}
                                  placeholder="yourwebsite.com"
                                  className="min-h-[48px] min-w-0 w-full flex-1 border-0 bg-transparent px-3 py-2 text-sm leading-normal text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-0 sm:min-h-[44px] sm:py-2.5"
                                />
                              </div>
                            )}
                          />
                          <button
                            type="button"
                            onClick={() => removeWebsite(index)}
                            className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50 sm:self-start"
                            aria-label="Remove website URL"
                          >
                            ×
                          </button>
                        </div>
                        {errors.websiteUrls?.[index]?.url ? (
                          <p className="mt-1 text-sm text-red-600" role="alert">
                            {errors.websiteUrls[index]?.url?.message}
                          </p>
                        ) : null}
                      </div>
                    ))}
                    {websiteFields.length < 3 && (
                      <button
                        type="button"
                        onClick={() => appendWebsite({ url: "" })}
                        className="text-sm text-amber-700 hover:text-amber-900 underline min-h-[44px]"
                      >
                        + Add website URL
                      </button>
                    )}
                  </div>
                  {errors.websiteUrls && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {(errors.websiteUrls as { message?: string }).message}
                    </p>
                  )}
                </div>

                {/* Social Links  -  fixed host prefix; type handle or path after it */}
                {(
                  [
                    {
                      name: "linkedinUrl" as const,
                      label: "LinkedIn",
                      prefix: REGISTRATION_LINKEDIN_PREFIX,
                      merge: mergeLinkedinUrl,
                      suffixFrom: linkedinSuffixFromStored,
                      placeholder: "your-profile-id",
                    },
                    {
                      name: "instagramUrl" as const,
                      label: "Instagram",
                      prefix: REGISTRATION_INSTAGRAM_PREFIX,
                      merge: mergeInstagramUrl,
                      suffixFrom: instagramSuffixFromStored,
                      placeholder: "yourhandle",
                    },
                    {
                      name: "facebookUrl" as const,
                      label: "Facebook",
                      prefix: REGISTRATION_FACEBOOK_PREFIX,
                      merge: mergeFacebookUrl,
                      suffixFrom: facebookSuffixFromStored,
                      placeholder: "your.page or profile path",
                    },
                    {
                      name: "twitterUrl" as const,
                      label: "Twitter / X",
                      prefix: REGISTRATION_TWITTER_PREFIX,
                      merge: mergeTwitterUrl,
                      suffixFrom: twitterSuffixFromStored,
                      placeholder: "yourhandle",
                    },
                    {
                      name: "youtubeUrl" as const,
                      label: "YouTube",
                      prefix: REGISTRATION_YOUTUBE_PREFIX,
                      merge: mergeYoutubeUrl,
                      suffixFrom: youtubeSuffixFromStored,
                      placeholder: "@channel or watch?v=…",
                    },
                  ] as const
                ).map(({ name, label, prefix, merge, suffixFrom, placeholder }) => (
                  <div key={name}>
                    <Controller
                      name={name}
                      control={control}
                      render={({ field }) => (
                        <RegistrationPrefixedUrlInput
                          id={name}
                          label={label}
                          prefix={prefix}
                          suffixPlaceholder={placeholder}
                          suffixFromStored={suffixFrom}
                          merge={merge}
                          field={field}
                          error={errors[name]?.message}
                          onFormatNote={formatNote.show}
                        />
                      )}
                    />
                  </div>
                ))}

                {/* Submit error */}
                {submitError ? <FormFieldNotice tone="error">{submitError}</FormFieldNotice> : null}
              </>
            ) : null}
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-amber-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={goToPreviousStep}
              disabled={isFirstStep || isSubmitting}
              className="min-h-[44px] rounded-full border border-amber-200 px-5 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            {isFinalStep ? (
              <button
                type="submit"
                disabled={isSubmitting || submitBlockedBySession}
                className="min-h-[48px] rounded-full bg-orange-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-900/15 transition-colors hover:bg-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-64"
              >
                {isSubmitting ? "Submitting…" : "Submit Registration Request"}
              </button>
            ) : (
              <button
                type="button"
                onClick={goToNextStep}
                disabled={isSubmitting}
                className="min-h-[48px] rounded-full bg-orange-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-900/15 transition-colors hover:bg-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-44"
              >
                Continue
              </button>
            )}
          </div>
          {isFinalStep && submitBlockedBySession ? (
            <FormFieldNotice tone="error" className="mt-3">
              You&apos;re currently signed in as {sessionState.role}. To submit this form, scroll up
              and check &ldquo;I am registering someone else.&rdquo;
            </FormFieldNotice>
          ) : null}
          {isFinalStep && finalRequiredFieldErrors.length > 0 ? (
            <FormFieldNotice tone="error" className="mt-3">
              Missing required fields:{" "}
              {finalRequiredFieldErrors.map(([, label]) => label).join(", ")}.
            </FormFieldNotice>
          ) : null}
        </form>
      </div>
    </main>
  );
}
