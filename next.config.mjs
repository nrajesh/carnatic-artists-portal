/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Lint errors won't block production builds — run `npm run lint` separately
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type errors won't block builds during active development
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent webpack from bundling native Node.js modules used by
      // @neondatabase/serverless in server-side code
      config.externals = [...(config.externals ?? []), 'ws'];
    }
    return config;
  },
};

export default nextConfig;
