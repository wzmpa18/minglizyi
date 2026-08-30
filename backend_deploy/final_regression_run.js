// ============================================================================
// final_regression_run.js — FINAL-MASTER-05 第一百二十四~一百三十章 全量回归总Runner
//   顺序执行 backend_deploy 全部隔离 E2E（每文件独立进程 + 随机端口 + 临时 DB），
//   按章节归属汇总，输出最终回归矩阵。
//   运行：node backend_deploy/final_regression_run.js
// ============================================================================
'use strict';

const path = require('path');
const { spawn } = require('child_process');

const SUITE = [
  // [文件, 章节归属, 说明]
  ['object_storage_backup_e2e_test.js', '124/130', '对象存储+备份灾备（路径穿越/私有对象访问/三库备份/恢复演练/COS如实状态）'],
  ['provider_e2e_test.js', '124/125', 'Provider 引擎（订单归属 ownership/幂等/退款/账本隔离）'],
  ['commission_router_test.js', '124/125', '分佣路由（幂等/L1L2/退款冲销）'],
  ['partner_attribution_test.js', '125', 'Partner 归因/合同/改绑审计/结算快照/逐单透明账'],
  ['p8_commission_e2e_test.js', '125', 'P8 佣金（提现/冻结/解冻）'],
  ['ai_phase1_test.js', '124', 'AI 阶段1（额度/成本记账）'],
  ['algorithm_regression_test.js', '126', '易学算法回归（八字/紫微/奇门/六爻/梅花/大六壬/择日+真太阳时Golden）'],
  ['question_factory_e2e_test.js', '127', 'Question Factory（题库/考试/审核/去重/质量指标）'],
  ['social_rate_limit_e2e_test.js', '128', '社交限频+评论层级'],
  ['final_gap_regression_test.js', '124/127/128', '覆盖缺口补全（安全核心/Price SSOT/中医学习/社交全功能）'],
  ['offline_e2e_test.js', '129', 'Offline（Pack/Manifest/SHA256/幂等同步/ServerGC）'],
  ['dedup_e2e_test.js', '122', '统一登录去重'],
  ['admin_unified_modules_smoke_test.js', '121-123', '统一后台总控模块覆盖'],
];

function runOne(file) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(__dirname, file)], {
      cwd: __dirname,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    const t0 = Date.now();
    p.stdout.on('data', (d) => { out += d.toString(); });
    p.stderr.on('data', (d) => { out += d.toString(); });
    p.on('close', (code) => {
      // 提取 PASS=/FAIL= 汇总行（各测试统一格式）
      const lines = out.split('\n').filter((l) => /PASS\s*=\s*\d+|PASS\/\s*\d+\s*FAIL|\d+\s*PASS\s*\/\s*\d+\s*FAIL/i.test(l));
      const summary = lines.length ? lines[lines.length - 1].trim() : '(无汇总行)';
      resolve({ file, code, summary, ms: Date.now() - t0, tail: out.split('\n').filter(Boolean).slice(-8) });
    });
    p.on('error', (e) => resolve({ file, code: -1, summary: 'spawn失败: ' + e.message, ms: 0, tail: [] }));
  });
}

// 服务器目标脚本：硬编码 /www/ 或 /root/ 生产路径，本机（Windows）不可执行，如实归类
// 仅识别「无 env 覆盖的硬编码」：require('/www/…) 或 直接赋值 = "/root/…；
// isForbiddenPath('/www/…') 这类禁写保护测试参数、process.env.X || '/root/…' 可覆盖默认值均不算
function isServerTarget(file) {
  try {
    const fs = require('fs');
    const s = fs.readFileSync(path.join(__dirname, file), 'utf8');
    if (/require\(\s*['"`]\/(www|root)\//.test(s)) return true;
    const lines = s.split('\n').map((l) => l.trim());
    for (const l of lines) {
      if (/^(const|let|var)\s+\w+\s*=\s*['"`]\/(www|root)\//.test(l)) return true;
    }
    return false;
  } catch { return false; }
}

async function main() {
  console.log('=== FINAL-MASTER-05 第一百二十四~一百三十章 全量回归（隔离E2E顺序执行） ===\n');
  const results = [];
  for (const [file, ch, desc] of SUITE) {
    console.log(`\n[${ch}] ${file}`);
    console.log(`  ${desc}`);
    if (isServerTarget(file)) {
      console.log('  => SRV  服务器目标脚本（硬编码 /www/ /root/ 生产路径，须在部署服务器执行，本机如实跳过不计NG）');
      results.push({ file, ch, desc, code: 'SRV', summary: '服务器目标脚本（本机不可执行）', ms: 0, tail: [] });
      continue;
    }
    const r = await runOne(file);
    results.push({ ...r, ch, desc });
    const ok = r.code === 0;
    console.log(`  => ${ok ? 'PASS' : 'FAIL'} (exit=${r.code}, ${r.ms}ms)`);
    console.log(`  => ${r.summary}`);
    if (!ok) {
      console.log('  ---- 输出尾部 ----');
      for (const l of r.tail) console.log('  | ' + l.slice(0, 160));
    }
  }

  console.log('\n===================== 回归矩阵 =====================');
  let allOk = true;
  for (const r of results) {
    if (r.code === 'SRV') {
      console.log(`SRV [${String(r.ch).padEnd(8)}] ${(r.file + '                              ').slice(0, 38)} ${r.summary.slice(0, 60)}`);
      continue;
    }
    const ok = r.code === 0;
    if (!ok) allOk = false;
    console.log(`${ok ? 'OK ' : 'NG '} [${String(r.ch).padEnd(8)}] ${(r.file + '                              ').slice(0, 38)} ${r.summary.slice(0, 60)}`);
  }
  console.log('====================================================');
  console.log(allOk ? '全量回归：全部通过 ✅（SRV 项须部署后在服务器执行）' : '全量回归：存在失败项 ❌（见上方 NG 行）');
  process.exitCode = allOk ? 0 : 1;
}

main().catch((e) => {
  console.error('回归总Runner崩溃:', e);
  process.exitCode = 1;
});
