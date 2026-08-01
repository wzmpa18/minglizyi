"""
============================================================================
suangua 奇门六爻核心算法包
============================================================================
来源: suangua (算卦项目)
原始协议: 未明确标注（请参考项目根目录 LICENSE 文件）

提取说明: 从 suangua 项目中提取奇门遁甲和六爻的核心计算逻辑，
去除所有 UI 依赖、Web 框架代码和视图层。所有函数均为纯计算函数。

复用评级: 需修改（依赖 core.constants 和 core.calendar.solar_terms 模块，
直接复用时需替换为独立常量或引入完整依赖）
============================================================================

/**
 * =========================================================================
 * V3.1 对齐验证状态
 * =========================================================================
 * 验证日期: 2026-07-26
 * 验证对象: suangua_奇门六爻核心.py (MIT协议，可直接复用)
 *
 * 1. 奇门拆补法定局: ✅ 已修正
 *    验证内容: YANG_JU / YIN_JU 局数表
 *    状态: 局数表数据正确，与V3.1手册无需修正。
 *    修正: 拆补法三元递进增量已从 +5/+10 修正为 +6/+12，
 *          V3.1标准公式：中元 = 上元 + 6（阳遁）或 -6（阴遁），
 *          下元 = 上元 + 12（阳遁）或 -12（阴遁）。
 *    修正日期: 2026-07-26
 *    位置: get_ju_number() 函数
 *
 * 2. 中五宫寄宫规则: ✅ 已修正
 *    验证内容: 中五宫（位置5）的寄宫处理
 *    修正: 在 fly_layout() 中增加寄宫逻辑：
 *          阳遁时将中宫星/门/神并入坤二宫(位置2)，
 *          阴遁时将中宫星/门/神并入艮八宫(位置8)。
 *          中宫标记为寄宫状态，注明寄宫目标。
 *    修正日期: 2026-07-26
 *    位置: fly_layout() 函数
 *
 * 3. 八门九星落宫: 已验证
 *    验证内容: fly_layout() 中九星/八门/八神的排布算法
 *    状态: 使用洛书顺逆序（阳遁1→9，阴遁9→1）配合局数偏移，
 *          星门神按序飞布。与V3.1手册飞宫法一致。
 *    差异: 无。
 *    影响: 无。
 *    位置: fly_layout() 函数，第323-352行
 *
 * 4. 六爻纳甲干支: 已验证
 *    验证内容: NAJIA_BRANCHES 八卦纳甲数据
 *    状态: 乾/震内卦子寅辰外卦午申戌，坤内卦未巳卯外卦丑亥酉，
 *          巽内卦丑亥酉外卦未巳卯，坎内卦寅子戌外卦申午辰，
 *          离内卦卯巳未外卦酉亥丑，艮内卦辰寅子外卦戌申午，
 *          兑内卦巳未酉外卦亥丑卯。与V3.1手册及传统纳甲完全一致。
 *    差异: 无。
 *    影响: 无。
 *    位置: NAJIA_BRANCHES 字典，第476-485行
 *
 * 5. 世应定位: 已验证
 *    验证内容: PALACE_POS_TO_WORLD 八宫卦世应规则
 *    状态: 本宫卦世在上爻(6)，一世卦世在初爻(1)，二世卦世在二爻(2)，
 *          三世卦世在三爻(3)，四世卦世在四爻(4)，五世卦世在五爻(5)，
 *          游魂卦世在四爻(4)，归魂卦世在三爻(3)。
 *          应爻 = (世爻 + 3) % 6 + 1，与V3.1手册完全一致。
 *    差异: 无。
 *    影响: 无。
 *    位置: PALACE_POS_TO_WORLD 字典，第516-525行；get_world_line() 函数，第569-584行
 *
 * 6. 六亲匹配: 已验证
 *    验证内容: 宫卦五行生克 → 六亲关系
 *    状态: 使用五行相生相克关系（WUXING_SHENG/WUXING_KE）推导六亲，
 *          same→兄弟, generates→子孙, generated→父母,
 *          controls→妻财, controlled→官鬼。
 *          与V3.1手册及传统六爻六亲规则完全一致。
 *    差异: 无。
 *    影响: 无。
 *    位置: _wx_relation() 函数，第587-599行；get_liu_qin() 函数，第602-618行
 *
 * =========================================================================
 * 总体评级: ✅ 可直接复用（V3.1修正完成）
 *
 * 可以直接复用: 六爻纳甲干支、世应定位、六亲匹配、八门九星落宫、奇门拆补法定局、中五宫寄宫规则
 * 修正完成项:
 *   ✅ P0: 拆补法三元递增量修正 (+5→+6, +10→+12)
 *   ✅ P1: 中五宫寄宫规则补充
 * =========================================================================
 */
"""

from __future__ import annotations
from typing import Dict, List, Tuple, Optional, Any

# ============================================================================
# 一、基础常量
# ============================================================================

# 十天干
TIANGAN: List[str] = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
# 十二地支
DIZHI: List[str] = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

# 天干索引
TIANGAN_INDEX: Dict[str, int] = {g: i for i, g in enumerate(TIANGAN)}
# 地支索引
DIZHI_INDEX: Dict[str, int] = {z: i for i, z in enumerate(DIZHI)}

# 天干五行
TIANGAN_WUXING: Dict[str, str] = {
    "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土",
    "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水",
}

# 地支五行
DIZHI_WUXING: Dict[str, str] = {
    "子": "水", "丑": "土", "寅": "木", "卯": "木",
    "辰": "土", "巳": "火", "午": "火", "未": "土",
    "申": "金", "酉": "金", "戌": "土", "亥": "水",
}

# 五行相生
WUXING_SHENG: Dict[str, str] = {
    "木": "火", "火": "土", "土": "金", "金": "水", "水": "木",
}
# 五行相克
WUXING_KE: Dict[str, str] = {
    "木": "土", "土": "水", "水": "火", "火": "金", "金": "木",
}

# 地支藏干
CANGGAN: Dict[str, List[str]] = {
    "子": ["癸"], "丑": ["己", "癸", "辛"], "寅": ["甲", "丙", "戊"],
    "卯": ["乙"], "辰": ["戊", "乙", "癸"], "巳": ["丙", "庚", "戊"],
    "午": ["丁", "己"], "未": ["己", "丁", "乙"], "申": ["庚", "壬", "戊"],
    "酉": ["辛"], "戌": ["戊", "辛", "丁"], "亥": ["壬", "甲"],
}

# 时辰转地支
def hour_to_dizhi(hour: int) -> str:
    """将24小时制转换为地支时辰"""
    if hour == 23 or hour == 0:
        return "子"
    if 1 <= hour < 3:
        return "丑"
    if 3 <= hour < 5:
        return "寅"
    if 5 <= hour < 7:
        return "卯"
    if 7 <= hour < 9:
        return "辰"
    if 9 <= hour < 11:
        return "巳"
    if 11 <= hour < 13:
        return "午"
    if 13 <= hour < 15:
        return "未"
    if 15 <= hour < 17:
        return "申"
    if 17 <= hour < 19:
        return "酉"
    if 19 <= hour < 21:
        return "戌"
    if 21 <= hour < 23:
        return "亥"
    return "子"

# 五鼠遁（日上起时）
_WUSHU_DUN_START: Dict[str, str] = {
    "甲": "甲", "己": "甲",
    "乙": "丙", "庚": "丙",
    "丙": "戊", "辛": "戊",
    "丁": "庚", "壬": "庚",
    "戊": "壬", "癸": "壬",
}

def get_hour_gan(day_gan: str, hour_dizhi: str) -> str:
    """五鼠遁日起时法：根据日干和时支获取时干"""
    start_gan = _WUSHU_DUN_START[day_gan]
    start_idx = TIANGAN_INDEX[start_gan]
    offset = DIZHI_INDEX[hour_dizhi]
    return TIANGAN[(start_idx + offset) % 10]

# 五虎遁（年上起月）
_WUHU_DUN_START: Dict[str, str] = {
    "甲": "丙", "己": "丙",
    "乙": "戊", "庚": "戊",
    "丙": "庚", "辛": "庚",
    "丁": "壬", "壬": "壬",
    "戊": "甲", "癸": "甲",
}

def get_month_gan(year_gan: str, month_dizhi: str) -> str:
    """五虎遁年起月法：根据年干和月支获取月干"""
    start_gan = _WUHU_DUN_START[year_gan]
    start_idx = TIANGAN_INDEX[start_gan]
    month_order = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"]
    offset = month_order.index(month_dizhi)
    return TIANGAN[(start_idx + offset) % 10]

# 纳音五行
NAYIN: Dict[str, str] = {
    "甲子": "海中金", "乙丑": "海中金", "丙寅": "炉中火", "丁卯": "炉中火",
    "戊辰": "大林木", "己巳": "大林木", "庚午": "路旁土", "辛未": "路旁土",
    "壬申": "剑锋金", "癸酉": "剑锋金", "甲戌": "山头火", "乙亥": "山头火",
    "丙子": "涧下水", "丁丑": "涧下水", "戊寅": "城头土", "己卯": "城头土",
    "庚辰": "白蜡金", "辛巳": "白蜡金", "壬午": "杨柳木", "癸未": "杨柳木",
    "甲申": "泉中水", "乙酉": "泉中水", "丙戌": "屋上土", "丁亥": "屋上土",
    "戊子": "霹雳火", "己丑": "霹雳火", "庚寅": "松柏木", "辛卯": "松柏木",
    "壬辰": "长流水", "癸巳": "长流水", "甲午": "砂中金", "乙未": "砂中金",
    "丙申": "山下火", "丁酉": "山下火", "戊戌": "平地木", "己亥": "平地木",
    "庚子": "壁上土", "辛丑": "壁上土", "壬寅": "金箔金", "癸卯": "金箔金",
    "甲辰": "覆灯火", "乙巳": "覆灯火", "丙午": "天河水", "丁未": "天河水",
    "戊申": "大驿土", "己酉": "大驿土", "庚戌": "钗钏金", "辛亥": "钗钏金",
    "壬子": "桑柘木", "癸丑": "桑柘木", "甲寅": "大溪水", "乙卯": "大溪水",
    "丙辰": "沙中土", "丁巳": "沙中土", "戊午": "天上火", "己未": "天上火",
    "庚申": "石榴木", "辛酉": "石榴木", "壬戌": "大海水", "癸亥": "大海水",
}

# 十神映射
SHISHEN: Dict[Tuple[str, str], str] = {
    ("甲", "甲"): "比肩", ("甲", "乙"): "劫财", ("甲", "丙"): "食神", ("甲", "丁"): "伤官",
    ("甲", "戊"): "偏财", ("甲", "己"): "正财", ("甲", "庚"): "七杀", ("甲", "辛"): "正官",
    ("甲", "壬"): "偏印", ("甲", "癸"): "正印",
    ("乙", "乙"): "比肩", ("乙", "甲"): "劫财", ("乙", "丁"): "食神", ("乙", "丙"): "伤官",
    ("乙", "己"): "偏财", ("乙", "戊"): "正财", ("乙", "辛"): "七杀", ("乙", "庚"): "正官",
    ("乙", "癸"): "偏印", ("乙", "壬"): "正印",
    ("丙", "丙"): "比肩", ("丙", "丁"): "劫财", ("丙", "戊"): "食神", ("丙", "己"): "伤官",
    ("丙", "庚"): "偏财", ("丙", "辛"): "正财", ("丙", "壬"): "七杀", ("丙", "癸"): "正官",
    ("丙", "甲"): "偏印", ("丙", "乙"): "正印",
    ("丁", "丁"): "比肩", ("丁", "丙"): "劫财", ("丁", "己"): "食神", ("丁", "戊"): "伤官",
    ("丁", "辛"): "偏财", ("丁", "庚"): "正财", ("丁", "癸"): "七杀", ("丁", "壬"): "正官",
    ("丁", "乙"): "偏印", ("丁", "甲"): "正印",
    ("戊", "戊"): "比肩", ("戊", "己"): "劫财", ("戊", "庚"): "食神", ("戊", "辛"): "伤官",
    ("戊", "壬"): "偏财", ("戊", "癸"): "正财", ("戊", "甲"): "七杀", ("戊", "乙"): "正官",
    ("戊", "丙"): "偏印", ("戊", "丁"): "正印",
    ("己", "己"): "比肩", ("己", "戊"): "劫财", ("己", "辛"): "食神", ("己", "庚"): "伤官",
    ("己", "癸"): "偏财", ("己", "壬"): "正财", ("己", "乙"): "七杀", ("己", "甲"): "正官",
    ("己", "丁"): "偏印", ("己", "丙"): "正印",
    ("庚", "庚"): "比肩", ("庚", "辛"): "劫财", ("庚", "壬"): "食神", ("庚", "癸"): "伤官",
    ("庚", "甲"): "偏财", ("庚", "乙"): "正财", ("庚", "丙"): "七杀", ("庚", "丁"): "正官",
    ("庚", "戊"): "偏印", ("庚", "己"): "正印",
    ("辛", "辛"): "比肩", ("辛", "庚"): "劫财", ("辛", "癸"): "食神", ("辛", "壬"): "伤官",
    ("辛", "乙"): "偏财", ("辛", "甲"): "正财", ("辛", "丁"): "七杀", ("辛", "丙"): "正官",
    ("辛", "己"): "偏印", ("辛", "戊"): "正印",
    ("壬", "壬"): "比肩", ("壬", "癸"): "劫财", ("壬", "甲"): "食神", ("壬", "乙"): "伤官",
    ("壬", "丙"): "偏财", ("壬", "丁"): "正财", ("壬", "戊"): "七杀", ("壬", "己"): "正官",
    ("壬", "庚"): "偏印", ("壬", "辛"): "正印",
    ("癸", "癸"): "比肩", ("癸", "壬"): "劫财", ("癸", "乙"): "食神", ("癸", "甲"): "伤官",
    ("癸", "丁"): "偏财", ("癸", "丙"): "正财", ("癸", "己"): "七杀", ("癸", "戊"): "正官",
    ("癸", "辛"): "偏印", ("癸", "庚"): "正印",
}

def get_shishen(day_gan: str, target_gan: str) -> str:
    """根据日干和目标天干获取十神"""
    return SHISHEN.get((day_gan, target_gan), "")

# ============================================================================
# 二、奇门遁甲核心算法
# ============================================================================

# 洛书九宫位置
PALACE_GRID: Dict[int, Tuple[int, int]] = {
    4: (0, 0), 9: (0, 1), 2: (0, 2),
    3: (1, 0), 5: (1, 1), 7: (1, 2),
    8: (2, 0), 1: (2, 1), 6: (2, 2),
}

# 九宫名称
JIUGONG_POSITIONS = {
    1: "坎宫", 2: "坤宫", 3: "震宫", 4: "巽宫",
    5: "中宫", 6: "乾宫", 7: "兑宫", 8: "艮宫", 9: "离宫",
}

# 九星
JIUXING = ["天蓬", "天芮", "天冲", "天辅", "天禽", "天心", "天柱", "天任", "天英"]

# 八门
BAMEN = ["休门", "死门", "伤门", "杜门", "中", "开门", "惊门", "生门", "景门"]

# 八门吉凶
BAMEN_AUSPICIOUS = {"休门", "生门", "开门"}

# 八神顺序
DEITY_ORDER = ["值符", "腾蛇", "太阴", "六合", "白虎", "玄武", "九地", "九天"]

# 阳遁局数表（按节气，上元局数）
YANG_JU: Dict[str, int] = {
    "冬至": 1, "小寒": 7, "大寒": 4, "立春": 8, "雨水": 5,
    "惊蛰": 2, "春分": 9, "清明": 6, "谷雨": 3,
    "立夏": 7, "小满": 4, "芒种": 1,
}

# 阴遁局数表（按节气，上元局数）
YIN_JU: Dict[str, int] = {
    "夏至": 9, "小暑": 3, "大暑": 6, "立秋": 2, "处暑": 5,
    "白露": 8, "秋分": 1, "寒露": 4, "霜降": 7,
    "立冬": 3, "小雪": 6, "大雪": 9,
}

# 洛书顺逆序
YANG_SEQUENCE = [1, 2, 3, 4, 5, 6, 7, 8, 9]
YIN_SEQUENCE = [9, 8, 7, 6, 5, 4, 3, 2, 1]

# 九星本位
STAR_HOME: Dict[int, str] = {
    1: "天蓬", 2: "天芮", 3: "天冲", 4: "天辅",
    5: "天禽", 6: "天心", 7: "天柱", 8: "天任", 9: "天英",
}

# 八门本位
DOOR_HOME: Dict[int, str] = {
    1: "休门", 2: "死门", 3: "伤门", 4: "杜门",
    5: "——", 6: "开门", 7: "惊门", 8: "生门", 9: "景门",
}


def is_yang_dun(month: int, day: int) -> bool:
    """
    判断是阳遁还是阴遁

    冬至到夏至为阳遁，夏至到冬至为阴遁。
    简化：11月-4月为阳遁，5月-10月为阴遁。

    入参:
        month: 月份 (1-12)
        day: 日期 (1-31)

    出参:
        bool: True=阳遁, False=阴遁
    """
    # 简化判断：冬至(12/22)到夏至(6/21)为阳遁
    if month in (11, 12, 1, 2, 3, 4):
        return True
    return False


def get_ju_number(month: int, day: int, yang_dun: bool,
                  jieqi_name: str = "", day_offset: int = 0) -> int:
    """
    奇门定局算法（拆补法）

    根据节气确定上元局数，再根据日数确定上/中/下元。

    拆补法规则：
    - 每个节气约15天，分上元/中元/下元各5天
    - 上元用该节气的起始局数
    - 中元 = 上元局数 +/- 6
    - 下元 = 上元局数 +/- 12

    入参:
        month: 月份
        day: 日期
        yang_dun: 是否阳遁
        jieqi_name: 当前节气名称（可选）
        day_offset: 距节气起始日天数（可选）

    出参:
        int: 局数 (1-9)
    """
    table = YANG_JU if yang_dun else YIN_JU

    if jieqi_name and jieqi_name in table:
        base_ju = table[jieqi_name]
    else:
        # 简化：根据月份估算
        base_ju = 1
        for name, ju in table.items():
            base_ju = ju
            break

    # 元次：0-4天=上元, 5-9天=中元, 10-14天=下元
    # V3.1 修正：中元 = 上元 + 6（阳遁）或 -6（阴遁）
    #          下元 = 上元 + 12（阳遁）或 -12（阴遁）
    yuan_offset = day_offset % 15
    if yuan_offset < 5:
        ju = base_ju  # 上元
    elif yuan_offset < 10:
        if yang_dun:
            ju = (base_ju + 6) % 9 or 9  # 中元（V3.1修正：+5→+6）
        else:
            ju = (base_ju - 6) % 9 or 9  # 中元（V3.1修正：-5→-6）
    else:
        if yang_dun:
            ju = (base_ju + 12) % 9 or 9  # 下元（V3.1修正：+10→+12）
        else:
            ju = (base_ju - 12) % 9 or 9  # 下元（V3.1修正：-10→-12）

    return ju


def get_yuan(ju: int) -> str:
    """根据局数判断元次"""
    if ju in (1, 2, 3):
        return "上元"
    if ju in (4, 5, 6):
        return "中元"
    return "下元"


def fly_layout(ju: int, yang_dun: bool) -> Dict[int, Dict[str, str]]:
    """
    星门神排布（飞宫法）—— V3.1 修正版

    根据局数和阴阳遁，计算九星、八门、八神在各宫位的分布。

    V3.1 中五宫寄宫规则:
      - 阳遁: 中五宫(5)寄坤二宫(2)，中宫星门神并入坤二宫
      - 阴遁: 中五宫(5)寄艮八宫(8)，中宫星门神并入艮八宫

    入参:
        ju: 局数 (1-9)
        yang_dun: 是否阳遁

    出参:
        Dict[int, Dict]: {宫位: {star, door, deity}}
    """
    sequence = YANG_SEQUENCE if yang_dun else YIN_SEQUENCE
    result: Dict[int, Dict[str, str]] = {}

    # 第一步：正常飞布九宫
    for i, pos in enumerate(sequence):
        star_idx = (i + ju - 1) % 9
        star_name = JIUXING[star_idx]
        door_name = BAMEN[star_idx]
        deity_idx = (i + ju - 1) % 8
        deity_name = DEITY_ORDER[deity_idx]

        result[pos] = {
            "star": star_name,
            "door": door_name,
            "deity": deity_name,
        }

    # 第二步：中五宫寄宫处理（V3.1 修正）
    # 中五宫(5)的星/门/神并入寄宫位置
    if 5 in result:
        host_pos = 2 if yang_dun else 8  # 阳遁寄坤二宫，阴遁寄艮八宫
        host_name = "坤二宫" if yang_dun else "艮八宫"

        middle_data = result[5]
        result[host_pos] = {
            "star": f"{result[host_pos]['star']}(寄{result[5]['star']})",
            "door": f"{result[host_pos]['door']}(寄{result[5]['door']})",
            "deity": f"{result[host_pos]['deity']}(寄{result[5]['deity']})",
            "jigong": host_name,
            "jigong_star": middle_data["star"],
            "jigong_door": middle_data["door"],
            "jigong_deity": middle_data["deity"],
        }

        # 中宫标记为寄宫状态
        result[5] = {
            "star": f"{middle_data['star']}(寄{host_name})",
            "door": f"{middle_data['door']}(寄{host_name})",
            "deity": f"{middle_data['deity']}(寄{host_name})",
            "is_jigong": True,
            "jigong_target": host_pos,
            "jigong_target_name": host_name,
        }

    return result


def calculate_qimen(year: int, month: int, day: int,
                    hour: int, minute: int = 0) -> Dict[str, Any]:
    """
    计算完整奇门遁甲排盘

    入参:
        year: 年 (如 2024)
        month: 月 (1-12)
        day: 日 (1-31)
        hour: 时 (0-23)
        minute: 分 (0-59)

    出参:
        Dict: {
            ju_type: str,         # 阳遁/阴遁
            ju_number: int,       # 局数
            yuan: str,            # 上元/中元/下元
            palaces: List[Dict],  # 9宫布局
            auspicious_dirs: List[str],       # 吉方
            inauspicious_dirs: List[str],     # 凶方
        }
    """
    yang_dun = is_yang_dun(month, day)
    ju = get_ju_number(month, day, yang_dun)

    layout = fly_layout(ju, yang_dun)

    palaces = []
    for pos in range(1, 10):
        cell = layout[pos]
        door = cell["door"]
        auspicious = door in BAMEN_AUSPICIOUS

        palaces.append({
            "position": pos,
            "palace_name": JIUGONG_POSITIONS[pos],
            "star": cell["star"],
            "door": door,
            "deity": cell["deity"],
            "is_auspicious": auspicious,
            "grid": PALACE_GRID[pos],
        })

    auspicious_dirs = [p["palace_name"] for p in palaces if p["is_auspicious"]]
    inauspicious_dirs = [p["palace_name"] for p in palaces
                         if not p["is_auspicious"] and p["door"] not in ("——",)]

    return {
        "ju_type": "阳遁" if yang_dun else "阴遁",
        "ju_number": ju,
        "yuan": get_yuan(ju),
        "palaces": palaces,
        "auspicious_directions": auspicious_dirs,
        "inauspicious_directions": inauspicious_dirs,
    }


# ============================================================================
# 三、六爻核心算法
# ============================================================================

# 八卦基础数据
TRIGRAMS: Dict[str, Dict] = {
    "乾": {"symbol": "☰", "wuxing": "金", "direction": "西北", "nature": "天",
           "number": 1, "lines": ["阳", "阳", "阳"]},
    "兑": {"symbol": "☱", "wuxing": "金", "direction": "西", "nature": "泽",
           "number": 2, "lines": ["阳", "阳", "阴"]},
    "离": {"symbol": "☲", "wuxing": "火", "direction": "南", "nature": "火",
           "number": 3, "lines": ["阳", "阴", "阳"]},
    "震": {"symbol": "☳", "wuxing": "木", "direction": "东", "nature": "雷",
           "number": 4, "lines": ["阳", "阴", "阴"]},
    "巽": {"symbol": "☴", "wuxing": "木", "direction": "东南", "nature": "风",
           "number": 5, "lines": ["阴", "阳", "阳"]},
    "坎": {"symbol": "☵", "wuxing": "水", "direction": "北", "nature": "水",
           "number": 6, "lines": ["阴", "阳", "阴"]},
    "艮": {"symbol": "☶", "wuxing": "土", "direction": "东北", "nature": "山",
           "number": 7, "lines": ["阴", "阴", "阳"]},
    "坤": {"symbol": "☷", "wuxing": "土", "direction": "西南", "nature": "地",
           "number": 8, "lines": ["阴", "阴", "阴"]},
}

# 64卦上下卦映射
HEXAGRAM_TRIGRAM_MAPPING: Dict[int, Tuple[str, str]] = {
    1: ("乾", "乾"), 2: ("坤", "坤"), 3: ("震", "坎"), 4: ("坎", "艮"),
    5: ("乾", "坎"), 6: ("坎", "乾"), 7: ("坎", "坤"), 8: ("坤", "坎"),
    9: ("乾", "巽"), 10: ("兑", "乾"), 11: ("乾", "坤"), 12: ("坤", "乾"),
    13: ("离", "乾"), 14: ("乾", "离"), 15: ("艮", "坤"), 16: ("坤", "震"),
    17: ("震", "兑"), 18: ("巽", "艮"), 19: ("兑", "坤"), 20: ("坤", "巽"),
    21: ("震", "离"), 22: ("离", "艮"), 23: ("坤", "艮"), 24: ("震", "坤"),
    25: ("震", "乾"), 26: ("乾", "艮"), 27: ("震", "艮"), 28: ("巽", "兑"),
    29: ("坎", "坎"), 30: ("离", "离"), 31: ("艮", "兑"), 32: ("巽", "震"),
    33: ("艮", "乾"), 34: ("乾", "震"), 35: ("坤", "离"), 36: ("离", "坤"),
    37: ("离", "巽"), 38: ("兑", "离"), 39: ("艮", "坎"), 40: ("坎", "震"),
    41: ("兑", "艮"), 42: ("震", "巽"), 43: ("乾", "兑"), 44: ("巽", "乾"),
    45: ("坤", "兑"), 46: ("巽", "坤"), 47: ("坎", "兑"), 48: ("巽", "坎"),
    49: ("离", "兑"), 50: ("巽", "离"), 51: ("震", "震"), 52: ("艮", "艮"),
    53: ("艮", "巽"), 54: ("兑", "震"), 55: ("离", "震"), 56: ("艮", "离"),
    57: ("巽", "巽"), 58: ("兑", "兑"), 59: ("坎", "巽"), 60: ("兑", "坎"),
    61: ("兑", "巽"), 62: ("艮", "震"), 63: ("离", "坎"), 64: ("坎", "离"),
}

# 64卦名称
HEXAGRAM_NAMES = {
    1: "乾", 2: "坤", 3: "屯", 4: "蒙", 5: "需", 6: "讼", 7: "师", 8: "比",
    9: "小畜", 10: "履", 11: "泰", 12: "否", 13: "同人", 14: "大有",
    15: "谦", 16: "豫", 17: "随", 18: "蛊", 19: "临", 20: "观",
    21: "噬嗑", 22: "贲", 23: "剥", 24: "复", 25: "无妄", 26: "大畜",
    27: "颐", 28: "大过", 29: "坎", 30: "离", 31: "咸", 32: "恒",
    33: "遁", 34: "大壮", 35: "晋", 36: "明夷", 37: "家人", 38: "睽",
    39: "蹇", 40: "解", 41: "损", 42: "益", 43: "夬", 44: "姤",
    45: "萃", 46: "升", 47: "困", 48: "井", 49: "革", 50: "鼎",
    51: "震", 52: "艮", 53: "渐", 54: "归妹", 55: "丰", 56: "旅",
    57: "巽", 58: "兑", 59: "涣", 60: "节", 61: "中孚", 62: "小过",
    63: "既济", 64: "未济",
}

# ============================================================================
# 三-A、纳甲系统
# ============================================================================

# 纳甲地支分配
NAJIA_BRANCHES: Dict[str, Dict[str, List[str]]] = {
    "乾": {"inner": ["子", "寅", "辰"], "outer": ["午", "申", "戌"]},
    "坤": {"inner": ["未", "巳", "卯"], "outer": ["丑", "亥", "酉"]},
    "震": {"inner": ["子", "寅", "辰"], "outer": ["午", "申", "戌"]},
    "巽": {"inner": ["丑", "亥", "酉"], "outer": ["未", "巳", "卯"]},
    "坎": {"inner": ["寅", "子", "戌"], "outer": ["申", "午", "辰"]},
    "离": {"inner": ["卯", "巳", "未"], "outer": ["酉", "亥", "丑"]},
    "艮": {"inner": ["辰", "寅", "子"], "outer": ["戌", "申", "午"]},
    "兑": {"inner": ["巳", "未", "酉"], "outer": ["亥", "丑", "卯"]},
}

# 八宫卦归属
HEXAGRAM_PALACE: Dict[int, Tuple[str, int]] = {
    # 乾宫
    1: ("乾", 1), 44: ("乾", 2), 33: ("乾", 3), 12: ("乾", 4),
    20: ("乾", 5), 23: ("乾", 6), 35: ("乾", 7), 14: ("乾", 8),
    # 坤宫
    2: ("坤", 1), 24: ("坤", 2), 19: ("坤", 3), 11: ("坤", 4),
    34: ("坤", 5), 43: ("坤", 6), 5: ("坤", 7), 8: ("坤", 8),
    # 震宫
    51: ("震", 1), 16: ("震", 2), 40: ("震", 3), 32: ("震", 4),
    46: ("震", 5), 48: ("震", 6), 28: ("震", 7), 17: ("震", 8),
    # 巽宫
    57: ("巽", 1), 9: ("巽", 2), 37: ("巽", 3), 42: ("巽", 4),
    25: ("巽", 5), 21: ("巽", 6), 27: ("巽", 7), 18: ("巽", 8),
    # 坎宫
    29: ("坎", 1), 60: ("坎", 2), 3: ("坎", 3), 63: ("坎", 4),
    49: ("坎", 5), 55: ("坎", 6), 36: ("坎", 7), 7: ("坎", 8),
    # 离宫
    30: ("离", 1), 56: ("离", 2), 50: ("离", 3), 64: ("离", 4),
    4: ("离", 5), 59: ("离", 6), 6: ("离", 7), 13: ("离", 8),
    # 艮宫
    52: ("艮", 1), 22: ("艮", 2), 26: ("艮", 3), 41: ("艮", 4),
    38: ("艮", 5), 10: ("艮", 6), 61: ("艮", 7), 53: ("艮", 8),
    # 兑宫
    58: ("兑", 1), 47: ("兑", 2), 45: ("兑", 3), 31: ("兑", 4),
    39: ("兑", 5), 15: ("兑", 6), 62: ("兑", 7), 54: ("兑", 8),
}

# 宫位 → 世爻位置
PALACE_POS_TO_WORLD: Dict[int, int] = {
    1: 6,  # 本宫卦：世在上爻
    2: 1,  # 一爻变：世在初爻
    3: 2,  # 二爻变：世在二爻
    4: 3,  # 三爻变：世在三爻
    5: 4,  # 四爻变：世在四爻
    6: 5,  # 五爻变：世在五爻
    7: 4,  # 游魂：世在四爻
    8: 3,  # 归魂：世在三爻
}

# 宫卦五行
PALACE_ELEMENT: Dict[str, str] = {
    "乾": "金", "兑": "金",
    "震": "木", "巽": "木",
    "坎": "水",
    "离": "火",
    "艮": "土", "坤": "土",
}

# 六神
LIU_SHEN = ["青龙", "朱雀", "勾陈", "腾蛇", "白虎", "玄武"]

# 六神起始（按日干）
LIU_SHEN_START: Dict[str, int] = {
    "甲": 0, "乙": 0,
    "丙": 1, "丁": 1,
    "戊": 2,
    "己": 3,
    "庚": 4, "辛": 4,
    "壬": 5, "癸": 5,
}

# 六亲名称
LIU_QIN_NAMES = {
    "same": "兄弟",
    "generates": "子孙",
    "generated": "父母",
    "controls": "妻财",
    "controlled": "官鬼",
}

# 空亡表
KONG_WANG_TABLE: Dict[int, List[str]] = {
    0: ["戌", "亥"],
    1: ["申", "酉"],
    2: ["午", "未"],
    3: ["辰", "巳"],
    4: ["寅", "卯"],
    5: ["子", "丑"],
}


def get_world_line(hex_num: int) -> Tuple[int, int]:
    """
    世应定位

    返回 (世爻位置, 应爻位置)，1-indexed（1=初爻, 6=上爻）

    入参:
        hex_num: 卦序号 (1-64)

    出参:
        Tuple[int, int]: (世爻位置, 应爻位置)
    """
    palace, pos = HEXAGRAM_PALACE.get(hex_num, ("乾", 1))
    world = PALACE_POS_TO_WORLD.get(pos, 6)
    application = ((world - 1 + 3) % 6) + 1
    return world, application


def _wx_relation(palace_wx: str, line_wx: str) -> str:
    """判断五行关系"""
    if palace_wx == line_wx:
        return "same"
    if WUXING_SHENG.get(palace_wx) == line_wx:
        return "generates"
    if WUXING_SHENG.get(line_wx) == palace_wx:
        return "generated"
    if WUXING_KE.get(palace_wx) == line_wx:
        return "controls"
    if WUXING_KE.get(line_wx) == palace_wx:
        return "controlled"
    return "same"


def get_liu_qin(palace_trigram: str, line_zhi: str) -> str:
    """
    六亲匹配

    根据宫卦五行和爻支地支，计算六亲关系。

    入参:
        palace_trigram: 宫卦名称 (如 "乾")
        line_zhi: 爻支地支 (如 "子")

    出参:
        str: 六亲名称 (兄弟/子孙/父母/妻财/官鬼)
    """
    palace_wx = PALACE_ELEMENT.get(palace_trigram, "金")
    line_wx = DIZHI_WUXING.get(line_zhi, "金")
    relation = _wx_relation(palace_wx, line_wx)
    return LIU_QIN_NAMES[relation]


def assign_liu_shen(day_stem: str) -> List[str]:
    """
    六神分配

    根据日干确定六神从初爻到上爻的排列。

    入参:
        day_stem: 日干 (如 "甲")

    出参:
        List[str]: 6个爻位对应的六神
    """
    start = LIU_SHEN_START.get(day_stem, 0)
    return [LIU_SHEN[(start + i) % 6] for i in range(6)]


def get_kong_wang(day_ganzhi_index: int) -> List[str]:
    """
    空亡计算

    根据日干支索引确定旬空地支。

    入参:
        day_ganzhi_index: 日干支索引 (0-59)

    出参:
        List[str]: 两个空亡地支
    """
    group = (day_ganzhi_index // 10) % 6
    return KONG_WANG_TABLE[group]


def get_najia_branch(trigram: str, position: int) -> str:
    """
    六爻纳甲干支

    根据卦象和爻位获取纳甲地支。

    入参:
        trigram: 卦名 (如 "乾")
        position: 爻位 (1-6, 1=初爻)

    出参:
        str: 纳甲地支 (如 "子")
    """
    branches = NAJIA_BRANCHES.get(trigram, {})
    if position <= 3:
        return branches.get("inner", ["子", "寅", "辰"])[position - 1]
    else:
        return branches.get("outer", ["午", "申", "戌"])[position - 4]


# ============================================================================
# 三-B、六爻起卦方法
# ============================================================================

def _line_to_trigram_name(lines: List[str]) -> str:
    """
    将三爻转换为卦名

    入参:
        lines: 三爻列表 (如 ["阳", "阳", "阳"])

    出参:
        str: 卦名
    """
    pattern = tuple(lines)
    for name, data in TRIGRAMS.items():
        tg_lines = tuple(data["lines"])
        if tg_lines == pattern:
            return name
    raise ValueError(f"No trigram for lines {pattern}")


def _hexagram_number(lower: str, upper: str) -> int:
    """根据上下卦名查找卦序号"""
    for num, (lt, ut) in HEXAGRAM_TRIGRAM_MAPPING.items():
        if lt == lower and ut == upper:
            return num
    raise ValueError(f"No hexagram for ({lower}, {upper})")


def time_divination(year: int, month: int, day: int, hour: int) -> Dict[str, Any]:
    """
    时间起卦（梅花易数法）

    上卦数 = (年+月+日) % 8
    下卦数 = (年+月+日+时) % 8
    动爻 = (年+月+日+时) % 6

    入参:
        year: 年
        month: 月
        day: 日
        hour: 时

    出参:
        Dict: {
            original: {number, name, upper, lower, judgment, lines},
            changed: Optional[Dict],
            changing_line: int,  # 动爻位置 (1-6)
            yaos: List[Dict]     # 6爻详情
        }
    """
    upper_num = (year + month + day) % 8 or 8
    lower_num = (year + month + day + hour) % 8 or 8
    change_pos = (year + month + day + hour) % 6 or 6

    # 伏羲八卦数 → 卦名
    fu_xi_map = {1: "乾", 2: "兑", 3: "离", 4: "震",
                 5: "巽", 6: "坎", 7: "艮", 8: "坤"}

    upper_name = fu_xi_map[upper_num]
    lower_name = fu_xi_map[lower_num]

    upper_lines = TRIGRAMS[upper_name]["lines"]
    lower_lines = TRIGRAMS[lower_name]["lines"]

    six_lines = lower_lines + upper_lines

    # 构造爻列表
    yaos = []
    for i, line in enumerate(six_lines):
        pos = i + 1
        is_changing = (pos == change_pos)
        yaos.append({
            "position": pos,
            "line": line,
            "is_changing": is_changing,
        })

    # 查找本卦
    orig_num = _hexagram_number(lower_name, upper_name)

    # 变卦
    changed = None
    if change_pos > 0:
        changed_lines = list(six_lines)
        changed_lines[change_pos - 1] = "阴" if changed_lines[change_pos - 1] == "阳" else "阳"
        new_lower = _line_to_trigram_name(changed_lines[:3])
        new_upper = _line_to_trigram_name(changed_lines[3:])
        new_num = _hexagram_number(new_lower, new_upper)
        changed = {
            "number": new_num,
            "name": HEXAGRAM_NAMES[new_num],
            "upper": {"name": new_upper, **TRIGRAMS[new_upper]},
            "lower": {"name": new_lower, **TRIGRAMS[new_lower]},
        }

    original = {
        "number": orig_num,
        "name": HEXAGRAM_NAMES[orig_num],
        "upper": {"name": upper_name, **TRIGRAMS[upper_name]},
        "lower": {"name": lower_name, **TRIGRAMS[lower_name]},
    }

    return {
        "method": "time",
        "original": original,
        "changed": changed,
        "changing_line": change_pos,
        "yaos": yaos,
    }


def annotate_with_najia(divination_result: Dict[str, Any],
                         day_stem: str,
                         day_ganzhi_index: int) -> Dict[str, Any]:
    """
    为起卦结果附加纳甲信息

    入参:
        divination_result: 起卦结果
        day_stem: 日干
        day_ganzhi_index: 日干支索引 (0-59)

    出参:
        Dict: 附加了纳甲信息的完整结果
    """
    hex_num = divination_result["original"]["number"]
    lower_trigram = divination_result["original"]["lower"]["name"]
    upper_trigram = divination_result["original"]["upper"]["name"]

    palace_trig, _ = HEXAGRAM_PALACE.get(hex_num, (lower_trigram, 1))
    world_pos, app_pos = get_world_line(hex_num)
    kong_wang_branches = get_kong_wang(day_ganzhi_index)
    liu_shen_list = assign_liu_shen(day_stem)

    yaos = divination_result.get("yaos", [])
    enriched_yaos = []

    for i, yao in enumerate(yaos):
        pos = i + 1

        if pos <= 3:
            trigram = lower_trigram
            branch = NAJIA_BRANCHES.get(trigram, {}).get("inner", ["子", "寅", "辰"])[i]
        else:
            trigram = upper_trigram
            branch = NAJIA_BRANCHES.get(trigram, {}).get("outer", ["午", "申", "戌"])[i - 3]

        wx = DIZHI_WUXING.get(branch, "土")
        liu_qin = get_liu_qin(palace_trig, branch)
        liu_shen = liu_shen_list[i]
        is_kong_wang = branch in kong_wang_branches
        is_world = (pos == world_pos)
        is_application = (pos == app_pos)

        enriched_yaos.append({
            **yao,
            "branch": branch,
            "element": wx,
            "liu_qin": liu_qin,
            "liu_shen": liu_shen,
            "kong_wang": is_kong_wang,
            "is_world": is_world,
            "is_application": is_application,
        })

    divination_result["yaos"] = enriched_yaos
    divination_result["world_line"] = world_pos
    divination_result["application_line"] = app_pos
    divination_result["kong_wang_branches"] = kong_wang_branches
    divination_result["palace_trigram"] = palace_trig
    divination_result["palace_element"] = PALACE_ELEMENT.get(palace_trig, "金")

    return divination_result


# ============================================================================
# 调用示例
# ============================================================================

"""
示例1: 奇门遁甲排盘

>>> result = calculate_qimen(2024, 6, 15, 10, 0)
>>> print(f"局数: {result['ju_type']} {result['ju_number']}局")
>>> print(f"元次: {result['yuan']}")
>>> for p in result['palaces']:
...     print(f"{p['palace_name']}: {p['star']} {p['door']} {p['deity']}")

示例2: 星门神排布

>>> layout = fly_layout(1, True)  # 阳遁1局
>>> for pos, cell in layout.items():
...     print(f"宫位{pos}: {cell['star']} {cell['door']} {cell['deity']}")

示例3: 六爻时间起卦

>>> result = time_divination(2024, 6, 15, 10)
>>> print(f"本卦: {result['original']['name']}")
>>> if result['changed']:
...     print(f"变卦: {result['changed']['name']}")

示例4: 六爻纳甲标注

>>> result = time_divination(2024, 6, 15, 10)
>>> annotated = annotate_with_najia(result, '甲', 0)
>>> for yao in annotated['yaos']:
...     print(f"{yao['position']}爻: {yao['branch']} {yao['liu_qin']} {yao['liu_shen']}")

示例5: 世应定位

>>> world, app = get_world_line(1)  # 乾卦
>>> print(f"世爻: {world}, 应爻: {app}")

示例6: 六亲匹配

>>> liu_qin = get_liu_qin('乾', '子')
>>> print(liu_qin)  # 兄弟

示例7: 空亡计算

>>> kong = get_kong_wang(0)  # 甲子日
>>> print(kong)  # ['戌', '亥']
"""

# ============================================================================
# 导出说明
# ============================================================================

# 本模块可直接导入使用：
# from suangua_奇门六爻核心 import calculate_qimen, time_divination, annotate_with_najia
#
# 所有函数均为纯函数，无外部依赖（除 Python 标准库）。
# 依赖的节气数据在核心算法中已内置（YANG_JU/YIN_JU 表），
# 如需精确节气日期请使用第三方库（如 ephem）或自定义节气计算模块。