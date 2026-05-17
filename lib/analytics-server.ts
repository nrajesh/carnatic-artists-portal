/**
 * Lightweight PostHog server integration (fetch only) — avoids `posthog-node`,
 * which is too large for the Cloudflare Workers 3 MiB script limit.
 *
 * Usage at call sites — analytics errors must never propagate to callers:
 *
 *   try {
 *     analyticsServer?.capture({ distinctId: artistId, event: 'artist_login' })
 *   } catch {
 *     // Silently ignore analytics errors
 *   }
 */

type CaptureArgs = {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
};

export type AnalyticsServer = {
  capture: (args: CaptureArgs) => void;
  isFeatureEnabled: (key: string, distinctId: string) => Promise<boolean>;
  getFeatureFlagValue: (key: string, distinctId: string) => Promise<string | boolean | null>;
};

function getHostAndKey(): { host: string; key: string } | null {
  const host = process.env.POSTHOG_HOST?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!host || !key) return null;
  return { host, key };
}

function createAnalyticsServer(): AnalyticsServer | null {
  if (!getHostAndKey()) return null;

  return {
    capture(args: CaptureArgs) {
      const cfg = getHostAndKey();
      if (!cfg) return;
      const body = JSON.stringify({
        api_key: cfg.key,
        event: args.event,
        distinct_id: args.distinctId,
        properties: args.properties ?? {},
      });
      void fetch(`${cfg.host}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }).catch(() => {
        //
      });
    },

    async isFeatureEnabled(key: string, distinctId: string): Promise<boolean> {
      const raw = await this.getFeatureFlagValue(key, distinctId);
      return raw === true || raw === "true";
    },

    async getFeatureFlagValue(key: string, distinctId: string): Promise<string | boolean | null> {
      const cfg = getHostAndKey();
      if (!cfg) return false;
      try {
        const res = await fetch(`${cfg.host}/decide/?v=3`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: cfg.key,
            distinct_id: distinctId,
          }),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as {
          featureFlags?: Record<string, string | boolean>;
        };
        return data.featureFlags?.[key] ?? null;
      } catch {
        return null;
      }
    },
  };
}

export const analyticsServer: AnalyticsServer | null = createAnalyticsServer();

/**
 * No in-memory queue with fetch-only capture; kept for API compatibility.
 */
export async function shutdownAnalytics(): Promise<void> {
  //
}
