# UI净室重构技术方案

> **文档版本**: v1.0
> **编制日期**: 2026-07-26
> **项目名称**: 医易命理APP — UI净室重构
> **设计原则**: 净室开发（Clean Room Design），所有UI组件从零原创开发，仅参考jishiyu的界面布局与交互逻辑作为设计灵感来源

---

## 一、技术栈锁定

### 1.1 核心技术栈

| 技术领域 | 技术选型 | 版本要求 | 选型理由 |
|----------|----------|----------|----------|
| 前端框架 | Next.js (App Router) | 14.x+ | 服务端渲染、文件路由、React Server Components |
| UI组件库 | shadcn/ui | latest | 基于Radix UI，无包依赖，组件源码可控 |
| 样式方案 | TailwindCSS | 3.x+ | 原子化CSS，设计系统一致性 |
| 可视化 | ECharts | 5.x+ | 百度开源，Apache 2.0协议，成熟稳定 |
| 语言 | TypeScript | 5.x+ | 类型安全 |
| 包管理 | pnpm | 8.x+ | 磁盘空间优化，严格依赖解析 |

### 1.2 禁止引入的技术栈

| 技术 | 禁止原因 |
|------|----------|
| layui | 老旧框架，已停止维护，协议不兼容 |
| GoJS | 商业授权，非开源友好协议 |
| jQuery | 过时技术，与React生态不兼容 |
| Bootstrap (jQuery版) | 依赖jQuery，与React范式冲突 |
| Bootstrap (仅CSS版) | 不禁止Pure CSS版，但推荐TailwindCSS替代 |

### 1.3 依赖协议要求

所有引入的第三方依赖（npm包）必须满足以下协议之一：

- **MIT**
- **ISC**
- **Apache 2.0**
- **BSD-2-Clause / BSD-3-Clause**

禁止引入以下协议的依赖：

- GPL / LGPL / AGPL（强传染性协议）
- 商业授权（未获得商业许可）
- 未明确授权的依赖

### 1.4 协议自查清单

在 `package.json` 中引入任何新依赖前，须执行：

```bash
pnpm licenses list --json | grep -v -E "MIT|ISC|Apache-2.0|BSD"
```

任何不在允许列表中的协议依赖，须经技术负责人审批后方可引入。

---

## 二、紫微圆盘组件设计

### 2.1 组件概述

**组件名称**: `ZiweiAstrolabe`
**组件路径**: `src/components/astrolabe/ZiweiAstrolabe.tsx`
**依赖**: ECharts 5.x + Canvas 2D API

### 2.2 视觉结构

紫微命盘采用环形12宫位布局，结构如下：

```
          [巳]    [午]    [未]    [申]
            \      |      |      /
             \     |      |     /
         [辰] ---  [中心太极] --- [酉]
             /     |      |     \
            /      |      |      \
          [卯]    [寅]    [丑]    [子]
```

- **外环**：12宫位（命宫、兄弟、夫妻、子女、财帛、疾厄、迁移、交友、官禄、田宅、福德、父母）
- **中环**：14主星（紫微、天机、太阳、武曲、天同、廉贞、天府、太阴、贪狼、巨门、天相、天梁、七杀、破军）标注位置
- **内环**：四化飞星连线（化禄、化权、化科、化忌）
- **中心**：太极图或命宫标识

### 2.3 技术实现方案

#### 2.3.1 极坐标图基础框架

使用 ECharts 的极坐标图（polar）作为基础框架：

```typescript
// 极坐标基础配置
const polarOption = {
  polar: {
    center: ['50%', '50%'],
    radius: ['30%', '80%'],
  },
  angleAxis: {
    type: 'category',
    data: ['命宫','兄弟','夫妻','子女','财帛','疾厄','迁移','交友','官禄','田宅','福德','父母'],
    boundaryGap: false,
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { show: true },
  },
  radiusAxis: {
    type: 'value',
    min: 0,
    max: 3,
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { show: false },
  },
};
```

#### 2.3.2 12宫位环形布局

- 每个宫位为一个扇形区域，30度
- 宫位线条使用 `splitLine` 绘制
- 宫位名称使用 `angleAxis.data` 标注
- 宫位地支（子丑寅卯...）作为第二层标注

#### 2.3.3 14主星标注

使用散点图（scatter）在极坐标中标注14主星位置：

```typescript
const starData = mainStars.map((star) => ({
  value: [star.palaceIndex, star.radius],
  name: star.name,
  symbolSize: 16,
  itemStyle: {
    color: getStarColor(star.brightness), // 庙旺颜色编码
  },
  label: {
    show: true,
    formatter: star.name,
    position: 'inside',
  },
}));
```

#### 2.3.4 四化飞星连线

使用 Canvas 2D API 在 ECharts 上层绘制四化连线：

- **化禄**：绿色 (`#52c41a`)，实线带箭头
- **化权**：蓝色 (`#1890ff`)，长虚线带箭头
- **化科**：黄色 (`#faad14`)，短虚线带箭头
- **化忌**：红色 (`#ff4d4f`)，点线带箭头

连线绘制逻辑：

```typescript
// 在 ECharts 的 renderItem 或组件外使用 Canvas 2D 绘制
function drawSiHuaArrows(ctx, siHuaLinks) {
  siHuaLinks.forEach((link) => {
    const from = polarToCartesian(link.fromPalace, link.fromRadius);
    const to = polarToCartesian(link.toPalace, link.toRadius);
    ctx.beginPath();
    ctx.strokeStyle = getSiHuaColor(link.type); // 颜色映射
    ctx.setLineDash(getSiHuaDash(link.type));    // 线型映射
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    drawArrowhead(ctx, from, to, link.type);     // 绘制箭头
  });
}
```

#### 2.3.5 庙旺颜色编码

| 亮度等级 | 颜色 | 色值 |
|----------|------|------|
| 庙 (最旺) | 深红色 | `#cf1322` |
| 旺 | 红色 | `#f5222d` |
| 得 | 橙色 | `#fa8c16` |
| 利 | 黄色 | `#fadb14` |
| 平 | 灰色 | `#8c8c8c` |
| 不 | 浅蓝色 | `#91d5ff` |
| 陷 (最弱) | 深蓝色 | `#003eb3` |

### 2.4 组件Props接口

```typescript
interface ZiweiAstrolabeProps {
  /** 命盘基础数据 */
  astrolabeData: AstrolabeData;
  /** 是否显示四化连线 */
  showSiHua?: boolean;
  /** 是否显示流年叠加 */
  showLiunian?: boolean;
  /** 组件尺寸 */
  size?: 'small' | 'medium' | 'large';
  /** 是否为移动端 */
  isMobile?: boolean;
  /** 点击宫位回调 */
  onPalaceClick?: (palaceIndex: number) => void;
  /** 点击主星回调 */
  onStarClick?: (starName: string) => void;
}
```

---

## 三、奇门九宫格组件设计

### 3.1 组件概述

**组件名称**: `QimenGrid`
**组件路径**: `src/components/qimen/QimenGrid.tsx`
**依赖**: ECharts 5.x

### 3.2 视觉结构

奇门遁甲九宫格采用标准的3x3网格布局，带后天八卦方位：

```
     [东南]         [南]         [西南]
       巽            离            坤
    [四宫]        [九宫]        [二宫]
       4             9             2
  ┌─────────┬─────────┬─────────┐
  │         │         │         │
  │  杜门   │  景门   │  死门   │
  │  天辅   │  天英   │  天芮   │
  │         │         │         │
  ├─────────┼─────────┼─────────┤
  │         │         │         │
  │  伤门   │         │  惊门   │
  │  天冲   │  中五   │  天柱   │
  │         │         │         │
  ├─────────┼─────────┼─────────┤
  │         │         │         │
  │  生门   │  休门   │  开门   │
  │  天蓬   │  天心   │  天任   │
  │         │         │         │
  └─────────┴─────────┴─────────┘
     [东北]         [北]         [西北]
       艮            坎            乾
    [八宫]        [一宫]        [六宫]
       8             1             6
```

### 3.3 技术实现方案

#### 3.3.1 使用ECharts Heatmap实现

```typescript
const heatmapOption = {
  grid: {
    left: '10%',
    right: '10%',
    top: '10%',
    bottom: '10%',
  },
  xAxis: {
    type: 'category',
    data: ['左', '中', '右'],
    position: 'top',
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false },
  },
  yAxis: {
    type: 'category',
    data: ['上', '中', '下'],
    inverse: true,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false },
  },
  visualMap: {
    min: 0,
    max: 1,
    show: false,
    inRange: {
      color: ['#f0f0f0', '#f0f0f0'], // 基底色
    },
  },
  series: [{
    type: 'heatmap',
    data: getGridData(),
    label: {
      show: true,
      formatter: (params) => {
        return formatGridCell(params);
      },
    },
    emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowColor: 'rgba(0, 0, 0, 0.5)',
      },
    },
  }],
};
```

#### 3.3.2 九宫格自定义渲染

每个宫格内展示内容：

- **宫位数字**：1-9（洛书数）
- **八卦**：坎、坤、震、巽、乾、兑、艮、离（中五为太极）
- **八门**：休、生、伤、杜、景、死、惊、开
- **九星**：天蓬、天芮、天冲、天辅、天禽、天心、天柱、天任、天英
- **八神**：值符、腾蛇、太阴、六合、白虎、玄武、九地、九天
- **天盘干** / **地盘干**
- **隐干**（可选）

使用 `rich` 文本格式化：

```typescript
label: {
  show: true,
  formatter: (params) => {
    const cell = cellData[params.dataIndex];
    return [
      `{palace|${cell.palaceName}}`,
      `{bagua|${cell.bagua}}`,
      `{door|${cell.door}}`,
      `{star|${cell.star}}`,
      `{gan|${cell.gan}}`,
    ].join('\n');
  },
  rich: {
    palace: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    bagua: { fontSize: 12, color: '#666' },
    door: { fontSize: 12, color: '#1890ff' },
    star: { fontSize: 12, color: '#722ed1' },
    gan: { fontSize: 11, color: '#999' },
  },
}
```

#### 3.3.3 颜色编码（阳遁/阴遁）

| 属性 | 阳遁 | 阴遁 |
|------|------|------|
| 背景色 | 暖色调 `#fff7e6` | 冷色调 `#e6f7ff` |
| 边框色 | 暖金色 `#d4a853` | 冷银色 `#85a5cc` |
| 吉门高亮 | 暖绿色 `#b7eb8f` | 冷绿色 `#87d068` |
| 凶门标记 | 暖红色 `#ffa39e` | 冷红色 `#f69899` |
| 中五宫 | 亮黄色 `#ffe58f` | 淡蓝色 `#bae7ff` |

### 3.4 组件Props接口

```typescript
interface QimenGridProps {
  /** 排盘数据 */
  qimenData: QimenData;
  /** 遁局类型 */
  dunType: 'yang' | 'yin'; // 阳遁/阴遁
  /** 是否显示隐干 */
  showHiddenGan?: boolean;
  /** 组件尺寸 */
  size?: 'small' | 'medium' | 'large';
  /** 是否为移动端 */
  isMobile?: boolean;
  /** 点击宫格回调 */
  onCellClick?: (cellIndex: number) => void;
}
```

---

## 四、八字排盘展示设计

### 4.1 组件概述

**组件名称**: `BaziChart`
**组件路径**: `src/components/bazi/BaziChart.tsx`
**依赖**: 纯CSS（TailwindCSS）+ ECharts 5.x（用于大运时间轴）

### 4.2 四柱卡片式布局

```
┌─────────────────────────────────────────────────────┐
│                    八字排盘结果                        │
├────────────┬────────────┬────────────┬───────────────┤
│    年柱     │    月柱     │    日柱     │    时柱      │
│  ┌──────┐  │  ┌──────┐  │  ┌──────┐  │  ┌──────┐   │
│  │ 甲   │  │  │ 丙   │  │  │ 戊   │  │  │ 庚   │   │
│  │(天干)│  │  │(天干)│  │  │(天干)│  │  │(天干)│   │
│  ├──────┤  │  ├──────┤  │  ├──────┤  │  ├──────┤   │
│  │ 子   │  │  │ 寅   │  │  │ 午   │  │  │ 申   │   │
│  │(地支)│  │  │(地支)│  │  │(地支)│  │  │(地支)│   │
│  └──────┘  │  └──────┘  │  └──────┘  │  └──────┘   │
│  正印      │  偏财      │  日主      │  食神       │
│  (十神)    │  (十神)    │  (十神)    │  (十神)     │
├────────────┴────────────┴────────────┴───────────────┤
│  藏干：癸  │ 藏干：甲丙戊│ 藏干：丁己  │ 藏干：庚壬戊  │
├────────────┴────────────┴────────────┴───────────────┤
│  纳音：海中金│ 纳音：炉中火│ 纳音：天上火│ 纳音：石榴木  │
└─────────────────────────────────────────────────────┘
```

### 4.3 技术实现方案

#### 4.3.1 卡片式布局

使用 TailwindCSS Grid 实现响应式四柱布局：

```tsx
<div className="grid grid-cols-4 gap-4 w-full">
  {pillars.map((pillar) => (
    <BaziPillarCard key={pillar.type} pillar={pillar} />
  ))}
</div>
```

每张卡片（`BaziPillarCard`）包含：

- 天干（大字，居中）
- 地支（大字，居中）
- 十神（小字，底部居中，颜色编码）
- 藏干（可折叠，展开显示）
- 纳音（可选显示）

#### 4.3.2 十神标注与颜色编码

| 十神 | 颜色 | 色值 | 说明 |
|------|------|------|------|
| 比肩 | 深绿 | `#237804` | 同我者为比肩 |
| 劫财 | 浅绿 | `#52c41a` | 异我者为劫财 |
| 食神 | 深红 | `#cf1322` | 我生同者为食神 |
| 伤官 | 浅红 | `#f5222d` | 我生异者为伤官 |
| 正财 | 深黄 | `#d48806` | 我克同者为正财 |
| 偏财 | 浅黄 | `#faad14` | 我克异者为偏财 |
| 正官 | 深蓝 | `#003eb3` | 克我同者为正官 |
| 偏官 | 浅蓝 | `#1890ff` | 克我异者为偏官 |
| 正印 | 深紫 | `#531dab` | 生我同者为正印 |
| 偏印 | 浅紫 | `#722ed1` | 生我异者为偏印 |

#### 4.3.3 大运流年时间轴

使用 ECharts 的 `timeline` 或自定义时间轴组件：

```typescript
// 大运时间轴 - 使用 ECharts 甘特图风格
const dayunOption = {
  xAxis: {
    type: 'time',
    axisLabel: { rotate: 45 },
  },
  yAxis: {
    type: 'category',
    data: ['大运'],
  },
  series: [{
    type: 'custom',
    renderItem: (params, api) => {
      // 自定义渲染每个大运周期块
      return renderDayunBlock(params, api);
    },
    data: dayunPeriods,
  }],
};
```

每个大运周期块显示：

- 起运年龄
- 干支组合
- 十神
- 周期起止年份

### 4.4 组件Props接口

```typescript
interface BaziChartProps {
  /** 八字排盘数据 */
  baziData: BaziResult;
  /** 是否显示藏干 */
  showCanggan?: boolean;
  /** 是否显示纳音 */
  showNayin?: boolean;
  /** 是否显示大运时间轴 */
  showDayun?: boolean;
  /** 组件尺寸 */
  size?: 'small' | 'medium' | 'large';
  /** 是否为移动端 */
  isMobile?: boolean;
  /** 点击柱回调 */
  onPillarClick?: (pillarType: 'year' | 'month' | 'day' | 'hour') => void;
}
```

---

## 五、交互规范

### 5.1 净室开发原则

> **核心原则：jishiyu仅参考交互逻辑，不复制任何代码。**

| 参考层级 | 允许行为 | 禁止行为 |
|----------|----------|----------|
| 功能概念 | 理解排盘、解读等功能流程 | — |
| 交互逻辑 | 参考用户操作流程（输入→排盘→解读） | 不得复制交互代码实现 |
| 界面布局 | 参考信息架构和布局方式 | 不得复制HTML/CSS结构 |
| 视觉设计 | 参考配色方案和设计风格 | 不得复制CSS样式代码 |
| 代码实现 | — | **严禁复制任何源码** |

### 5.2 开发流程规范

1. **需求分析**：理解功能需求和交互逻辑
2. **设计稿确认**：产品/设计团队独立输出UI设计稿
3. **组件拆解**：将设计稿拆解为独立的React组件
4. **从零编码**：所有组件代码由开发者从空白文件开始编写
5. **代码审查**：审查阶段须确认无jishiyu源码痕迹
6. **协议检查**：确保所有引入依赖协议合规

### 5.3 代码审查检查项

- [ ] 组件代码中无jishiyu的HTML结构
- [ ] 组件代码中无jishiyu的CSS类名
- [ ] 组件代码中无jishiyu的JavaScript函数名
- [ ] 组件代码中无jishiyu的变量命名模式
- [ ] 所有第三方依赖协议在允许列表中
- [ ] 所有组件为原创实现

### 5.4 响应式设计规范（移动端优先）

#### 5.4.1 断点定义

| 断点名称 | 最小宽度 | 对应设备 |
|----------|----------|----------|
| `xs` | 0px | 手机竖屏（默认） |
| `sm` | 640px | 手机横屏/小平板 |
| `md` | 768px | 平板竖屏 |
| `lg` | 1024px | 平板横屏/小桌面 |
| `xl` | 1280px | 桌面端 |
| `2xl` | 1536px | 大屏桌面 |

#### 5.4.2 关键组件移动端适配

| 组件 | 移动端 (< 768px) | 桌面端 (>= 768px) |
|------|------------------|-------------------|
| 紫微圆盘 | 单列布局，圆盘缩小至全宽 | 双列布局，圆盘居左，详情居右 |
| 奇门九宫格 | 全宽3x3网格，宫格内容精简 | 居中固定宽度，宫格内容完整展示 |
| 八字四柱 | 2x2网格（两行两列） | 1x4横排（一行四列） |
| 大运时间轴 | 垂直滚动列表 | 水平滚动时间轴 |

#### 5.4.3 触摸交互规范

- 所有可点击区域最小尺寸：44px x 44px（符合WCAG 2.1 AA）
- 宫格/卡片点击使用 `touch-action: manipulation` 避免300ms延迟
- 滑动手势用于大运时间轴切换（移动端）
- 双指缩放用于紫微圆盘和奇门九宫格（移动端）
- 长按显示详细信息tooltip（移动端替代hover）

### 5.5 无障碍访问（A11y）

- 所有图表组件提供 `aria-label` 描述
- 颜色编码须同时提供文字说明（不依赖颜色传递信息）
- 支持键盘导航（Tab键焦点切换）
- 屏幕阅读器友好的语义化HTML结构

---

## 六、组件目录结构

```
src/
├── components/
│   ├── astrolabe/
│   │   ├── ZiweiAstrolabe.tsx        # 紫微圆盘主组件
│   │   ├── AstrolabePalace.tsx       # 单个宫位子组件
│   │   ├── SiHuaArrows.tsx           # 四化飞星连线
│   │   ├── StarMarker.tsx            # 主星标注
│   │   └── astrolabe.utils.ts        # 坐标计算工具函数
│   ├── qimen/
│   │   ├── QimenGrid.tsx             # 奇门九宫格主组件
│   │   ├── GridCell.tsx              # 单个宫格子组件
│   │   ├── QimenLegend.tsx           # 图例组件
│   │   └── qimen.utils.ts            # 奇门工具函数
│   ├── bazi/
│   │   ├── BaziChart.tsx             # 八字排盘主组件
│   │   ├── BaziPillarCard.tsx        # 四柱卡片
│   │   ├── DayunTimeline.tsx         # 大运时间轴
│   │   └── bazi.utils.ts             # 八字工具函数
│   ├── shared/
│   │   ├── DisclaimerBar.tsx         # 免責声明栏（通用）
│   │   ├── SchoolNote.tsx            # 流派说明组件
│   │   └── ResponsiveContainer.tsx   # 响应式容器
│   └── ui/                           # shadcn/ui 组件（自动生成）
│       ├── button.tsx
│       ├── card.tsx
│       └── ...
├── constants/
│   ├── disclaimers.ts                # 免责声明文案常量
│   ├── colors.ts                     # 颜色编码常量
│   └── schools.ts                    # 流派说明文案常量
├── hooks/
│   ├── useResponsive.ts              # 响应式断点hook
│   └── useChartResize.ts             # 图表自适应hook
└── types/
    ├── astrolabe.ts                  # 紫微类型定义
    ├── qimen.ts                      # 奇门类型定义
    └── bazi.ts                       # 八字类型定义
```

---

## 七、净室声明

> **本UI方案所有设计均为独立原创，仅参考jishiyu的界面布局与交互逻辑作为设计灵感来源，未复制任何HTML/CSS/JS源码。**

### 净室开发承诺

1. 所有组件代码从空白文件开始编写，未复制任何外部项目的HTML结构
2. 所有CSS样式基于TailwindCSS设计系统独立编写，未复制任何外部项目的CSS规则
3. 所有JavaScript/TypeScript逻辑为独立实现，未复制任何外部项目的算法代码
4. 所有可视化图表配置基于ECharts官方文档独立编写，未复制任何外部项目的图表配置
5. 本项目仅参考jishiyu的功能概念、交互流程和界面布局作为产品设计灵感，不涉及任何代码层面的借鉴

### 参考来源声明

| 参考来源 | 参考内容 | 是否涉及代码复制 |
|----------|----------|:----------------:|
| jishiyu | 界面布局结构、交互流程、功能模块划分 | 否 |
| iztro | 排盘算法API（MIT协议，合法依赖） | 是（算法库调用） |
| ECharts官方文档 | 图表配置方法和API | 是（文档引用） |
| shadcn/ui官方文档 | 组件库使用方法 | 是（组件库引入） |