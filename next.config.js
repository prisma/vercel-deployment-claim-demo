/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore the projects folder during build
  webpack: (config, { isServer }) => {
    // Ignore the projects folder
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/projects/**", "**/node_modules/**"],
    };

    return config;
  },

  // Also ignore in TypeScript compilation
  typescript: {
    ignoreBuildErrors: false,
  },

  // Ignore specific directories during build
  experimental: {
    outputFileTracingIgnores: ["projects/**/*"],
  },
};

module.exports = nextConfig;
