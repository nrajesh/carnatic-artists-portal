import type { NextRequest } from "next/server";
import { normalizeSpecialityLabel } from "@/lib/speciality-catalog";

export const REGISTRATION_APPROVE_DEFAULT_COMMENT = "Approved";

const MAX_COMMENT_LEN = 2000;
const MAX_SPECIALITY_LABEL_LEN = 80;
const MAX_SPECIALITIES = 3;

export type ParsedReviewComment =
  | { ok: true; comment: string }
  | { ok: false; error: string; status: number };

export type ParsedRegistrationApprovalPayload =
  | { ok: true; comment: string; specialities?: string[] }
  | { ok: false; error: string; status: number };

export type ParsedRegistrationSpecialitiesPayload =
  | { ok: true; specialities: string[] }
  | { ok: false; error: string; status: number };

function parseApprovalSpecialityOverride(
  raw: unknown,
): string[] | undefined | "INVALID_SPECIALITIES" {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) return "INVALID_SPECIALITIES";

  const seen = new Set<string>();
  const specialities: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") return "INVALID_SPECIALITIES";
    const label = normalizeSpecialityLabel(item);
    if (label.length < 2 || label.length > MAX_SPECIALITY_LABEL_LEN) {
      return "INVALID_SPECIALITIES";
    }
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    specialities.push(label);
  }

  if (specialities.length < 1 || specialities.length > MAX_SPECIALITIES) {
    return "INVALID_SPECIALITIES";
  }

  return specialities;
}

function parseApproveComment(raw: unknown): ParsedReviewComment {
  const commentValue = typeof raw === "string" ? raw : "";
  const trimmed = commentValue.trim();
  if (trimmed.length > MAX_COMMENT_LEN) {
    return { ok: false, error: "COMMENT_TOO_LONG", status: 400 };
  }
  return { ok: true, comment: trimmed || REGISTRATION_APPROVE_DEFAULT_COMMENT };
}

/**
 * Reads approval form/JSON payload in one body pass. `specialities` is optional for API backwards
 * compatibility; when present, it replaces the registration speciality list before artist creation.
 */
export async function parseRegistrationApprovalPayload(
  request: NextRequest,
): Promise<ParsedRegistrationApprovalPayload> {
  const ct = (request.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("application/json")) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return { ok: false, error: "INVALID_JSON", status: 400 };
    }

    const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const comment = parseApproveComment(data.comment);
    if (!comment.ok) return comment;

    const hasSpecialities = Object.prototype.hasOwnProperty.call(data, "specialities");
    const specialities = parseApprovalSpecialityOverride(
      hasSpecialities ? data.specialities : undefined,
    );
    if (specialities === "INVALID_SPECIALITIES") {
      return { ok: false, error: "INVALID_SPECIALITIES", status: 400 };
    }
    return { ok: true, comment: comment.comment, ...(specialities ? { specialities } : {}) };
  }

  let fd: FormData;
  try {
    fd = await request.formData();
  } catch {
    return { ok: false, error: "INVALID_FORM", status: 400 };
  }

  const comment = parseApproveComment(fd.get("comment"));
  if (!comment.ok) return comment;

  const hasSpecialities = fd.get("specialities_present") === "1";
  const specialities = parseApprovalSpecialityOverride(
    hasSpecialities ? fd.getAll("specialities") : undefined,
  );
  if (specialities === "INVALID_SPECIALITIES") {
    return { ok: false, error: "INVALID_SPECIALITIES", status: 400 };
  }
  return { ok: true, comment: comment.comment, ...(specialities ? { specialities } : {}) };
}

export async function parseRegistrationSpecialitiesPayload(
  request: NextRequest,
): Promise<ParsedRegistrationSpecialitiesPayload> {
  const ct = (request.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("application/json")) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return { ok: false, error: "INVALID_JSON", status: 400 };
    }

    const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const specialities = parseApprovalSpecialityOverride(data.specialities);
    if (specialities === undefined || specialities === "INVALID_SPECIALITIES") {
      return { ok: false, error: "INVALID_SPECIALITIES", status: 400 };
    }
    return { ok: true, specialities };
  }

  let fd: FormData;
  try {
    fd = await request.formData();
  } catch {
    return { ok: false, error: "INVALID_FORM", status: 400 };
  }

  const specialities = parseApprovalSpecialityOverride(fd.getAll("specialities"));
  if (specialities === undefined || specialities === "INVALID_SPECIALITIES") {
    return { ok: false, error: "INVALID_SPECIALITIES", status: 400 };
  }
  return { ok: true, specialities };
}

/**
 * Reads `comment` from JSON body or form (registration approve/reject).
 * Reject: non-empty after trim. Approve: empty → {@link REGISTRATION_APPROVE_DEFAULT_COMMENT}.
 */
export async function parseRegistrationReviewComment(
  request: NextRequest,
  mode: "approve" | "reject",
): Promise<ParsedReviewComment> {
  const ct = (request.headers.get("content-type") ?? "").toLowerCase();
  let raw = "";
  if (ct.includes("application/json")) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return { ok: false, error: "INVALID_JSON", status: 400 };
    }
    const c = (body as { comment?: unknown }).comment;
    raw = typeof c === "string" ? c : "";
  } else {
    let fd: FormData;
    try {
      fd = await request.formData();
    } catch {
      return { ok: false, error: "INVALID_FORM", status: 400 };
    }
    raw = (fd.get("comment") as string | null) ?? "";
  }

  const trimmed = raw.trim();
  if (trimmed.length > MAX_COMMENT_LEN) {
    return { ok: false, error: "COMMENT_TOO_LONG", status: 400 };
  }
  if (mode === "reject" && !trimmed) {
    return { ok: false, error: "COMMENT_REQUIRED", status: 400 };
  }
  const comment = mode === "approve" ? trimmed || REGISTRATION_APPROVE_DEFAULT_COMMENT : trimmed;
  return { ok: true, comment };
}

export type ParsedAmendReviewComment =
  | { ok: true; comment: string | null }
  | { ok: false; error: string; status: number };

/**
 * Reads `comment` from JSON or form for updating stored `reviewComment` after approve/reject.
 * Empty after trim → `null` (clear stored note). Non-empty → trimmed text.
 */
export async function parseAmendRegistrationReviewComment(
  request: NextRequest,
): Promise<ParsedAmendReviewComment> {
  const ct = (request.headers.get("content-type") ?? "").toLowerCase();
  let raw = "";
  if (ct.includes("application/json")) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return { ok: false, error: "INVALID_JSON", status: 400 };
    }
    const c = (body as { comment?: unknown }).comment;
    raw = typeof c === "string" ? c : "";
  } else {
    let fd: FormData;
    try {
      fd = await request.formData();
    } catch {
      return { ok: false, error: "INVALID_FORM", status: 400 };
    }
    raw = (fd.get("comment") as string | null) ?? "";
  }

  const trimmed = raw.trim();
  if (trimmed.length > MAX_COMMENT_LEN) {
    return { ok: false, error: "COMMENT_TOO_LONG", status: 400 };
  }
  return { ok: true, comment: trimmed.length === 0 ? null : trimmed };
}
