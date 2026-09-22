// 6个批次选题的文章状态核查（字数/状态/钩子/医疗声明/系列前缀）
const { getDb } = require('/www/yandaoguoxue-backend/wechatOaDb');

const TOPICS = [
  ['易学研习②坤卦六爻：坤为地，读懂另一种节奏', '易学研习③，聊屯卦'],
  ['伤寒论研习②太阳病：外感第一课', '伤寒论研习③，读阳明病'],
  ['语言研习①玄奘的语言课：一千三百年前的外语学习法', '语言研习下一篇：汉字文化圈'],
  ['语言研习②汉字文化圈：汉字如何串起东亚两千年', '语言研习下一篇：严复的'],
  ['数字研习①河图洛书：中国人数字观念的原点', '数字研习下一篇'],
  ['数字研习②为学日益，为道日损：老子的数字断舍离', '数字研习下一篇'],
];

const db = getDb();
for (const [kw, hookKey] of TOPICS) {
  const t = db.prepare('SELECT topic_id FROM wechat_topic_candidates WHERE run_date = ? AND keyword = ?').get('2026-09-23', kw);
  if (!t) { console.log('NO_TOPIC: ' + kw); continue; }
  const rows = db.prepare('SELECT article_id, title, status, word_count, content_html FROM wechat_articles WHERE topic_id = ? AND status != ?').all(t.topic_id, 'DELETED');
  if (!rows.length) { console.log('NO_ARTICLE: ' + kw); continue; }
  for (const r of rows) {
    const hasHook = r.content_html.includes(hookKey);
    const hasMed = /就医|看医生|找医生|遵医嘱/.test(r.content_html);
    const tailCount = (r.content_html.match(/到时候，接着聊。/g) || []).length;
    console.log(`#${r.article_id} [${r.status}] ${r.word_count}字 钩子=${hasHook} 医疗=${hasMed} 尾巴数=${tailCount} | ${r.title}`);
  }
}
