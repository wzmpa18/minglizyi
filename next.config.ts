import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // 静态导出部署，构建时需使用 build.sh 临时移除API路由
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