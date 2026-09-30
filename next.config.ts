import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // tesseract.js ships node-only shims; keep them out of the browser bundle.
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

export default nextConfig;
