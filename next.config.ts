import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { formats: ["image/avif", "image/webp"], qualities: [75, 90] },
  // three.js ecosystem ships ESM that Next should transpile for the client bundles
  transpilePackages: ["three"],
};

export default nextConfig;
