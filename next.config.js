/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // next dev and next build may run at the same time locally. Give development
  // its own artifacts so a build cannot remove the dev server's _document.js.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.tambayanslu.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
