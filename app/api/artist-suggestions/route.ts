import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session-jwt";

export async function GET(request: Request) {
  try {
    const token = (await cookies()).get("session")?.value ?? null;
    const session = token ? await verifySession(token) : null;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const db = getDb();
    const artists = await db.artist.findMany({
      where: {
        fullName: { contains: query, mode: "insensitive" },
        isSuspended: false,
        isSystemAccount: false,
      },
      select: {
        slug: true,
        fullName: true,
        province: true,
      },
      take: 8,
    });

    const suggestions = artists.map((a) => ({
      slug: a.slug,
      label: a.fullName,
      province: a.province,
    }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error fetching artist suggestions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
