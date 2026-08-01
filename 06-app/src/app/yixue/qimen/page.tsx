"use client";

import { useState, useEffect, useCallback } from "react";
import { Solar } from "lunar-javascript";
import { calculateQimen } from "@/algorithm-core";
import type { QimenResult } from "@/algorithm-core";
import ClientSelector from "@/components/ClientSelector";
import { DatePickerInline, QuickBtnGroup } from "@/components/shared";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";

// ============================================================================
// 常量
// ============================================================================

const BRAND_PURPLE = "#7B2FBE";
const BRAND_PURPLE_BG = "#f3ebfa";
const COLOR_GRAY_LABEL = "#999";
const COLOR_RED = "#ed4d49";
const COLOR_BLACK = "#000";

// 五行颜色
const GAN_COLORS: Record<string, string> = {
  "甲": "#0f7d18", "乙": "#0f7d18", // 木-绿
  "丙": "#ed4d49", "丁": "#ed4d49", // 火-红
  "戊": "#a06319", "己": "#a06319", // 土-棕
  "庚": "#d4a017", "辛": "#d4a017", // 金-黄
  "壬": "#1d4ed8", "癸": "#1d4ed8", // 水-蓝
};

const SHEN_COLORS: Record<string, string> = {
  "值符": "#d4a017", "螣蛇": "#a06319", "太阴": "#d4a017", "六合": "#0f7d18",
  "白虎": "#ed4d49", "玄武": "#1d4ed8", "九地": "#1d4ed8", "九天": "#d4a017",
  "符": "#d4a017", "蛇": "#a06319", "阴": "#d4a017", "六": "#0f7d18",
  "白": "#ed4d49", "玄": "#1d4ed8", "地": "#1d4ed8", "天": "#d4a017",
};

const XING_COLORS: Record<string, string> = {
  "天蓬": "#1d4ed8", "天芮": "#a06319", "天冲": "#0f7d18", "天辅": "#0f7d18",
  "天禽": "#a06319", "天心": "#d4a017", "天柱": "#d4a017", "天任": "#a06319", "天英": "#ed4d49",
  "芮禽": "#a06319",
};

const MEN_COLORS: Record<string, string> = {
  "休": "#1d4ed8", "生": "#0f7d18", "伤": "#0f7d18", "杜": "#0f7d18",
  "景": "#ed4d49", "死": "#a06319", "惊": "#d4a017", "开": "#d4a017",
  "休门": "#1d4ed8", "生门": "#0f7d18", "伤门": "#0f7d18", "杜门": "#0f7d18",
  "景门": "#ed4d49", "死门": "#a06319", "惊门": "#d4a017", "开门": "#d4a017",
};

// 洛书九宫布局（3x3）
const LUOSHU_LAYOUT = [
  [4, 9, 2],  // 巽4 离9 坤2
  [3, 5, 7],  // 震3 中5 兑7
  [8, 1, 6],  // 艮8 坎1 乾6
];

const BAGUA: Record<number, string> = {
  1: "坎", 2: "坤", 3: "震", 4: "巽", 5: "", 6: "乾", 7: "兑", 8: "艮", 9: "离",
};

const DIR: Record<number, string> = {
  1: "北", 2: "西南", 3: "东", 4: "东南", 5: "", 6: "西北", 7: "西", 8: "东北", 9: "南",
};

// 时辰列表
const SHICHEN_LIST = [
  { name: "早子时", zhi: "子", range: "00:00-01:00" },
  { name: "丑时", zhi: "丑", range: "01:00-03:00" },
  { name: "寅时", zhi: "寅", range: "03:00-05:00" },
  { name: "卯时", zhi: "卯", range: "05:00-07:00" },
  { name: "辰时", zhi: "辰", range: "07:00-09:00" },
  { name: "巳时", zhi: "巳", range: "09:00-11:00" },
  { name: "午时", zhi: "午", range: "11:00-13:00" },
  { name: "未时", zhi: "未", range: "13:00-15:00" },
  { name: "申时", zhi: "申", range: "15:00-17:00" },
  { name: "酉时", zhi: "酉", range: "17:00-19:00" },
  { name: "戌时", zhi: "戌", range: "19:00-21:00" },
  { name: "亥时", zhi: "亥", range: "21:00-23:00" },
  { name: "夜子时", zhi: "子", range: "23:00-24:00" },
];

// ============================================================================
// 主组件
// ============================================================================

export default function QimenPage() {
  const [showForm, setShowForm] = useState(true);
  const [result, setResult] = useState<QimenResult | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);

  // 表单状态
  const now = new Date();
  const [formData, setFormData] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    desc: "",
    panMethod: "chaibu" as "chaibu" | "zhirun" | "maoshan",
    showDiShen: false,
    showZhangSheng: false,
  });

  // 执行排盘
  const doPaipan = useCallback(() => {
    try {
      const r = calculateQimen({
        year: formData.year,
        month: formData.month,
        day: formData.day,
        hour: formData.hour,
        panMethod: formData.panMethod,
        anganType: "zhishi" as const,
      });
      setResult(r);
      setShowForm(false);
      // 保存客户记录
      if(selectedClient){
        try{saveRecord({clientId:selectedClient.id,type:"qimen",data:{...r,inputParams:{...formData}},note:"",status:"pending"});}catch(e){console.error("保存记录失败:",e);}
      }
    } catch (e) {
      console.error("排盘错误:", e);
      alert("排盘出错，请检查输入");
    }
  }, [formData, selectedClient]);

  // 上一局/下一局
  const shiftTime = useCallback((delta: number) => {
    if (!result) return;
    const newHour = formData.hour + delta * 2;
    let newDay = formData.day;
    let newMonth = formData.month;
    let newYear = formData.year;
    let h = newHour;
    if (h < 0) {
      h = 22; // 前一天亥时
      const d = new Date(formData.year, formData.month - 1, formData.day - 1);
      newDay = d.getDate();
      newMonth = d.getMonth() + 1;
      newYear = d.getFullYear();
    } else if (h >= 24) {
      h = 0; // 后天子时
      const d = new Date(formData.year, formData.month - 1, formData.day + 1);
      newDay = d.getDate();
      newMonth = d.getMonth() + 1;
      newYear = d.getFullYear();
    }
    setFormData(prev => ({ ...prev, year: newYear, month: newMonth, day: newDay, hour: h }));
    setTimeout(() => {
      try {
        const r = calculateQimen({
          year: newYear,
          month: newMonth,
          day: newDay,
          hour: h,
          panMethod: formData.panMethod,
          anganType: "zhishi" as const,
        });
        setResult(r);
      } catch (e) { /* ignore */ }
    }, 50);
  }, [result, formData]);

  // 监听编辑事件
  useEffect(() => {
    const handler = () => setShowForm(true);
    window.addEventListener("yixue-edit", handler);
    return () => window.removeEventListener("yixue-edit", handler);
  }, []);

  // URL参数clientId自动选中客户 + 回填数据检查
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) {
      const c = getClient(cid);
      if (c) setSelectedClient(c);
    }
    const prefill = getPrefillData("qimen");
    if (prefill) {
      try {
        // 回填排盘结果
        setResult(prefill);
        // 回填输入参数
        if (prefill.inputParams) {
          const ip = prefill.inputParams;
          setFormData(prev => ({
            ...prev,
            year: ip.year || prev.year,
            month: ip.month || prev.month,
            day: ip.day || prev.day,
            hour: ip.hour !== undefined ? ip.hour : prev.hour,
            panMethod: ip.panMethod || prev.panMethod,
          }));
        }
        setShowForm(false);
        clearPrefillData("qimen");
      } catch (e) { console.error("回填失败:", e); }
    }
  }, []);

  // ==================== 输入表单 ====================
  if (showForm) {
    return (
      <div style={{ maxWidth: "375px", margin: "0 auto", backgroundColor: "#fff", minHeight: "100vh", paddingBottom: "20px" }}>
        {/* 标题栏 */}
        <div style={{ backgroundColor: BRAND_PURPLE, color: "#fff", padding: "12px 16px", textAlign: "center", fontSize: "18px", fontWeight: 700 }}>
          言道奇门遁甲
        </div>

        <div style={{ padding: "16px" }}>
          {/* 事项输入 */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "14px", color: "#333", marginBottom: "6px", display: "block" }}>预测事项</label>
            <input
              type="text"
              value={formData.desc}
              onChange={e => setFormData(prev => ({ ...prev, desc: e.target.value }))}
              placeholder="请输入预测事项（选填）"
              maxLength={30}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          {/* 日期选择 */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "14px", color: "#333", marginBottom: "8px", display: "block" }}>日期选择</label>
            <DatePickerInline
              year={formData.year} month={formData.month} day={formData.day} hour={formData.hour}
              onYearChange={(v) => setFormData(prev => ({ ...prev, year: v }))}
              onMonthChange={(v) => setFormData(prev => ({ ...prev, month: v }))}
              onDayChange={(v) => setFormData(prev => ({ ...prev, day: v }))}
              onHourChange={(v) => setFormData(prev => ({ ...prev, hour: v }))}
            />
            <div style={{ marginTop: "8px" }}>
              <QuickBtnGroup items={[
                { label: "1990年", onClick: () => setFormData(prev => ({ ...prev, year: 1990 })) },
                { label: "2000年", onClick: () => setFormData(prev => ({ ...prev, year: 2000 })) },
                { label: "2020年", onClick: () => setFormData(prev => ({ ...prev, year: 2020 })) },
                { label: "1月", onClick: () => setFormData(prev => ({ ...prev, month: 1 })) },
                { label: "6月", onClick: () => setFormData(prev => ({ ...prev, month: 6 })) },
                { label: "12月", onClick: () => setFormData(prev => ({ ...prev, month: 12 })) },
                { label: "1日", onClick: () => setFormData(prev => ({ ...prev, day: 1 })) },
                { label: "15日", onClick: () => setFormData(prev => ({ ...prev, day: 15 })) },
                { label: "0时", onClick: () => setFormData(prev => ({ ...prev, hour: 0 })) },
                { label: "12时", onClick: () => setFormData(prev => ({ ...prev, hour: 12 })) },
              ]} />
            </div>
          </div>

          {/* 排盘方式 */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "14px", color: "#333", marginBottom: "8px", display: "block" }}>排盘方式</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {[
                { v: "chaibu", label: "拆补法" },
                { v: "zhirun", label: "置闰法" },
                { v: "maoshan", label: "茅山法" },
              ].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setFormData(prev => ({ ...prev, panMethod: opt.v as any }))}
                  style={{
                    flex: 1,
                    padding: "8px",
                    border: formData.panMethod === opt.v ? "2px solid " + BRAND_PURPLE : "1px solid #ddd",
                    borderRadius: "6px",
                    backgroundColor: formData.panMethod === opt.v ? BRAND_PURPLE_BG : "#fff",
                    color: formData.panMethod === opt.v ? BRAND_PURPLE : "#333",
                    fontSize: "13px",
                    fontWeight: formData.panMethod === opt.v ? 700 : 400,
                    cursor: "pointer",
                  }}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          {/* 客户选择 */}
          <div style={{ marginBottom: "12px" }}>
            <ClientSelector selectedClient={selectedClient} onSelect={setSelectedClient} />
          </div>

          {/* 排盘按钮 */}
          <button
            onClick={doPaipan}
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: BRAND_PURPLE,
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >开始排盘</button>

          <div style={{ marginTop: "16px", fontSize: "11px", color: "#999", textAlign: "center", lineHeight: 1.6 }}>
            免责声明：奇门遁甲排盘仅供传统文化学习参考，不构成任何决策依据
          </div>
        </div>
      </div>
    );
  }

  // ==================== 排盘结果 ====================
  if (!result) return null;

  const getGanColor = (g: string) => GAN_COLORS[g] || COLOR_BLACK;
  const getShenColor = (s: string) => SHEN_COLORS[s] || COLOR_BLACK;
  const getXingColor = (x: string) => XING_COLORS[x] || COLOR_BLACK;
  const getMenColor = (m: string) => MEN_COLORS[m] || (MEN_COLORS[m.replace("门", "")] || COLOR_BLACK);

  // 派生显示数据
  const isYangDun = result.yinYangDun === "阳遁";
  const juNum = result.juNumber;
  const yuanShort = result.sanYuan.replace("元", "");
  const hourZhi = result.siZhu.hour[1];
  const zhiFuStar = result.zhiFuZhiShi.zhiFuXingGong[0];
  const zhiShiDoor = result.zhiFuZhiShi.zhiShiMenGong[0];
  const yiMa = result.maXing.yiMa;
  const siZhuArr = [result.siZhu.year, result.siZhu.month, result.siZhu.day, result.siZhu.hour];
  // 农历日期
  const solarObj = Solar.fromYmdHms(formData.year, formData.month, formData.day, formData.hour, 0, 0);
  const lunarObj = solarObj.getLunar();
  const lunarStr = `农历${lunarObj.getMonthInChinese()}月${lunarObj.getDayInChinese()}`;

  // 宫格样式辅助函数
  const getPalaceStyle = (gongNum: number) => {
    const p = result.palaces[gongNum];
    const bg = p.jixing ? "#ffe0e0" : p.rumu ? "#fff3cd" : p.menpo ? "#e0f0ff" : "#fff";
    return {
      backgroundColor: bg,
      border: "1px solid #ccc",
      padding: "2px",
      minHeight: "85px",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      position: "relative" as const,
    };
  };

  return (
    <div style={{ maxWidth: "375px", margin: "0 auto", backgroundColor: "#fff", minHeight: "100vh", paddingBottom: "60px" }}>
      {/* 操作栏 */}
      <div style={{ display: "flex", padding: "8px", gap: "6px", borderBottom: "1px solid #eee", alignItems: "center" }}>
        <button onClick={() => shiftTime(-1)} style={{ flex: 1, padding: "6px", border: "1px solid #ddd", borderRadius: "4px", backgroundColor: "#fff", fontSize: "12px", cursor: "pointer" }}>上一局</button>
        <button onClick={() => { setShowForm(true); }} style={{ flex: 1, padding: "6px", border: "1px solid " + BRAND_PURPLE, borderRadius: "4px", backgroundColor: BRAND_PURPLE_BG, color: BRAND_PURPLE, fontSize: "12px", cursor: "pointer" }}>当前盘</button>
        <button onClick={() => shiftTime(1)} style={{ flex: 1, padding: "6px", border: "1px solid #ddd", borderRadius: "4px", backgroundColor: "#fff", fontSize: "12px", cursor: "pointer" }}>下一局</button>
        <button
          onClick={() => setFormData(prev => ({ ...prev, showZhangSheng: !prev.showZhangSheng }))}
          style={{ padding: "6px 8px", border: formData.showZhangSheng ? "1px solid " + BRAND_PURPLE : "1px solid #ddd", borderRadius: "4px", backgroundColor: formData.showZhangSheng ? BRAND_PURPLE_BG : "#fff", fontSize: "11px", cursor: "pointer" }}
        >长生</button>
        <button
          onClick={() => setFormData(prev => ({ ...prev, showDiShen: !prev.showDiShen }))}
          style={{ padding: "6px 8px", border: formData.showDiShen ? "1px solid " + BRAND_PURPLE : "1px solid #ddd", borderRadius: "4px", backgroundColor: formData.showDiShen ? BRAND_PURPLE_BG : "#fff", fontSize: "11px", cursor: "pointer" }}
        >地八神</button>
      </div>

      {/* 局数 */}
      <div style={{ textAlign: "center", padding: "6px", fontSize: "15px", fontWeight: 700, color: BRAND_PURPLE }}>
        {isYangDun ? "阳遁" : "阴遁"}{juNum}局 {yuanShort}元
      </div>

      {/* 日期 */}
      <div style={{ textAlign: "center", fontSize: "12px", color: "#666", padding: "2px 8px" }}>
        {formData.year}年{formData.month}月{formData.day}日 {lunarStr} {hourZhi}时
      </div>

      {/* 节气 */}
      <div style={{ textAlign: "center", fontSize: "11px", color: "#999", padding: "2px 8px" }}>
        {result.jieqi}
      </div>

      {/* 五要素信息表 */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", margin: "4px 0" }}>
        <thead>
          <tr style={{ backgroundColor: "#f5f5f5" }}>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666" }}>值符</th>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666" }}>值使</th>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666" }}>旬首</th>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666" }}>马星</th>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666" }}>空亡</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #ddd", padding: "3px", textAlign: "center", color: getXingColor(zhiFuStar) }}>{zhiFuStar}</td>
            <td style={{ border: "1px solid #ddd", padding: "3px", textAlign: "center", color: getMenColor(zhiShiDoor) }}>{zhiShiDoor}</td>
            <td style={{ border: "1px solid #ddd", padding: "3px", textAlign: "center" }}>{result.xunShou}</td>
            <td style={{ border: "1px solid #ddd", padding: "3px", textAlign: "center", color: COLOR_RED }}>{yiMa}</td>
            <td style={{ border: "1px solid #ddd", padding: "3px", textAlign: "center", color: "#999" }}>{result.xunKong[0]}{result.xunKong[1]}</td>
          </tr>
        </tbody>
      </table>

      {/* 四柱 */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", margin: "4px 0" }}>
        <thead>
          <tr style={{ backgroundColor: "#f5f5f5" }}>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666", width: "20%" }}></th>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666", width: "20%" }}>年柱</th>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666", width: "20%" }}>月柱</th>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666", width: "20%" }}>日柱</th>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666", width: "20%" }}>时柱</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #ddd", padding: "3px", textAlign: "center", fontSize: "10px", color: "#999" }}>天干</td>
            {siZhuArr.map((gz, i) => (
              <td key={"g" + i} style={{ border: "1px solid #ddd", padding: "3px", textAlign: "center", fontSize: "14px", fontWeight: 700, color: getGanColor(gz[0]) }}>{gz[0]}</td>
            ))}
          </tr>
          <tr>
            <td style={{ border: "1px solid #ddd", padding: "3px", textAlign: "center", fontSize: "10px", color: "#999" }}>地支</td>
            {siZhuArr.map((gz, i) => (
              <td key={"z" + i} style={{ border: "1px solid #ddd", padding: "3px", textAlign: "center", fontSize: "14px", fontWeight: 700, color: getGanColor(gz[1] || gz[0]) }}>{gz[1]}</td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* 九宫格排盘 */}
      <div style={{ padding: "6px", border: "2px solid #333", margin: "4px 8px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          {LUOSHU_LAYOUT.flat().map((gongNum, idx) => {
            const p = result.palaces[gongNum];
            const isZhong = gongNum === 5;
            return (
              <div key={gongNum} style={getPalaceStyle(gongNum)}>
                {/* 宫位标记（左上） */}
                <div style={{ position: "absolute", top: "1px", left: "2px", fontSize: "8px", color: "#999", lineHeight: 1 }}>
                  {BAGUA[gongNum]}{DIR[gongNum]}
                </div>

                {/* 空亡/马星标记（右上） */}
                <div style={{ position: "absolute", top: "1px", right: "2px", fontSize: "8px", lineHeight: 1 }}>
                  {p.kongwang && <span style={{ color: "#999" }}>空</span>}
                  {p.ma && <span style={{ color: COLOR_RED, marginLeft: "2px" }}>马</span>}
                </div>

                {isZhong ? (
                  <div style={{ textAlign: "center", fontSize: "11px", color: "#666" }}>
                    <div style={{ fontWeight: 700 }}>中宫</div>
                    <div style={{ fontSize: "10px", marginTop: "4px" }}>寄坤二宫</div>
                  </div>
                ) : (
                  <>
                    {/* 八神（最上） */}
                    <div style={{ fontSize: "11px", fontWeight: 500, color: getShenColor(p.tianShen), lineHeight: 1.2 }}>
                      {p.tianShen}
                    </div>
                    {/* 地八神（可选） */}
                    {formData.showDiShen && p.diShen && (
                      <div style={{ fontSize: "9px", color: getShenColor(p.diShen), lineHeight: 1.1 }}>
                        {p.diShen}
                      </div>
                    )}
                    {/* 天盘天干 */}
                    <div style={{ fontSize: "18px", fontWeight: 700, color: getGanColor(p.tianPanGan), lineHeight: 1.2 }}>
                      {p.tianPanGan}
                      {p.tianPanJiXing && <span style={{ fontSize: "10px", color: COLOR_RED, marginLeft: "1px" }}>刑</span>}
                      {p.tianPanRuMu && <span style={{ fontSize: "10px", color: "#a06319", marginLeft: "1px" }}>墓</span>}
                    </div>
                    {/* 九星 */}
                    <div style={{ fontSize: "11px", fontWeight: 500, color: getXingColor(p.star), lineHeight: 1.2 }}>
                      {p.star}
                    </div>
                    {/* 八门 */}
                    <div style={{ fontSize: "12px", fontWeight: 700, color: getMenColor(p.door), lineHeight: 1.2 }}>
                      {p.door ? p.door.replace("门", "") : ""}
                    </div>
                    {/* 地盘天干 */}
                    <div style={{ fontSize: "13px", fontWeight: 500, color: getGanColor(p.diPanGan), lineHeight: 1.2, textDecoration: "underline", textUnderlineOffset: "2px" }}>
                      {p.diPanGan}
                    </div>
                    {/* 暗干 */}
                    {p.anGan && (
                      <div style={{ fontSize: "9px", color: getGanColor(p.anGan), lineHeight: 1.1, position: "absolute", bottom: "1px", right: "2px" }}>
                        {p.anGan}
                      </div>
                    )}
                    {/* 12长生状态（可选） */}
                    {formData.showZhangSheng && p.tianPan12ZhangSheng && (
                      <div style={{ fontSize: "8px", color: "#666", lineHeight: 1, position: "absolute", bottom: "1px", left: "2px" }}>
                        {p.tianPan12ZhangSheng}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 颜色图例 */}
      <div style={{ padding: "4px 8px", fontSize: "10px", color: "#999", display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
        <span>击刑:红底</span>
        <span>入墓:黄底</span>
        <span>门迫:蓝底</span>
        <span>空:空亡</span>
        <span>马:驿马</span>
      </div>

      {/* 免责声明 */}
      <div style={{ padding: "8px 16px", fontSize: "10px", color: "#999", textAlign: "center", lineHeight: 1.6 }}>
        <span style={{ color: COLOR_RED }}>免责声明：</span>奇门遁甲排盘仅供传统文化学习参考，不构成任何决策依据
      </div>
    </div>
  );
}
