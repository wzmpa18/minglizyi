'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

assert.equal(process.env.NEXT_PUBLIC_STORE_CHANNEL, 'huawei', 'Run this gate only on the Huawei export');
const root = path.resolve(__dirname, '..', 'out');
const routes = [
  'bazi', 'ziwei', 'daliuren', 'hehun', 'xuankong-feixing', 'meihua',
  'astro', 'tarot', 'name', 'qiming', 'phone', 'carplate', 'zeri', 'qizheng', 'ai',
];
const forbidden = [
  '开通AI解读', '单次解锁完整解读', 'AI学习解读',
  'AI 星盘深度解读', 'AI 深度择日分析', 'AI 深度牌阵解读',
  'AI 定制起名', '增值服务 ¥', '按次付费', '单次付费',
  '单号码分析 ¥9.9', '批量合号选号 ¥198',
];

for (const route of routes) {
  const file = path.join(root, 'yixue', route, 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  assert.ok(html.includes('<title>'), `${route}: page not exported`);
  for (const text of forbidden) assert.ok(!html.includes(text), `${route}: paid chart AI still rendered: ${text}`);
}
for (const route of ['bazi', 'ziwei', 'daliuren', 'hehun']) {
  const html = fs.readFileSync(path.join(root, 'yixue', route, 'index.html'), 'utf8');
  assert.ok(html.includes('排盘'), `${route}: core chart page missing`);
}
for (const route of ['zhongyi/classic', 'academy/wrong-book']) {
  assert.ok(fs.existsSync(path.join(root, route, 'index.html')), `${route}: learning page missing`);
}
console.log(`PASS: ${routes.length} Huawei chart pages exclude paid AI; core charts and learning routes remain.`);
