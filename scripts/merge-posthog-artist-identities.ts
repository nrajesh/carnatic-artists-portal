/**
 * One-off operator script: merge PostHog persons after artist DB IDs were
 * normalized. Uses PostHog's documented `$merge_dangerously` event for existing
 * identified users where `alias()` would not be valid.
 *
 * Usage:
 *   npm run posthog:merge-artist-identities
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { POSTHOG_ARTIST_ID_MIGRATIONS } from "../lib/posthog-distinct-ids";
import { logSafeError } from "../lib/safe-log";

function loadEnvFiles(): void {
  for (const name of [".env.local", ".env"]) {
    const path = join(process.cwd(), name);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

function requiredPosthogConfig(): { host: string; key: string } {
  loadEnvFiles();
  const host = process.env.POSTHOG_HOST?.trim().replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!host || !key) {
    throw new Error("POSTHOG_HOST and NEXT_PUBLIC_POSTHOG_KEY must be set.");
  }
  return { host, key };
}

async function mergeOne(host: string, key: string, oldId: string, newId: string): Promise<void> {
  const response = await fetch(`${host}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      event: "$merge_dangerously",
      distinct_id: newId,
      properties: {
        alias: oldId,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `PostHog merge failed for ${oldId} -> ${newId}: ${response.status} ${response.statusText} ${body}`.trim(),
    );
  }
}

async function main() {
  const { host, key } = requiredPosthogConfig();
  if (POSTHOG_ARTIST_ID_MIGRATIONS.length === 0) {
    console.log("No PostHog artist identity migrations configured.");
    return;
  }

  for (const migration of POSTHOG_ARTIST_ID_MIGRATIONS) {
    await mergeOne(host, key, migration.oldId, migration.newId);
    console.log(`Merged PostHog identity ${migration.oldId} -> ${migration.newId}`);
  }
}

main().catch((error) => {
  logSafeError("[scripts/merge-posthog-artist-identities]", error);
  process.exit(1);
});
