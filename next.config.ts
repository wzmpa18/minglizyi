import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  assetPrefix: "/",
  typescript: {
    ignoreBuildErrors: true,
  },
  generateBuildId: () => `v21.3_records_sync_0811`,
};

export default nextConfig;