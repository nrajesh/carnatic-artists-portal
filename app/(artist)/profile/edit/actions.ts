"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { verifySession } from "@/lib/session-jwt";

const UpdateSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  email: z.string().trim().toLowerCase().email("Valid email is required"),
  contactNumber: z.string().trim().min(1, "Contact number is required").max(40),
  contactType: z.enum(["whatsapp", "mobile"]),
  province: z.string().trim().min(1, "Province is required"),
  specialities: z
    .array(z.string().trim().min(1))
    .min(1, "At least one speciality is required")
    .max(3, "At most three specialities"),
});

export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof z.infer<typeof UpdateSchema>, string>> };

/**
 * Update the logged-in artist's profile + speciality join rows in a single
 * transaction. The session cookie is the source of truth for "who are you";
 * a malicious client cannot spoof a different artistId via the form.
 */
export async function updateArtistProfile(
  input: z.infer<typeof UpdateSchema>,
): Promise<UpdateProfileResult> {
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  if (!session) {
    return { ok: false, error: "Not signed in." };
  }

  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !(key in fieldErrors)) {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const { fullName, email, contactNumber, contactType, province, specialities } = parsed.data;
  const db = getDb();

  const conflictingArtist = await db.artist.findFirst({
    where: { email, NOT: { id: session.artistId } },
    select: { id: true },
  });
  if (conflictingArtist) {
    return {
      ok: false,
      error: "That email is already in use by another artist.",
      fieldErrors: { email: "Email already in use." },
    };
  }

  const specRows = await db.speciality.findMany({
    where: { name: { in: specialities } },
    select: { id: true, name: true },
  });
  if (specRows.length !== specialities.length) {
    return {
      ok: false,
      error: "One or more selected specialities do not exist.",
      fieldErrors: { specialities: "Pick specialities from the list." },
    };
  }
  const specIdByName = new Map(specRows.map((s) => [s.name, s.id]));

  await db.$transaction(async (tx) => {
    await tx.artist.update({
      where: { id: session.artistId },
      data: { fullName, email, contactNumber, contactType, province },
    });

    await tx.artistSpeciality.deleteMany({ where: { artistId: session.artistId } });
    await tx.artistSpeciality.createMany({
      data: specialities.map((name, index) => ({
        artistId: session.artistId,
        specialityId: specIdByName.get(name)!,
        displayOrder: index,
      })),
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/profile/edit");
  revalidatePath(`/artists/${session.artistId}`);
  return { ok: true };
}
