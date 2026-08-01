/**
 * 原始来源：tcm-cli (MIT License)
 * 原始版本：v1.0
 * 修改记录：2026-07-26 通过导入 JSON 数据源完成实现
 * 当前协议：MIT
 *
 * 合规改造说明：
 * - 原始数据来源于 tcm-cli 项目
 * - 仅保留学习用途字段：经络名称、穴位名称、位置、功能
 * - 已移除任何涉及医疗操作、针刺指导的字段
 * - 穴位定位数据为经典文献记载，仅供学习参考
 *
 * 数据来源：tcm-cli内置数据 + 针灸甲乙经等经典文献
 * 提取日期：2026-07-26
 * 总计经络：12条，穴位：20个（完整数据见 data/meridians.json）
 */

import type { TcmMeridian, TcmAcupoint } from '../../types/tcm';

// ============================================================================
// 经络分类映射
// ============================================================================

function getMeridianCategory(name: string): string {
  const yinMeridians = ['肝经', '心经', '脾经', '肺经', '肾经', '心包经'];
  const handMeridians = ['肺经', '心经', '心包经', '大肠经', '小肠经', '三焦经'];
  if (name === '督脉') return '奇经八脉';
  if (name === '任脉') return '奇经八脉';
  if (yinMeridians.includes(name)) {
    return handMeridians.includes(name) ? '手三阴经' : '足三阴经';
  }
  return handMeridians.includes(name) ? '手三阳经' : '足三阳经';
}

// ============================================================================
// 经络路径描述（基于经典文献）
// ============================================================================

const MERIDIAN_PATHWAYS: Record<string, string> = {
  '肝经': '起于足大趾，沿足背内踝前，上行经小腿内侧、大腿内侧，绕阴部，过小腹，挟胃属肝络胆，上贯膈布胁肋，循喉咙，连目系，上出额与督脉会于巅。',
  '心经': '起于心中，出属心系，下膈络小肠。其支者从心系上挟咽系目系；其直者复从心系却上肺，下出腋下，循臂内后廉，抵掌后锐骨之端，入掌内后廉，循小指之内出其端。',
  '脾经': '起于足大趾，循趾内侧白肉际，上内踝前廉，循胫骨后，交出厥阴之前，上膝股内前廉，入腹属脾络胃，上膈挟咽，连舌本散舌下。',
  '肺经': '起于中焦，下络大肠，还循胃口，上膈属肺，从肺系横出腋下，循臂内前廉，入寸口，循鱼际，出大指之端。',
  '肾经': '起于足小趾之下，斜走足心，出然骨之下，循内踝之后，别入跟中，以上踹内，出腘内廉，上股内后廉，贯脊属肾络膀胱。',
  '胆经': '起于目锐眦，上抵头角，下耳后，循颈至肩上，却交出手少阳之后，入缺盆。其支者从耳后入耳中，出走耳前；其直者从缺盆下腋循胸过季胁，下合髀厌中，循髀阳出膝外廉，下外辅骨之前，直下抵绝骨之端，下出外踝之前，循足跗上入小指次指之间。',
  '小肠经': '起于手小指之端，循手外侧上腕，出踝中，直上循臂骨下廉，出肘内侧两筋之间，上循臑外后廉，出肩解绕肩胛，交肩上，入缺盆络心，循咽下膈，抵胃属小肠。',
  '胃经': '起于鼻之交頞中，旁纳太阳之脉，下循鼻外，入上齿中，还出挟口环唇，下交承浆，却循颐后下廉，出大迎循颊车，上耳前过客主人，循发际至额颅。其支者从大迎前下人迎，循喉咙入缺盆，下膈属胃络脾。',
  '大肠经': '起于手大指次指之端，循指上廉，出合谷两骨之间，上入两筋之中，循臂上廉，入肘外廉，上臑外前廉，上肩出髃骨之前廉，上出于柱骨之会上，下入缺盆络肺，下膈属大肠。',
  '膀胱经': '起于目内眦，上额交巅。其支者从巅至耳上角；其直者从巅入络脑，还出别下项，循肩膊内挟脊，抵腰中，入循膂络肾属膀胱。',
  '心包经': '起于胸中，出属心包络，下膈历络三焦。其支者循胸出胁，下腋三寸，上抵腋下，循臑内行太阴少阴之间，入肘中，下臂行两筋之间，入掌中，循中指出其端。',
  '三焦经': '起于手小指次指之端，上出两指之间，循手表腕，出臂外两骨之间，上贯肘，循臑外上肩，而交出足少阳之后，入缺盆，布膻中，散络心包，下膈循属三焦。',
  '督脉': '起于胞中，下出会阴，后行于腰背正中，循脊柱上行，经项后部至风府，入脑，上巅顶，沿前额下行至鼻柱，总督一身之阳经，为阳脉之海。',
  '任脉': '起于胞中，下出会阴，向前上行于阴毛部位，沿腹部和胸部正中线上行，经咽喉，至下颌部，环绕口唇，沿面颊分行至两目眶下，总任一身之阴经，为阴脉之海。',
};

// ============================================================================
// 经络库（12条经络，全部内嵌）
// 数据来源：tcm-cli 经络穴位数据库
// ============================================================================

const RAW_MERIDIANS: Array<{
  name: string;
  pinyin: string;
  english: string;
  element: string;
  yin_yang: string;
  paired: string;
}> = [
  { name: '肝经', pinyin: 'Gān Jīng', english: 'Liver Meridian', element: '木 (Wood)', yin_yang: 'Yin', paired: '胆经' },
  { name: '心经', pinyin: 'Xīn Jīng', english: 'Heart Meridian', element: '火 (Fire)', yin_yang: 'Yin', paired: '小肠经' },
  { name: '脾经', pinyin: 'Pí Jīng', english: 'Spleen Meridian', element: '土 (Earth)', yin_yang: 'Yin', paired: '胃经' },
  { name: '肺经', pinyin: 'Fèi Jīng', english: 'Lung Meridian', element: '金 (Metal)', yin_yang: 'Yin', paired: '大肠经' },
  { name: '肾经', pinyin: 'Shèn Jīng', english: 'Kidney Meridian', element: '水 (Water)', yin_yang: 'Yin', paired: '膀胱经' },
  { name: '胆经', pinyin: 'Dǎn Jīng', english: 'Gallbladder Meridian', element: '木 (Wood)', yin_yang: 'Yang', paired: '肝经' },
  { name: '小肠经', pinyin: 'Xiǎo Cháng Jīng', english: 'Small Intestine Meridian', element: '火 (Fire)', yin_yang: 'Yang', paired: '心经' },
  { name: '胃经', pinyin: 'Wèi Jīng', english: 'Stomach Meridian', element: '土 (Earth)', yin_yang: 'Yang', paired: '脾经' },
  { name: '大肠经', pinyin: 'Dà Cháng Jīng', english: 'Large Intestine Meridian', element: '金 (Metal)', yin_yang: 'Yang', paired: '肺经' },
  { name: '膀胱经', pinyin: 'Páng Guāng Jīng', english: 'Bladder Meridian', element: '水 (Water)', yin_yang: 'Yang', paired: '肾经' },
  { name: '心包经', pinyin: 'Xīn Bāo Jīng', english: 'Pericardium Meridian', element: '火 (Fire)', yin_yang: 'Yin', paired: '三焦经' },
  { name: '三焦经', pinyin: 'Sān Jiāo Jīng', english: 'Triple Burner Meridian', element: '火 (Fire)', yin_yang: 'Yang', paired: '心包经' },
  { name: '督脉', pinyin: 'Dū Mài', english: 'Governor Vessel', element: '奇经八脉', yin_yang: '阳脉之海', paired: '任脉' },
  { name: '任脉', pinyin: 'Rèn Mài', english: 'Conception Vessel', element: '奇经八脉', yin_yang: '阴脉之海', paired: '督脉' },
];

/**
 * 经络穴位库（12条经络，全部内嵌）
 * 免责声明：穴位定位数据为经典文献记载，仅供学习参考
 */
export const MERIDIANS_DB: TcmMeridian[] = RAW_MERIDIANS.map((m, idx) => ({
  id: `m${String(idx + 1).padStart(2, '0')}`,
  name: m.name,
  pinyin: m.pinyin,
  category: getMeridianCategory(m.name),
  element: m.element,
  yin_yang: m.yin_yang,
  paired: m.paired,
  points: [], // 穴位通过 acupoints 数据关联
  pathway: MERIDIAN_PATHWAYS[m.name] || '详见经典文献记载',
}));

// ============================================================================
// 穴位库（20个穴位，全部内嵌）
// 数据来源：tcm-cli 经络穴位数据库
// ============================================================================

const RAW_ACUPOINTS: TcmAcupoint[] = [
  {
    name: '百会', pinyin: 'Bǎi Huì', code: 'DU20', meridian: '督脉',
    location: '头顶正中，两耳尖连线中点',
    location_detail: '前发际正中直上5寸',
    function: '升阳举陷，醒脑开窍',
    literature: '《针灸甲乙经》',
  },
  {
    name: '风池', pinyin: 'Fēng Chí', code: 'GB20', meridian: '胆经',
    location: '项部，枕骨之下，胸锁乳突肌与斜方肌上端之间的凹陷中',
    location_detail: '与风府相平',
    function: '疏风清热，醒脑开窍',
    literature: '《针灸甲乙经》',
  },
  {
    name: '合谷', pinyin: 'Hé Gǔ', code: 'LI4', meridian: '大肠经',
    location: '手背，第1、2掌骨间，第2掌骨桡侧中点',
    location_detail: '以一手拇指指骨关节横纹放在另一手拇食指间指蹼缘上，拇指尖下即是',
    function: '疏风解表，通络镇痛',
    literature: '《针灸甲乙经》',
  },
  {
    name: '足三里', pinyin: 'Zú Sān Lǐ', code: 'ST36', meridian: '胃经',
    location: '小腿外侧，犊鼻下3寸，胫骨前嵴外一横指',
    location_detail: '犊鼻与解溪连线上',
    function: '健脾和胃，扶正培元',
    literature: '《针灸甲乙经》',
  },
  {
    name: '三阴交', pinyin: 'Sān Yīn Jiāo', code: 'SP6', meridian: '脾经',
    location: '小腿内侧，内踝尖上3寸，胫骨内侧缘后方',
    location_detail: '足内踝尖直上3寸',
    function: '健脾利湿，调补肝肾',
    literature: '《针灸甲乙经》',
  },
  {
    name: '太冲', pinyin: 'Tài Chōng', code: 'LR3', meridian: '肝经',
    location: '足背侧，第1、2趾骨结合部前方凹陷中',
    location_detail: '第1跖骨间隙后方凹陷处',
    function: '平肝熄风，疏肝理气',
    literature: '《针灸甲乙经》',
  },
  {
    name: '内关', pinyin: 'Nèi Guān', code: 'PC6', meridian: '心包经',
    location: '前臂掌侧，腕横纹上2寸，掌长肌腱与桡侧腕屈肌腱之间',
    location_detail: '曲泽与大陵连线上',
    function: '宁心安神，理气止痛',
    literature: '《针灸甲乙经》',
  },
  {
    name: '关元', pinyin: 'Guān Yuán', code: 'RN4', meridian: '任脉',
    location: '下腹部，前正中线上，脐下3寸',
    location_detail: '脐中下3寸',
    function: '培补元气，益肾固精',
    literature: '《针灸甲乙经》',
  },
  {
    name: '气海', pinyin: 'Qì Hǎi', code: 'RN6', meridian: '任脉',
    location: '下腹部，前正中线上，脐下1.5寸',
    location_detail: '脐中下1.5寸',
    function: '补气益肾，调经固精',
    literature: '《针灸甲乙经》',
  },
  {
    name: '涌泉', pinyin: 'Yǒng Quán', code: 'KI1', meridian: '肾经',
    location: '足底部，足前部凹陷处，第2、3趾趾缝纹头端与足跟连线前1/3处',
    location_detail: '卷足时足前部凹陷处',
    function: '滋阴益肾，醒脑开窍',
    literature: '《针灸甲乙经》',
  },
  {
    name: '曲池', pinyin: 'Qū Chí', code: 'LI11', meridian: '大肠经',
    location: '肘横纹外侧端，屈肘时尺泽与肱骨外上髁连线中点',
    location_detail: '屈肘成直角，肘横纹外端凹陷处',
    function: '清热解表，疏经通络',
    literature: '《针灸甲乙经》',
  },
  {
    name: '大椎', pinyin: 'Dà Zhuī', code: 'DU14', meridian: '督脉',
    location: '后正中线上，第7颈椎棘突下凹陷中',
    location_detail: '低头时颈部最突出骨头下方',
    function: '清热解表，通阳散寒',
    literature: '《针灸甲乙经》',
  },
  {
    name: '命门', pinyin: 'Mìng Mén', code: 'DU4', meridian: '督脉',
    location: '腰部，后正中线上，第2腰椎棘突下凹陷中',
    location_detail: '与脐相对',
    function: '温肾壮阳，强腰固精',
    literature: '《针灸甲乙经》',
  },
  {
    name: '太溪', pinyin: 'Tài Xī', code: 'KI3', meridian: '肾经',
    location: '足内侧，内踝后方，内踝尖与跟腱之间凹陷处',
    location_detail: '内踝尖与跟腱之间',
    function: '滋阴益肾，清热利湿',
    literature: '《针灸甲乙经》',
  },
  {
    name: '神门', pinyin: 'Shén Mén', code: 'HT7', meridian: '心经',
    location: '腕部，腕横纹尺侧端，尺侧腕屈肌腱桡侧凹陷处',
    location_detail: '腕掌侧横纹尺侧端',
    function: '宁心安神，清心调气',
    literature: '《针灸甲乙经》',
  },
  {
    name: '中脘', pinyin: 'Zhōng Wǎn', code: 'RN12', meridian: '任脉',
    location: '上腹部，前正中线上，脐上4寸',
    location_detail: '胸骨下端与脐连线中点',
    function: '健脾和胃，消食导滞',
    literature: '《针灸甲乙经》',
  },
  {
    name: '天枢', pinyin: 'Tiān Shū', code: 'ST25', meridian: '胃经',
    location: '腹部，脐旁2寸',
    location_detail: '脐中旁开2寸',
    function: '调理肠胃，理气消滞',
    literature: '《针灸甲乙经》',
  },
  {
    name: '阳陵泉', pinyin: 'Yáng Líng Quán', code: 'GB34', meridian: '胆经',
    location: '小腿外侧，腓骨小头前下方凹陷处',
    location_detail: '腓骨小头前下方',
    function: '疏肝利胆，舒筋活络',
    literature: '《针灸甲乙经》',
  },
  {
    name: '列缺', pinyin: 'Liè Quē', code: 'LU7', meridian: '肺经',
    location: '前臂桡侧，桡骨茎突上方，腕横纹上1.5寸',
    location_detail: '两手虎口交叉，食指指尖所至凹陷处',
    function: '宣肺解表，通经活络',
    literature: '《针灸甲乙经》',
  },
  {
    name: '丰隆', pinyin: 'Fēng Lóng', code: 'ST40', meridian: '胃经',
    location: '小腿前外侧，外踝尖上8寸，胫骨前嵴外二横指',
    location_detail: '条口外一横指',
    function: '化痰祛湿，和胃降逆',
    literature: '《针灸甲乙经》',
  },
];

/**
 * 穴位库（20个常用穴位，全部内嵌）
 * 免责声明：穴位定位为经典文献记载，仅供学习参考，不构成医疗操作指导
 */
export const ACUPOINTS_DB: TcmAcupoint[] = RAW_ACUPOINTS;

// ============================================================================
// 搜索经络
// ============================================================================

/**
 * 搜索经络
 * @param keyword 关键词（支持名称、穴位名、功能匹配）
 * @returns 匹配的经络列表
 */
export function searchMeridians(keyword: string): TcmMeridian[] {
  if (!keyword || keyword.trim() === '') {
    return MERIDIANS_DB;
  }
  const kw = keyword.toLowerCase();
  return MERIDIANS_DB.filter(
    (m) =>
      m.name.includes(kw) ||
      m.category.includes(kw) ||
      m.pathway.includes(kw) ||
      m.points.some((p) => p.name.includes(kw) || p.function.includes(kw))
  );
}

/**
 * 根据ID获取经络详情
 */
export function getMeridianById(id: string): TcmMeridian | undefined {
  return MERIDIANS_DB.find((m) => m.id === id);
}

/**
 * 根据名称获取经络详情
 */
export function getMeridianByName(name: string): TcmMeridian | undefined {
  return MERIDIANS_DB.find((m) => m.name === name);
}

// ============================================================================
// 搜索穴位
// ============================================================================

/**
 * 搜索穴位
 * @param keyword 关键词（支持名称、拼音、编码、所属经络、功能匹配）
 * @returns 匹配的穴位列表
 */
export function searchAcupoints(keyword: string): TcmAcupoint[] {
  if (!keyword || keyword.trim() === '') {
    return ACUPOINTS_DB;
  }
  const kw = keyword.toLowerCase();
  return ACUPOINTS_DB.filter(
    (pt) =>
      pt.name.includes(kw) ||
      pt.pinyin.toLowerCase().includes(kw) ||
      pt.code.toLowerCase().includes(kw) ||
      pt.meridian.includes(kw) ||
      pt.function.includes(kw) ||
      pt.location.includes(kw)
  );
}

/**
 * 根据编码获取穴位详情
 */
export function getAcupointByCode(code: string): TcmAcupoint | undefined {
  return ACUPOINTS_DB.find((pt) => pt.code === code);
}

/**
 * 根据名称获取穴位详情
 */
export function getAcupointByName(name: string): TcmAcupoint | undefined {
  return ACUPOINTS_DB.find((pt) => pt.name === name);
}

/**
 * 获取指定经络的所有穴位
 */
export function getAcupointsByMeridian(meridianName: string): TcmAcupoint[] {
  return ACUPOINTS_DB.filter((pt) => pt.meridian === meridianName);
}

// ============================================================================
// 完整数据库加载（异步）
// ============================================================================

let fullMeridiansLoaded = false;

interface RawMeridianSource {
  name: string;
  pinyin: string;
  english: string;
  element: string;
  yin_yang: string;
  paired: string;
}

interface RawAcupointSource {
  name: string;
  pinyin: string;
  code: string;
  meridian: string;
  location: string;
  location_detail: string;
  function: string;
  literature: string;
}

/**
 * 加载完整经络穴位数据库（从 data/meridians.json）
 * 覆盖内嵌的12条经络和20个穴位，提供完整数据
 *
 * 重要：此函数为异步加载，首次调用后会缓存结果
 */
export async function loadFullMeridiansDatabase(): Promise<{
  meridians: TcmMeridian[];
  acupoints: TcmAcupoint[];
}> {
  if (fullMeridiansLoaded) {
    return { meridians: MERIDIANS_DB, acupoints: ACUPOINTS_DB };
  }

  try {
    const response = await fetch('/algorithm-core/modules/tcm/data/meridians.json');
    const data = await response.json();
    const rawMeridians: RawMeridianSource[] = data.meridians || [];
    const rawAcupoints: RawAcupointSource[] = data.acupoints || [];

    // 更新经络
    const updatedMeridians = rawMeridians.map((m, idx) => ({
      id: `m${String(idx + 1).padStart(2, '0')}`,
      name: m.name,
      pinyin: m.pinyin,
      category: getMeridianCategory(m.name),
      element: m.element,
      yin_yang: m.yin_yang,
      paired: m.paired,
      points: rawAcupoints
        .filter((pt) => pt.meridian === m.name)
        .map((pt) => ({
          name: pt.name,
          location: pt.location,
          function: pt.function,
        })),
      pathway: MERIDIAN_PATHWAYS[m.name] || '详见经典文献记载',
    }));

    // 合并到全局数据库
    if (updatedMeridians.length > 0) {
      (MERIDIANS_DB as TcmMeridian[]).splice(0, MERIDIANS_DB.length, ...updatedMeridians);
    }
    if (rawAcupoints.length > 0) {
      (ACUPOINTS_DB as TcmAcupoint[]).splice(0, ACUPOINTS_DB.length, ...rawAcupoints);
    }

    fullMeridiansLoaded = true;
    return { meridians: MERIDIANS_DB, acupoints: ACUPOINTS_DB };
  } catch (error) {
    console.warn(
      '[TCM meridians] 无法加载完整数据库，使用内嵌数据。',
      error
    );
    fullMeridiansLoaded = true;
    return { meridians: MERIDIANS_DB, acupoints: ACUPOINTS_DB };
  }
}