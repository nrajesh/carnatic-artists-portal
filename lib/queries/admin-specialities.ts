import { getDb } from "@/lib/db";

export type AdminSpecialityRow = {
  id: string;
  name: string;
  primaryColor: string;
  textColor: string;
  artistCount: number;
};

export async function listSpecialitiesForAdmin(): Promise<AdminSpecialityRow[]> {
  const rows = await getDb().speciality.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      primaryColor: true,
      textColor: true,
      _count: {
        select: { artists: true },
      },
    },
  });

  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    primaryColor: s.primaryColor,
    textColor: s.textColor,
    artistCount: s._count.artists,
  }));
}
