/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: './',
  },
  experimental: {},
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
