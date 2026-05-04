import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // PostHog ingest uses trailing slashes (e.g. `/e/`); avoid Next redirecting those requests.
  // @see https://posthog.com/docs/advanced/proxy/nextjs
  skipTrailingSlashRedirect: true,
  // Required by @opennextjs/cloudflare to produce the server bundle under .next/standalone
  output: "standalone",
  // Prisma on Workers: keep generated client external so OpenNext can patch for workerd
  serverExternalPackages: ["@prisma/client", ".prisma/client", "cloudflare:workers"],
  typescript: {
    // Type errors won't block builds during active development
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_DEPLOYMENT_NAME: process.env.DEPLOYMENT_NAME ?? "",
    NEXT_PUBLIC_DEPLOYMENT_REGION: process.env.DEPLOYMENT_REGION ?? "",
    NEXT_PUBLIC_DEPLOYMENT_LOCALE_PRIMARY: process.env.DEPLOYMENT_LOCALE_PRIMARY ?? "en",
    NEXT_PUBLIC_DEPLOYMENT_LOCATION_LABEL_SINGULAR:
      process.env.DEPLOYMENT_LOCATION_LABEL_SINGULAR ?? "",
    NEXT_PUBLIC_DEPLOYMENT_LOCATION_LABEL_PLURAL:
      process.env.DEPLOYMENT_LOCATION_LABEL_PLURAL ?? "",
    NEXT_PUBLIC_DEPLOYMENT_LOCATION_OPTIONS: process.env.DEPLOYMENT_LOCATION_OPTIONS ?? "",
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent webpack from bundling native Node.js modules used by
      // @neondatabase/serverless in server-side code
      // cloudflare:workers is a virtual module at runtime on Workers only (R2 env in lib/storage.ts)
      config.externals = [...(config.externals ?? []), 'ws', 'cloudflare:workers'];
    }
    return config;
  },
};

initOpenNextCloudflareForDev();

export default nextConfig;
