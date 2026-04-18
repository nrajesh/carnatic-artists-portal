"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { verifySession } from "@/lib/session-jwt";
import { normalizeSpecialityLabel } from "@/lib/speciality-catalog";

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

  try {
    await getDb().speciality.create({
      data: {
        name,
        primaryColor: parsed.data.primaryColor,
        textColor: parsed.data.textColor,
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

  try {
    await getDb().speciality.update({
      where: { id: parsed.data.id },
      data: {
        name,
        primaryColor: parsed.data.primaryColor,
        textColor: parsed.data.textColor,
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
