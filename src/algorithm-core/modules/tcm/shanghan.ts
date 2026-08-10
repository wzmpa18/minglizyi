/**
 * 原始来源：nihaixia (MulanPSL-2.0 License)
 * 原始版本：v1.0
 * 修改记录：2026-07-26 通过导入 JSON 数据源完成实现
 * 当前协议：MulanPSL-2.0
 *
 * 合规改造说明：
 * - 原始数据来源于 nihaixia 项目的伤寒论六经辨证模块
 * - 仅保留辨证学习的对照展示功能
 * - 辨证逻辑仅保留后台计算能力，前端按「证型对照学习」模式展示
 * - 所有数据标注"典籍记载"来源，明确区分于医疗诊断
 * - 前后端分离，前端仅展示学习对照内容
 * - 本数据基于倪海厦人纪系列讲义蒸馏，非原始古籍原文
 *
 * 数据来源：nihaixia/modules (基于倪海厦人纪系列讲义蒸馏)
 * 来源项目：https://github.com/jangviktor-web/nihaixia
 * 提取日期：2026-07-26
 * 总计典籍条目：1037条（完整数据见 data/shanghan_texts.json）
 */

import type { TcmSyndrome, TcmDiagnosisResult } from '../../types/tcm';

// ============================================================================
// 伤寒论六经辨证对照表（10个证型，内嵌）
// 基于倪海厦人纪系列讲义蒸馏
// ============================================================================

/**
 * 伤寒论六经辨证对照表
 *
 * 重要说明：此内容仅供典籍学习对照使用，不构成医疗诊断。
 * 展示的是症状与典籍记载证型的对应关系，而非诊断结果。
 */
export const SHANGHAN_SYNDROMES: TcmSyndrome[] = [
  // ---- 太阳病 ----
  {
    name: '太阳病·中风证（桂枝汤证）',
    description: '外感风寒表虚证，风寒袭表，卫强营弱。太阳病，发热，汗出，恶风，脉缓。',
    symptoms: ['发热', '汗出', '恶风', '脉缓', '头痛', '鼻鸣', '干呕'],
    formulas: ['桂枝汤'],
    score: 0,
  },
  {
    name: '太阳病·伤寒证（麻黄汤证）',
    description: '外感风寒表实证，风寒束表，卫阳被遏。太阳病，或已发热，或未发热，必恶寒，体痛，呕逆，脉阴阳俱紧。',
    symptoms: ['恶寒', '发热', '无汗', '头身疼痛', '腰痛', '骨节疼痛', '气喘', '脉浮紧'],
    formulas: ['麻黄汤', '大青龙汤'],
    score: 0,
  },
  // ---- 阳明病 ----
  {
    name: '阳明病·经证（白虎汤证）',
    description: '阳明气分热盛，里热炽盛，充斥内外。身大热，汗大出，口大渴，脉洪大（四大症）。',
    symptoms: ['壮热', '面赤', '大汗出', '烦渴引饮', '舌苔黄燥', '脉洪大有力'],
    formulas: ['白虎汤', '白虎加人参汤'],
    score: 0,
  },
  {
    name: '阳明病·腑实证（承气汤证）',
    description: '阳明腑实，燥屎内结。阳明病，其人多汗，津液外出，胃中燥，大便必硬。',
    symptoms: ['潮热', '谵语', '大便秘结', '腹满硬痛', '拒按', '舌苔黄燥起刺', '脉沉实'],
    formulas: ['大承气汤', '小承气汤', '调胃承气汤'],
    score: 0,
  },
  // ---- 少阳病 ----
  {
    name: '少阳病·半表半里证（小柴胡汤证）',
    description: '少阳枢机不利，胆火上炎，正邪分争于半表半里。往来寒热，胸胁苦满，默默不欲饮食，心烦喜呕。',
    symptoms: ['往来寒热', '胸胁苦满', '口苦', '咽干', '目眩', '心烦喜呕', '不欲饮食', '脉弦'],
    formulas: ['小柴胡汤', '大柴胡汤'],
    score: 0,
  },
  // ---- 太阴病 ----
  {
    name: '太阴病·脾虚寒湿证（理中汤证）',
    description: '太阴脾虚，寒湿内盛。腹满而吐，食不下，自利益甚，时腹自痛。',
    symptoms: ['腹满', '呕吐', '食不下', '下利', '时腹自痛', '口不渴', '舌淡苔白', '脉缓弱'],
    formulas: ['理中汤'],
    score: 0,
  },
  // ---- 少阴病 ----
  {
    name: '少阴病·寒化证（四逆汤证）',
    description: '少阴心肾阳虚，阴寒内盛。少阴病，脉微细，但欲寐。阴盛格阳于外，则四肢厥逆。',
    symptoms: ['脉微细', '但欲寐', '四肢厥冷', '恶寒蜷卧', '下利清谷', '小便清长', '舌淡苔白'],
    formulas: ['四逆汤'],
    score: 0,
  },
  {
    name: '少阴病·热化证（黄连阿胶汤证）',
    description: '少阴阴虚，心肾不交，虚火上炎。少阴病，得之二三日以上，心中烦，不得卧。',
    symptoms: ['心中烦', '不得卧', '口燥咽干', '舌红少苔', '脉细数'],
    formulas: ['黄连阿胶汤'],
    score: 0,
  },
  // ---- 厥阴病 ----
  {
    name: '厥阴病·寒热错杂证（乌梅丸证）',
    description: '厥阴病，上热下寒，寒热错杂。消渴，气上撞心，心中疼热，饥而不欲食，食则吐蛔，下之利不止。',
    symptoms: ['消渴', '气上撞心', '心中疼热', '饥不欲食', '吐蛔', '手足厥冷', '下利'],
    formulas: ['乌梅丸'],
    score: 0,
  },
  {
    name: '厥阴病·血虚寒厥证（当归四逆汤证）',
    description: '厥阴血虚寒凝，经脉不利。手足厥寒，脉细欲绝。',
    symptoms: ['手足厥寒', '脉细欲绝', '四肢冷痛', '面色苍白', '畏寒', '舌淡苔白'],
    formulas: ['当归四逆汤'],
    score: 0,
  },
];

// ============================================================================
// 症状到证型的匹配关键词映射
// ============================================================================

const SYNDROME_KEYWORD_MAP: Array<{
  syndromeIndex: number;
  keywords: string[];
}> = [
  // 太阳中风
  { syndromeIndex: 0, keywords: ['发热', '汗出', '恶风', '怕风', '脉缓', '头痛', '鼻鸣', '干呕', '中风', '有汗'] },
  // 太阳伤寒
  { syndromeIndex: 1, keywords: ['恶寒', '怕冷', '无汗', '身痛', '腰痛', '骨节痛', '气喘', '脉浮紧', '伤寒', '头痛', '发热'] },
  // 阳明经证
  { syndromeIndex: 2, keywords: ['壮热', '高热', '大汗', '烦渴', '口渴', '脉洪大', '面赤'] },
  // 阳明腑实
  { syndromeIndex: 3, keywords: ['潮热', '谵语', '便秘', '大便硬', '腹满', '腹痛', '拒按', '舌苔黄燥', '脉沉实'] },
  // 少阳证
  { syndromeIndex: 4, keywords: ['寒热往来', '忽冷忽热', '胸胁苦满', '口苦', '咽干', '目眩', '心烦', '喜呕', '脉弦', '胁痛'] },
  // 太阴证
  { syndromeIndex: 5, keywords: ['腹满', '呕吐', '食不下', '食欲差', '下利', '腹泻', '腹痛', '脉缓弱', '舌淡'] },
  // 少阴寒化
  { syndromeIndex: 6, keywords: ['脉微细', '嗜睡', '欲寐', '四肢厥冷', '手足冷', '四逆', '畏寒', '蜷卧', '下利清谷'] },
  // 少阴热化
  { syndromeIndex: 7, keywords: ['心烦', '不得卧', '失眠', '不寐', '口燥', '咽干', '脉细数', '舌红少苔'] },
  // 厥阴寒热错杂
  { syndromeIndex: 8, keywords: ['消渴', '气上撞心', '心中疼热', '饥不欲食', '吐蛔', '手足厥', '寒热错杂'] },
  // 厥阴血虚寒厥
  { syndromeIndex: 9, keywords: ['手足厥寒', '脉细欲绝', '四肢冷痛', '面色苍白', '血虚', '寒厥'] },
];

// ============================================================================
// 辨证学习功能
// ============================================================================

/**
 * 基于症状的六经辨证对照学习
 *
 * 重要说明：此功能仅供典籍学习对照使用，不构成医疗诊断。
 * 展示的是症状与典籍记载证型的对应关系，而非诊断结果。
 *
 * 算法：基于关键词匹配计算每个证型的匹配分数，按分数降序排列
 *
 * @param symptoms 症状列表
 * @returns 典籍对应证型学习结果
 */
export function studySyndromeMatch(symptoms: string[]): TcmDiagnosisResult {
  if (!symptoms || symptoms.length === 0) {
    return {
      symptoms: [],
      syndromes: [],
      disclaimer: '本内容仅供中医典籍学习研究使用，不构成任何医疗诊断、用药建议。请勿自行用药，身体不适请及时前往正规医疗机构就诊。',
    };
  }

  const scoredSyndromes: TcmSyndrome[] = SHANGHAN_SYNDROMES.map((syndrome, index) => {
    const mapEntry = SYNDROME_KEYWORD_MAP[index];
    if (!mapEntry) return { ...syndrome, score: 0 };

    let score = 0;
    for (const symptom of symptoms) {
      for (const keyword of mapEntry.keywords) {
        if (symptom.includes(keyword) || keyword.includes(symptom)) {
          score += 1;
        }
      }
    }

    return { ...syndrome, score };
  });

  // 按分数降序排列，过滤分数为0的
  const matched = scoredSyndromes
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    symptoms,
    syndromes: matched,
    disclaimer: '本内容仅供中医典籍学习研究使用，不构成任何医疗诊断、用药建议。以上证型对照为典籍原文记载，非诊断结果。请勿自行用药，身体不适请及时前往正规医疗机构就诊。',
  };
}

// ============================================================================
// 典籍文本搜索
// ============================================================================

interface ClassicTextEntry {
  classic: string;
  chapter: string;
  subchapter: string;
  subsection: string;
  content_preview: string;
  content_lines: number;
  source_mark: string;
  disclaimer: string;
}

let classicTextsDB: ClassicTextEntry[] = [];

/**
 * 搜索典籍文本
 *
 * 在1037条典籍条目中搜索，支持按典籍名、章节、内容关键词筛选。
 * 首次调用时自动从 data/shanghan_texts.json 加载完整数据。
 *
 * @param keyword 搜索关键词
 * @param options 筛选选项
 * @returns 匹配的典籍条目
 */
export async function searchClassicTexts(
  keyword: string,
  options?: {
    classic?: string;   // 按典籍名称筛选（如"伤寒论"）
    chapter?: string;   // 按章节筛选
    limit?: number;     // 返回结果数限制
  }
): Promise<ClassicTextEntry[]> {
  // 首次加载
  if (classicTextsDB.length === 0) {
    try {
      const response = await fetch('/data/tcm/shanghan_texts.json');
      const data = await response.json();
      classicTextsDB = data.texts || [];
    } catch (error) {
      console.warn('[TCM shanghan] 无法加载典籍文本库。', error);
      return [];
    }
  }

  let results = classicTextsDB;

  // 按典籍筛选
  if (options?.classic) {
    results = results.filter((t) => t.classic === options.classic);
  }

  // 按章节筛选
  if (options?.chapter) {
    results = results.filter((t) => t.chapter.includes(options!.chapter!));
  }

  // 按关键词搜索
  if (keyword && keyword.trim() !== '') {
    const kw = keyword.toLowerCase();
    results = results.filter(
      (t) =>
        t.classic.includes(kw) ||
        t.chapter.includes(kw) ||
        t.subchapter.includes(kw) ||
        t.subsection.includes(kw) ||
        t.content_preview.includes(kw)
    );
  }

  // 限制结果数
  if (options?.limit && options.limit > 0) {
    results = results.slice(0, options.limit);
  }

  return results;
}

/**
 * 获取典籍文本条目总数
 */
export async function getClassicTextsCount(): Promise<number> {
  if (classicTextsDB.length === 0) {
    try {
      const response = await fetch('/data/tcm/shanghan_texts.json');
      const data = await response.json();
      classicTextsDB = data.texts || [];
    } catch {
      return 0;
    }
  }
  return classicTextsDB.length;
}

/**
 * 获取所有典籍名称列表
 */
export async function getClassicNames(): Promise<string[]> {
  if (classicTextsDB.length === 0) {
    try {
      const response = await fetch('/algorithm-core/modules/tcm/data/shanghan_texts.json');
      const data = await response.json();
      classicTextsDB = data.texts || [];
    } catch {
      return [];
    }
  }
  const names = new Set(classicTextsDB.map((t) => t.classic));
  return Array.from(names).sort();
}