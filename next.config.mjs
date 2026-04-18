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
