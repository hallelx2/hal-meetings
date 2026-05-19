import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@hal/ui', '@hal/design-tokens'],
  experimental: {
    optimizePackageImports: ['motion'],
  },
};

export default nextConfig;
