#!/usr/bin/env node
'use strict';

/**
 * 自动 Growth Pipeline（PHASE9 · DEV-SEO-GROWTH-ENGINE 流水线编排）
 *
 * 流程（一条命令跑完，幂等可重复）：
 *   [1] 生成 SEO 落地页（generateSeoPages.js → public/）
 *   [2] 质量门禁（seoQualityGate.js，FAIL 即中止，禁止推送）
 *   [3] 公网探测（抽查新 URL 是否已部署上线；未上线则跳过推送并提示先部署）
 *   [4] IndexNow 自动推送（必应/Yandex/Seznam/Naver 系）
 *   [5] 百度推送队列追加（去重；服务器端 baidu_daily_push.sh 每日 10 条自动推进）
 *   [6] 运行报告（Pipeline Run Report）
 *
 * 用法：
 *   node growthPipeline.cjs              # 全流程（含推送）
 *   node growthPipeline.cjs --no-push    # 只生成+门禁，不推送（构建期用）
 *
 * 夜间调度：
 *   服务器 cron：20 3 * * * cd /root/backend-auth/seo && node growthPipeline.cjs >> /root/backup/growth_pipeline.log 2>&1
 *   Windows 任务计划：schtasks /create /tn "GrowthPipeline" /tr "node C:\...\growthPipeline.cjs" /sc daily /st 03:20
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SEO_DIR = __dirname;
const CONFIG_PATH = path.join(SEO_DIR, 'seoPagesConfig.json');
const INDEXNOW_URLS = path.join(SEO_DIR, 'indexnow_urls_niche_tools.txt');
const BAIDU_QUEUE = path.join(SEO_DIR, 'baidu_push_queue.txt');

const HOST = 'yandaoguoxue.yandao.vip';
const INDEXNOW_KEY = '6adb2132052f4657a159f7302971f5c2';

const NO_PUSH = process.argv.includes('--no-push');
const t = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

const log = (msg) => console.log(`[${t()}] ${msg}`);

// ---------------------------------------------------------------------------
// [1] 生成 SEO 落地页
// ---------------------------------------------------------------------------
function stepGenerate() {
  log('STEP1 生成 SEO 落地页 ...');
  const out = execFileSync('node', [path.join(SEO_DIR, 'generateSeoPages.js')], {
    encoding: 'utf8',
    cwd: SEO_DIR,
  });
  const m = out.match(/DONE: (\d+) pages \+ (\d+) index pages/);
  if (!m) throw new Error('生成器输出异常：' + out.slice(-200));
  log(`STEP1 完成：${m[1]} 页 + ${m[2]} 索引页`);
  return { pages: Number(m[1]) };
}

// ---------------------------------------------------------------------------
// [2] 质量门禁
// ---------------------------------------------------------------------------
function stepQualityGate() {
  log('STEP2 质量门禁 ...');
  try {
    const out = execFileSync('node', [path.join(SEO_DIR, 'seoQualityGate.js')], {
      encoding: 'utf8',
      cwd: SEO_DIR,
    });
    const m = out.match(/RESULT: (\d+) PASS \/ (\d+) FAIL/);
    if (!m || Number(m[2]) !== 0) throw new Error('门禁未通过');
    log(`STEP2 通过：${m[1]} PASS / 0 FAIL`);
    return { gatePass: Number(m[1]) };
  } catch (e) {
    // seoQualityGate.js exit 1 时 execFileSync 抛出，stdout 在 e.stdout
    const out = String(e.stdout || '');
    const m = out.match(/RESULT: (\d+) PASS \/ (\d+) FAIL/);
    throw new Error(`质量门禁不通过（${m ? m[1] + ' PASS / ' + m[2] + ' FAIL' : '未知'}），禁止推送`);
  }
}

// ---------------------------------------------------------------------------
// [3] 公网探测（全量 GET + 内容指纹校验）
//     生产环境为 SPA fallback：任意路径都返回 200，HEAD 状态码不可信，
//     必须校验响应体包含页面特征词（h1）才算真正上线。
// ---------------------------------------------------------------------------
async function stepProbeLive(checks) {
  log(`STEP3 公网探测（全量 ${checks.length} 个 URL，GET+内容指纹）...`);
  const dead = [];
  for (const c of checks) {
    try {
      const res = await fetch(c.url, { method: 'GET', signal: AbortSignal.timeout(15000) });
      const text = await res.text();
      if (!res.ok) {
        dead.push(`${c.url} (HTTP ${res.status})`);
      } else if (!text.includes(c.mustInclude)) {
        dead.push(`${c.url} (200 但内容不含特征词「${c.mustInclude}」，疑为 SPA fallback)`);
      }
    } catch (e) {
      dead.push(`${c.url} (${e.name})`);
    }
  }
  if (dead.length === 0) {
    log(`STEP3 通过：${checks.length}/${checks.length} 全部真实在线`);
    return true;
  }
  log(`STEP3 未全部上线：${checks.length - dead.length}/${checks.length} 在线，未上线清单：`);
  dead.forEach((d) => log('  - ' + d));
  log('STEP3 结论：跳过推送，先完成部署再重跑（避免向搜索引擎提交 fallback 内容 URL）');
  return false;
}

// ---------------------------------------------------------------------------
// [4] IndexNow 自动推送
// ---------------------------------------------------------------------------
async function stepIndexNow(urls) {
  log(`STEP4 IndexNow 推送 ${urls.length} 个 URL ...`);
  const body = JSON.stringify({
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  });
  try {
    const res = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body,
      signal: AbortSignal.timeout(30000),
    });
    const text = await res.text();
    log(`STEP4 IndexNow HTTP ${res.status}${text ? ' ' + text : ''}`);
    if (res.status === 200 || res.status === 202) return { indexnow: res.status };
    return { indexnow: 'FAIL ' + res.status };
  } catch (e) {
    log(`STEP4 IndexNow 推送失败：${e.name}: ${e.message}`);
    return { indexnow: 'FAIL ' + e.name };
  }
}

// ---------------------------------------------------------------------------
// [5] 百度推送队列追加（去重）
// ---------------------------------------------------------------------------
function stepBaiduQueue(urls) {
  const existing = new Set(
    fs.readFileSync(BAIDU_QUEUE, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean)
  );
  const fresh = urls.filter((u) => !existing.has(u));
  if (fresh.length > 0) {
    fs.appendFileSync(BAIDU_QUEUE, fresh.join('\n') + '\n', 'utf8');
    log(`STEP5 百度队列追加 ${fresh.length} 条（服务器 baidu_daily_push.sh 每日 10 条自动推进）`);
    log('     注意：部署时同步 baidu_push_queue.txt 到服务器并重置指针可加快首推');
  } else {
    log('STEP5 百度队列无新增（全部已在队列）');
  }
  return { baiduQueueAdded: fresh.length };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
(async () => {
  log('=== Growth Pipeline 启动 ===');
  const report = {};

  const gen = stepGenerate();
  Object.assign(report, gen);

  const gate = stepQualityGate();
  Object.assign(report, gate);

  // 推送 URL 池：全部 SEO 落地页 + 4 个目录索引（sitemap 由搜索引擎自行抓取）
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const pageUrls = cfg.pages.map((p) => `${cfg.site.domain}/${p.file}`);
  const dirUrls = [...new Set(cfg.pages.map((p) => `${cfg.site.domain}/${p.dir}/`))];
  const allUrls = [...pageUrls, ...dirUrls];

  // 探测特征：页面 h1（唯一）；目录索引用 dirLabel（按 dir 去重）
  const dirMap = new Map();
  cfg.pages.forEach((p) => dirMap.set(p.dir, p.dirLabel));
  const checks = [
    ...cfg.pages.map((p) => ({ url: `${cfg.site.domain}/${p.file}`, mustInclude: p.h1 })),
    ...[...dirMap.entries()].map(([dir, label]) => ({
      url: `${cfg.site.domain}/${dir}/`,
      mustInclude: label,
    })),
  ];

  // 维护 IndexNow 清单文件（全量刷新，幂等）
  fs.writeFileSync(INDEXNOW_URLS, allUrls.join('\n') + '\n', 'utf8');

  if (NO_PUSH) {
    log('--no-push 模式：跳过公网探测与推送，仅生成+门禁');
    log('=== Pipeline 完成（未推送）===');
    console.log('\nPIPELINE REPORT:', JSON.stringify({ ...report, pushed: false }, null, 2));
    return;
  }

  const live = await stepProbeLive(checks);
  if (!live) {
    log('=== Pipeline 完成（页面未上线，未推送）===');
    console.log('\nPIPELINE REPORT:', JSON.stringify({ ...report, pushed: false, reason: 'not-deployed' }, null, 2));
    return;
  }

  const idx = await stepIndexNow(allUrls);
  Object.assign(report, idx);

  const baidu = stepBaiduQueue(allUrls);
  Object.assign(report, baidu);

  log('=== Pipeline 完成 ===');
  console.log('\nPIPELINE REPORT:', JSON.stringify({ ...report, pushed: true, totalUrls: allUrls.length }, null, 2));
})().catch((e) => {
  log('FATAL: ' + e.message);
  process.exit(1);
});
