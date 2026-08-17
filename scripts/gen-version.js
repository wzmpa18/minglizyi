const fs = require("fs");
const path = require("path");

const VERSION = "v25.0.29";
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
