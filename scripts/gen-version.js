const fs = require("fs");
const path = require("path");

// 单一事实源：package.json 的 version 字段（形如 "v25.0.34"）。
// 发版仅需改 package.json 一处，本脚本在构建时自动生成 public/version.json，杜绝硬编码旧版本复发。
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
const VERSION = String(pkg.version || "").trim();
if (!/^v\d+\.\d+\.\d+$/.test(VERSION)) {
  console.error("FATAL: package.json version 必须形如 v25.0.34，当前为: " + JSON.stringify(pkg.version));
  process.exit(1);
}

const now = new Date();
const d = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
const buildId = `${VERSION}_D${d}`;

const payload = {
  buildId,
  version: VERSION,
  builtAt: now.toISOString(),
};

const outPath = path.join(__dirname, "..", "public", "version.json");
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log("BUILD_ID=" + buildId);
