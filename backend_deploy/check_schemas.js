const D = require("better-sqlite3");
const d = new D("/www/yandaoguoxue-backend/data/academy.db");
for (const t of ["questions", "knowledge_points", "loc_op_logs"]) {
  const cols = d.prepare("PRAGMA table_info(" + t + ")").all().map((c) => c.name);
  console.log(t + ": " + cols.join(", "));
}
