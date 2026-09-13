# 七政四余学习专区15专题体系化与141题核验交付报告（QIZHENG-LEARNING-TOPICS）

- **日期**：2026-09-13
- **批次**：v25.0.80_D20260913B（服务器 release：v25.0.80b）
- **前置**：《20260913_七政四余GAP_MATRIX差异审计》G1（学习专区章节碎片化）、《20260913_七政四余P1批次交付报告》（P0/P1 主体）
- **状态**：✅ 全部完成并公网上线（源代码提交 → 构建 → 部署 → 原子切流 → 公网验证全流程）

---

## 一、本批次目标（GAP G1 闭环）

| 差异项 | 现状 | 目标 | 结果 |
|---|---|---|---|
| 135 条知识点散落 56 个章节 | 学科页按章节平铺，学习路径碎片化 | 归并为 15 学习专题，由浅入深 | ✅ 15 专题全部上线 |
| 练习题无体系化分组 | 141 题平铺展示 | 按专题归组为"专题练习" | ✅ 141/141 归组成功 |
| 打卡粒度粗 | 按章节打卡，同章节跨专题状态混淆 | 精确到知识点级打卡 | ✅ `qz-kp-{id}` 点级打卡 |
| 141 题质量未核验 | 未知 | 绑定/章节一致/去重/分层全查 | ✅ 四维全过，无需修复 |

## 二、15 学习专题映射设计（135 条知识点全覆盖）

映射原则：**每条知识点恰属一个专题，不改动服务端数据，仅前端归组**。id 依据 `academy.db knowledge_points`（track=yixue, category=七政四余）。

| # | 专题 | 点数 | 题数 | 内容要点 |
|---|---|---|---|---|
| 1 | 入门导读 | 11 | 14 | 学习路径 · 流派选择 · 星盘类比模型 · 中国占星时空观 · 五行生克四时 |
| 2 | 七政星曜 | 11 | 15 | 日月五星名目布宫 · 星性总纲 · 各曜性情（玉衡经）· 行度躔次 |
| 3 | 四余星曜 | 3 | 3 | 紫炁月孛罗睺计都 · 名目五行 · 君子小人之分 · 政余关系 |
| 4 | 十二宫位 | 5 | 5 | 十二地支宫位 · 名目次序 · 强宫弱宫 · 宫主度主 · 宫分所属 |
| 5 | 十二人事宫 | 5 | 5 | 人事宫义 · 起法冲合 · 十二宫守拱照活看法 |
| 6 | 二十八宿 | 4 | 5 | 四象七宿 · 宿度度数 · 度数所在宫 |
| 7 | 星制与排盘 | 6 | 8 | 黄道恒星之争 · 立命分歧 · 宫度之争 · 昼夜百刻 · 定寅时 |
| 8 | 安身立命 | 6 | 5 | 定命宫命度 · 量天尺 · 身宫身度 · 三主总义 · 身命二主 |
| 9 | 神煞体系 | 16 | 14 | 年支月将神煞 · 空亡孤虚 · 桃花驿马 · 神煞综合应用 |
| 10 | 十干化曜 | 9 | 6 | 化曜口诀 · 天禄十曜 · 禄勋贵人 · 三元四元 · 天马地驿 |
| 11 | 星格格局 | 24 | 19 | 垣殿庙旺 · 忌躔恩难 · 贵格贱格 · 八格赋 · 女命格 · 补遗格局 |
| 12 | 大限行限 | 8 | 10 | 洞微百六限 · 童限出限 · 行限度法 · 三减关 · 倒限论 |
| 13 | 流年太岁 | 2 | 3 | 原局与限流关系 · 太岁冲限 · 钓起飞来 |
| 14 | 常用术语 | 8 | 10 | 对拱夹照迎送 · 明晦升沉 · 时令调候 · 凶吉综合 |
| 15 | 案例与歌赋 | 17 | 19 | 郑氏星案 · 看盘十法 · 二十四秘法 · 象赋歌赋 · 断命总纲 |
| **合计** | | **135** | **141** | |

> 专题学习路径：入门 → 星曜（七政/四余）→ 宫位体系（地支宫/人事宫/28宿）→ 排盘（星制）→ 命身 → 神煞化曜 → 格局 → 限流 → 术语 → 案例歌赋。

## 三、模块交付验证说明

### 3.1 新增文件

| 文件 | 作用 |
|---|---|
| `src/lib/qizhengLearningTopics.ts` | 15 专题配置（key/seq/name/icon/desc/pointIds），`qizhengTopicOfPoint()` 映射函数，`QIZHENG_TOPIC_TOTAL=135` 导出 |
| `scripts/verify_qizheng_topics.mjs` | 专题映射完整性验证（对服务器导出的 135 条真实数据核验） |
| `scripts/verify_qizheng_quiz_grouping.mjs` | 141 题专题分组验证（模拟前端分组算法） |
| `scripts/qz_questions_check.js` / `qz_questions_dump.js` | 141 题质量核验与绑定数据导出（服务器端 better-sqlite3 只读） |
| `scripts/qz_pub_verify.sh` / `qz_e2e_token.sh` | 公网页面状态码验证 / 登录态（JWT）API 数据通路验证 |
| `deploy_v25_0_80b.sh` | 本批次部署脚本（内容门禁 + 原子切流 + 公网立检） |

### 3.2 修改文件与关键实现

**`src/lib/yixueSubjects.ts`**
- `YixueSubject` 接口新增可选字段 `topics?: QizhengLearningTopic[]`（有则专题分组，无则章节分组——其他 7 学科零影响）；
- 七政学科引入 `topics: QIZHENG_LEARNING_TOPICS`，intro 更新为十五专题学习路径描述。

```typescript
export interface YixueSubject {
  ...
  /** 可选：专题化学习路径（有则按专题分组，否则按章节分组） */
  topics?: QizhengLearningTopic[];
}
```

**`src/app/academy/yixue/[key]/ClientPage.tsx`**
1. 专题模式判定与分组：
```typescript
const hasTopics = (subject.topics?.length ?? 0) > 0;
const topicGroups = useMemo(() => {
  if (!hasTopics || !subject.topics) return null;
  const byId = new Map(points.map((p) => [Number(p.id), p]));
  return subject.topics
    .map((t) => ({ topic: t, kps: t.pointIds.map((id) => byId.get(id)).filter(Boolean) as KnowledgeVo[] }))
    .filter((g) => g.kps.length > 0);
}, [points, subject, hasTopics]);
```
2. 练习按 `knowledgeId → 专题` 归组（`quizGroups`），未映射题落入"综合练习"兜底组（实际 0 题）；
3. 知识点级打卡（专题模式 key 为 `qz-kp-{pointId}`）：
```typescript
const kpKey = useCallback(
  (p: KnowledgeVo) => (hasTopics ? `yixue:qz-kp-${p.id}` : `yixue:${p.chapter || p.title}`),
  [hasTopics]
);
const r = await checkinProgress("yixue", hasTopics ? `qz-kp-${p.id}` : p.chapter || p.title);
```
4. 专题卡片：icon 徽标 + 专题序号 + 描述 + **专题内打卡进度 n/m**（学满变绿）；练习卡片：题数徽标；Tab 文案自适应（学习专题/专题练习）；
5. 题卡抽取为 `renderQuestion()` 共用渲染（分组/平铺一致体验）；
6. 顺手修复既有类型缺陷：`kpResps/qResps` 加类型断言（Promise.all 联合类型收窄，tsc 本文件 0 错误）。

### 3.3 141 题质量核验结果（服务器 academy.db 实查）

| 核验维度 | 结果 | 结论 |
|---|---|---|
| knowledge_id 绑定 | 141/141 bound | ✅ 全绑定 |
| 题目章节 vs 绑定知识点章节一致性 | 0 不一致 | ✅ 完全对齐 |
| 题干重复（stem 前 40 字） | 0 组重复 | ✅ 无重复（q_hash1 空 42 条为历史字段，实际无重复，不影响） |
| 绑定到不存在知识点 | 0 | ✅ 引用完整 |
| 题型分布 | single 89 / judge 37 / fill 7 / multi 3 / qa 4 / case 1 | ✅ 合理 |
| 难度分层 | easy 56 / medium 55 / hard 30 | ✅ 三层均衡 |
| 状态 | 141 approved | ✅ 全可用 |
| 无题知识点 | 23 条 | 节要/纲要/考据类纯阅读知识点（性情断语、歌赋节要等），不出题合理 |

## 四、验证记录

### 4.1 本地验证
- **tsc**：修改的 3 个文件 0 错误（其余 26 个为 admin 既有错误，`ignoreBuildErrors` 覆盖，非本批次引入）；
- **next build**：exit 0，2033 文件 27.8MB，`out/academy/yixue/qizheng/index.html` 生成，新代码烧录 chunk（`学习专题`/`qz-kp-`/`专题练习` 均命中）；
- **映射验证**（`node scripts/verify_qizheng_topics.mjs`）：15 专题、135 点、无重复、服务器 135 条全映射（无遗漏/无多余）→ **全部 PASS**；
- **分组验证**（`node scripts/verify_qizheng_quiz_grouping.mjs`）：141/141 归入专题、0 兜底组、15 专题全有题 → **全部 PASS**。

### 4.2 服务器部署与公网验证（全流程）

1. **源代码提交**：`63cc9b5`（39 文件 +5318 行）；
2. **构建**：本地 `npm run build` → tar（6.2MB）→ scp；
3. **部署**：解压 `/root/yandaoguoxue/releases/v25.0.80b`（2033 文件）；
4. **内容门禁**（全过）：本批次特征（学习专题 tab / qz-kp- 打卡 / 专题练习分组 / 感应图层 / 原流相并 / 导出隐私模式 / 七政两页面存在）+ v25.0.80 回归（全局返回键 / 黄历古籍注解 / 手机号码解析 / AI 免责声明 / 易学 10 页 / tools 42 页 / sitemap 69 URL / IP 零泄漏 / 无"吉凶"合规）；
5. **原子切流**：`current → releases/v25.0.80b`（symlink 原子切换）；
6. **公网立检**：
   - `version.json` → `v25.0.80_D20260913B` ✅
   - `/academy/yixue/qizheng/`（七政学习页）→ **200** ✅
   - `/yixue/qizheng/`（七政排盘页）→ **200** ✅
   - 首页 / 记录页 / 易学中心 → 200 ✅；黄历古籍注解 ✅；首页无"吉凶" ✅；API health ✅
7. **登录态数据通路**（JWT Bearer，公网）：
   - knowledge API → `success:true, points:135`（53 章节）✅
   - questions API → `success:true, questions:141, bound 141/141` ✅
   - progress API → `success:true` ✅

> 过程修复两处部署脚本问题：① trailingSlash 规范化导致无斜杠 URL 301（验证 URL 统一带尾斜杠）；② `set -o pipefail` 下 `curl | grep -q` 的 SIGPIPE 陷阱（141 退出码，改为两步式落盘检查）。

## 五、GAP 差异闭环状态更新

| GAP | 差异项 | 状态 |
|---|---|---|
| G1 | 学习专区章节碎片化（135 点/56 章） | ✅ **本批次闭环**（15 专题 + 141 题归组 + 点级打卡） |
| G1b | 141 题质量未知 | ✅ **本批次闭环**（四维核验全过，无需修复） |
| P0 | 真太阳时/Profile/DST/边界/回归 | ✅ 前批次闭环（63cc9b5） |
| P1-1~P1-5 | 图层/流年/圈层/缩放/导出 | ✅ 前批次闭环（63cc9b5，报告 QIZHENG-P1-BATCH） |

## 六、遗留与下一步

1. **增长**：中医自学/医考题库/易学/七政集群 SEO 页面（GAP 矩阵增长线）；
2. **微信**：4 批/月 MONTHLY_BATCH_SCHEDULER 生产生效跟踪；
3. **Apple ASC**：真实状态核实（需 Owner 配合登录 App Store Connect）；
4. **安卓同步**：本批次为 Web 端学堂内容，App 内 WebView 同源生效；如需 App 发版提示再议。

---

**验收方式**：登录 https://yandaoguoxue.yandao.vip → 学堂 → 易学学习中心 → 七政四余，即可见"学习专题 135 / 专题练习 141"双 Tab，15 专题卡片由浅入深排列，展开可学知识点（打卡精确到点）与专题练习。
