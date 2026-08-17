const D = require("better-sqlite3");
const d = new D("/www/yandaoguoxue-backend/data/academy.db");

const matCols = d.prepare("PRAGMA table_info(materials)").all().map((x) => x.name);
const kpCols = d.prepare("PRAGMA table_info(knowledge_points)").all().map((x) => x.name);
const orgCols = d.prepare("PRAGMA table_info(organizations)").all().map((x) => x.name);

const idx = d
  .prepare("SELECT name FROM sqlite_master WHERE type='index'")
  .all()
  .map((x) => x.name)
  .filter((n) => n.indexOf("idx_") === 0);

const kpTotal = d.prepare("SELECT COUNT(*) n FROM knowledge_points").get().n;
const kpHashed = d.prepare("SELECT COUNT(*) n FROM knowledge_points WHERE content_hash IS NOT NULL AND content_hash != ''").get().n;
const matTotal = d.prepare("SELECT COUNT(*) n FROM materials").get().n;
const matHashed = d.prepare("SELECT COUNT(*) n FROM materials WHERE content_hash IS NOT NULL AND content_hash != ''").get().n;

const dupGroups = d
  .prepare("SELECT content_hash, COUNT(*) n FROM knowledge_points WHERE content_hash != '' GROUP BY content_hash HAVING n > 1 LIMIT 3")
  .all();

console.log("mat_has_content_hash=" + matCols.includes("content_hash"));
console.log("kp_has_content_hash=" + kpCols.includes("content_hash"));
console.log("org_has_org_type=" + orgCols.includes("org_type"));
console.log("indexes=" + idx.join(","));
console.log("kp_total=" + kpTotal + " kp_hashed=" + kpHashed);
console.log("mat_total=" + matTotal + " mat_hashed=" + matHashed);
console.log("dup_groups_sample=" + dupGroups.length);
