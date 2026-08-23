import { validateCopySet } from "../src/lib/marketing/compliance";
import { VIRAL_TEMPLATES, SHARE_COPY_LIBRARY } from "../src/lib/marketing/viralTemplates";
import { generateAiPosterCopies } from "../src/lib/marketing/aiCopy";

let fail = 0;

function check(label: string, fields: string[]) {
  const r = validateCopySet(fields.filter(Boolean));
  if (!r.passed) {
    fail++;
    console.log(`❌ ${label} 不合规:`, r.violations.map((v) => `${v.category}:${v.word}`).join(", "));
  } else {
    console.log(`✅ ${label} 合规`);
  }
}

// 1. 三套固定模板文案
for (const t of VIRAL_TEMPLATES) {
  check(`模板[${t.name}]`, [
    t.copy.title,
    t.copy.subtitle,
    ...t.copy.sellingPoints,
    ...(t.copy.pointGroups?.flatMap((g) => [g.title, ...g.items]) ?? []),
    t.copy.cta,
    t.copy.benefitLine ?? "",
    t.copy.qrNote ?? "",
  ]);
}

// 2. 分场景分享文案库
for (const sc of SHARE_COPY_LIBRARY) {
  check(`分享文案[${sc.title}]`, [sc.text]);
}

// 3. AI兜底文案合规
async function main() {
const r = await generateAiPosterCopies(999);
console.log(r.usedFallback ? `（AI不可用，使用兜底：${r.error}）` : `AI返回 ${r.sets.length} 套`);
for (const s of r.sets) {
  check(`AI兜底[${s.styleName}]`, [s.title, s.subtitle, ...s.sellingPoints, s.momentsText, s.groupText]);
}

// 4. 标题长度/卖点条数结构校验
for (const t of VIRAL_TEMPLATES) {
  const points = t.copy.pointGroups?.flatMap((g) => g.items) ?? t.copy.sellingPoints;
  const okLen = t.copy.title.length <= 20 && t.copy.subtitle.length <= 40 && points.length >= 3 && points.length <= 6;
  if (!okLen) {
    fail++;
    console.log(`❌ 模板[${t.name}] 结构异常: title=${t.copy.title.length}字 subtitle=${t.copy.subtitle.length}字 points=${points.length}条`);
  } else {
    console.log(`✅ 模板[${t.name}] 结构OK: title=${t.copy.title.length}字 points=${points.length}条`);
  }
}

console.log(fail === 0 ? "\n全部通过 ✅" : `\n${fail} 项失败 ❌`);
process.exit(fail === 0 ? 0 : 1);
}

void main();
