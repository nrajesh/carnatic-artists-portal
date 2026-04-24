/**
 * Normalizes registration form URL fragments and validates phone-style contact numbers.
 * Used by the public registration form and POST /api/registrations (server must re-validate).
 */

const HTTPS = "https://";

/** Shown as the fixed prefix for generic HTTPS fields (websites, image URLs). */
export const REGISTRATION_HTTPS_PREFIX = HTTPS;

export function normalizeHttpsUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^http:\/\//i.test(t)) return `https://${t.slice(7)}`;
  if (/^https:\/\//i.test(t)) return t;
  return `${HTTPS}${t.replace(/^\/+/, "")}`;
}

/** `https://` + rest; empty rest → "". */
export function mergeWebsitePath(rest: string): string {
  const s = rest.trim();
  if (!s) return "";
  return normalizeHttpsUrl(s);
}

export function websitePathSuffixFromStored(stored: string): string {
  const t = stored.trim();
  if (!t) return "";
  if (/^https:\/\//i.test(t)) return t.slice(HTTPS.length);
  if (/^http:\/\//i.test(t)) return t.slice("http://".length);
  return t;
}

export const REGISTRATION_LINKEDIN_PREFIX = "https://www.linkedin.com/in/";
export const REGISTRATION_INSTAGRAM_PREFIX = "https://www.instagram.com/";
export const REGISTRATION_FACEBOOK_PREFIX = "https://www.facebook.com/";
export const REGISTRATION_TWITTER_PREFIX = "https://x.com/";
export const REGISTRATION_YOUTUBE_PREFIX = "https://www.youtube.com/";

const LINKEDIN_IN = REGISTRATION_LINKEDIN_PREFIX;
const INSTAGRAM = REGISTRATION_INSTAGRAM_PREFIX;
const FACEBOOK = REGISTRATION_FACEBOOK_PREFIX;
const X = REGISTRATION_TWITTER_PREFIX;
const YOUTUBE = REGISTRATION_YOUTUBE_PREFIX;

function parseHttpUrl(raw: string): URL | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    return new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
  } catch {
    return null;
  }
}

export function linkedinSuffixFromStored(stored: string): string {
  const t = stored.trim();
  if (!t) return "";
  const u = parseHttpUrl(t);
  if (u && /linkedin\.com$/i.test(u.hostname.replace(/^www\./, ""))) {
    const m = u.pathname.match(/\/in\/([^/]+)/i);
    if (m?.[1]) return decodeURIComponent(m[1]);
    return u.pathname.replace(/^\//, "").replace(/^in\/?/i, "") || t;
  }
  return t.replace(/^@+/, "").replace(/^\/+|\/+$/g, "");
}

export function mergeLinkedinUrl(suffix: string): string {
  const s = suffix.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return normalizeHttpsUrl(s);
  if (/linkedin\.com/i.test(s)) return normalizeHttpsUrl(s);
  const slug = s.replace(/^@+/, "").replace(/^\/+|\/+$/g, "").split("/")[0];
  if (!slug) return "";
  return `${LINKEDIN_IN}${slug}`;
}

export function instagramSuffixFromStored(stored: string): string {
  const t = stored.trim();
  if (!t) return "";
  const u = parseHttpUrl(t);
  if (u && /instagram\.com$/i.test(u.hostname.replace(/^www\./, ""))) {
    const first = u.pathname.split("/").filter(Boolean)[0];
    return first ? decodeURIComponent(first) : t;
  }
  return t.replace(/^@+/, "").replace(/^\/+|\/+$/g, "");
}

export function mergeInstagramUrl(suffix: string): string {
  const s = suffix.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return normalizeHttpsUrl(s);
  if (/instagram\.com/i.test(s)) return normalizeHttpsUrl(s);
  const slug = s.replace(/^@+/, "").replace(/^\/+|\/+$/g, "").split("/")[0];
  if (!slug) return "";
  return `${INSTAGRAM}${slug}`;
}

export function facebookSuffixFromStored(stored: string): string {
  const t = stored.trim();
  if (!t) return "";
  const u = parseHttpUrl(t);
  if (u && /facebook\.com$/i.test(u.hostname.replace(/^www\./, ""))) {
    return (u.pathname + u.search).replace(/^\//, "");
  }
  return t.replace(/^\/+|\/+$/g, "");
}

export function mergeFacebookUrl(suffix: string): string {
  const s = suffix.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return normalizeHttpsUrl(s);
  if (/facebook\.com/i.test(s)) return normalizeHttpsUrl(s);
  return `${FACEBOOK}${s.replace(/^\/+/, "")}`;
}

export function twitterSuffixFromStored(stored: string): string {
  const t = stored.trim();
  if (!t) return "";
  const u = parseHttpUrl(t);
  if (u && /^(x|twitter)\.com$/i.test(u.hostname.replace(/^www\./, ""))) {
    return u.pathname.split("/").filter(Boolean)[0] || "";
  }
  return t.replace(/^@+/, "").replace(/^\/+|\/+$/g, "");
}

export function mergeTwitterUrl(suffix: string): string {
  const s = suffix.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return normalizeHttpsUrl(s);
  if (/(^|\.)twitter\.com|(^|\.)x\.com/i.test(s)) return normalizeHttpsUrl(s);
  const slug = s.replace(/^@+/, "").replace(/^\/+|\/+$/g, "").split("/")[0];
  if (!slug) return "";
  return `${X}${slug}`;
}

export function youtubeSuffixFromStored(stored: string): string {
  const t = stored.trim();
  if (!t) return "";
  const u = parseHttpUrl(t);
  if (!u) return t.replace(/^@+/, "").replace(/^\/+|\/+$/g, "");
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    return (u.pathname.replace(/^\//, "") + u.search).replace(/^\//, "") || t;
  }
  if (/youtube\.com$/i.test(host)) {
    return (u.pathname + u.search).replace(/^\//, "");
  }
  return t.replace(/^@+/, "").replace(/^\/+|\/+$/g, "");
}

export function mergeYoutubeUrl(suffix: string): string {
  const s = suffix.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return normalizeHttpsUrl(s);
  if (/youtu\.be|youtube\.com/i.test(s)) return normalizeHttpsUrl(s);
  return `${YOUTUBE}${s.replace(/^\/+/, "")}`;
}

/** Digits only, optional single leading + (international prefix). No spaces or other symbols. Max 15 digits. */
export function sanitizeContactNumberInput(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length > 15) digits = digits.slice(0, 15);
  const wantsPlus = /^\s*\+/.test(raw);
  if (!digits) return wantsPlus ? "+" : "";
  return wantsPlus ? `+${digits}` : digits;
}

export function isPlausibleContactNumber(s: string): boolean {
  const t = s.trim();
  if (!t || t === "+") return false;
  if (!/^\+?\d+$/.test(t)) return false;
  const digits = t.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}
