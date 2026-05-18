"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { verifySession } from "@/lib/session-jwt";

export async function markAllDashboardNotificationsReadAction(): Promise<{
  ok: true;
} | {
  ok: false;
  error: string;
}> {
  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session) return { ok: false, error: "Please sign in again." };

  await getDb().notification.updateMany({
    where: {
      artistId: session.artistId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/profile/notifications");
  return { ok: true };
}
