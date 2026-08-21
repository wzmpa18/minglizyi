# 言道国学 · 最终交接文档（YANDAO_GUOXUE_HANDOVER_FINAL）

> 交接日期: 2026-08-21 | 生产版本: v25.0.47_3 | Git HEAD: 8dc5502
> 本文档面向接手开发者/项目方，10 分钟读完即可完全接管项目。
> 权威事实以 `PROJECT_MASTER_LEDGER.md` 为准（同仓库根目录）。

---

## 1. 项目是什么

**言道国学**：医易命理 APP（六爻/梅花/紫微/八字/奇门/大六壬 + 中医/医考 + 社交/学堂/推广）。
- **架构**：Next.js 静态导出（SPA）部署服务器；iOS/Android 为 Capacitor 壳**远程加载** `https://yandaoguoxue.yandao.vip`（前端更新无需重发 APP）。
- **入口**：Web https://yandaoguoxue.yandao.vip ｜ GitHub https://github.com/wzmpa18/minglizyi

## 2. 从零接管五步（已实测验证）

```bash
# ① 克隆
git clone https://github.com/wzmpa18/minglizyi.git && cd minglizyi
# ② 装依赖
npm ci
# ③ 构建（Next.js 静态导出 → out/）
npm run build
# ④ 验证（19 项静态回归）
node scripts/static-export-verify.mjs
# ⑤ 发布（见 PROJECT_MASTER_LEDGER.md 第六节运维手册）
```

**✅ 2026-08-21 实测**：fresh clone（8dc5502）→ npm ci exit 0 → build exit 0 → 19/19 验证通过 → 产物 1638 文件与线上 v25.0.47_3 完全一致。

## 3. 服务器接管（82.156.228.87）

| 项 | 值 |
|----|-----|
| 登录 | root（密钥 id_rsa_yandao / 密码见部署资料；工具 `scripts/ssh_exec.py`） |
| 前端 | /root/yandaoguoxue/releases/&lt;tag&gt;，current 软链即当前版 |
| 后端 | /www/yandaoguoxue-backend（PM2: yandaoguoxue-backend，3001 端口） |
| 数据 | PostgreSQL yandaoguoxue + SQLite（yandao_users.db / academy.db） |
| 备份 | 每日 02:00 自动（cron 已确认，恢复演练 integrity=ok） |
| 日志轮转 | /etc/logrotate.d/yandao-guoxue（已安装，daily×14 天压缩） |
| 回滚 | `ln -sfn /root/yandaoguoxue/releases/<旧版> /root/yandaoguoxue/current && nginx -s reload`（秒级） |

## 4. 移动端打包

### iOS —— 打包能力已验证 ✅
- 工程 `ios/App`，Bundle ID `com.yandao.guoxue`，自动签名，iOS 15+。
- 就绪校验 33 项全过：`node scripts/ios-build-readiness-verify.mjs`
- 云打包：GitHub Actions `ios-build.yml`（macos-14）。
  - 已实测 **ARCHIVE SUCCEEDED**，xcarchive 工件可下载。
  - P8 密钥（Key ID UWQ354QP54）已入 GitHub Secrets。
  - **出签名 ipa 只差一步**：在 GitHub 仓库 Settings → Secrets 补 `APP_STORE_CONNECT_ISSUER_ID`（App Store Connect → 用户和访问 → 集成 → 密钥页顶部），重跑 workflow 即得签名 ipa，可勾选直传 TestFlight。

### Android —— 就绪
- 工程 `android/`，versionCode 2047 / versionName 25.0.47，keystore 在仓库根。
- 壳为远程加载：**前端更新即时生效，无需重发 APK**。

## 5. 后端路由体系（/www/yandaoguoxue-backend）

server.js 的 extraRoutes 数组注册（新增路由照此模式）：
`newsRoutes(/api/news + /api/admin/news)`、`socialApiRoutes`、`academyRoutes`、`socialStorageRoutes`、`posterConfigRoutes`、`platformFeatureGate`、`qualityGate` 等。
行业资讯模块（v25.0.47 新增）：公开读取（分页/分类/时间排序）+ 管理 CRUD + **合规门禁**（拦截"全网第一/100%准确/根治/分享赚钱"类违规词）+ 强制来源标注。

## 6. 当前版本包含什么（v25.0.47_3）

1. 底部导航统一 BottomActionLayout（--bottom-nav-height 公式，根治遮挡）
2. 六爻 MAIN_ROW + FU_SHEN_ROW 结构（伏神逐爻渲染，FuShenCore 数据源）
3. **梅花三卦层（本卦/互卦/变卦）伏神渲染**（本版新增，冒烟 13/13）
4. legacy group_* 假群治理完成（服务端群 ID 唯一）
5. 群聊功能 E2E 修复（踢人/转让/邀请面板/历史同步）
6. 发现页行业资讯恢复 + /admin/sources 内容源管理页
7. 营销海报合规门禁 + 真实性核验
8. iOS 支付门禁（服务端 403 拦截）

## 7. 交接待办（项目方动作）

| # | 事项 | 说明 |
|---|------|------|
| 1 | iOS 签名 | 补 APP_STORE_CONNECT_ISSUER_ID Secret → 重跑 ios-build.yml → TestFlight |
| 2 | 实机终验 | 六爻/梅花伏神视觉、群聊、海报二维码（报告 03/05/06） |
| 3 | AI 白名单 | 腾讯 TokenHub Key 白名单加 82.156.228.87 |
| 4 | 内容运营 | /admin/sources 生产资讯；学堂审核工作台处理 pending 资料 |
| 5 | 应用商店 | 悬挂 ICP 备案号已做（粤ICP备2026071165号-4A）；上架材料自行准备 |

## 8. 修改红线（冻结）

版本号保持 **v25.0.47** 直至全部验证完成。仅允许改动：六爻 UI/对齐/伏神、群聊、底部导航/安全区、中医搜索、营销海报、资讯模块。**禁止**改动：紫微/八字/奇门/梅花算法核心、医考引擎、支付、会员、邀请体系、数据库结构、无关首页 UI。

## 9. 验证证据索引

- 十项交付报告：TRAE 工作区（01~10 报告，见 MASTER_LEDGER 4.2 节）
- 伏神对拍：`scripts/fushen-jishiyu-verify.mjs`（vs 吉时雨基准 2174 断言全过）
- 静态回归：`scripts/static-export-verify.mjs`（19 项）
- iOS 就绪：`scripts/ios-build-readiness-verify.mjs`（33 项）
- 云构建记录：GitHub Actions run 32493360331（ARCHIVE SUCCEEDED）
- 公网验证：home/discover/meihua/liuyao/groups/admin/sources 全 200，/api/news/public 正常返回
