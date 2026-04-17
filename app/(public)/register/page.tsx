'use client';

/**
 * Registration form page for Carnatic Artist Portal.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8
 */

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';
import TiptapLink from '@tiptap/extension-link';
import NextLink from 'next/link';
import { usePostHog } from 'posthog-js/react';
import SpecialityPicker from '@/components/speciality-picker';

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const fileSchema = z
  .instanceof(File)
  .refine((f) => f.size <= MAX_FILE_SIZE, 'File must be 5 MB or less')
  .refine((f) => ACCEPTED_IMAGE_TYPES.includes(f.type), 'Only JPEG, PNG, WebP, and GIF are accepted');

const urlSchema = z.string().url('Must be a valid URL').or(z.literal(''));

export const registrationSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email address is required'),
  contactNumber: z.string().min(1, 'Contact number is required'),
  contactType: z.enum(['whatsapp', 'mobile'], {
    required_error: 'Please select a contact type',
  }),
  profilePhoto: fileSchema,
  specialities: z
    .array(z.string().min(1))
    .min(1, 'At least one speciality is required')
    .max(3, 'Maximum 3 specialities allowed'),
  backgroundImage: z.instanceof(File).optional().nullable(),
  bioRichText: z.string().optional(),
  websiteUrls: z.array(z.object({ url: urlSchema })).optional(),
  linkedinUrl: urlSchema.optional(),
  instagramUrl: urlSchema.optional(),
  facebookUrl: urlSchema.optional(),
  twitterUrl: urlSchema.optional(),
  youtubeUrl: urlSchema.optional(),
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
    <div className="flex flex-wrap gap-1 border border-amber-200 border-b-0 rounded-t-md bg-amber-50 p-2">
      <button
        type="button"
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
  const posthog = usePostHog();

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
      specialities: [],
      websiteUrls: [],
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

  // Tiptap editor - immediatelyRender: false prevents SSR hydration mismatch
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TiptapImage,
      TiptapLink.configure({ openOnClick: false }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setValue('bioRichText', editor.getHTML());
    },
  });

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
      formData.append('profilePhoto', data.profilePhoto);
      data.specialities.forEach((s) => formData.append('specialities', s));

      if (data.backgroundImage) formData.append('backgroundImage', data.backgroundImage);
      if (data.bioRichText) formData.append('bioRichText', data.bioRichText);
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
        setSubmitError(json.error ?? 'Submission failed. Please try again.');
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
    <main className="min-h-screen bg-amber-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
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
          className="bg-white rounded-2xl shadow-lg border border-amber-200 p-6 space-y-6"
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
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="contactNumber"
                type="text"
                {...register('contactNumber')}
                className="flex-1 border border-amber-300 rounded-lg px-3 py-2 text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                placeholder="+31 6 12345678"
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

          {/* ── Profile Photo ── */}
          <div>
            <label htmlFor="profilePhoto" className="block text-sm font-semibold text-amber-900 mb-1">
              Profile Photo <span className="text-red-600">*</span>
            </label>
            <p className="text-xs text-amber-600 mb-2">JPEG, PNG, WebP, or GIF - max 5 MB</p>
            <Controller
              name="profilePhoto"
              control={control}
              render={({ field: { onChange } }) => (
                <input
                  id="profilePhoto"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onChange(file);
                  }}
                  className="w-full border border-amber-300 rounded-lg px-3 py-2 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px] file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-amber-100 file:text-amber-800 file:cursor-pointer"
                />
              )}
            />
            {errors.profilePhoto && (
              <p className="mt-1 text-sm text-red-600" role="alert">{errors.profilePhoto.message as string}</p>
            )}
          </div>

          {/* ── Specialities ── */}
          <div>
            <label className="block text-sm font-semibold text-amber-900 mb-1">
              Specialities <span className="text-red-600">*</span>{' '}
              <span className="font-normal text-amber-600">(1–3)</span>
            </label>
            <Controller
              name="specialities"
              control={control}
              render={({ field }) => (
                <SpecialityPicker
                  selected={field.value ?? []}
                  onChange={field.onChange}
                  error={errors.specialities?.message ?? (errors.specialities as { root?: { message?: string } } | undefined)?.root?.message}
                />
              )}
            />
          </div>

          {/* ── Divider: Optional fields ── */}
          <div className="border-t border-amber-100 pt-4">
            <p className="text-sm font-semibold text-amber-700 mb-4">Optional Information</p>

            {/* Background Image */}
            <div className="mb-4">
              <label htmlFor="backgroundImage" className="block text-sm font-semibold text-amber-900 mb-1">
                Background Image
              </label>
              <p className="text-xs text-amber-600 mb-2">JPEG, PNG, WebP, or GIF - max 5 MB</p>
              <Controller
                name="backgroundImage"
                control={control}
                render={({ field: { onChange } }) => (
                  <input
                    id="backgroundImage"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      onChange(file ?? null);
                    }}
                    className="w-full border border-amber-300 rounded-lg px-3 py-2 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px] file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-amber-100 file:text-amber-800 file:cursor-pointer"
                  />
                )}
              />
              {errors.backgroundImage && (
                <p className="mt-1 text-sm text-red-600" role="alert">{errors.backgroundImage.message as string}</p>
              )}
            </div>

            {/* Bio / Musical Journey */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-amber-900 mb-1">
                Bio / Musical Journey
              </label>
              <EditorToolbar editor={editor} />
              <EditorContent
                editor={editor}
                className="border border-amber-300 rounded-b-md min-h-[120px] px-3 py-2 text-amber-900 focus-within:ring-2 focus-within:ring-amber-500 prose prose-sm max-w-none"
              />
            </div>

            {/* Website URLs */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-amber-900 mb-1">
                Website URLs <span className="font-normal text-amber-600">(up to 3)</span>
              </label>
              <div className="space-y-2">
                {websiteFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2">
                    <input
                      type="url"
                      {...register(`websiteUrls.${index}.url`)}
                      placeholder="https://yourwebsite.com"
                      className="flex-1 border border-amber-300 rounded-lg px-3 py-2 text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => removeWebsite(index)}
                      className="px-3 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 min-w-[44px] min-h-[44px]"
                      aria-label="Remove website URL"
                    >
                      ×
                    </button>
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

            {/* Social Links */}
            {[
              { name: 'linkedinUrl' as const, label: 'LinkedIn URL', placeholder: 'https://linkedin.com/in/yourprofile' },
              { name: 'instagramUrl' as const, label: 'Instagram URL', placeholder: 'https://instagram.com/yourhandle' },
              { name: 'facebookUrl' as const, label: 'Facebook URL', placeholder: 'https://facebook.com/yourpage' },
              { name: 'twitterUrl' as const, label: 'Twitter / X URL', placeholder: 'https://x.com/yourhandle' },
              { name: 'youtubeUrl' as const, label: 'YouTube Channel URL', placeholder: 'https://youtube.com/@yourchannel' },
            ].map(({ name, label, placeholder }) => (
              <div key={name} className="mb-4">
                <label htmlFor={name} className="block text-sm font-semibold text-amber-900 mb-1">
                  {label}
                </label>
                <input
                  id={name}
                  type="url"
                  {...register(name)}
                  placeholder={placeholder}
                  className="w-full border border-amber-300 rounded-lg px-3 py-2 text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                />
                {errors[name] && (
                  <p className="mt-1 text-sm text-red-600" role="alert">{errors[name]?.message}</p>
                )}
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
