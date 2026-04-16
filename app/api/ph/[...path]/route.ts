/**
 * GET|POST|HEAD|OPTIONS|PUT|DELETE /api/ph/[...path]
 *
 * Reverse-proxy to PostHog (Cloud or self-hosted). Browser talks to same origin
 * `/api/ph/*`; we forward to POSTHOG_HOST with a correct `Host` header so
 * PostHog Cloud accepts ingestion (forwarding the Workers hostname breaks this).
 *
 * Requirements: 7.1–7.6
 */

import { NextRequest } from "next/server";

/** Headers safe to forward; Host is set to the PostHog hostname separately. */
function buildUpstreamHeaders(request: NextRequest, posthogHostname: string): Headers {
  const out = new Headers();
  const pass = [
    "content-type",
    "content-encoding",
    "accept",
    "accept-encoding",
    "accept-language",
    "user-agent",
    "cookie",
    "authorization",
    "referer",
    "origin",
  ];
  for (const name of pass) {
    const v = request.headers.get(name);
    if (v) out.set(name, v);
  }
  out.set("Host", posthogHostname);
  const xff = request.headers.get("x-forwarded-for") ?? request.headers.get("cf-connecting-ip");
  if (xff) out.set("X-Forwarded-For", xff);
  return out;
}

/**
 * PostHog Cloud serves `/static/*` and `/array/*` from the regional assets host,
 * not the main ingest API. See https://posthog.com/docs/advanced/proxy/nextjs
 */
function resolveUpstreamBase(posthogHost: string, targetPath: string): string {
  const base = posthogHost.replace(/\/$/, "");
  if (targetPath.startsWith("static/") || targetPath.startsWith("array/")) {
    if (base.includes("eu.i.posthog")) return "https://eu-assets.i.posthog.com";
    if (base.includes("us.i.posthog")) return "https://us-assets.i.posthog.com";
  }
  return base;
}

async function handler(
  request: NextRequest,
  { params }: { params: { path: string[] } },
): Promise<Response> {
  const posthogHost = process.env.POSTHOG_HOST?.replace(/\/$/, "");

  if (!posthogHost) {
    return Response.json({ error: "analytics unavailable" }, { status: 503 });
  }

  try {
    new URL(posthogHost);
  } catch {
    return Response.json({ error: "invalid POSTHOG_HOST" }, { status: 503 });
  }

  const targetPath = params.path.join("/");
  const { search } = new URL(request.url);
  const upstreamBase = resolveUpstreamBase(posthogHost, targetPath);
  const targetUrl = `${upstreamBase}/${targetPath}${search}`;

  let upstreamHostname: string;
  try {
    upstreamHostname = new URL(upstreamBase).hostname;
  } catch {
    return Response.json({ error: "invalid POSTHOG_HOST" }, { status: 503 });
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstreamHeaders = buildUpstreamHeaders(request, upstreamHostname);

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body: hasBody ? request.body : null,
      // @ts-expect-error duplex for streaming body
      duplex: "half",
    });

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: upstreamResponse.headers,
    });
  } catch {
    return Response.json({ error: "upstream unreachable" }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const HEAD = handler;
export const OPTIONS = handler;
export const PUT = handler;
export const DELETE = handler;
