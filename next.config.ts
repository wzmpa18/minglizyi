import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  assetPrefix: "/",
  typescript: {
    ignoreBuildErrors: true,
  },
  generateBuildId: () => {
    const now = new Date();
    const d = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    return `v25.0.12_D${d}`;
  },
};

export default nextConfig;