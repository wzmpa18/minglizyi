// 查看公众号AI调用成本记录
const { getDb } = require('/www/yandaoguoxue-backend/wechatOaDb');
const db = getDb();
const rows = db.prepare("SELECT model, provider_id, tokens_in, tokens_out, estimated_cost, status, created_at FROM ai_call_logs WHERE scene='wechat_content' ORDER BY rowid DESC LIMIT 12").all();
for (const r of rows) console.log(JSON.stringify(r));
const tot = db.prepare("SELECT COUNT(*) n, COALESCE(SUM(estimated_cost),0) c FROM ai_call_logs WHERE scene='wechat_content' AND created_at >= date('now','localtime')").get();
console.log('TODAY:', JSON.stringify(tot));
