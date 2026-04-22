import type { NextRequest } from "next/server";

/**
 * Whether `Set-Cookie` should use `Secure` so it matches what the browser actually used.
 * Behind proxies (e.g. Cloudflare → OpenNext), `nextUrl.protocol` can be `http:` while the
 * client is on HTTPS — then clearing a Secure cookie fails unless we honour `x-forwarded-proto`.
 */
export function requestIsHttpsForCookies(request: NextRequest): boolean {
  if (request.nextUrl.protocol === "https:") return true;
  const xfp = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  return xfp === "https";
}
