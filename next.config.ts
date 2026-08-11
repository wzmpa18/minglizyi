import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "export", // v20.5: 移除静态导出，支持动态API路由
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  assetPrefix: "/",
  typescript: {
    ignoreBuildErrors: true,
  },
  generateBuildId: () => `v20.5_poster_share_calibration_0811`,
};

export default nextConfig;