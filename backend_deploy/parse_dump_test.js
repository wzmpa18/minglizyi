// 用三个真实dump验证修复4（函数从引擎原样复制）
const fs = require('fs');

function dumpParseFail() { }

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

function articleWordCount(a) {
  return (a.intro + ' ' + a.sections.map((x) => (x.paragraphs || [x.p || '']).join(' ')).join(' ') + ' ' + (a.takeaway || '')).replace(/\s/g, '').length;
}

const files = ['ai_fail_1.json', 'ai_fail_2.json', 'ai_fail_3.json'];
for (const f of files) {
  const raw = fs.readFileSync(`${process.env.TEMP}\\${f}`, 'utf8');
  try {
    const parsed = parseAIJson(raw);
    console.log(f, '=> PARSED OK | takeaway =', parsed.takeaway && parsed.takeaway.slice(0, 30) + '…', '| 字数 =', articleWordCount(parsed));
  } catch (e) { console.log(f, '=> FAIL:', e.message); }
}
