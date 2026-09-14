# 官网首页改版（产品双按钮）与谷歌Play所有权验证APK交付报告

- **交付日期**：2026-09-14
- **涉及站点**：www.yandao.vip（腾讯云COS北京桶 + CDN）
- **GitHub提交**：c2f7083（谷歌验证令牌文件）、本次新增（首页源留档+报告）
- **状态**：全部完成，公网验证通过

---

## 一、官网首页改版（www.yandao.vip）

### 1.1 改版内容

| # | 需求 | 实现 |
|---|---|---|
| 1 | 去掉右上角"📱 APP下载" | 导航栏移除该链接及对应CSS |
| 2 | 中间产品介绍区：每产品两个按键"访问网页版"+"下载APP" | 3个已上线产品卡片均改为双按钮（btn-stack纵向排列，先了解再下载） |
| 3 | 中间补上学外语 | 学外语卡片补全：状态改为"✅ 已上线"+双按钮；业务范围区同步补链接 |
| 4 | 链接弄进去 | 全部按钮指向真实可访问链接（6个URL全部200验证） |

### 1.2 产品按钮指向

| 产品 | 访问网页版 | 下载APP | 验证 |
|---|---|---|---|
| 国学传承 | https://yandaoguoxue.yandao.vip/ | https://www.yandao.vip/app-download/latest.apk（Android v25.0.86） | 200/200 |
| 言道学外语 | https://xuewaiyu.yandao.vip/xuewaiyu/ | https://xuewaiyu.yandao.vip/xuewaiyu/download.html（Android） | 200/200 |
| 数字管家 | https://shuziguajia.yandao.vip/ | https://shuziguajia.yandao.vip/download.html（Windows） | 200/200 |
| 本地生活 | 开发中（保持"敬请期待"） | — | — |

### 1.3 公网验证（改版后线上实测）

- 导航栏"APP下载"残留：**0处**
- "访问网页版"按钮：**6处**（业务区3 + 产品卡3）
- "下载APP"按钮：**6处**（业务区3 + 产品卡3）
- "正在开发中"文案：仅剩本地生活相关4处（符合实际）
- CDN已刷新，TaskId 2512fd0a，改版内容即刻生效

### 1.4 源码留档

首页源文件（COS对象，仓库原无副本）已留档：`docs/materials/company_homepage_index.html`，后续改版以此为准同步COS。

---

## 二、谷歌Play所有权验证APK

### 2.1 问题

谷歌提示"上传的 APK 没有必需的令牌文件"——原上传APK缺少 `adi-registration.properties` 令牌文件。

### 2.2 处理

1. **签名指纹核验**：本keystore（yandao-release.keystore）SHA-256 = `8C:A0:C4:14:57:3D:4B:05:FC:2B:D1:BA:9C:6A:2A:80:90:C9:0C:58:E3:81:51:19:49:46:07:44:3D:C6:D5:A0`，**与谷歌要求完全一致**（apksigner复核APK实际签名digest一致）。
2. **令牌文件**：`android/app/src/main/assets/adi-registration.properties` 写入 `DDSZ65SKDLAWMAAAAAAAAAAAAA`，已提交c2f7083并同步服务器仓库。
3. **重新构建**：v25.0.86（2073）+ 令牌文件，gradle release签名构建。
4. **APK内验证**：`assets/adi-registration.properties`（26字节）已在包内，内容逐字正确。

### 2.3 验证专用APK（用户上传谷歌用）

- **下载地址**：https://www.yandao.vip/app-download/yandao-guoxue-v25.0.86-google-verify.apk
- **本地副本**：`C:\Users\ZhuanZ\Downloads\yandao-guoxue-v25.0.86-google-verify.apk`
- **大小/MD5**：14,360,266 bytes / `4d2816900e297a7875895cb3d28daa62`
- **说明**：仅用于谷歌私钥验证上传，不影响分发三别名（latest.apk等保持干净版v25.0.86）。

---

## 三、其他

- 服务器仓库同步至c2f7083；被`git stash -u`误暂存的SEO运行时文件（baidu_push_queue.txt等6个）已全部恢复，明日9:10百度推送cron不受影响。
- 历史二维码19入口在本轮改版后依然全部有效（首页改动不影响任何APK对象URL）。

## 四、交付物

| 文件 | 说明 |
|---|---|
| `docs/materials/company_homepage_index.html` | 官网首页源留档（新版） |
| `android/app/src/main/assets/adi-registration.properties` | 谷歌验证令牌（c2f7083） |
| COS `index.html` | 改版后首页（23948字节） |
| COS `app-download/yandao-guoxue-v25.0.86-google-verify.apk` | 谷歌验证专用APK |
| 本报告 | `docs/reports/20260914_官网首页改版与谷歌验证APK交付报告_HOMEPAGE-GOOGLE.md` |
