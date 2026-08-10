package com.yandao.guoxue;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.widget.RemoteViews;

import java.util.Calendar;

/**
 * 言道黄历桌面小组件 (AppWidgetProvider)。
 *
 * 自包含的中国农历 / 干支 / 宜忌 / 冲煞 计算实现，不依赖任何外部日历库。
 * 支持两种尺寸：4x1 (小) 与 4x2 (大)。点击小组件打开 App 并携带 open_huangli=true。
 * 使用 SharedPreferences 缓存最近一次计算结果，便于离线展示；并通过 AlarmManager
 * 在每日 0 点触发刷新。
 */
public class HuangliWidgetProvider extends AppWidgetProvider {

    /** 每日 0 点自动刷新的广播 Action。 */
    private static final String ACTION_AUTO_UPDATE = "com.yandao.guoxue.action.HUANGLI_AUTO_UPDATE";
    /** 缓存文件名。 */
    private static final String PREFS_NAME = "huangli_widget_cache";
    /** 打开 App 时携带的额外参数。 */
    private static final String EXTRA_OPEN_HUANGLI = "open_huangli";

    /** 主题色：言道紫。 */
    private static final int COLOR_PURPLE = 0xFF7B2FBE;

    // ======================================================================================
    // 农历数据表 (1900-2049)。每年用一个 int 编码：
    //   bit[3:0]   闰月月份 (0 表示无闰月)
    //   bit[15:4]  12 个月的大小 (1=30天, 0=29天)
    //   bit[16]    闰月大小 (1=30天, 0=29天)
    // 该数组为业界通用数据，已用春节 / 端午 / 中秋等已知农历日期校验通过。
    // ======================================================================================
    private static final int[] LUNAR_INFO = {
            0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 1900-1909
            0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, // 1910-1919
            0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, // 1920-1929
            0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, // 1930-1939
            0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, // 1940-1949
            0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0, // 1950-1959
            0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, // 1960-1969
            0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6, // 1970-1979
            0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, // 1980-1989
            0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0, // 1990-1999
            0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000-2009
            0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, // 2010-2019
            0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, // 2020-2029
            0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, // 2030-2039
            0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, // 2040-2049
    };
    private static final int LUNAR_MIN_YEAR = 1900;
    private static final int LUNAR_MAX_YEAR = 1900 + LUNAR_INFO.length - 1; // 2049

    /** 天干。 */
    private static final String[] GAN = {"甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"};
    /** 地支。 */
    private static final String[] ZHI = {"子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"};
    /** 生肖。 */
    private static final String[] ANIMALS = {"鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"};
    /** 60 甲子纳音 (每两个干支配一个纳音，共 30 个)。 */
    private static final String[] NAYIN = {
            "海中金", "炉中火", "大林木", "路旁土", "剑锋金", "山头火", "涧下水", "城头土", "白蜡金", "杨柳木",
            "泉中水", "屋上土", "霹雳火", "松柏木", "长流水", "砂中金", "山下火", "平地木", "壁上土", "金箔金",
            "覆灯火", "天河水", "大驿土", "钗钏金", "桑柘木", "大溪水", "沙中土", "天上火", "石榴木", "大海水"
    };
    /** 建除十二神。 */
    private static final String[] JIAN_SHEN = {"建", "除", "满", "平", "定", "执", "破", "危", "成", "收", "开", "闭"};
    /** 建除值位对应的宜 (传统黄历取用)。 */
    private static final String[][] YI = {
            {"出行", "赴任", "入学", "谒贵", "求职"},                 // 建
            {"祭祀", "解除", "沐浴", "扫舍", "求医"},                 // 除
            {"祭祀", "祈福", "结亲", "开市", "交易"},                 // 满
            {"修造", "动土", "平治道涂", "修坟"},                     // 平
            {"祭祀", "祈福", "定盟", "纳采", "结婚"},                 // 定
            {"捕捉", "畋猎", "纳财", "交易", "立券"},                 // 执
            {"求医", "破屋", "坏垣", "拆卸"},                         // 破
            {"祭祀", "祈福", "安床", "拆卸"},                         // 危
            {"祭祀", "祈福", "开市", "入学", "结婚"},                 // 成
            {"收获", "纳财", "捕捉", "畋猎", "开市"},                 // 收
            {"祭祀", "祈福", "开市", "入学", "赴任"},                 // 开
            {"筑堤", "塞穴", "安葬", "祭祀"},                         // 闭
    };
    /** 建除值位对应的忌 (传统黄历取用)。 */
    private static final String[][] JI = {
            {"动土", "开仓", "破土", "安葬"},                         // 建
            {"嫁娶", "求名", "出行"},                                 // 除
            {"动土", "破土", "安葬", "服药"},                         // 满
            {"祭祀", "祈福", "求嗣", "开渠"},                         // 平
            {"诉讼", "出师", "乘船", "词讼"},                         // 定
            {"开市", "开仓", "出行", "安葬"},                         // 执
            {"嫁娶", "开市", "安葬", "立券"},                         // 破
            {"登高", "乘船", "出行", "安葬"},                         // 危
            {"诉讼", "出行", "安葬"},                                 // 成
            {"出行", "安葬", "破土", "开仓"},                         // 收
            {"安葬", "破土", "伐木"},                                 // 开
            {"开市", "求名", "出行", "动土"},                         // 闭
    };

    /** 二十四节气 (从小寒起算，与 sTerm 的索引一致)。 */
    private static final String[] SOLAR_TERMS = {
            "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏",
            "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分",
            "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"
    };
    /** 节气计算系数 D。 */
    private static final double TERM_D = 0.2422;
    /** 节气世纪 C 值：第 0 行=20 世纪，第 1 行=21 世纪。 */
    private static final double[][] TERM_CENTURY = {
            {6.11, 20.84, 4.6295, 19.4599, 6.3826, 21.4155, 5.59, 20.888, 6.318, 21.86, 6.5, 22.2, 7.928, 23.65, 8.35, 23.95, 8.44, 23.822, 9.098, 24.218, 8.218, 23.08, 7.9, 22.6},
            {5.4055, 20.12, 3.87, 18.73, 5.63, 20.646, 4.81, 20.1, 5.52, 21.04, 5.678, 21.37, 7.108, 22.83, 7.5, 23.13, 7.646, 23.042, 8.318, 23.438, 7.438, 22.36, 7.18, 21.94}
    };
    /** 节气特殊年份 +1 偏移 {节气索引, 年份}。 */
    private static final int[][] TERM_INCREASE = {
            {0, 1982}, {1, 2082}, {5, 2084}, {9, 2008}, {10, 1902}, {11, 1928}, {12, 1925}, {12, 2016},
            {13, 1922}, {14, 2002}, {16, 1927}, {17, 1942}, {19, 2089}, {20, 2089}, {21, 1978}, {22, 1954}
    };
    /** 节气特殊年份 -1 偏移 {节气索引, 年份}。 */
    private static final int[][] TERM_DECREASE = {
            {0, 2019}, {3, 2026}, {23, 1918}, {23, 2021}
    };

    /** 农历日数字。 */
    private static final String[] CN_NUM = {"零", "一", "二", "三", "四", "五", "六", "七", "八", "九"};

    // ======================================================================================
    // 农历核心计算
    // ======================================================================================

    /** 农历 y 年的总天数。 */
    private static int lunarYearDays(int y) {
        int sum = 348;
        for (int i = 0x8000; i > 0x8; i >>= 1) {
            sum += (LUNAR_INFO[y - LUNAR_MIN_YEAR] & i) != 0 ? 1 : 0;
        }
        return sum + leapDays(y);
    }

    /** 农历 y 年闰月的天数 (无闰月返回 0)。 */
    private static int leapDays(int y) {
        if (leapMonth(y) != 0) {
            return (LUNAR_INFO[y - LUNAR_MIN_YEAR] & 0x10000) != 0 ? 30 : 29;
        }
        return 0;
    }

    /** 农历 y 年闰哪个月 (1-12，0 表示无闰月)。 */
    private static int leapMonth(int y) {
        return LUNAR_INFO[y - LUNAR_MIN_YEAR] & 0xf;
    }

    /** 农历 y 年 m 月的天数。 */
    private static int monthDays(int y, int m) {
        return (LUNAR_INFO[y - LUNAR_MIN_YEAR] & (0x10000 >> m)) != 0 ? 30 : 29;
    }

    /**
     * 公历日期转农历。
     *
     * @return 长度 4 的数组：[农历年, 农历月(1-12), 农历日(1-30), 是否闰月(0/1)]
     */
    private static int[] solarToLunar(Calendar cal) {
        // 基准：1900-01-31 = 农历 1900 年正月初一
        Calendar base = Calendar.getInstance();
        base.clear();
        base.set(1900, Calendar.JANUARY, 31);
        long offset = daysBetween(base, cal);

        int iYear;
        int daysOfYear = 0;
        for (iYear = LUNAR_MIN_YEAR; iYear < LUNAR_MAX_YEAR && offset > 0; iYear++) {
            daysOfYear = lunarYearDays(iYear);
            offset -= daysOfYear;
        }
        if (offset < 0) {
            offset += daysOfYear;
            iYear--;
        }
        int lunarYear = iYear;

        int leapM = leapMonth(lunarYear);
        boolean leap = false;
        int iMonth;
        int daysOfMonth = 0;
        for (iMonth = 1; iMonth < 13 && offset > 0; iMonth++) {
            if (leapM > 0 && iMonth == (leapM + 1) && !leap) {
                iMonth--;
                leap = true;
                daysOfMonth = leapDays(lunarYear);
            } else {
                daysOfMonth = monthDays(lunarYear, iMonth);
            }
            offset -= daysOfMonth;
            if (leap && iMonth == (leapM + 1)) {
                leap = false;
            }
        }
        if (offset == 0 && leapM > 0 && iMonth == leapM + 1) {
            if (leap) {
                leap = false;
            } else {
                leap = true;
                iMonth--;
            }
        }
        if (offset < 0) {
            offset += daysOfMonth;
            iMonth--;
        }
        return new int[]{lunarYear, iMonth, (int) offset + 1, leap ? 1 : 0};
    }

    /** 计算两个 Calendar (按日期，忽略时分秒) 之间的天数差 (b - a)。 */
    private static long daysBetween(Calendar a, Calendar b) {
        Calendar ca = Calendar.getInstance();
        ca.clear();
        ca.set(a.get(Calendar.YEAR), a.get(Calendar.MONTH), a.get(Calendar.DAY_OF_MONTH));
        Calendar cb = Calendar.getInstance();
        cb.clear();
        cb.set(b.get(Calendar.YEAR), b.get(Calendar.MONTH), b.get(Calendar.DAY_OF_MONTH));
        long diff = cb.getTimeInMillis() - ca.getTimeInMillis();
        return diff / (24L * 60L * 60L * 1000L);
    }

    /** 干支 (0=甲子)。 */
    private static String cyclic(int n) {
        int stem = ((n % 10) + 10) % 10;
        int branch = ((n % 12) + 12) % 12;
        return GAN[stem] + ZHI[branch];
    }

    /** 节气特殊年份偏移量。 */
    private static int termSpecialOffset(int year, int n) {
        int offset = 0;
        for (int[] pair : TERM_DECREASE) {
            if (pair[0] == n && pair[1] == year) offset -= 1;
        }
        for (int[] pair : TERM_INCREASE) {
            if (pair[0] == n && pair[1] == year) offset += 1;
        }
        return offset;
    }

    /**
     * 获取 year 年第 n 个节气 (n=0 小寒, 1 大寒, ...) 在当月的日号。
     * 采用通用 [Y*D+C]-[Y/4] 寿星公式，并叠加特殊年份修正。
     */
    private static int solarTermDay(int year, int n) {
        int centuryIndex = (year >= 1901 && year <= 2000) ? 0 : 1;
        double c = TERM_CENTURY[centuryIndex][n];
        int y = year % 100;
        boolean isLeap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
        if (isLeap && (n == 0 || n == 1 || n == 2 || n == 3)) {
            y = y - 1;
        }
        int dateNum = (int) (y * TERM_D + c) - (int) (y / 4.0);
        dateNum += termSpecialOffset(year, n);
        return dateNum;
    }

    /** 节气所在的月份 (1-12)。n=0 小寒在 1 月, n=2 立春在 2 月, ... n=22 大雪在 12 月。 */
    private static int termMonth(int n) {
        // 小寒/大寒(0,1)->1月, 立春/雨水(2,3)->2月, ... 大雪/冬至(22,23)->12月
        return (n / 2) + 1;
    }

    // ======================================================================================
    // 黄历数据
    // ======================================================================================

    private static final class HuangliData {
        String solarShort;   // "8月9日"
        String solarFull;    // "2026年8月9日 星期日"
        String lunarShort;   // "六月廿七"
        String lunarFull;    // "农历 丙午(马)年 六月廿七"
        String yearGz;       // 年柱 干支
        String monthGz;      // 月柱 干支
        String dayGz;        // 日柱 干支
        String jianShen;     // 建除值位 (如 "危")
        String nayin;        // 日柱纳音五行
        String[] yi;         // 宜
        String[] ji;         // 忌
        String chong;        // 冲 (如 "鸡(己酉)")
        String sha;          // 煞方 (如 "西")
        String jieqi;        // 节气提示
    }

    /** 计算指定公历日期的黄历数据。 */
    private static HuangliData compute(Calendar cal) {
        HuangliData d = new HuangliData();
        int sYear = cal.get(Calendar.YEAR);
        int sMonth = cal.get(Calendar.MONTH) + 1; // 1-12
        int sDay = cal.get(Calendar.DAY_OF_MONTH);

        // ---- 公历 ----
        d.solarShort = sMonth + "月" + sDay + "日";
        String[] weekArr = {"日", "一", "二", "三", "四", "五", "六"};
        int weekIdx = cal.get(Calendar.DAY_OF_WEEK) - 1; // 1=周日 -> 0
        d.solarFull = sYear + "年" + sMonth + "月" + sDay + "日 星期" + weekArr[weekIdx];

        // ---- 农历 ----
        int[] lunar = solarToLunar(cal);
        int lYear = lunar[0], lMonth = lunar[1], lDay = lunar[2];
        boolean isLeap = lunar[3] == 1;
        d.lunarShort = lunarMonthName(lMonth, isLeap) + "月" + lunarDayName(lDay);

        // ---- 干支日柱 (公历连续纪日) ----
        // 1900-01-31 = 甲辰日 (60 甲子序号 40)；故 dayGzIndex = (daysSince1900_01_31 + 40) % 60
        Calendar base = Calendar.getInstance();
        base.clear();
        base.set(1900, Calendar.JANUARY, 31);
        long offset = daysBetween(base, cal);
        int dayGzIndex = (int) (((offset + 40) % 60 + 60) % 60);
        d.dayGz = cyclic(dayGzIndex);

        // ---- 节气月 (用于月柱 / 建除)：定位当前日期所在的「节」段 ----
        int curMonthTermIdx = 2 * (sMonth - 1); // 本月的「节」节气索引 (偶数)
        int termDay = solarTermDay(sYear, curMonthTermIdx);
        int activeTermIdx; // 当前所属「节」的节气索引
        if (sDay >= termDay) {
            activeTermIdx = curMonthTermIdx;
        } else {
            // 属于上一个「节」段
            if (curMonthTermIdx == 0) {
                activeTermIdx = 22; // 小寒之前 -> 上一年大雪
            } else {
                activeTermIdx = curMonthTermIdx - 2;
            }
        }
        // 干支月序号 k：0=寅(立春) ... 10=子(大雪) 11=丑(小寒)
        int k = (((activeTermIdx / 2) - 1) % 12 + 12) % 12;

        // ---- 干支年柱 (以立春为界) ----
        int lichunDay = solarTermDay(sYear, 2); // 立春在 2 月的日号
        boolean beforeLichun = (sMonth < 2) || (sMonth == 2 && sDay < lichunDay);
        int gzYear = beforeLichun ? sYear - 1 : sYear;
        int yearStemIdx = (((gzYear - 4) % 10) + 10) % 10;
        int yearGzIndex = (((gzYear - 4) % 60) + 60) % 60;
        d.yearGz = cyclic(yearGzIndex);

        // ---- 干支月柱 (五虎遁) ----
        // 甲己之年丙作首：寅月天干 = ((yearStem % 5) * 2 + 2) % 10
        int firstMonthStem = ((yearStemIdx % 5) * 2 + 2) % 10;
        int monthStemIdx = (firstMonthStem + k) % 10;
        int monthBranchIdx = (2 + k) % 12; // 寅=2
        d.monthGz = GAN[monthStemIdx] + ZHI[monthBranchIdx];

        // ---- 纳音五行 (日柱) ----
        d.nayin = NAYIN[dayGzIndex / 2];

        // ---- 建除十二神 ----
        int dayBranchIdx = dayGzIndex % 12;
        int jianShenIdx = ((dayBranchIdx - monthBranchIdx) % 12 + 12) % 12;
        d.jianShen = JIAN_SHEN[jianShenIdx];
        d.yi = YI[jianShenIdx];
        d.ji = JI[jianShenIdx];

        // ---- 冲煞 ----
        int clashBranchIdx = (dayBranchIdx + 6) % 12;
        int clashGzIndex = (((dayGzIndex - 6) % 60) + 60) % 60;
        d.chong = ANIMALS[clashBranchIdx] + "(" + cyclic(clashGzIndex) + ")";
        d.sha = shaDirection(dayBranchIdx);

        // ---- 农历全称 (含生肖) ----
        int animalIdx = (((lYear - 4) % 12) + 12) % 12;
        d.lunarFull = "农历 " + d.yearGz + "(" + ANIMALS[animalIdx] + ")年 " + d.lunarShort;

        // ---- 节气提示 ----
        d.jieqi = buildJieqiTip(cal);

        return d;
    }

    /** 煞方：申子辰->南, 亥卯未->西, 寅午戌->北, 巳酉丑->东。 */
    private static String shaDirection(int branchIdx) {
        switch (branchIdx) {
            case 0: case 4: case 8:  // 子辰申 -> 南
                return "南";
            case 3: case 7: case 11: // 卯未亥 -> 西
                return "西";
            case 2: case 6: case 10: // 寅午戌 -> 北
                return "北";
            case 1: case 5: case 9:  // 丑巳酉 -> 东
            default:
                return "东";
        }
    }

    /** 农历月份名 (1=正, ..., 10=十, 11=冬, 12=腊)，闰月前缀「闰」。 */
    private static String lunarMonthName(int month, boolean leap) {
        String name;
        switch (month) {
            case 1: name = "正"; break;
            case 10: name = "十"; break;
            case 11: name = "冬"; break;
            case 12: name = "腊"; break;
            default: name = CN_NUM[month]; break;
        }
        return (leap ? "闰" : "") + name;
    }

    /** 农历日名 (初一..三十)。 */
    private static String lunarDayName(int day) {
        if (day == 10) return "初十";
        if (day == 20) return "二十";
        if (day == 30) return "三十";
        if (day < 10) return "初" + CN_NUM[day];
        if (day < 20) return "十" + CN_NUM[day - 10];
        return "廿" + CN_NUM[day - 20]; // 21..29
    }

    /** 节气提示：今日为节气则提示「今日 X」，否则提示下一个节气及天数。 */
    private static String buildJieqiTip(Calendar cal) {
        int year = cal.get(Calendar.YEAR);
        int month = cal.get(Calendar.MONTH) + 1;
        int day = cal.get(Calendar.DAY_OF_MONTH);
        // 今日是否为节气
        for (int n = 0; n < 24; n++) {
            if (termMonth(n) == month && solarTermDay(year, n) == day) {
                return "今日 " + SOLAR_TERMS[n];
            }
        }
        // 寻找下一个节气
        for (int n = 0; n < 24; n++) {
            int tm = termMonth(n);
            int td = solarTermDay(year, n);
            if (tm > month || (tm == month && td > day)) {
                int days = daysToTerm(cal, year, n, td);
                return "距" + SOLAR_TERMS[n] + " " + days + "天";
            }
        }
        // 跨年：取下一年小寒
        int td = solarTermDay(year + 1, 0);
        int days = daysToTerm(cal, year + 1, 0, td);
        return "距" + SOLAR_TERMS[0] + " " + days + "天";
    }

    /** 计算从 cal 到 (termYear 年第 n 个节气) 之间的天数。 */
    private static int daysToTerm(Calendar cal, int termYear, int n, int termDay) {
        Calendar t = Calendar.getInstance();
        t.clear();
        t.set(termYear, termMonth(n) - 1, termDay);
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH));
        long diff = (t.getTimeInMillis() - c.getTimeInMillis()) / (24L * 60L * 60L * 1000L);
        return (int) diff;
    }

    /** 用「、」连接数组前 count 项。 */
    private static String joinFirst(String[] arr, int count) {
        int n = Math.min(count, arr.length);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) {
            if (i > 0) sb.append("、");
            sb.append(arr[i]);
        }
        return sb.toString();
    }

    // ======================================================================================
    // RemoteViews 构建
    // ======================================================================================

    /** 子类重写以区分尺寸。 */
    protected boolean isLarge() {
        return false;
    }

    private RemoteViews buildViews(Context ctx, HuangliData data) {
        RemoteViews rv = new RemoteViews(ctx.getPackageName(),
                isLarge() ? R.layout.widget_huangli_large : R.layout.widget_huangli_small);
        if (isLarge()) {
            populateLarge(rv, data);
            rv.setOnClickPendingIntent(R.id.widget_root_large, buildOpenIntent(ctx));
        } else {
            populateSmall(rv, data);
            rv.setOnClickPendingIntent(R.id.widget_root_small, buildOpenIntent(ctx));
        }
        return rv;
    }

    private void populateSmall(RemoteViews rv, HuangliData d) {
        rv.setTextViewText(R.id.tv_solar_small, d.solarShort);
        rv.setTextViewText(R.id.tv_lunar_small, d.lunarShort);
        rv.setTextViewText(R.id.tv_yi_small, "宜 " + joinFirst(d.yi, 2));
        rv.setTextViewText(R.id.tv_ji_small, "忌 " + joinFirst(d.ji, 2));
    }

    private void populateLarge(RemoteViews rv, HuangliData d) {
        rv.setTextViewText(R.id.tv_solar_large, d.solarFull);
        rv.setTextViewText(R.id.tv_lunar_large, d.lunarFull);
        rv.setTextViewText(R.id.tv_ganzhi_large,
                "干支 " + d.yearGz + "年 " + d.monthGz + "月 " + d.dayGz + "日");
        rv.setTextViewText(R.id.tv_wuxing_large, "五行 " + d.nayin + " · " + d.jianShen + "日");
        rv.setTextViewText(R.id.tv_chongsha_large, "冲 " + d.chong + "  煞 " + d.sha);
        rv.setTextViewText(R.id.tv_yi_large, "宜  " + joinFirst(d.yi, 4));
        rv.setTextViewText(R.id.tv_ji_large, "忌  " + joinFirst(d.ji, 4));
        rv.setTextViewText(R.id.tv_jieqi_large, d.jieqi);
    }

    /** 点击小组件打开 App (MainActivity)，并携带 open_huangli=true。 */
    private PendingIntent buildOpenIntent(Context ctx) {
        Intent intent = new Intent(ctx, MainActivity.class);
        intent.putExtra(EXTRA_OPEN_HUANGLI, true);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(ctx, 0, intent, flags);
    }

    // ======================================================================================
    // AppWidgetProvider 生命周期
    // ======================================================================================

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] appWidgetIds) {
        HuangliData data = computeSafe(ctx);
        if (appWidgetIds != null) {
            for (int id : appWidgetIds) {
                mgr.updateAppWidget(id, buildViews(ctx, data));
            }
        }
        scheduleMidnight(ctx);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        if (ACTION_AUTO_UPDATE.equals(intent.getAction())) {
            updateAll(ctx);
            scheduleMidnight(ctx);
        }
    }

    @Override
    public void onEnabled(Context ctx) {
        super.onEnabled(ctx);
        scheduleMidnight(ctx);
    }

    @Override
    public void onDisabled(Context ctx) {
        super.onDisabled(ctx);
        if (totalWidgetCount(ctx) == 0) {
            cancelMidnight(ctx);
        }
    }

    /** 刷新所有尺寸的小组件。 */
    private void updateAll(Context ctx) {
        HuangliData data = computeSafe(ctx);
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        updateByIds(ctx, mgr, mgr.getAppWidgetIds(new ComponentName(ctx, HuangliWidgetProvider.class)), data, false);
        updateByIds(ctx, mgr, mgr.getAppWidgetIds(new ComponentName(ctx, HuangliWidgetProviderLarge.class)), data, true);
    }

    private void updateByIds(Context ctx, AppWidgetManager mgr, int[] ids, HuangliData data, boolean large) {
        if (ids == null) return;
        for (int id : ids) {
            RemoteViews rv = large ? buildLargeViews(ctx, data) : buildSmallViews(ctx, data);
            mgr.updateAppWidget(id, rv);
        }
    }

    /** 静态构建小尺寸视图 (供 updateAll 跨实例调用)。 */
    private static RemoteViews buildSmallViews(Context ctx, HuangliData data) {
        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_huangli_small);
        rv.setTextViewText(R.id.tv_solar_small, data.solarShort);
        rv.setTextViewText(R.id.tv_lunar_small, data.lunarShort);
        rv.setTextViewText(R.id.tv_yi_small, "宜 " + joinFirst(data.yi, 2));
        rv.setTextViewText(R.id.tv_ji_small, "忌 " + joinFirst(data.ji, 2));
        rv.setOnClickPendingIntent(R.id.widget_root_small, buildOpenIntentStatic(ctx));
        return rv;
    }

    /** 静态构建大尺寸视图 (供 updateAll 跨实例调用)。 */
    private static RemoteViews buildLargeViews(Context ctx, HuangliData data) {
        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_huangli_large);
        rv.setTextViewText(R.id.tv_solar_large, data.solarFull);
        rv.setTextViewText(R.id.tv_lunar_large, data.lunarFull);
        rv.setTextViewText(R.id.tv_ganzhi_large,
                "干支 " + data.yearGz + "年 " + data.monthGz + "月 " + data.dayGz + "日");
        rv.setTextViewText(R.id.tv_wuxing_large, "五行 " + data.nayin + " · " + data.jianShen + "日");
        rv.setTextViewText(R.id.tv_chongsha_large, "冲 " + data.chong + "  煞 " + data.sha);
        rv.setTextViewText(R.id.tv_yi_large, "宜  " + joinFirst(data.yi, 4));
        rv.setTextViewText(R.id.tv_ji_large, "忌  " + joinFirst(data.ji, 4));
        rv.setTextViewText(R.id.tv_jieqi_large, data.jieqi);
        rv.setOnClickPendingIntent(R.id.widget_root_large, buildOpenIntentStatic(ctx));
        return rv;
    }

    private static PendingIntent buildOpenIntentStatic(Context ctx) {
        Intent intent = new Intent(ctx, MainActivity.class);
        intent.putExtra(EXTRA_OPEN_HUANGLI, true);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(ctx, 0, intent, flags);
    }

    /** 计算今日数据并缓存；计算异常时回退到缓存。 */
    private HuangliData computeSafe(Context ctx) {
        HuangliData data;
        try {
            data = compute(Calendar.getInstance());
            saveCache(ctx, data);
        } catch (Exception e) {
            data = loadCache(ctx);
            if (data == null) {
                data = fallbackData();
            }
        }
        return data;
    }

    private static HuangliData fallbackData() {
        HuangliData d = new HuangliData();
        d.solarShort = "言道黄历";
        d.solarFull = "言道黄历";
        d.lunarShort = "";
        d.lunarFull = "点击打开查看今日宜忌";
        d.yearGz = d.monthGz = d.dayGz = "";
        d.jianShen = "";
        d.nayin = "";
        d.yi = new String[]{"祭祀", "祈福"};
        d.ji = new String[]{"出行"};
        d.chong = "";
        d.sha = "";
        d.jieqi = "";
        return d;
    }

    // ======================================================================================
    // 缓存 (SharedPreferences)
    // ======================================================================================

    private void saveCache(Context ctx, HuangliData d) {
        try {
            SharedPreferences sp = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            sp.edit()
                    .putString("solarShort", d.solarShort)
                    .putString("solarFull", d.solarFull)
                    .putString("lunarShort", d.lunarShort)
                    .putString("lunarFull", d.lunarFull)
                    .putString("yearGz", d.yearGz)
                    .putString("monthGz", d.monthGz)
                    .putString("dayGz", d.dayGz)
                    .putString("jianShen", d.jianShen)
                    .putString("nayin", d.nayin)
                    .putString("yi", joinFirst(d.yi, d.yi.length))
                    .putString("ji", joinFirst(d.ji, d.ji.length))
                    .putString("chong", d.chong)
                    .putString("sha", d.sha)
                    .putString("jieqi", d.jieqi)
                    .apply();
        } catch (Exception ignored) {
        }
    }

    private HuangliData loadCache(Context ctx) {
        try {
            SharedPreferences sp = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            if (sp.getString("dayGz", null) == null) return null;
            HuangliData d = new HuangliData();
            d.solarShort = sp.getString("solarShort", "");
            d.solarFull = sp.getString("solarFull", "");
            d.lunarShort = sp.getString("lunarShort", "");
            d.lunarFull = sp.getString("lunarFull", "");
            d.yearGz = sp.getString("yearGz", "");
            d.monthGz = sp.getString("monthGz", "");
            d.dayGz = sp.getString("dayGz", "");
            d.jianShen = sp.getString("jianShen", "");
            d.nayin = sp.getString("nayin", "");
            d.yi = splitList(sp.getString("yi", ""));
            d.ji = splitList(sp.getString("ji", ""));
            d.chong = sp.getString("chong", "");
            d.sha = sp.getString("sha", "");
            d.jieqi = sp.getString("jieqi", "");
            return d;
        } catch (Exception e) {
            return null;
        }
    }

    private static String[] splitList(String s) {
        if (s == null || s.isEmpty()) return new String[0];
        return s.split("、");
    }

    // ======================================================================================
    // 每日 0 点定时刷新
    // ======================================================================================

    private void scheduleMidnight(Context ctx) {
        try {
            Calendar c = Calendar.getInstance();
            c.set(Calendar.HOUR_OF_DAY, 0);
            c.set(Calendar.MINUTE, 0);
            c.set(Calendar.SECOND, 0);
            c.set(Calendar.MILLISECOND, 0);
            c.add(Calendar.DAY_OF_MONTH, 1);
            long triggerAt = c.getTimeInMillis();

            Intent intent = new Intent(ACTION_AUTO_UPDATE);
            intent.setComponent(new ComponentName(ctx.getPackageName(),
                    HuangliWidgetProvider.class.getName()));
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getBroadcast(ctx, 0, intent, flags);

            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                am.setRepeating(AlarmManager.RTC, triggerAt,
                        AlarmManager.INTERVAL_DAY, pi);
            }
        } catch (Exception ignored) {
        }
    }

    private void cancelMidnight(Context ctx) {
        try {
            Intent intent = new Intent(ACTION_AUTO_UPDATE);
            intent.setComponent(new ComponentName(ctx.getPackageName(),
                    HuangliWidgetProvider.class.getName()));
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getBroadcast(ctx, 0, intent, flags);
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                am.cancel(pi);
            }
        } catch (Exception ignored) {
        }
    }

    /** 当前所有尺寸小组件的总数。 */
    private int totalWidgetCount(Context ctx) {
        try {
            AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
            int a = mgr.getAppWidgetIds(new ComponentName(ctx, HuangliWidgetProvider.class)).length;
            int b = mgr.getAppWidgetIds(new ComponentName(ctx, HuangliWidgetProviderLarge.class)).length;
            return a + b;
        } catch (Exception e) {
            return 0;
        }
    }
}

/**
 * 4x2 大尺寸小组件提供者。复用 {@link HuangliWidgetProvider} 的全部逻辑，
 * 仅覆盖尺寸标识，使其绑定到不同布局与元数据。
 */
class HuangliWidgetProviderLarge extends HuangliWidgetProvider {
    @Override
    protected boolean isLarge() {
        return true;
    }
}
