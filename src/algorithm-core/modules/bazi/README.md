# 八字排盘模块 (modules/bazi/)

## 来源说明
| 文件 | 功能 | 原始来源 | 原始协议 | 当前协议 |
|------|------|---------|---------|---------|
| base.ts | 四柱计算、空亡、纳音、十神、节气、神煞 | mystilight-8char | ISC | ISC |
| advanced.ts | 身强身弱、大运、格局 | 自研重写 | - | MIT |

## 修改记录
- 2026-07-26: 按V3.1手册修正身强身弱、大运起运逻辑、格局判定
- 2026-07-26: 新增solarToBazi()完整排盘入口函数
- 2026-07-26: 拆分base.ts和advanced.ts，模块化隔离

## 协议
- base.ts: ISC License（继承自 mystilight-8char）
- advanced.ts: MIT License（自研重写）
- 无AGPL代码混入