import { z } from "zod";
import {
  mergeFacebookUrl,
  mergeInstagramUrl,
  mergeLinkedinUrl,
  mergeTwitterUrl,
  mergeWebsitePath,
  mergeYoutubeUrl,
  isPlausibleContactNumber,
  sanitizeContactNumberInput,
} from "@/lib/registration-input-normalize";

/** Profile photos are managed uploads now; legacy remote URL submissions are rejected. */
const deprecatedProfilePhotoUrl = z.preprocess(
  (val: unknown) => {
    if (val === undefined || val === null) return undefined;
    if (typeof val !== "string") return undefined;
    const t = val.trim();
    if (t === "") return undefined;
    return t;
  },
  z.undefined({ error: "Upload a profile photo instead of linking to a remote image." }),
);

/** Empty / missing -> undefined. When set, must be a valid HTTPS image URL. */
const optionalHttpsPhotoUrl = z.preprocess(
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

function optionalMergedSocial(merge: (s: string) => string) {
  return z.preprocess(
    (val: unknown) => (typeof val === "string" ? merge(val.trim()) : ""),
    z.union([z.literal(""), z.string().url("Must be a valid URL")]),
  );
}

export const registrationServerSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Valid email address is required"),
    province: z.string().trim().min(1, "City is required").max(120),
    contactNumber: z.preprocess(
      (v: unknown) => (typeof v === "string" ? sanitizeContactNumberInput(v) : ""),
      z.string(),
    ),
    contactType: z.preprocess(
      (v: unknown) => {
        if (v === null || v === undefined) return "";
        if (typeof v !== "string") return "";
        return v.trim();
      },
      z.union([z.literal(""), z.enum(["whatsapp", "mobile"])]),
    ),
    profilePhotoUrl: deprecatedProfilePhotoUrl,
    backgroundImageUrl: optionalHttpsPhotoUrl,
    specialities: z
      .array(z.string().min(2).max(80))
      .min(1, "At least one speciality is required")
      .max(3, "Maximum 3 specialities allowed"),
    bioRichText: z.string().optional(),
    linkedinUrl: optionalMergedSocial(mergeLinkedinUrl),
    instagramUrl: optionalMergedSocial(mergeInstagramUrl),
    facebookUrl: optionalMergedSocial(mergeFacebookUrl),
    twitterUrl: optionalMergedSocial(mergeTwitterUrl),
    youtubeUrl: optionalMergedSocial(mergeYoutubeUrl),
    websiteUrls: z.preprocess(
      (val: unknown) => {
        if (!Array.isArray(val)) return [];
        return val
          .filter((x): x is string => typeof x === "string")
          .map((s) => mergeWebsitePath(s.trim()))
          .filter((u) => u !== "");
      },
      z.array(z.string().url("Must be a valid URL")).optional(),
    ),
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
    if (data.contactType !== "whatsapp" && data.contactType !== "mobile") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select WhatsApp or mobile for your contact number.",
        path: ["contactType"],
      });
    }
  });

export type RegistrationServerData = z.infer<typeof registrationServerSchema>;
