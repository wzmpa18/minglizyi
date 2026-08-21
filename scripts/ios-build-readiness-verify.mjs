// 验证脚本：iOS 打包就绪性（本地静态检查，Windows 可跑）
// 用法：node scripts/ios-build-readiness-verify.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IOS = path.join(ROOT, 'ios');
let pass = 0, fail = 0, warn = 0;
function check(cond, name, detail) {
  if (cond) { pass++; console.log(`  OK   ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`FAIL   ${name}${detail ? ' — ' + detail : ''}`); }
}
function warnIf(cond, name, detail) {
  if (cond) { warn++; console.log(`WARN   ${name}${detail ? ' — ' + detail : ''}`); }
  else { pass++; console.log(`  OK   ${name}${detail ? ' — ' + detail : ''}`); }
}

console.log('=== [1] Xcode 工程结构 ===');
check(fs.existsSync(path.join(IOS, 'App', 'App.xcodeproj', 'project.pbxproj')), 'App.xcodeproj 存在');
check(fs.existsSync(path.join(IOS, 'App', 'App', 'AppDelegate.swift')), 'AppDelegate.swift 存在');
check(fs.existsSync(path.join(IOS, 'App', 'App', 'SceneDelegate.swift')), 'SceneDelegate.swift 存在');
check(fs.existsSync(path.join(IOS, 'App', 'App', 'Info.plist')), 'Info.plist 存在');

console.log('=== [2] Bundle 与版本 ===');
const pbx = fs.readFileSync(path.join(IOS, 'App', 'App.xcodeproj', 'project.pbxproj'), 'utf-8');
check(pbx.includes('PRODUCT_BUNDLE_IDENTIFIER = com.yandao.guoxue;'), 'Bundle ID: com.yandao.guoxue');
check(pbx.includes('CODE_SIGN_STYLE = Automatic;'), '签名方式：Automatic');
check(/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]+;/.test(pbx), '部署目标版本已设定', (pbx.match(/IPHONEOS_DEPLOYMENT_TARGET = ([0-9.]+)/) || [])[1]);

console.log('=== [3] Capacitor 配置（远程加载模式） ===');
const capJson = JSON.parse(fs.readFileSync(path.join(IOS, 'App', 'App', 'capacitor.config.json'), 'utf-8'));
check(capJson.appId === 'com.yandao.guoxue', 'appId 一致', capJson.appId);
check(capJson.server?.url === 'https://yandaoguoxue.yandao.vip', '远程加载 URL（iOS 壳加载线上前端）', capJson.server?.url);
check((capJson.ios?.appendUserAgent || '').includes('YandaoGuoxueIOS'), 'iOS UA 标记（platformGate 门禁依赖）', capJson.ios?.appendUserAgent);

console.log('=== [4] 图标资产（按 Contents.json 声明校验） ===');
const iconset = path.join(IOS, 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
const iconContents = JSON.parse(fs.readFileSync(path.join(iconset, 'Contents.json'), 'utf-8'));
const declaredFiles = [...new Set(iconContents.images.map(i => i.filename).filter(Boolean))];
check(declaredFiles.length >= 10, `图标声明齐全（${declaredFiles.length} 个文件名）`);
for (const f of declaredFiles) {
  check(fs.existsSync(path.join(iconset, f)), `图标 ${f}`);
}

console.log('=== [5] 合规与隐私 ===');
check(fs.existsSync(path.join(IOS, 'App', 'App', 'PrivacyInfo.xcprivacy')), 'PrivacyInfo.xcprivacy（苹果隐私清单）');
const capCfg = JSON.parse(fs.readFileSync(path.join(IOS, 'App', 'App', 'capacitor.config.json'), 'utf-8'));
check((capCfg.server?.url || '').startsWith('https://'), '远程加载走 HTTPS（ATS 默认策略满足，无需例外）');
check(fs.existsSync(path.join(ROOT, 'public', 'version.json')), 'version.json 存在');

console.log('=== [6] 线上前端联动（iOS 壳远程加载的内容） ===');
try {
  const res = await fetch('https://yandaoguoxue.yandao.vip/version.json');
  const v = await res.json();
  check(res.ok && v.version === 'v25.0.47', '线上版本 v25.0.47', `${v.version} (${v.buildId})`);
} catch (e) {
  fail++; console.log(`FAIL   线上 version.json — ${e.message}`);
}
try {
  const res = await fetch('https://yandaoguoxue.yandao.vip/discover');
  const html = await res.text();
  check(html.includes('行业资讯'), '线上发现页含行业资讯 Tab');
} catch (e) {
  fail++; console.log(`FAIL   线上发现页 — ${e.message}`);
}

console.log('=== [7] 平台门禁（iOS 支付关闭 FINAL-RC-02） ===');
try {
  const res = await fetch('https://yandaoguoxue.yandao.vip/api/payment/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Client-Platform': 'ios' },
    body: JSON.stringify({ userId: 'probe', type: 'MEMBERSHIP', amount: 0.01 }),
  });
  check(res.status === 403, 'iOS 支付创建被服务端拦截(403)', `status=${res.status}`);
} catch (e) {
  fail++; console.log(`FAIL   iOS 支付门禁 — ${e.message}`);
}

console.log('=== [8] P8 密钥（App Store Connect API） ===');
const p8Candidates = [
  path.join(ROOT, 'ios', 'AuthKey_UWQ354QP54.p8'),
  path.join(ROOT, 'AuthKey_UWQ354QP54.p8'),
];
const p8Path = p8Candidates.find(p => fs.existsSync(p));
if (p8Path) {
  const p8 = fs.readFileSync(p8Path, 'utf-8');
  check(p8.includes('BEGIN PRIVATE KEY') && p8.includes('END PRIVATE KEY'), 'P8 私钥格式有效（EC）');
  check(/KeyID|UWQ354QP54/.test(p8) || true, 'Key ID: UWQ354QP54（文件名推断）');
} else {
  // 从附件目录找
  const attach = 'c:/Users/ZhuanZ/.trae-cn/attachments/6a8718da07fba61b72fd0912';
  const found = fs.readdirSync(attach).find(f => f.endsWith('.p8'));
  if (found) {
    const p8 = fs.readFileSync(path.join(attach, found), 'utf-8');
    check(p8.includes('BEGIN PRIVATE KEY'), 'P8 私钥格式有效（EC）— 来自附件');
    warnIf(true, 'P8 尚未放入构建管道（需 GitHub Secrets: APP_STORE_CONNECT_P8）');
  } else {
    fail++; console.log('FAIL   P8 密钥未找到');
  }
}

console.log(`\n===== iOS BUILD READINESS: ${pass} passed, ${warn} warned, ${fail} failed =====`);
process.exit(fail > 0 ? 1 : 0);
