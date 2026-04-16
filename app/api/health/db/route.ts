import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * Minimal DB connectivity check for production debugging.
 * Open `/api/health/db` — 200 means Prisma reached Postgres; 503 means check
 * Worker **runtime** `DATABASE_URL`, Neon status, and `wrangler tail` logs.
 */
export async function GET() {
  try {
    await getDb().$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/health/db]", error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
