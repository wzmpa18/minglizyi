const { getDb } = require('/www/yandaoguoxue-backend/wechatOaDb');
const db = getDb();
const PATTERNS = [
  [/《[^》]{2,12}》(?:卷[一二三四五六七八九十百零\d]+)?(?:中)?(?:明确)?(?:详细)?(?:等)?记载/g, '伪引文风险:据某书记载'],
  [/记[载录]载?[：:]/g, '记载:'],
  [/[某高校某大学某研究复旦北京上海某学院][^，。；]{0,14}(?:教授|研究|实验|学院|实验室)/g, '虚构机构人物'],
  [/研究表明/g, '研究表明'],
  [/\d+(?:\.\d+)?%/g, '百分比数据'],
  [/提升\d+|增长\d+|提高\d+/g, '提升N'],
  [/(?:唐|宋|明|清|现代|当代|哈佛|斯坦福|牛津|剑桥)[^，。；"]{0,10}(?:大学|学院)[^，。；"]{0,20}(?:指出|发现|表明|研究)/g, '机构背书'],
];
const rows = db.prepare("SELECT article_id, title FROM wechat_articles WHERE article_id IN (17,18,24,25,26) AND status != 'DELETED'").all();
for (const r of rows) {
  const a = db.prepare('SELECT content_html FROM wechat_articles WHERE article_id = ?').get(r.article_id);
  const text = a.content_html.replace(/<[^>]+>/g, '');
  console.log(`\n===== #${r.article_id} ${r.title} (纯文本${text.length}字) =====`);
  let found = 0;
  for (const [re, label] of PATTERNS) {
    const m = text.match(re);
    if (m) {
      found += m.length;
      for (const x of m.slice(0, 8)) {
        const idx = text.indexOf(x);
        const ctx = text.slice(Math.max(0, idx - 40), idx + x.length + 50).replace(/\s+/g, ' ');
        console.log(`[${label}] ...${ctx}...`);
      }
    }
  }
  if (!found) console.log('（无风险模式命中）');
}
