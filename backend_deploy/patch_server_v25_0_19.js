const fs = require("fs");

const p = "/www/yandaoguoxue-backend/server.js";
const s = fs.readFileSync(p, "utf8");

if (s.includes("socialApiRoutes")) {
  console.log("ALREADY_PATCHED");
  process.exit(0);
}

const anchor = "  { file: 'socialStorageRoutes', path: '/api/social', name: '社交存储' },";
if (!s.includes(anchor)) {
  console.log("PATTERN_NOT_FOUND");
  process.exit(1);
}

const replacement = [
  "  { file: 'socialApiRoutes', path: '/api/social', name: '社交API' },",
  "  { file: 'academyRoutes', path: '/api/academy', name: '言道学堂' },",
  anchor,
].join("\n");

fs.writeFileSync(p, s.replace(anchor, replacement, 1), "utf8");
console.log("PATCHED");
