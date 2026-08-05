/**
 * 穴位信息静态数据服务 v18.2
 * 原 /api/scrape-acupoint API 路由改为静态数据模块（适配 output:export 静态部署）
 * 所有穴位数据预编译为静态字典，无需运行时 API 调用
 */
"use client";

// ==================== 类型 ====================
interface ScrapeResult {
  detail: string;
  image_url: string;
  needling_method: string;
  fetched_at: string;
  source: string;
  needs_refetch: boolean;
}

// ==================== 穴位详细定位静态数据 ====================
const ACUPOINT_DETAILS: Record<string, string> = {
  "中府": "在胸前壁外上方，前正中线旁开6寸，平第1肋间隙处。简便取穴：正坐或仰卧，在锁骨下窝外侧，肩胛骨喙突内下方，平第1肋间隙。",
  "尺泽": "在肘横纹中，肱二头肌腱桡侧凹陷处。简便取穴：微屈肘，在肘横纹上，肱二头肌腱桡侧缘凹陷中。",
  "列缺": "在前臂桡侧缘，桡骨茎突上方，腕横纹上1.5寸，当肱桡肌与拇长展肌腱之间。简便取穴：两手虎口交叉，一手食指按在另一手桡骨茎突上，指尖下凹陷中。",
  "太渊": "在腕掌侧横纹桡侧，桡动脉搏动处。简便取穴：仰掌，在腕横纹桡侧，桡动脉桡侧凹陷中。",
  "鱼际": "在手拇指本节（第1掌指关节）后凹陷处，约当第1掌骨中点桡侧，赤白肉际处。",
  "少商": "在手拇指末节桡侧，距指甲角0.1寸。简便取穴：拇指桡侧指甲角旁约0.1寸。",
  "商阳": "在手食指末节桡侧，距指甲角0.1寸。",
  "合谷": "在手背，第1、2掌骨间，当第2掌骨桡侧中点处。简便取穴：以一手的拇指指骨关节横纹，放在另一手拇、食指之间的指蹼缘上，拇指尖下即是。",
  "曲池": "在肘横纹外侧端，屈肘，当尺泽与肱骨外上髁连线中点。简便取穴：屈肘成直角，肘横纹外侧端凹陷处。",
  "迎香": "在鼻翼外缘中点旁，当鼻唇沟中。",
  "足三里": "在小腿前外侧，当犊鼻下3寸，距胫骨前缘一横指（中指）。简便取穴：屈膝，外膝眼下3寸，胫骨外侧约一横指处。",
  "天枢": "在腹中部，脐中旁开2寸。",
  "梁丘": "屈膝，在大腿前面，当髂前上棘与髌底外侧端的连线上，髌底上2寸。",
  "三阴交": "在小腿内侧，当足内踝尖上3寸，胫骨内侧缘后方。简便取穴：内踝尖直上3寸（四横指），胫骨内侧缘后方。",
  "阴陵泉": "在小腿内侧，当胫骨内侧髁后下方凹陷处。",
  "血海": "屈膝，在大腿内侧，髌底内侧端上2寸，当股四头肌内侧头的隆起处。",
  "神门": "在腕部，腕掌侧横纹尺侧端，尺侧腕屈肌腱的桡侧凹陷处。",
  "少海": "屈肘，在肘横纹内侧端与肱骨内上髁连线的中点处。",
  "后溪": "在手掌尺侧，微握拳，当第5掌指关节后的远侧掌横纹头赤白肉际。",
  "听宫": "在面部，耳屏前，下颌骨髁状突的后方，张口时呈凹陷处。",
  "睛明": "在面部，目内眦角稍上方凹陷处。",
  "肺俞": "在背部，当第3胸椎棘突下，旁开1.5寸。",
  "心俞": "在背部，当第5胸椎棘突下，旁开1.5寸。",
  "肝俞": "在背部，当第9胸椎棘突下，旁开1.5寸。",
  "脾俞": "在背部，当第11胸椎棘突下，旁开1.5寸。",
  "肾俞": "在腰部，当第2腰椎棘突下，旁开1.5寸。",
  "委中": "在腘横纹中点，当股二头肌腱与半腱肌腱的中间。",
  "承山": "在小腿后面正中，委中与昆仑之间，当伸直小腿或足跟上提时腓肠肌肌腹下出现尖角凹陷处。",
  "昆仑": "在足部外踝后方，当外踝尖与跟腱之间的凹陷处。",
  "涌泉": "在足底部，卷足时足前部凹陷处，约当足底第2、3趾趾缝纹头端与足跟连线的前1/3与后2/3交点上。",
  "太溪": "在足内侧，内踝后方，当内踝尖与跟腱之间的凹陷处。",
  "照海": "在足内侧，内踝尖下方凹陷处。",
  "内关": "在前臂掌侧，当曲泽与大陵的连线上，腕横纹上2寸，掌长肌腱与桡侧腕屈肌腱之间。",
  "大陵": "在腕掌横纹的中点处，当掌长肌腱与桡侧腕屈肌腱之间。",
  "劳宫": "在手掌心，当第2、3掌骨之间，偏于第3掌骨，握拳屈指时中指尖处。",
  "外关": "在前臂背侧，当阳池与肘尖的连线上，腕背横纹上2寸，尺骨与桡骨之间。",
  "翳风": "在耳垂后方，当乳突与下颌角之间的凹陷处。",
  "风池": "在项部，当枕骨之下，与风府相平，胸锁乳突肌与斜方肌上端之间的凹陷处。",
  "环跳": "在股外侧部，侧卧屈股，当股骨大转子最凸点与骶管裂孔连线的外1/3与中1/3交点处。",
  "阳陵泉": "在小腿外侧，当腓骨小头前下方凹陷处。",
  "悬钟": "在小腿外侧，当外踝尖上3寸，腓骨前缘。",
  "太冲": "在足背侧，当第1、2跖骨结合部之前凹陷处。",
  "期门": "在胸部，当乳头直下，第6肋间隙，前正中线旁开4寸。",
  "章门": "在侧腹部，当第11肋游离端的下方。",
  "百会": "在头部，当前发际正中直上5寸，或两耳尖连线的中点处。",
  "大椎": "在后正中线上，第7颈椎棘突下凹陷中。",
  "命门": "在腰部，当后正中线上，第2腰椎棘突下凹陷中。",
  "风府": "在项部，当后发际正中直上1寸，枕外隆凸直下，两侧斜方肌之间凹陷中。",
  "水沟": "在面部，当人中沟的上1/3与中1/3交点处。",
  "关元": "在下腹部，前正中线上，当脐中下3寸。",
  "气海": "在下腹部，前正中线上，当脐中下1.5寸。",
  "中脘": "在上腹部，前正中线上，当脐中上4寸。",
  "膻中": "在胸部，当前正中线上，平第4肋间，两乳头连线的中点。",
  "天突": "在颈部，当前正中线上，胸骨上窝中央。",
};

// ==================== 进针方法静态数据 ====================
const NEEDLING_METHODS: Record<string, string> = {
  "尺泽": "直刺0.5-0.8寸，或点刺出血。可灸。",
  "列缺": "向上斜刺0.3-0.5寸。可灸。",
  "太渊": "避开桡动脉，直刺0.3-0.5寸。可灸。",
  "少商": "浅刺0.1寸，或点刺出血。可灸。",
  "商阳": "浅刺0.1寸，或点刺出血。可灸。",
  "合谷": "直刺0.5-1寸。可灸。孕妇禁针。",
  "曲池": "直刺1-1.5寸。可灸。",
  "迎香": "斜刺或平刺0.3-0.5寸。不宜灸。",
  "足三里": "直刺1-2寸。可灸。强壮保健常用灸法。",
  "三阴交": "直刺1-1.5寸。可灸。孕妇禁针。",
  "阴陵泉": "直刺1-2寸。可灸。",
  "神门": "直刺0.3-0.5寸。可灸。",
  "后溪": "直刺0.5-1寸。可灸。",
  "委中": "直刺1-1.5寸，或用三棱针点刺腘静脉出血。可灸。",
  "涌泉": "直刺0.5-1寸。可灸。",
  "太溪": "直刺0.5-1寸。可灸。",
  "内关": "直刺0.5-1寸。可灸。",
  "外关": "直刺0.5-1寸。可灸。",
  "风池": "针尖微下，向鼻尖斜刺0.8-1.2寸，或平刺透风府穴。深部中间为延髓，必须严格掌握针刺角度与深度。可灸。",
  "阳陵泉": "直刺1-1.5寸。可灸。",
  "太冲": "直刺0.5-0.8寸。可灸。",
  "百会": "平刺0.5-0.8寸。可灸。",
  "大椎": "向上斜刺0.5-1寸。可灸。",
  "关元": "直刺1-1.5寸，需排尿后进行。可灸。孕妇慎用。",
  "气海": "直刺1-1.5寸。可灸。孕妇慎用。",
  "中脘": "直刺1-1.5寸。可灸。",
  "膻中": "平刺0.3-0.5寸。可灸。",
  "天突": "先直刺0.2寸，然后将针尖转向下方，紧靠胸骨后方刺入1-1.5寸。必须严格掌握针刺角度和深度，以防刺伤肺脏和动脉。可灸。",
  "肺俞": "斜刺0.5-0.8寸。可灸。",
  "心俞": "斜刺0.5-0.8寸。可灸。",
  "肝俞": "斜刺0.5-0.8寸。可灸。",
  "脾俞": "斜刺0.5-0.8寸。可灸。",
  "肾俞": "直刺0.5-1寸。可灸。",
  "承山": "直刺1-2寸。可灸。",
  "昆仑": "直刺0.5-1寸。可灸。孕妇禁针。",
  "血海": "直刺1-1.5寸。可灸。",
  "睛明": "嘱患者闭目，医者左手轻推眼球向外侧固定，右手缓慢进针，紧靠眶缘直刺0.5-1寸。不捻转，不提插（或只轻微捻转）。出针后按压针孔片刻，以防出血。禁灸。",
  "听宫": "张口，直刺1-1.5寸。可灸。",
  "翳风": "直刺0.5-1寸。可灸。",
  "环跳": "直刺2-3寸。可灸。",
  "悬钟": "直刺0.5-0.8寸。可灸。",
  "章门": "斜刺0.5-0.8寸。可灸。",
  "期门": "斜刺或平刺0.5-0.8寸。可灸。",
  "命门": "向上斜刺0.5-1寸。可灸。",
  "水沟": "向上斜刺0.3-0.5寸，或用指甲按掐。不灸。",
  "风府": "正坐，头微前倾，项部放松，向下颌方向缓慢刺入0.5-1寸。针尖不可向上，以免刺入枕骨大孔，误伤延髓。可灸。",
  "劳宫": "直刺0.3-0.5寸。可灸。",
  "大陵": "直刺0.3-0.5寸。可灸。",
  "照海": "直刺0.5-0.8寸。可灸。",
  "天枢": "直刺1-1.5寸。可灸。孕妇不可灸。",
  "梁丘": "直刺1-1.2寸。可灸。",
  "中府": "向外斜刺或平刺0.5-0.8寸，不可向内深刺，以免伤及肺脏。可灸。",
  "鱼际": "直刺0.5-0.8寸。可灸。",
  "少海": "直刺0.5-1寸。可灸。",
};

// ==================== 图片URL静态数据 ====================
const IMAGE_URLS: Record<string, string> = {
  "合谷": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/LI4.jpg/200px-LI4.jpg",
  "足三里": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/ST36.jpg/200px-ST36.jpg",
  "百会": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/GV20.jpg/200px-GV20.jpg",
  "内关": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/PC6.jpg/200px-PC6.jpg",
  "三阴交": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/SP6.jpg/200px-SP6.jpg",
  "太冲": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/LR3.jpg/200px-LR3.jpg",
  "涌泉": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/KI1.jpg/200px-KI1.jpg",
  "风池": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/GB20.jpg/200px-GB20.jpg",
  "大椎": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/GV14.jpg/200px-GV14.jpg",
  "关元": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/CV4.jpg/200px-CV4.jpg",
};

// ==================== localStorage 缓存 ====================
const LOCAL_CACHE_KEY = "tcm_scrape_cache";

function getLocalCache(): Record<string, ScrapeResult> {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalCacheEntry(id: string, data: ScrapeResult): void {
  const cache = getLocalCache();
  cache[id] = data;
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

// ==================== 静态数据获取 ====================

function buildResult(name: string, meridian: string): ScrapeResult {
  const detail = ACUPOINT_DETAILS[name] || `${name}位于${meridian}上。具体定位：请参考《针灸学》国家标准（GB/T 12346-2006）或《经络腧穴学》教材。`;
  const image_url = IMAGE_URLS[name] || "";
  const needling_method = NEEDLING_METHODS[name] || `请在专业医师指导下确定进针角度、深度和手法。一般可直刺0.5-1寸，具体深度需根据穴位部位和患者体型调整。`;
  return {
    detail,
    image_url,
    needling_method,
    fetched_at: new Date().toISOString(),
    source: "静态预编译数据（参考《针灸学》国家标准）",
    needs_refetch: false,
  };
}

/** 获取已缓存的穴位信息 */
export function getCachedAcupointInfo(
  id: string,
  type: "acupoint" | "dong" = "acupoint"
): ScrapeResult | null {
  const local = getLocalCache();
  if (local[id]) return local[id];
  return null;
}

/** 获取穴位信息（静态数据，无需网络请求） */
export function triggerScrape(
  id: string,
  name: string,
  meridian: string,
  type: "acupoint" | "dong" = "acupoint"
): ScrapeResult | null {
  const result = buildResult(name, meridian);
  setLocalCacheEntry(id, result);
  return result;
}

/** 标记需要重新抓取（静态模式下仅为清除缓存） */
export function markForRefetch(
  id: string,
  type: "acupoint" | "dong" = "acupoint"
): boolean {
  const cache = getLocalCache();
  if (cache[id]) {
    cache[id].needs_refetch = true;
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cache));
    } catch { /* ignore */ }
    return true;
  }
  return false;
}

export function getLocalCachedInfo(id: string): ScrapeResult | null {
  return getCachedAcupointInfo(id);
}

export function setLocalCachedInfo(id: string, data: ScrapeResult): void {
  setLocalCacheEntry(id, data);
}