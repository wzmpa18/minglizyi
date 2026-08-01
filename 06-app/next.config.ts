import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // P2-3终验：启用静态导出用于Nginx部署（云端API暂不启用，本地存储全功能可用）
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
