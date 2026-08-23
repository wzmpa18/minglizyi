#!/usr/bin/env node
// v25.0.47_13 深度报告字数实测：从源码提取真实提示词 → 调公网 /api/ai/chat → 校验字数与五段式
'use strict';
const fs = require('fs');

const SRC = '/root/yandaoguoxue-source/src/lib/deepReportPrompt.ts';
const DOMAIN = 'https://yandaoguoxue.yandao.vip';

let ts;
try {
  ts = fs.readFileSync(SRC, 'utf-8');
} catch (e) {
  console.log('SKIP: 源码文件不存在', SRC);
  process.exit(0);
}

// TS → JS 轻量转换（仅针对本文件已知类型标注）
const js = ts
  .replace(/const CLASSIC_BOOKS_BY_TOOL: Array<\{ match: RegExp; books: string; note: string \}> =/, 'const CLASSIC_BOOKS_BY_TOOL =')
  .replace(/function getClassicBasis\(toolName: string\): string \{/, 'function getClassicBasis(toolName) {')
  .replace(/export function buildDeepReportSystemPrompt\(toolName: string, sceneHint\?: string\): string \{/, 'function buildDeepReportSystemPrompt(toolName, sceneHint) {')
  + '\nmodule.exports = { buildDeepReportSystemPrompt };\n';

fs.writeFileSync('/tmp/deepReportPrompt.js', js);
const { buildDeepReportSystemPrompt } = require('/tmp/deepReportPrompt.js');

const CASES = [
  { tool: '姓名测算', user: '姓名：林清和，性别：女，公历1993年8月16日早上7点出生，请解读姓名格局与人生方向。' },
  { tool: '手机号测算', user: '手机号：13824681357，机主男，1990年生，主要关注事业财运方面。' },
];

function analyze(content) {
  const len = content.replace(/\s/g, '').length;
  const sections = ['一、', '二、', '三、', '四、', '五、'].filter((s) => content.includes(s));
  return { len, sections: sections.length };
}

(async () => {
  for (const c of CASES) {
    try {
      const systemPrompt = buildDeepReportSystemPrompt(c.tool);
      const res = await fetch(`${DOMAIN}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          userPrompt: c.user,
          cacheKey: `verify-v13-${c.tool}-${Date.now()}`,
          forceRefresh: true,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        console.log(`  [${c.tool}] FAIL: ${data.error || 'HTTP ' + res.status}`);
        continue;
      }
      const { len, sections } = analyze(data.content);
      const lenOk = len >= 680 && len <= 1100;
      const structOk = sections === 5;
      console.log(`  [${c.tool}] 字数=${len}（目标700-1000） 五段式=${sections}/5 ${lenOk ? 'PASS' : 'FAIL'}${structOk ? '' : ' STRUCT-FAIL'}`);
    } catch (e) {
      console.log(`  [${c.tool}] ERROR: ${e.message}`);
    }
  }
})();
