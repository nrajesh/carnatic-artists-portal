import type { Prisma } from "@prisma/client";

export type SuspensionMessageRole = "admin" | "artist";

export type SuspensionMessage = {
  role: SuspensionMessageRole;
  body: string;
  /** ISO 8601 */
  at: string;
};

function isSuspensionMessageRole(v: unknown): v is SuspensionMessageRole {
  return v === "admin" || v === "artist";
}

function parseMessagesFromUnknown(raw: unknown): SuspensionMessage[] {
  if (!raw || typeof raw !== "object") return [];
  const messages = (raw as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) return [];
  const out: SuspensionMessage[] = [];
  for (const m of messages) {
    if (!m || typeof m !== "object") continue;
    const rec = m as Record<string, unknown>;
    const role = rec.role;
    const body = rec.body;
    const at = rec.at;
    if (!isSuspensionMessageRole(role) || typeof body !== "string" || typeof at !== "string") continue;
    const trimmed = body.trim();
    if (!trimmed) continue;
    out.push({ role, body: trimmed, at });
  }
  return out;
}

/** Normalised messages from DB JSON, or [] if missing/invalid. */
export function parseSuspensionThreadJson(stored: Prisma.JsonValue | null | undefined): SuspensionMessage[] {
  if (stored === null || stored === undefined) return [];
  return parseMessagesFromUnknown(stored);
}

/**
 * Messages shown in UI: persisted thread, or a single admin bubble from legacy `suspensionComment`.
 */
export function resolveSuspensionMessages(row: {
  isSuspended: boolean;
  suspensionComment: string | null;
  suspensionThread: Prisma.JsonValue | null | undefined;
  updatedAt?: Date;
}): SuspensionMessage[] {
  const fromDb = parseSuspensionThreadJson(row.suspensionThread ?? null);
  if (fromDb.length > 0) return fromDb;
  const c = row.suspensionComment?.trim();
  if (row.isSuspended && c) {
    const at = row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString();
    return [{ role: "admin", body: c, at }];
  }
  return [];
}

export function suspensionThreadPayloadFromAdminNote(note: string, at = new Date().toISOString()): Prisma.InputJsonValue {
  const trimmed = note.trim();
  return {
    messages: [{ role: "admin", body: trimmed, at }],
  };
}

export function appendArtistMessage(
  current: SuspensionMessage[],
  body: string,
  at = new Date().toISOString(),
): Prisma.InputJsonValue {
  const trimmed = body.trim();
  const next: SuspensionMessage[] = [...current, { role: "artist", body: trimmed, at }];
  return { messages: next };
}
