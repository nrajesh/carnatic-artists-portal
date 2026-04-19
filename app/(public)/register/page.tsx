'use client';

/**
 * Registration form page for Carnatic Artist Portal.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8
 */

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';
import TiptapLink from '@tiptap/extension-link';
import NextLink from 'next/link';
import { usePostHog } from 'posthog-js/react';
import SpecialityPicker, { type SpecialityCatalogItem } from '@/components/speciality-picker';
import { RegistrationPrefixedUrlInput } from '@/components/registration-prefixed-url-input';
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
} from '@/lib/registration-input-normalize';

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

/** Empty → omitted. When set, must be HTTPS (image URL you host). */
const optionalHttpsPhotoUrlSchema = z.preprocess((val: unknown) => {
  if (val === undefined || val === null) return undefined;
  if (typeof val !== 'string') return undefined;
  const t = val.trim();
  if (t === '') return undefined;
  return mergeWebsitePath(t);
}, z.union([z.undefined(), z.string().url('Must be a valid URL').refine((u) => /^https:\/\//i.test(u), 'Must use HTTPS')]));

function optMergedSocialField(merge: (s: string) => string) {
  return z.preprocess(
    (val) => (typeof val === 'string' ? merge(val.trim()) : ''),
    z.union([z.literal(''), z.string().url('Must be a valid URL')]),
  );
}

const websiteRowUrlSchema = z.preprocess(
  (val) => (typeof val === 'string' ? mergeWebsitePath(val.trim()) : ''),
  z.union([z.literal(''), z.string().url('Must be a valid URL')]),
);

export const registrationSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email address is required'),
  contactNumber: z.preprocess(
    (v) => (typeof v === 'string' ? sanitizeContactNumberInput(v) : ''),
    z
      .string()
      .min(1, 'Contact number is required')
      .refine(
        isPlausibleContactNumber,
        'Enter 7–15 digits; optional + only at the start (no spaces or other symbols)',
      ),
  ),
  contactType: z.enum(['whatsapp', 'mobile']),
  profilePhotoUrl: optionalHttpsPhotoUrlSchema,
  specialities: z
    .array(z.string().min(2).max(80))
    .min(1, 'At least one speciality is required')
    .max(3, 'Maximum 3 specialities allowed')
    .refine(
      (arr) => new Set(arr.map((s) => s.trim().toLowerCase())).size === arr.length,
      'Each speciality must be unique',
    ),
  backgroundImageUrl: optionalHttpsPhotoUrlSchema,
  bioRichText: z.string().optional(),
  websiteUrls: z.array(z.object({ url: websiteRowUrlSchema })).optional(),
  linkedinUrl: optMergedSocialField(mergeLinkedinUrl),
  instagramUrl: optMergedSocialField(mergeInstagramUrl),
  facebookUrl: optMergedSocialField(mergeFacebookUrl),
  twitterUrl: optMergedSocialField(mergeTwitterUrl),
  youtubeUrl: optMergedSocialField(mergeYoutubeUrl),
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Tiptap toolbar
// ---------------------------------------------------------------------------

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt('Enter image URL');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const setLink = () => {
    const url = window.prompt('Enter URL');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
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
          editor.isActive('bold') ? 'bg-amber-700 text-white' : 'bg-white text-amber-900 border border-amber-300'
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
          editor.isActive('italic') ? 'bg-amber-700 text-white' : 'bg-white text-amber-900 border border-amber-300'
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
          editor.isActive('link') ? 'bg-amber-700 text-white' : 'bg-white text-amber-900 border border-amber-300'
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
  const [sessionState, setSessionState] = useState<{
    loading: boolean;
    authenticated: boolean;
    role: 'artist' | 'admin' | null;
  }>({
    loading: true,
    authenticated: false,
    role: null,
  });
  const [registeringSomeoneElse, setRegisteringSomeoneElse] = useState(false);
  const [specialityCatalog, setSpecialityCatalog] = useState<SpecialityCatalogItem[]>([]);
  const posthog = usePostHog();
  const bioRichTextDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      contactType: 'whatsapp',
      profilePhotoUrl: '',
      backgroundImageUrl: '',
      specialities: [],
      websiteUrls: [],
      linkedinUrl: '',
      instagramUrl: '',
      facebookUrl: '',
      twitterUrl: '',
      youtubeUrl: '',
    },
  });

  const { fields: websiteFields, append: appendWebsite, remove: removeWebsite } = useFieldArray({
    control,
    name: 'websiteUrls',
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const data = (await res.json()) as {
          authenticated?: boolean;
          role?: 'artist' | 'admin';
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
        const res = await fetch('/api/specialities');
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
    extensions: [
      StarterKit,
      TiptapImage,
      TiptapLink.configure({ openOnClick: false }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class:
          'min-h-[12rem] cursor-text px-3 py-3 text-base text-amber-900 outline-none prose prose-sm max-w-none focus:outline-none sm:text-sm',
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (bioRichTextDebounceRef.current) clearTimeout(bioRichTextDebounceRef.current);
      bioRichTextDebounceRef.current = setTimeout(() => {
        bioRichTextDebounceRef.current = null;
        setValue('bioRichText', ed.getHTML(), { shouldDirty: true, shouldValidate: false });
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
      setSubmitError('You are already signed in. Check "I am registering someone else" to continue.');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('fullName', data.fullName);
      formData.append('email', data.email);
      formData.append('contactNumber', data.contactNumber);
      formData.append('contactType', data.contactType);
      if (data.profilePhotoUrl) formData.append('profilePhotoUrl', data.profilePhotoUrl);
      data.specialities.forEach((s) => formData.append('specialities', s));

      if (data.backgroundImageUrl) formData.append('backgroundImageUrl', data.backgroundImageUrl);
      const bioRichText = editor?.getHTML() ?? data.bioRichText ?? '';
      if (bioRichText) formData.append('bioRichText', bioRichText);
      if (data.linkedinUrl) formData.append('linkedinUrl', data.linkedinUrl);
      if (data.instagramUrl) formData.append('instagramUrl', data.instagramUrl);
      if (data.facebookUrl) formData.append('facebookUrl', data.facebookUrl);
      if (data.twitterUrl) formData.append('twitterUrl', data.twitterUrl);
      if (data.youtubeUrl) formData.append('youtubeUrl', data.youtubeUrl);
      data.websiteUrls?.forEach((w) => {
        if (w.url) formData.append('websiteUrls', w.url);
      });

      const res = await fetch('/api/registrations', { method: 'POST', body: formData });
      const json = await res.json();

      if (json.success) {
        posthog.capture('registration_submitted', {
          speciality_count: data.specialities.length,
        });
        setSubmitted(true);
      } else {
        setSubmitError(
          (typeof json.message === 'string' && json.message) ||
            (typeof json.error === 'string' && json.error) ||
            'Submission failed. Please try again.',
        );
      }
    } catch {
      setSubmitError('An unexpected error occurred. Please try again.');
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-amber-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-amber-200">
          <div className="text-5xl mb-4">🎵</div>
          <h1 className="text-2xl font-bold text-amber-900 mb-3">Request Submitted!</h1>
          <p className="text-amber-800 leading-relaxed">
            Your registration request has been submitted. An admin will review it and you&apos;ll
            receive an email once approved.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen min-w-0 bg-amber-50 py-8 px-4">
      <div className="mx-auto max-w-2xl min-w-0">
        {/* Back link */}
        <div className="mb-6">
          <NextLink href="/" className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 font-medium transition-colors">
            ← Back to home
          </NextLink>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">Join the Portal</h1>
          <p className="text-amber-700">
            Register as a Carnatic musician to create your portfolio and connect with fellow artists.
          </p>
        </div>
        {!sessionState.loading && sessionState.authenticated && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            You are currently signed in as {sessionState.role}. By default, registration is intended for new artists.
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
          className="touch-manipulation space-y-6 rounded-2xl border border-amber-200 bg-white p-6 shadow-lg"
        >
          {/* ── Full Name ── */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-semibold text-amber-900 mb-1">
              Full Name <span className="text-red-600">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              {...register('fullName')}
              className="w-full border border-amber-300 rounded-lg px-3 py-2 text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
              placeholder="Your full name"
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-600" role="alert">{errors.fullName.message}</p>
            )}
          </div>

          {/* ── Email ── */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-amber-900 mb-1">
              Email Address <span className="text-red-600">*</span>
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className="w-full border border-amber-300 rounded-lg px-3 py-2 text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600" role="alert">{errors.email.message}</p>
            )}
          </div>

          {/* ── Contact Number + Contact Type ── */}
          <div>
            <label className="block text-sm font-semibold text-amber-900 mb-1">
              Contact Number <span className="text-red-600">*</span>
            </label>
            <p className="mb-2 text-xs text-amber-600">
              Digits only (7–15). Use an optional <strong>+</strong> at the start for a country code  -  no spaces or other
              symbols.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Controller
                name="contactNumber"
                control={control}
                render={({ field }) => (
                  <input
                    id="contactNumber"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(sanitizeContactNumberInput(e.target.value))}
                    className="min-h-[44px] flex-1 rounded-lg border border-amber-300 px-3 py-2 text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="+31 6 12345678"
                  />
                )}
              />
              <div className="flex items-center gap-4 sm:gap-3">
                <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                  <input
                    type="radio"
                    value="whatsapp"
                    {...register('contactType')}
                    className="w-4 h-4 accent-amber-600"
                  />
                  <span className="text-sm text-amber-900">WhatsApp</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                  <input
                    type="radio"
                    value="mobile"
                    {...register('contactType')}
                    className="w-4 h-4 accent-amber-600"
                  />
                  <span className="text-sm text-amber-900">Mobile only</span>
                </label>
              </div>
            </div>
            {errors.contactNumber && (
              <p className="mt-1 text-sm text-red-600" role="alert">{errors.contactNumber.message}</p>
            )}
            {errors.contactType && (
              <p className="mt-1 text-sm text-red-600" role="alert">{errors.contactType.message}</p>
            )}
          </div>

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
                    <span className="font-normal text-amber-600">(optional)</span> Path after{' '}
                    <strong>https://</strong> to an image you already host. Leave blank for the initial letter on your
                    public profile.
                  </span>
                }
                prefix={REGISTRATION_HTTPS_PREFIX}
                suffixPlaceholder="cdn.example.com/photos/me.jpg"
                suffixFromStored={websitePathSuffixFromStored}
                merge={mergeWebsitePath}
                field={field}
                error={errors.profilePhotoUrl?.message as string | undefined}
              />
            )}
          />

          {/* ── Specialities ── */}
          <div>
            <label className="block text-sm font-semibold text-amber-900 mb-1">
              Specialities <span className="text-red-600">*</span>{' '}
              <span className="font-normal text-amber-600">(1–3)</span>
            </label>
            <p className="mb-2 text-xs text-amber-700">
              Pick from the list or add your own if it&apos;s missing - an admin can add it to the catalogue when reviewing your request.
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
                    (errors.specialities as { root?: { message?: string } } | undefined)?.root?.message
                  }
                />
              )}
            />
          </div>

          {/* ── Divider: Optional fields ── */}
          <div className="border-t border-amber-100 pt-4">
            <p className="text-sm font-semibold text-amber-700 mb-4">Optional Information</p>

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
                  />
                )}
              />
            </div>

            {/* Bio / Musical Journey  -  min-height on ProseMirror (editorProps) so the whole box is clickable */}
            <div className="mb-4 min-w-0 max-w-full">
              <label className="block text-sm font-semibold text-amber-900 mb-1">
                Bio / Musical Journey
              </label>
              <EditorToolbar editor={editor} />
              <EditorContent
                editor={editor}
                className="rounded-b-md border border-t-0 border-amber-300 bg-white focus-within:ring-2 focus-within:ring-amber-500"
              />
            </div>

            {/* Website URLs */}
            <div className="mb-4">
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
                          <div className="flex w-full min-w-0 max-w-full flex-col rounded-lg border border-amber-300 bg-white focus-within:ring-2 focus-within:ring-amber-500 sm:flex-row sm:overflow-hidden">
                            <span className="select-none break-all border-b border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] font-medium leading-snug text-amber-900 sm:border-b-0 sm:border-r sm:py-2 sm:text-xs">
                              {REGISTRATION_HTTPS_PREFIX}
                            </span>
                            <input
                              type="text"
                              inputMode="url"
                              autoComplete="off"
                              name={urlField.name}
                              ref={urlField.ref}
                              onBlur={urlField.onBlur}
                              value={websitePathSuffixFromStored(urlField.value ?? '')}
                              onChange={(e) => urlField.onChange(mergeWebsitePath(e.target.value))}
                              placeholder="yourwebsite.com"
                              className="min-h-[48px] min-w-0 w-full flex-1 border-0 bg-transparent px-2 py-2 text-base text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-0 sm:min-h-[44px]"
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
                    onClick={() => appendWebsite({ url: '' })}
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
                  name: 'linkedinUrl' as const,
                  label: 'LinkedIn',
                  prefix: REGISTRATION_LINKEDIN_PREFIX,
                  merge: mergeLinkedinUrl,
                  suffixFrom: linkedinSuffixFromStored,
                  placeholder: 'your-profile-id',
                },
                {
                  name: 'instagramUrl' as const,
                  label: 'Instagram',
                  prefix: REGISTRATION_INSTAGRAM_PREFIX,
                  merge: mergeInstagramUrl,
                  suffixFrom: instagramSuffixFromStored,
                  placeholder: 'yourhandle',
                },
                {
                  name: 'facebookUrl' as const,
                  label: 'Facebook',
                  prefix: REGISTRATION_FACEBOOK_PREFIX,
                  merge: mergeFacebookUrl,
                  suffixFrom: facebookSuffixFromStored,
                  placeholder: 'your.page or profile path',
                },
                {
                  name: 'twitterUrl' as const,
                  label: 'Twitter / X',
                  prefix: REGISTRATION_TWITTER_PREFIX,
                  merge: mergeTwitterUrl,
                  suffixFrom: twitterSuffixFromStored,
                  placeholder: 'yourhandle',
                },
                {
                  name: 'youtubeUrl' as const,
                  label: 'YouTube',
                  prefix: REGISTRATION_YOUTUBE_PREFIX,
                  merge: mergeYoutubeUrl,
                  suffixFrom: youtubeSuffixFromStored,
                  placeholder: '@channel or watch?v=…',
                },
              ] as const
            ).map(({ name, label, prefix, merge, suffixFrom, placeholder }) => (
              <div key={name} className="mb-4">
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
                    />
                  )}
                />
              </div>
            ))}
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700" role="alert">{submitError}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || (sessionState.authenticated && !registeringSomeoneElse)}
            className="w-full py-3 px-6 bg-amber-700 text-white font-semibold rounded-lg hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] transition-colors"
          >
            {isSubmitting ? 'Submitting…' : 'Submit Registration Request'}
          </button>
        </form>
      </div>
    </main>
  );
}
