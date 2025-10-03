/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: false, // Changed to false to avoid routing issues
  images: {
    unoptimized: true
  },
  async redirects() {
    return [
      // Redirect trailing slash to non-trailing slash for consistency
      {
        source: '/:path*/',
        destination: '/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;