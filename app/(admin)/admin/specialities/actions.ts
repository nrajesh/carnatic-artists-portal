"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { verifySession } from "@/lib/session-jwt";
import { prismaStringIdArraySchema } from "@/lib/prisma-string-id";
import { normalizeSpecialityLabel } from "@/lib/speciality-catalog";
import { specialityColorPairKey } from "@/lib/speciality-random-colors";

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a #RRGGBB colour");

const CreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  primaryColor: hexColor,
  textColor: hexColor,
});

const UpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  primaryColor: hexColor,
  textColor: hexColor,
});

export type SpecialityActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireAdmin(): Promise<{ artistId: string } | null> {
  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== "admin") return null;
  return { artistId: session.artistId };
}

export async function createSpecialityAction(formData: FormData): Promise<SpecialityActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized." };

  const parsed = CreateSchema.safeParse({
    name: formData.get("name"),
    primaryColor: formData.get("primaryColor"),
    textColor: formData.get("textColor"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const name = normalizeSpecialityLabel(parsed.data.name);
  if (name.length < 2) return { ok: false, error: "Name is too short." };

  const primaryColor = parsed.data.primaryColor.trim().toUpperCase();
  const textColor = parsed.data.textColor.trim().toUpperCase();
  const pairKey = specialityColorPairKey(primaryColor, textColor);
  const existingPairs = await getDb().speciality.findMany({
    select: { primaryColor: true, textColor: true },
  });
  if (
    existingPairs.some((r) => specialityColorPairKey(r.primaryColor, r.textColor) === pairKey)
  ) {
    return { ok: false, error: "Another speciality already uses this primary and text colour pair." };
  }

  try {
    await getDb().speciality.create({
      data: {
        name,
        primaryColor,
        textColor,
      },
    });
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "P2002") return { ok: false, error: "A speciality with this name already exists." };
    return { ok: false, error: "Could not create speciality." };
  }

  revalidatePath("/admin/specialities");
  return { ok: true };
}

export async function updateSpecialityAction(formData: FormData): Promise<SpecialityActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized." };

  const parsed = UpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    primaryColor: formData.get("primaryColor"),
    textColor: formData.get("textColor"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const name = normalizeSpecialityLabel(parsed.data.name);
  if (name.length < 2) return { ok: false, error: "Name is too short." };

  const primaryColor = parsed.data.primaryColor.trim().toUpperCase();
  const textColor = parsed.data.textColor.trim().toUpperCase();
  const pairKey = specialityColorPairKey(primaryColor, textColor);
  const allOthers = await getDb().speciality.findMany({
    where: { id: { not: parsed.data.id } },
    select: { primaryColor: true, textColor: true },
  });
  if (allOthers.some((r) => specialityColorPairKey(r.primaryColor, r.textColor) === pairKey)) {
    return { ok: false, error: "Another speciality already uses this primary and text colour pair." };
  }

  try {
    await getDb().speciality.update({
      where: { id: parsed.data.id },
      data: {
        name,
        primaryColor,
        textColor,
      },
    });
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "P2002") return { ok: false, error: "A speciality with this name already exists." };
    if (code === "P2025") return { ok: false, error: "Speciality not found." };
    return { ok: false, error: "Could not update speciality." };
  }

  revalidatePath("/admin/specialities");
  return { ok: true };
}

export async function deleteSpecialityAction(formData: FormData): Promise<SpecialityActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized." };

  const idRaw = formData.get("id");
  const id = typeof idRaw === "string" ? idRaw.trim() : "";
  if (!id) return { ok: false, error: "Missing id." };

  const row = await getDb().speciality.findUnique({
    where: { id },
    select: { _count: { select: { artists: true } } },
  });
  if (!row) return { ok: false, error: "Not found." };
  if (row._count.artists > 0) {
    return { ok: false, error: "Cannot delete: artists still use this speciality." };
  }

  try {
    await getDb().speciality.delete({ where: { id } });
  } catch {
    return { ok: false, error: "Could not delete speciality." };
  }

  revalidatePath("/admin/specialities");
  return { ok: true };
}

const BulkIdsSchema = prismaStringIdArraySchema(100);

export type BulkDeleteSpecialitiesResult =
  | { ok: true; deleted: number; blocked: number }
  | { ok: false; error: string };

export async function deleteSpecialitiesBulkAction(ids: string[]): Promise<BulkDeleteSpecialitiesResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized." };

  const parsed = BulkIdsSchema.safeParse(ids);
  if (!parsed.success) {
    return { ok: false, error: "Invalid id list." };
  }

  const unique = [...new Set(parsed.data)];
  let deleted = 0;
  let blocked = 0;

  for (const id of unique) {
    const row = await getDb().speciality.findUnique({
      where: { id },
      select: { _count: { select: { artists: true } } },
    });
    if (!row) continue;
    if (row._count.artists > 0) {
      blocked += 1;
      continue;
    }
    try {
      await getDb().speciality.delete({ where: { id } });
      deleted += 1;
    } catch {
      blocked += 1;
    }
  }

  revalidatePath("/admin/specialities");
  return { ok: true, deleted, blocked };
}
