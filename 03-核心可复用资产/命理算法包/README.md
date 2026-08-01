# 命理算法包 - 资产清单与使用说明

## 概述

本目录包含从三个合规开源命理项目中提取的纯计算逻辑（已去除 UI、样式、页面代码），按功能分类归档为独立的算法包。

> ⚠️ **AGPL 隔离声明**：原 jishiyu (AGPL-3.0) 公共基础包已从本目录永久移除，移入 `01-命理开源项目源码/_参考源码_仅阅读/` 目录。所有参考 jishiyu 逻辑的模块将走净室重写流程，严禁直接搬运源码。

---

## 一、资产清单

| 序号 | 文件名 | 来源项目 | 开源协议 | 复用等级 | 语言 | 说明 |
|------|--------|----------|----------|----------|------|------|
| 1 | `iztro_紫微核心.js` | [iztro](https://github.com/SylarLong/iztro) | MIT | 直接复用 | JavaScript | 紫微斗数核心算法 |
| 2 | `mystilight_八字核心.js` | [mystilight-8char](https://github.com/mystilight/mystilight-8char) | ISC | 直接复用 | JavaScript | 八字命理核心算法 |
| 3 | `suangua_奇门六爻核心.py` | [suangua](https://github.com/fogandsun-5467/suangua) | MIT | 直接复用 | Python | 奇门遁甲 + 六爻核心算法 |

### 待净室重写资产（来源：仅参考 jishiyu 算法思想，独立重写）

| 序号 | 资产名称 | 参考来源 | 参考协议 | 重写状态 | 说明 |
|------|----------|----------|----------|----------|------|
| 1 | 神煞全量表（51种） | jishiyu / lunar-javascript | AGPL/MIT混用 | PENDING | 按V3.1手册+公开神煞口诀净室重写 |
| 2 | 六爻纳甲排盘 | jishiyu | AGPL | PENDING | 按《增删卜易》+V3.1净室重写 |
| 3 | 小六壬/大六壬/梅花易数 | jishiyu | AGPL | PENDING | 按对应典籍+V3.1净室重写 |
| 4 | 公共基础包（干支/节气/纳音/真太阳时） | jishiyu | AGPL | PENDING | 参照lunar-javascript(MIT)自行实现 |

---

## 二、各包功能概览

### 2.1 iztro_紫微核心.js

**来源**: iztro 项目 (MIT License)  
**功能列表**:

| 功能模块 | 核心函数 | 说明 |
|----------|----------|------|
| 安星算法 | `getMajorStars()`, `getMinorStars()` | 14主星 + 辅星落宫计算 |
| 起紫微星 | `getZiweiStarIndex()` | 紫微星定位（起紫微星诀） |
| 四化飞星 | `getSihua()` | 四化（禄权科忌）计算 |
| 庙旺计算 | `getBrightness()`, `getAdjectiveLevel()` | 星曜亮度/庙旺利陷 |
| 大限流年 | `getHoroscope()`, `getDecadal()` | 大限+流年运势计算 |
| 命宫身宫 | `getSoulAndBody()`, `getSoul()`, `getBody()` | 命宫/身宫定位 |
| 四柱计算 | `getHeavenlyStem()`, `getEarthlyBranch()` | 年月日时柱干支 |
| 五行局 | `getFiveElementsClass()` | 五行局计算 |

**依赖**: 无外部依赖，纯 JavaScript 函数

---

### 2.2 mystilight_八字核心.js

**来源**: mystilight-8char 项目 (ISC License)  
**功能列表**:

| 功能模块 | 核心函数 | 说明 |
|----------|----------|------|
| 四柱计算 | `buildBazi()` | 年月日时柱干支组装 |
| 十神映射 | `getShiShen()`, `getShiShenShort()` | 以日干为基准的十神计算 |
| 神煞计算 | `calculateShenSha()` | 25项核心神煞 |
| 大运计算 | `calculateDayun()` | 起运年龄 + 顺逆排大运 |
| 格局判定 | `determinePattern()` | 普通格局 + 特殊格局 |
| 空亡计算 | `getXunKong()` | 六甲空亡 |
| 纳音计算 | `getNaYin()` | 六十甲子纳音 |
| 藏干计算 | `CANGGAN`, `getCangGan()` | 地支藏干 |
| 十二长生 | `getChangSheng()` | 日干对地支的十二长生 |

> ⚠️ **V3.1 对齐待办**：身强身弱判定、大运起运年龄精确化、格局判定需按 V3.1 手册修正后入库。

**依赖**: 无外部依赖，纯 JavaScript 函数

---

### 2.3 suangua_奇门六爻核心.py

**来源**: suangua 项目 (MIT License)  
**功能列表**:

| 功能模块 | 核心函数 | 说明 |
|----------|----------|------|
| 奇门定局 | `calculate_qimen()` | 拆补法定局（阳遁/阴遁） |
| 星门神排布 | `fly_layout()`, `get_qi_men_dunjia()` | 九星/八门/八神飞布 |
| 六爻纳甲 | `annotate_with_najia()` | 纳甲干支 + 五行 |
| 世应定位 | `get_world_line()` | 世爻/应爻位置 |
| 六亲匹配 | `get_liu_qin()` | 父母/兄弟/妻财/子孙/官鬼 |
| 六神分配 | `assign_liu_shen()` | 青龙/朱雀/勾陈/腾蛇/白虎/玄武 |
| 起卦方法 | `coin_divination()`, `time_divination()` | 铜钱起卦 + 时间起卦 |

**依赖**: Python 3.x, 无外部第三方库依赖

---

## 三、开源协议说明

| 来源 | 协议 | 商用限制 | 源码公开要求 |
|------|------|----------|-------------|
| iztro | MIT | 无限制 | 保留版权声明即可 |
| mystilight-8char | ISC | 无限制 | 保留版权声明即可 |
| suangua | MIT | 无限制 | 保留版权声明即可 |

### 关于 jishiyu (AGPL-3.0) 的永久隔离

jishiyu (吉时雨) 源码已移入 `01-命理开源项目源码/_参考源码_仅阅读/` 目录，永久冻结代码复制权限：
- ❌ 禁止任何形式的源码直接粘贴进入主工程
- ✅ 允许通过「阅读源码 → 提炼自然语言逻辑/伪代码 → 独立重写」的净室流程
- 所有净室重写模块必须在账簿中注明「净室重写，参考自 jishiyu 思想，无源码复制」

---

## 四、文件结构

```
命理算法包/
├── README.md                    # 本文件
├── iztro_紫微核心.js            # 紫微斗数核心算法 (MIT)
├── mystilight_八字核心.js       # 八字命理核心算法 (ISC)
└── suangua_奇门六爻核心.py      # 奇门遁甲 + 六爻核心算法 (MIT)
```

---

## 五、使用建议

1. **紫微斗数项目**: 直接使用 `iztro_紫微核心.js`，MIT 协议可商用
2. **八字命理项目**: 使用 `mystilight_八字核心.js`（ISC 协议），但需按 V3.1 手册修正身强身弱/大运/格局判定
3. **奇门/六爻项目**: 直接使用 `suangua_奇门六爻核心.py`，MIT 协议可商用
4. **公共基础数据**: 参照 lunar-javascript (MIT) 自行实现，或走净室重写流程

---

*更新日期: 2026-07-26*  
*AGPL 隔离完成时间: 2026-07-26 (Task001)*  
*原始项目版权归各项目原作者所有*