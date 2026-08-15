# 言道国学 · 标准部署流程 SOP（P0-2 固化）

> 适用：`yandaoguoxue.yandao.vip`（82.156.228.87，唯一项目=言道国学）
> 违反本流程的部署视为无效部署。

## 一、部署七步（每次上线必须全部执行）

```
1. 源码提交    本地修改 → git commit → git push origin main（禁止未提交构建）
2. 服务器同步  /root/yandaoguoxue-source: git fetch bundle/main → git reset --hard <commit>
              （GitHub 直连失败时用 git bundle：本地 git bundle create → scp → fetch）
3. 生产构建    npm run build（服务器 Node v22）
4. 发布版本    cp -a out/. /root/yandaoguoxue/releases/v<版本号>/
5. 部署门禁    bash /root/yandaoguoxue/deploy_standard.sh（全部 PASS 才可切换）
6. 原子切换    ln -sfn /root/yandaoguoxue/releases/v<版本号> /root/yandaoguoxue/current
              + 清理静态缓存 + nginx -s reload
7. 公网校验    抓取首页版本标识 == 本次构建 ID；不符立即回切上一版本
```

## 二、版本追溯表（本次专项）

| 版本 | Commit | 构建ID | 部署时间(服务器) | 内容 | 验证 |
|------|--------|--------|------------------|------|------|
| v25.0.11 | （无，工作区构建） | v25.0.11_D20260815 | 2026-08-15 21:37 | P0-1 初版修复 | ❌ 实机验证不通过（定位劫持+滚动锁互踩） |
| v25.0.12 | c3ccffc | v25.0.12_D20260815 | 2026-08-15 22:20 | P0-1 初版 + P1-1/P1-2 修复提交入库 | ❌ 实机验证发现根因 |
| v25.0.13 | a173528 | v25.0.13_D20260816 | 2026-08-16 03:10 | willChange 根因修复 + 滚动锁引用计数 | ✅ 8工具实机复验全部通过 |

## 三、门禁脚本清单（服务器 /root/yandaoguoxue/，仓库 scripts/deploy/ 同步）

| 脚本 | 作用 |
|------|------|
| deploy_standard.sh v2.0 | 总门禁：身份校验（公网IP/实例ID）→七层门禁→Nginx路径→事故回归→隔离验证 |
| gate_seven_layer.sh | GATE-A~G 七层部署健康检查 |
| gate_nginx_path.sh v1.2 | root/alias/proxy_pass 可达性 + current 软链 + 学外语残留引用扫描 |
| gate_regression.sh v1.2 | 白屏事故回归（静态资源可访问性、核心页面200、/xuewaiyu/ 隔离404） |

## 四、2026-08-15 学外语迁出清理（用户授权）

- Nginx：两域名配置移除 /xuewaiyu/ 块与 :3000 死代理；/xuewaiyu/ 返回 404
- 归档：8 个 /root/xuewaiyu_* + 2 个 /backup/xuewaiyu_*.dump 已下载本地保全后删除
- 原配置备份：/root/cleanup_backup_20260815/
- 注：yandao.vip 实际解析在 111.230.155.30（另一台服务器），本机该配置为休眠配置

## 五、回滚

```bash
ln -sfn /root/yandaoguoxue/releases/v<上一版本> /root/yandaoguoxue/current && nginx -s reload
```
releases/ 目录保留历史版本，禁止清理最近 3 个版本。
