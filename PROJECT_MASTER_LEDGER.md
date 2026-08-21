# 言道国学项目总账（PROJECT_MASTER_LEDGER）

> **本文档是项目唯一权威账簿（Single Source of Truth）。**
> 最后更新: 2026-08-21（对应生产版本 v25.0.47_3）
> 历史详细记录见 `PROJECT_LEDGER_FINAL.md`（v25.0.0 ~ v25.0.20 阶段账，冻结归档）。
> 本账簿只记录 v25.0.21 之后增量与当前全局事实；冲突时以本文为准。

---

## 一、项目身份

| 项 | 值 |
|----|-----|
| 产品名 | 言道国学（医易命理 APP，iOS/Android 壳 + 远程加载 Web） |
| 仓库 | https://github.com/wzmpa18/minglizyi（main 分支） |
| 域名 | https://yandaoguoxue.yandao.vip |
| ICP 备案 | 粤ICP备2026071165号-4A（服务名：言道国学，域 yandao.vip） |
| 当前生产版本 | **v25.0.47_3**（buildId v25.0.47_D20260821，2026-08-21 22:42 UTC 构建） |
| Git HEAD | 8dc5502（main，本地=GitHub=服务器源码仓 三端一致） |

---

## 二、基础设施（生产）

| 项 | 值 |
|----|-----|
| 服务器 | 82.156.228.87（腾讯云轻量 北京，root） |
| 前端发布 | /root/yandaoguoxue/releases/&lt;tag&gt; + current 软链（SPA 静态导出） |
| 后端服务 | /www/yandaoguoxue-backend，PM2 名 yandaoguoxue-backend，端口 3001 |
| 数据库 | PostgreSQL 15（127.0.0.1:5432/yandaoguoxue，用户 yandao）+ SQLite（用户核心库 yandao_users.db、academy.db） |
| Nginx | / → 静态前端；/api/* → 127.0.0.1:3001 |
| SSL | Let's Encrypt（certbot） |
| 备份 | 每日 02:00 users_db（cron /root/backend-auth/backup_db.sh）；03:00 一致性校验；周日 04:00 VACUUM+REINDEX；另有 /root/backup_20260815 全量 |
| 日志轮转 | /etc/logrotate.d/yandao-guoxue（nginx+PM2，daily/rotate 14/压缩，2026-08-21 安装验证） |
| SSH 工具 | scripts/ssh_exec.py（paramiko，密钥 id_rsa_yandao 优先/密码降级） |

**服务器磁盘**：19G→17G / 50G（2026-08-21 垃圾清理：releases 3.2G→170M，保留 v25.0.45/46/47/47_2/47_3 五版）。

---

## 三、版本演进（v25.0.21 → v25.0.47_3 摘要）

| 版本 | 日期 | 要点 |
|------|------|------|
| v25.0.24~25 | 08-17 | 正骨数据管线、版本修复 |
| v25.0.26~35 | 08-17~18 | 医考题库导入（p8_yikao_batch）、TCM 管线、账号删除 |
| v25.0.36~43 | 08-18~19 | 平台门禁（platformFeatureGate）、海报配置、质量门禁 |
| v25.0.44 | 08-20 | 账号删除流程 |
| v25.0.45~46 | 08-20 | 热修复迭代 |
| v25.0.47 | 08-21 | **最终热修包**：底部导航统一 BottomActionLayout（--bottom-nav-height 公式）、六爻动爻像素对齐、legacy group_* 治理（074eef5）、群聊页脚遮挡修复（2401be8）、营销海报合规、发现页行业资讯恢复 + 内容源管理页 + 六爻/梅花伏神 UI（fc6/fc7） |
| v25.0.47_2 | 08-21 21:56 | 资讯模块发布（NEWS-TAB/API 动态加载/管理页/伏神 UI 入包门禁） |
| **v25.0.47_3** | 08-21 22:42 | **梅花 HexagramDisplay 补齐 FU_SHEN_ROW 伏神渲染**（本卦/互卦/变卦三卦层全覆盖，FuShenCore 统一数据源，冒烟 13/13） |

---

## 四、今日交付验证（2026-08-21）

### 4.1 服务器（全部公网实测）

| 验证项 | 结果 |
|--------|------|
| newsRoutes 后端 | ✅ /api/news/public 返回真实资讯（n001 起），PM2 online |
| 行业资讯 Tab | ✅ discover 页 200 且含"行业资讯" |
| 内容源管理页 | ✅ /admin/sources 200，chunks 含管理逻辑 |
| 伏神 UI | ✅ FUSHEN-RENDER/DATA/UI 三项入包门禁通过 |
| 公网 6 页面 | ✅ home/discover/meihua/liuyao/groups/admin/sources 全 200 |
| 错误 IP 扫描 | ✅ 0 匹配（101.32.191.210） |
| iOS 支付门禁 | ✅ 服务端 403 拦截（platformGate） |

### 4.2 十项交付验证报告（TRAE 工作区 6a8718...090f）

1. `01_BOTTOM_FIXED_LAYOUT_REPORT.md` 底部固定布局
2. `02_LIUYAO_PIXEL_ALIGNMENT_REPORT.md` 六爻像素对齐
3. `03_LIUYAO_FUSHEN_VISUAL_REPORT.md` 伏神视觉
4. `04_LEGACY_GROUP_MIGRATION_REPORT.md` legacy 群治理
5. `05_GROUP_CHAT_UI_E2E_REPORT.md` 群聊 E2E
6. `06_MARKETING_POSTER_REALITY_REPORT.md` 营销海报真实性
7. `07_NAV_SAFE_AREA_REPORT.md` 导航安全区
8. `08_TODAY_REALITY_MATRIX_FINAL.md` 当日现实矩阵
9. `09_v25_0_47_DEPLOY_REPORT.md` 部署报告
10. `10_ANDROID_v25_0_47_DEVICE_REPORT.md` Android 设备报告

---

## 五、移动端打包状态（2026-08-21 更新）

### 5.1 iOS ✅ 打包管道已验证可用（签名三件套已齐，待签 PLA）

| 项 | 状态 |
|----|------|
| 工程 | ios/App（Capacitor，远程加载 https://yandaoguoxue.yandao.vip） |
| Bundle ID | com.yandao.guoxue，自动签名，iOS 15.0+，**DEVELOPMENT_TEAM=WM586465ZD**（08-22 从分发证书提取补入 pbxproj，commit b99bda9） |
| 就绪校验 | **33 项全通过**（scripts/ios-build-readiness-verify.mjs：工程结构/Bundle/UA 标记 YandaoGuoxueIOS/15 图标/PrivacyInfo/ATS/线上联动/支付门禁/P8 格式） |
| 云打包 | GitHub Actions `.github/workflows/ios-build.yml`（macos-14 + Xcode 15.4；签名失败自动降级产出未签名 xcarchive，commit 5843ad3） |
| 实测 | ✅ 归档能力验证（run 32493360331 / 32534601195 均产出 xcarchive 工件） |
| 签名材料 | ✅ 三件套已入 GitHub Secrets：APP_STORE_CONNECT_KEY（P8 私钥）/ KEY_ID=UWQ354QP54 / **ISSUER_ID=ee663add-…-8110（08-22 配置）** |
| API 认证 | ✅ 实测有效（ES256 JWT 调 ASC API，403 为协议问题而非认证失败） |
| **唯一缺口** | ⚠️ **PLA（计划许可协议）未接受** —— 账号持有人 ZHIMIN WU 登录 developer.apple.com/account 接受最新协议 → 重跑 workflow 即出**签名 ipa**（可选直传 TestFlight）。Apple 硬性要求，API 密钥无法绕过 |
| 备选 | codemagic.yaml 同步就绪（控制台集成 P8 + Issuer ID） |

### 5.2 Android

| 项 | 状态 |
|----|------|
| 工程 | android/（Capacitor，versionCode 2047 / versionName 25.0.47） |
| 签名 | yandao-release.keystore（仓库根；wrong-0801.bak 为废弃误签备份勿用） |
| APK 基线 | v25.0.47 构建验证完成（见报告 10） |
| 注意 | 壳为远程加载模式，前端已更新至 v25.0.47_3，无需重发 APK 即生效 |

---

## 六、运维手册（速查）

```bash
# SSH 执行（密钥优先）
python scripts/ssh_exec.py run "<命令>"
python scripts/ssh_exec.py put <本地> <远程>

# 前端发布（本地构建后）
npm run build
tar -czf out_<tag>.tar.gz -C out .
python scripts/ssh_exec.py put out_<tag>.tar.gz /root/yandaoguoxue/out_<tag>.tar.gz
python scripts/ssh_exec.py put backend_deploy/release_<tag>.sh /root/release_<tag>.sh
python scripts/ssh_exec.py run "cd /root/yandaoguoxue && bash release_<tag>.sh"

# 回滚（切换软链即可，秒级）
python scripts/ssh_exec.py run "ln -sfn /root/yandaoguoxue/releases/v25.0.47_2 /root/yandaoguoxue/current && nginx -s reload"

# iOS 云打包（触发）
gh workflow run ios-build.yml --repo wzmpa18/minglizyi --ref main

# 后端路由部署基线：backend_deploy/newsRoutes.js + deploy_news_routes_v25_0_47.sh
```

**发布门禁（必须全过）**：版本号 v25.0.47 / 资讯 Tab / fushenLayer 入包 / hiddenBranch 入包 / B45309 样式入包 / 错误 IP 零匹配 / 公网 200。

---

## 七、遗留事项（交接必读）

| 项 | 说明 | 责任方 |
|----|------|--------|
| **iOS 签署 PLA 协议** | Issuer ID 已配置（08-22）；仅剩账号持有人登录 developer.apple.com/account 接受最新《计划许可协议》→ 重跑 iOS workflow 即出签名 ipa/TestFlight（Apple 硬性要求，API 密钥无法绕过） | 项目方（账号持有人 ZHIMIN WU） |
| 用户实机终验 | 六爻伏神/梅花伏神视觉、群聊功能、海报二维码（报告 3/5/6） | 项目方 |
| AI TokenHub 白名单 | 腾讯 Key 白名单需含 82.156.228.87（UV-004 遗留） | 项目方 |
| 内容运营 | 资讯内容生产走 /admin/sources；学堂资料审核工作台 | 项目方 |

**红线**（冻结约束）：版本号保持 v25.0.47 直至全部验证；只允许修改指定区域（六爻 UI/群聊/底部导航/中医搜索/营销海报/资讯）；紫微/八字/奇门/梅花算法核心、医考引擎、支付、邀请体系、数据库结构禁止改动。
