import { cookies, headers } from "next/headers";
import { hasAnalyticsOptOutCookieFromStore } from "@/lib/analytics-opt-out-cookies";

function dntHeaderOptOut(value: string | null): boolean {
  if (value == null || value === "") return false;
  const s = value.trim().toLowerCase();
  return s === "1" || s === "yes" || s === "true";
}

function gpcHeaderOptOut(h: Headers): boolean {
  const v = (h.get("sec-gpc") ?? h.get("Sec-GPC") ?? "").trim();
  return v === "1";
}

/** Cookie-based opt-out only (what the /privacy “A” card should reflect). */
export async function getServerCookieAnalyticsOptOut(): Promise<boolean> {
  const cookieStore = await cookies();
  return hasAnalyticsOptOutCookieFromStore(cookieStore);
}

/** DNT / GPC for this request only (can differ from `document.cookie`; do not use for the “cookie is set” UI). */
export async function getServerPrivacySignalOptOut(): Promise<boolean> {
  const h = await headers();
  const dnt = h.get("dnt") ?? h.get("DNT");
  return dntHeaderOptOut(dnt) || gpcHeaderOptOut(h);
}

/** Full browser privacy signal for server-rendered copy (cookie OR DNT/GPC). */
export async function getServerAnalyticsOptOut(): Promise<boolean> {
  const [cookieStore, signal] = await Promise.all([
    cookies(),
    getServerPrivacySignalOptOut(),
  ]);
  return hasAnalyticsOptOutCookieFromStore(cookieStore) || signal;
}
