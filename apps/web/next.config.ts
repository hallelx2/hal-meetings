import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@hal/ui', '@hal/design-tokens', '@hal/media', '@hal/db', '@hal/crypto'],
  experimental: {
    optimizePackageImports: ['motion'],
  },
};

export default nextConfig;
