# 中医数据模块 (modules/tcm/)

## 来源说明
| 文件 | 功能 | 原始来源 | 原始协议 | 当前协议 | 合规状态 |
|------|------|---------|---------|---------|---------|
| herbs.ts | 中药药材库 | TCM-Learning-Assistant | MIT | MIT | 合规改造完成 |
| formulas.ts | 方剂库 | TCM-Learning-Assistant | MIT | MIT | 合规改造完成 |
| meridians.ts | 经络穴位 | tcm-cli | MIT | MIT | 合规改造完成 |
| shanghan.ts | 伤寒论辨证 | nihaixia | MulanPSL-2.0 | MulanPSL-2.0 | 合规改造完成 |

## 合规改造记录
- 2026-07-26: 所有中医数据完成合规改造
- 仅保留学习用途字段
- 已移除任何涉及医疗建议、诊断、处方的字段
- 所有数据标注"典籍记载"来源
- 辨证逻辑前后端分离，前端仅展示「证型对照学习」

## 协议
- herbs.ts, formulas.ts, meridians.ts: MIT License
- shanghan.ts: MulanPSL-2.0 License
- 无AGPL代码混入