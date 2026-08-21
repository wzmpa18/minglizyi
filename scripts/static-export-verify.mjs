// 验证脚本：静态导出产物验证（HTML级 + chunk级，node scripts/static-export-verify.mjs）
import http from 'http';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve('out');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  let file = path.join(OUT, p);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(OUT, p, 'index.html');
  }
  if (!fs.existsSync(file)) {
    res.writeHead(404); res.end('NOT_FOUND'); return;
  }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

await new Promise(r => server.listen(0, r));
const BASE = `http://127.0.0.1:${server.address().port}`;

let pass = 0, fail = 0;
async function checkHtml(name, url, marker) {
  try {
    const res = await fetch(BASE + url);
    const text = res.ok ? await res.text() : '';
    const ok = res.status === 200 && (!marker || text.includes(marker));
    if (ok) { pass++; console.log(`  OK  ${name}`); }
    else { fail++; console.log(`FAIL  ${name} (status=${res.status}${marker ? `, marker「${marker}」${text.includes(marker) ? '命中' : '未命中'}` : ''})`); }
  } catch (e) {
    fail++; console.log(`FAIL  ${name} — ${e.message}`);
  }
}

// 客户端渲染功能 → 校验 JS chunks（静态导出后功能代码必然入包）
function checkChunk(name, marker) {
  const files = [];
  (function walk(d) {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) walk(p);
      else if (f.name.endsWith('.js')) files.push(p);
    }
  })(path.join(OUT, '_next'));
  const hit = files.some(f => {
    try { return fs.readFileSync(f, 'utf-8').includes(marker); } catch { return false; }
  });
  if (hit) { pass++; console.log(`  OK  ${name}`); }
  else { fail++; console.log(`FAIL  ${name} — chunk中未找到「${marker}」`); }
}

console.log('=== [1] 核心页面可达性（HTML 200） ===');
await checkHtml('首页', '/');
await checkHtml('发现页', '/discover');
await checkHtml('六爻页', '/yixue/liuyao');
await checkHtml('梅花页', '/yixue/meihua');
await checkHtml('群聊列表', '/groups');
await checkHtml('管理后台', '/admin');
await checkHtml('内容源管理页', '/admin/sources');

console.log('=== [2] HTML级功能标记（静态可渲染） ===');
await checkHtml('发现页含「行业资讯」Tab', '/discover', '行业资讯');

console.log('=== [3] Chunk级功能标记（客户端渲染） ===');
checkChunk('发现页资讯API调用', 'api/news/public');
checkChunk('资讯卡片来源标注', '来源：');
checkChunk('资讯卡片合规注释', '合规红线');
checkChunk('发现页资讯合规提示文案', '版权归原作者所有');
checkChunk('管理端导航「内容源管理」', '内容源管理');
checkChunk('管理端合规提示', '必须标注来源');
checkChunk('管理端新增/恢复按钮', '新增资讯');
checkChunk('六爻伏神渲染（琥珀色样式）', 'B45309');
checkChunk('伏神数据层（hiddenBranch）', 'hiddenBranch');

console.log('=== [4] 版本门禁 ===');
await checkHtml('version.json', '/version.json');
const v = JSON.parse(fs.readFileSync(path.join(OUT, 'version.json'), 'utf-8'));
if (v.version === 'v25.0.47') { pass++; console.log('  OK  版本号保持 v25.0.47'); }
else { fail++; console.log(`FAIL  版本号异常: ${v.version}`); }

server.close();
console.log(`\n===== STATIC REGRESSION: ${pass} passed, ${fail} failed =====`);
process.exit(fail > 0 ? 1 : 0);
