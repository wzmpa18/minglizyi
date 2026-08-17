/**
 * P6-I-PLUS 规则4 Knowledge Hash E2E 验收测试：
 * 1) 复制资料#51（颈椎精讲）全文，以不同标题创建「指纹测试」资料
 * 2) 调用解析 → 期望：指纹命中资料#51，直接复用，AI 调用 0 次
 * 3) 验证 ai_call_logs 中 hash_dedup_reuse 记录 + tokens 0
 * 4) 测试完成后清理测试资料（保持生产库干净）
 */
const crypto = require("crypto");
const D = require("better-sqlite3");

const DB_PATH = "/www/yandaoguoxue-backend/data/academy.db";
function sha256(s) { return crypto.createHash("sha256").update(s, "utf8").digest("hex"); }
function materialHash(text) { return sha256("mat:" + String(text || "").replace(/\s+/g, "").toLowerCase()); }

const d = new D(DB_PATH);
d.pragma("journal_mode = WAL");

// 清理历史测试残留
d.prepare("DELETE FROM materials WHERE title LIKE '[指纹测试]%'").run();

// 步骤1：复制 #51 内容建测试资料
const src = d.prepare("SELECT id, title, text_content, content_hash FROM materials WHERE id=51").get();
console.log("[步骤1] 源资料: #" + src.id + "《" + src.title + "》 hash=" + src.content_hash.slice(0, 16) + " (" + src.text_content.length + "字)");
const TEST_TITLE = "[指纹测试]重复内容验证-" + Date.now();
const h = materialHash(src.text_content);
console.log("[步骤1] 测试资料指纹: " + h.slice(0, 16) + " 与源一致=" + (h === src.content_hash));
const ins = d.prepare(
  "INSERT INTO materials (title, track, category, format, file_path, text_content, grade, status, uploader_id, uploader_name, created_at, updated_at, content_hash) VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now','localtime'),datetime('now','localtime'),?)"
);
const r = ins.run(TEST_TITLE, "zhongyi", "中华非遗正骨", "text", "", src.text_content, "B", "pending", "system_import", "指纹测试", h);
const TEST_ID = Number(r.lastInsertRowid);
console.log("[步骤1] 测试资料已创建: #" + TEST_ID + "《" + TEST_TITLE + "》");
console.log("TEST_ID=" + TEST_ID);
