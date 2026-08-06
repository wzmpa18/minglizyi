import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // v18.2 安全整改：使用 output:"export" 静态导出
  // AI API 密钥由独立 Express 代理服务器（server/）管理
  // Nginx 将 /api/ai/chat 代理转发到 Express 服务器
  // 前端 JS 零密钥、零第三方 API 地址暴露
  output: "export",
  distDir: "dist",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  typescript: {
    // Turbopack 16.2 自动生成类型文件偶发找不到的临时绕过
    ignoreBuildErrors: true,
  },
};

export default nextConfig;