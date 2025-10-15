const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Load .env from root directory
  env: {
    envFilePath: path.join(__dirname, '..', '.env')
  }
};

module.exports = nextConfig;