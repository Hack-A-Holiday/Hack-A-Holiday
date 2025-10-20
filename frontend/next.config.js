const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Exclude test files from build
  typescript: {
    // Don't type-check test files during build
    tsconfigPath: './tsconfig.json'
  },
  eslint: {
    // Disable ESLint during next build, we check separately
    ignoreDuringBuilds: false
  },
  // Next.js automatically loads .env from the project root.
};

module.exports = nextConfig;