/**
 * v25.0.24 正骨资料导入：15 部中华非遗正骨 md → materials 表
 * - 类目：中华非遗正骨（track=zhongyi，不存在则创建）
 * - 上传者：system_import（与 v25.0.21 资料导入约定一致）
 * - 指纹：materialHash 与 academyRoutes.js 完全一致（sha256('mat:'+去空白小写)）
 * - 幂等：按 title+content_hash 判重，重复导入跳过
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const D = require("better-sqlite3");

const SRC = "/root/zhenggu_materials";
const DB_PATH = "/www/yandaoguoxue-backend/data/academy.db";
const TRACK = "zhongyi";
const CATEGORY = "中华非遗正骨";

function sha256(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}
function materialHash(text) {
  const norm = String(text || "").replace(/\s+/g, "").toLowerCase();
  return sha256("mat:" + norm);
}

const d = new D(DB_PATH);
d.pragma("journal_mode = WAL");

// 1. 类目（幂等）
let cat = d.prepare("SELECT id FROM categories WHERE track=? AND name=?").get(TRACK, CATEGORY);
if (!cat) {
  const maxSort = d.prepare("SELECT COALESCE(MAX(sort),0) s FROM categories WHERE track=?").get(TRACK).s;
  const r = d.prepare("INSERT INTO categories (track, name, sort, status) VALUES (?,?,?,?)").run(TRACK, CATEGORY, maxSort + 1, "active");
  cat = { id: Number(r.lastInsertRowid) };
  console.log("[类目] 已创建: " + CATEGORY + " (id=" + cat.id + ")");
} else {
  console.log("[类目] 已存在: " + CATEGORY + " (id=" + cat.id + ")");
}

// 2. 逐文件导入
const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".md")).sort();
let inserted = 0, skipped = 0, dupContent = 0;
const ins = d.prepare(
  "INSERT INTO materials (title, track, category, format, file_path, text_content, grade, status, uploader_id, uploader_name, created_at, updated_at, content_hash) VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now','localtime'),datetime('now','localtime'),?)"
);
for (const f of files) {
  const text = fs.readFileSync(path.join(SRC, f), "utf8");
  const title = f.replace(/\.md$/, "");
  const h = materialHash(text);
  const existTitle = d.prepare("SELECT id FROM materials WHERE title=?").get(title);
  const existHash = d.prepare("SELECT id, title FROM materials WHERE content_hash=?").get(h);
  if (existTitle) { console.log("[跳过] 同名资料已存在 #" + existTitle.id + " " + title); skipped++; continue; }
  if (existHash) { console.log("[跳过] 同指纹资料已存在 #" + existHash.id + "《" + existHash.title + "》与 " + title); dupContent++; continue; }
  const r = ins.run(title, TRACK, CATEGORY, "text", "", text, "B", "pending", "system_import", "v25.0.24正骨导入", h);
  inserted++;
  console.log("[导入] #" + r.lastInsertRowid + " " + title + " (" + text.length + "字, hash=" + h.slice(0, 12) + ")");
}

console.log("==== 导入完成: 新增 " + inserted + " / 同名跳过 " + skipped + " / 同指纹跳过 " + dupContent + " ====");
const rows = d.prepare("SELECT id, title, LENGTH(text_content) len, status FROM materials WHERE category=? ORDER BY id").all(CATEGORY);
console.log(CATEGORY + " 类目资料总数: " + rows.length);
for (const row of rows) console.log("  #" + row.id + " " + row.title + " [" + row.len + "字/" + row.status + "]");
