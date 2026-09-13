/**
 * 七政四余学习专区 15 专题体系（GAP G1 闭环：135 条知识点 → 15 学习专题）
 * 映射原则：每条知识点恰属一个专题；不改动服务端数据，仅前端归组展示。
 * id 依据 academy.db knowledge_points（track=yixue, category=七政四余, 共 135 条）。
 */

export interface QizhengLearningTopic {
  key: string;
  seq: number;
  name: string;
  icon: string;
  desc: string;
  pointIds: number[];
}

export const QIZHENG_LEARNING_TOPICS: QizhengLearningTopic[] = [
  {
    key: "qz-intro",
    seq: 1,
    name: "入门导读",
    icon: "启",
    desc: "学习路径 · 流派选择 · 星盘类比模型 · 中国占星时空观",
    pointIds: [34, 253, 254, 255, 256, 257, 260, 261, 10747, 10748, 10749],
  },
  {
    key: "qz-qizheng",
    seq: 2,
    name: "七政星曜",
    icon: "日",
    desc: "日月五星名目布宫 · 星性总纲 · 各曜性情 · 行度躔次",
    pointIds: [37, 10734, 10738, 10739, 10740, 10756, 10757, 10758, 10759, 10760, 10761],
  },
  {
    key: "qz-siyu",
    seq: 3,
    name: "四余星曜",
    icon: "余",
    desc: "紫炁月孛罗睺计都 · 名目五行所属 · 君子小人之分",
    pointIds: [10735, 10736, 10737],
  },
  {
    key: "qz-gong",
    seq: 4,
    name: "十二宫位",
    icon: "宫",
    desc: "十二地支宫位 · 名目次序 · 强宫弱宫 · 宫主度主 · 宫分所属",
    pointIds: [38, 10744, 10745, 10746, 10755],
  },
  {
    key: "qz-renshi",
    seq: 5,
    name: "十二人事宫",
    icon: "人",
    desc: "人事宫义 · 起法冲合 · 十二宫守拱照活看法",
    pointIds: [39, 10766, 10832, 10833, 10834],
  },
  {
    key: "qz-28xiu",
    seq: 6,
    name: "二十八宿",
    icon: "宿",
    desc: "四象七宿 · 宿度度数 · 度数所在宫",
    pointIds: [40, 10741, 10742, 10743],
  },
  {
    key: "qz-xingzhi",
    seq: 7,
    name: "星制与排盘",
    icon: "制",
    desc: "黄道恒星之争 · 立命分歧 · 宫度之争 · 定时刻制度",
    pointIds: [35, 36, 258, 259, 10770, 10771],
  },
  {
    key: "qz-mingshen",
    seq: 8,
    name: "安身立命",
    icon: "命",
    desc: "定命宫命度 · 量天尺 · 身宫身度 · 三主总义",
    pointIds: [42, 10762, 10763, 10764, 10783, 10784],
  },
  {
    key: "qz-shensha",
    seq: 9,
    name: "神煞体系",
    icon: "煞",
    desc: "年支月将神煞 · 空亡孤虚 · 桃花驿马 · 综合应用",
    pointIds: [41, 10789, 10790, 10791, 10792, 10793, 10794, 10795, 10796, 10797, 10798, 10799, 10800, 10801, 10802, 10803],
  },
  {
    key: "qz-huayao",
    seq: 10,
    name: "十干化曜",
    icon: "化",
    desc: "化曜口诀 · 天禄十曜 · 禄勋贵人 · 三元四元 · 天马地驿",
    pointIds: [10750, 10751, 10752, 10753, 10754, 10785, 10786, 10787, 10788],
  },
  {
    key: "qz-geju",
    seq: 11,
    name: "星格格局",
    icon: "格",
    desc: "垣殿庙旺 · 忌躔恩难 · 贵格贱格 · 八格赋 · 女命格",
    pointIds: [
      10772, 10773, 10774, 10775, 10776, 10777, 10778, 10779, 10780, 10781, 10782,
      10811, 10812, 10813, 10814, 10815, 10816, 10817, 10818, 10819, 10820, 10821, 10822, 10823,
    ],
  },
  {
    key: "qz-daxian",
    seq: 12,
    name: "大限行限",
    icon: "限",
    desc: "洞微百六限 · 童限出限 · 行限度法 · 倒限论",
    pointIds: [43, 10765, 10804, 10805, 10806, 10807, 10808, 10809],
  },
  {
    key: "qz-liunian",
    seq: 13,
    name: "流年太岁",
    icon: "岁",
    desc: "原局与限流关系 · 太岁冲限 · 钓起飞来",
    pointIds: [252, 10810],
  },
  {
    key: "qz-term",
    seq: 14,
    name: "常用术语",
    icon: "语",
    desc: "对拱夹照迎送 · 明晦升沉 · 时令调候 · 凶吉综合",
    pointIds: [44, 45, 46, 47, 48, 10767, 10768, 10769],
  },
  {
    key: "qz-anli",
    seq: 15,
    name: "案例与歌赋",
    icon: "案",
    desc: "郑氏星案 · 看盘十法 · 二十四秘法 · 象赋歌赋 · 断命总纲",
    pointIds: [49, 50, 251, 262, 10824, 10825, 10826, 10827, 10828, 10829, 10830, 10831, 10835, 10836, 10837, 10838, 10839],
  },
];

/** pointId → 专题（Map 缓存） */
const TOPIC_OF_POINT = new Map<number, QizhengLearningTopic>();
for (const t of QIZHENG_LEARNING_TOPICS) {
  for (const id of t.pointIds) TOPIC_OF_POINT.set(id, t);
}

export function qizhengTopicOfPoint(pointId: number | string): QizhengLearningTopic | undefined {
  const id = typeof pointId === "string" ? Number(pointId) : pointId;
  return Number.isFinite(id) ? TOPIC_OF_POINT.get(id) : undefined;
}

/** 专题总点数（校验用：应 = 135） */
export const QIZHENG_TOPIC_TOTAL = QIZHENG_LEARNING_TOPICS.reduce((s, t) => s + t.pointIds.length, 0);
