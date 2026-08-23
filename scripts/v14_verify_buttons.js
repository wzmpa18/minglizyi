const fs = require("fs");
const base = "C:/Users/ZhuanZ/Projects/minglizyi/";
const checks = [
  ["注册页下载按钮", "src/app/register/page.tsx", "下载言道国学APP"],
  ["注册页a标签链接", "src/app/register/page.tsx", 'href="https://yandaoguoxue.yandao.vip/friend"'],
  ["注册页target空白页", "src/app/register/page.tsx", 'target="_blank"'],
  ["登录页下载按钮", "src/app/login/page.tsx", "下载言道国学APP"],
  ["登录页a标签链接", "src/app/login/page.tsx", 'href="https://yandaoguoxue.yandao.vip/friend"'],
  ["invite页3套模板", "src/app/invite/page.tsx", "VIRAL_TEMPLATES"],
  ["invite页完整海报保存", "src/app/invite/page.tsx", "handleSavePoster"],
  ["invite页系统分享", "src/app/invite/page.tsx", "handleSharePoster"],
  ["invite页文案库", "src/app/invite/page.tsx", "SHARE_COPY_LIBRARY"],
  ["poster页裂变推荐", "src/app/invite/poster/page.tsx", "buildViralRecs"],
  ["poster页文案库", "src/app/invite/poster/page.tsx", "SHARE_COPY_LIBRARY"],
  ["viralTemplates模板一", "src/lib/marketing/viralTemplates.ts", "藏在手机里的国学宝藏工具"],
  ["viralTemplates模板二", "src/lib/marketing/viralTemplates.ts", "免费！专业级国学工具App"],
  ["viralTemplates模板三", "src/lib/marketing/viralTemplates.ts", "你的随身国学学习助手"],
  ["文案①朋友圈长文", "src/lib/marketing/viralTemplates.ts", "最近挖到一个很良心的传统文化App"],
  ["文案②群聊短文", "src/lib/marketing/viralTemplates.ts", "给你分享个国学工具App"],
  ["文案③兴趣群", "src/lib/marketing/viralTemplates.ts", "推荐一个免费的国学工具"],
  ["文案④私发好友", "src/lib/marketing/viralTemplates.ts", "注册了我们都有奖励"],
  ["海报引擎4条卖点", "src/lib/marketing/posterEngine.ts", "slice(0, 4)"],
];
let pass = 0, fail = 0;
for (const [name, file, needle] of checks) {
  const ok = fs.readFileSync(base + file, "utf8").includes(needle);
  console.log((ok ? "PASS" : "FAIL") + "  " + name);
  ok ? pass++ : fail++;
}
console.log("\n合计: " + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
