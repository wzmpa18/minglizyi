import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

function readBuildId(): string {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "public", "version.json"), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.buildId === "string" && parsed.buildId) return parsed.buildId;
  } catch { /* prebuild 未执行时兜底 */ }
  const now = new Date();
  const d = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `dev_D${d}`;
}

const BUILD_ID = readBuildId();

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
  generateBuildId: () => BUILD_ID,
  // 本机构建内存受限（可用 ~3GB），静态页生成并发过高会 Zone OOM
  experimental: {
    // Windows 打包机内存紧张时，多 worker 会在静态页生成阶段被系统直接终止。
    // 单 worker 稍慢，但能稳定完成正式包构建。
    cpus: 1,
    turbopackMemoryLimit: 2048,
  },
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
};

export default nextConfig;
