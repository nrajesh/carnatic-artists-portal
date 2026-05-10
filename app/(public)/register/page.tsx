"use client";

/**
 * Registration form page for Artist Discovery Portal.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8
 */

import { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import NextLink from "next/link";
import { usePostHog } from "posthog-js/react";
import SpecialityPicker, { type SpecialityCatalogItem } from "@/components/speciality-picker";
import { RegistrationPrefixedUrlInput } from "@/components/registration-prefixed-url-input";
import { FormFieldNotice } from "@/components/form-field-notice";
import { SiteBrandMark } from "@/components/site-brand-mark";
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

export const registrationSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Valid email address is required"),
    province: z.string().trim().min(1, "Location is required").max(120),
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

export type RegistrationFormData = z.infer<typeof registrationSchema>;

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

function capitalizeFirst(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return value;
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

const finalRequiredFieldLabels = {
  fullName: "Full name",
  email: "Email address",
  province: "Location",
  specialities: "Specialities",
} as const;

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Tiptap toolbar
// ---------------------------------------------------------------------------

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt("Enter image URL");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const setLink = () => {
    const url = window.prompt("Enter URL");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
  };

  return (
    <div className="flex flex-wrap gap-1 border border-amber-300 border-b-0 rounded-t-md bg-amber-50 p-2">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`px-2 py-1 text-sm rounded font-bold min-w-[44px] min-h-[44px] ${
          editor.isActive("bold")
            ? "bg-amber-700 text-white"
            : "bg-white text-amber-900 border border-amber-300"
        }`}
        aria-label="Bold"
      >
        B
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`px-2 py-1 text-sm rounded italic min-w-[44px] min-h-[44px] ${
          editor.isActive("italic")
            ? "bg-amber-700 text-white"
            : "bg-white text-amber-900 border border-amber-300"
        }`}
        aria-label="Italic"
      >
        I
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={setLink}
        className={`px-2 py-1 text-sm rounded min-w-[44px] min-h-[44px] ${
          editor.isActive("link")
            ? "bg-amber-700 text-white"
            : "bg-white text-amber-900 border border-amber-300"
        }`}
        aria-label="Link"
      >
        🔗
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={addImage}
        className="px-2 py-1 text-sm rounded bg-white text-amber-900 border border-amber-300 min-w-[44px] min-h-[44px]"
        aria-label="Insert image"
      >
        🖼
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
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
  const posthog = usePostHog();
  const bioRichTextDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatNote = useTimedFieldNotice();
  const locationConfig = getPublicDeploymentLocationInputConfig();
  const locationAreaLabel = capitalizeFirst(locationConfig.areaLabelSingular);
  const locationSuggestionsId = "registration-location-suggestions";
  const activeStep = registrationSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isFinalStep = currentStep === registrationSteps.length - 1;
  const submitBlockedBySession = sessionState.authenticated && !registeringSomeoneElse;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
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
      ["profilePhotoUrl", "specialities", "backgroundImageUrl", "bioRichText"],
      [],
    ];
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

  // Tiptap editor - immediatelyRender: false prevents SSR hydration mismatch
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, TiptapImage, TiptapLink.configure({ openOnClick: false })],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm prose-stone max-w-measure min-h-[12rem] cursor-text px-4 py-4 text-left font-sans leading-relaxed text-amber-950 outline-none focus:outline-none sm:prose-base",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (bioRichTextDebounceRef.current) clearTimeout(bioRichTextDebounceRef.current);
      bioRichTextDebounceRef.current = setTimeout(() => {
        bioRichTextDebounceRef.current = null;
        setValue("bioRichText", ed.getHTML(), { shouldDirty: true, shouldValidate: false });
      }, 300);
    },
  });

  useEffect(() => {
    return () => {
      if (bioRichTextDebounceRef.current) clearTimeout(bioRichTextDebounceRef.current);
    };
  }, []);

  const onSubmit = async (data: RegistrationFormData) => {
    setSubmitError(null);
    if (sessionState.authenticated && !registeringSomeoneElse) {
      setSubmitError(
        'You are already signed in. Check "I am registering someone else" to continue.',
      );
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
      if (data.profilePhotoUrl) formData.append("profilePhotoUrl", data.profilePhotoUrl);
      data.specialities.forEach((s) => formData.append("specialities", s));

      if (data.backgroundImageUrl) formData.append("backgroundImageUrl", data.backgroundImageUrl);
      const bioRichText = editor?.getHTML() ?? data.bioRichText ?? "";
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
        setSubmitError(
          (typeof json.message === "string" && json.message) ||
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
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_12px_22px_rgba(154,52,18,0.18)] ring-1 ring-amber-100">
              <SiteBrandMark className="h-10 w-10" />
            </span>
          </div>
          <h1 className="mb-3 font-display text-2xl font-bold tracking-tight text-amber-900">
            Request Submitted!
          </h1>
          <p className="text-amber-800 leading-relaxed">
            Your registration request has been submitted. An admin will review it and you&apos;ll
            receive an email once approved.
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
                    Enter your city, province, district, state, or area. Suggestions are there to
                    help, not to limit you.
                  </p>
                  <input
                    type="text"
                    list={locationConfig.areaOptions.length > 0 ? locationSuggestionsId : undefined}
                    {...register("province")}
                    className="ph-no-capture w-full rounded-lg border border-amber-300 px-3 py-2 text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                    placeholder={`Type a ${locationConfig.areaLabelSingular.toLowerCase()}, city, district, or area`}
                  />
                  {locationConfig.areaOptions.length > 0 ? (
                    <datalist id={locationSuggestionsId}>
                      {locationConfig.areaOptions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  ) : null}
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
                {/* ── Profile photo URL (optional) ── */}
                <Controller
                  name="profilePhotoUrl"
                  control={control}
                  render={({ field }) => (
                    <RegistrationPrefixedUrlInput
                      id="profilePhotoUrl"
                      label="Profile photo URL"
                      helperText={
                        <span>
                          <span className="font-normal text-amber-600">(optional)</span> Path after{" "}
                          <strong>https://</strong> to an image you already host. Leave blank for
                          the initial letter on your public profile.
                        </span>
                      }
                      prefix={REGISTRATION_HTTPS_PREFIX}
                      suffixPlaceholder="cdn.example.com/photos/me.jpg"
                      suffixFromStored={websitePathSuffixFromStored}
                      merge={mergeWebsitePath}
                      field={field}
                      error={errors.profilePhotoUrl?.message as string | undefined}
                      onFormatNote={formatNote.show}
                    />
                  )}
                />

                {/* ── Specialities ── */}
                <div>
                  <label className="block text-sm font-semibold text-amber-900 mb-1">
                    Specialities <span className="text-red-600">*</span>{" "}
                    <span className="font-normal text-amber-600">(1-3)</span>
                  </label>
                  <p className="mb-2 text-xs text-amber-700">
                    Pick from the list or <strong>add your own</strong>{" "}if it&apos;s missing - an
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

                  {/* Background image URL */}
                  <div className="mb-4">
                    <Controller
                      name="backgroundImageUrl"
                      control={control}
                      render={({ field }) => (
                        <RegistrationPrefixedUrlInput
                          id="backgroundImageUrl"
                          label="Background image URL"
                          helperText="Optional. Wide banner image for your public profile hero."
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

                  {/* Bio / Artistic Journey  -  min-height on ProseMirror (editorProps) so the whole box is clickable */}
                  <div className="mb-4 min-w-0 max-w-full">
                    <label className="block text-sm font-semibold text-amber-900 mb-1">
                      Bio / Artistic Journey
                    </label>
                    <EditorToolbar editor={editor} />
                    <EditorContent
                      editor={editor}
                      className="rounded-b-md border border-t-0 border-amber-300 bg-white focus-within:ring-2 focus-within:ring-amber-500"
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
