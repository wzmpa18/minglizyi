// 验证 parseAIJson 三层修复（不依赖DB，仅测函数）
const fs = require('fs');
const path = require('path');

function parseAIJson(text) {
  let t = String(text || '').trim();
  t = t.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  try {
    return JSON.parse(t);
  } catch (e) {
    const KNOWN_KEYS = 'titleCandidates|digest|intro|sections|takeaway|h|paragraphs';
    let repaired = t;
    repaired = repaired.replace(new RegExp(`"(${KNOWN_KEYS})"\\s*(?=["[{])`, 'g'), '"$1":');
    repaired = repaired.replace(new RegExp(`"(${KNOWN_KEYS})"\\s*：`, 'g'), '"$1":');
    repaired = repaired.replace(new RegExp(`"(${KNOWN_KEYS})\\s*："`, 'g'), '"$1": "');
    const CJK = '\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef';
    const reAfter = new RegExp(`([${CJK}])"(?![,:}\\]\\s]|$)`, 'g');
    const reBefore = new RegExp(`(?<![{\\[:,\\s])"([${CJK}])`, 'g');
    repaired = repaired.replace(reAfter, '$1\\u0022').replace(reBefore, '\\u0022$1');
    if (repaired !== t) {
      try { return JSON.parse(repaired); } catch (e2) { throw e2; }
    }
    throw e;
  }
}

// 案例1：缺冒号（key换行后顶格跟值）——本次实测故障
const c1 = `{
"titleCandidates": ["标题一","标题二"],
"digest": "摘要内容",
"intro": "开场白，从细节切入。",
"sections"
[
{"h": "小节一","paragraphs": ["段落甲","段落乙"]}
],
"takeaway": "一句话"
}`;

// 案例2：全角冒号
const c2 = `{
"a"："b"
}`;

// 案例3：未转义英文双引号
const c3 = `{"digest": "他说的"信达雅"三字", "intro": "开场", "sections": [{"h": "标题", "paragraphs": ["段"]}], "takeaway": "话"}`;

// 案例4：正常JSON不受修复影响
const c4 = `{"titleCandidates": ["t1"], "digest": "d", "intro": "i", "sections": [{"h": "h", "paragraphs": ["p1", "p2"]}], "takeaway": "t"}`;

for (const [name, s] of Object.entries({ c1, c2, c3, c4 })) {
  try {
    const r = parseAIJson(s);
    console.log(name, '=> PARSED, keys =', Object.keys(r).join(','));
  } catch (e) { console.log(name, '=> FAIL:', e.message); }
}
