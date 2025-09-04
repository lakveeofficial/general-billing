/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'], // Add your image domains here
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer, dev }) => {
    // Run ensure-seed script when starting the production server
    if (isServer && !dev) {
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = await originalEntry();
        if (entries['pages/_app']) {
          entries['pages/_app'].unshift('./scripts/ensure-seed.ts');
        }
        return entries;
      };
    }
    return config;
  },
};

module.exports = nextConfig;
