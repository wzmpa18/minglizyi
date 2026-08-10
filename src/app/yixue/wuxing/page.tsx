"use client";

import { useState, useMemo } from "react";
import {
  GAN, ZHI,
  GAN_WUXING, ZHI_WUXING,
  GAN_YIN_YANG, ZHI_YIN_YANG,
  GAN_WU_HE, ZHI_LIU_HE, ZHI_LIU_CHONG,
  ZHI_SAN_HE, ZHI_SAN_HUI, ZHI_LIU_HAI, ZHI_XING, ZHI_PO,
  getGanWuxing, getZhiWuxing, getGanYinYang, getZhiYinYang,
  getGanHePartner, getZhiHePartner, getZhiChongPartner,
} from "@/algorithm-core";
import type { TianGan, DiZhi } from "@/algorithm-core";
import EventDivinationPanel from "@/components/EventDivinationPanel";

import { ShareButton } from "@/components/ShareButton";
const WUXING_COLORS: Record<string, string> = {
  '金': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  '木': 'bg-green-100 text-green-800 border-green-300',
  '水': 'bg-blue-100 text-blue-800 border-blue-300',
  '火': 'bg-red-100 text-red-800 border-red-300',
  '土': 'bg-amber-100 text-amber-800 border-amber-300',
};

type TabKey = "tiangan" | "dizhi";

export default function WuXingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("tiangan");

  // 天干数据
  const ganData = useMemo(() => {
    return GAN.map((g) => {
      const wx = getGanWuxing(g as TianGan);
      const yy = getGanYinYang(g as TianGan);
      const hePartner = getGanHePartner(g as TianGan);
      return {
        gan: g,
        wuxing: wx,
        yinyang: yy,
        hePartner: hePartner ? `${hePartner.partner}（合化${hePartner.huaWuXing}）` : "无",
      };
    });
  }, []);

  // 地支数据
  const zhiData = useMemo(() => {
    return ZHI.map((z) => {
      const wx = getZhiWuxing(z as DiZhi);
      const yy = getZhiYinYang(z as DiZhi);
      const hePartner = getZhiHePartner(z as DiZhi);
      const chongPartner = getZhiChongPartner(z as DiZhi);

      // 三合
      let sanHeGroup = "";
      for (const [z1, z2, z3, swx] of ZHI_SAN_HE) {
        if (z === z1 || z === z2 || z === z3) {
          sanHeGroup = `${z1}${z2}${z3}（${swx}局）`;
          break;
        }
      }

      // 三会
      let sanHuiGroup = "";
      for (const [z1, z2, z3, swx] of ZHI_SAN_HUI) {
        if (z === z1 || z === z2 || z === z3) {
          sanHuiGroup = `${z1}${z2}${z3}（${swx}方）`;
          break;
        }
      }

      // 六害
      let haiPartner = "";
      for (const [z1, z2] of ZHI_LIU_HAI) {
        if (z === z1) { haiPartner = z2; break; }
        if (z === z2) { haiPartner = z1; break; }
      }

      // 相刑
      const xingList: string[] = [];
      for (const [key, val] of Object.entries(ZHI_XING)) {
        if (key.includes(z)) {
          if (key === `${z}${z}`) {
            xingList.push(`自刑（${val}）`);
          } else if (!xingList.includes(val)) {
            xingList.push(val);
          }
        }
      }
      const xingStr = xingList.length > 0 ? xingList.join("；") : "无";

      // 相破
      let poPartner = "";
      for (const [z1, z2] of ZHI_PO) {
        if (z === z1) { poPartner = z2; break; }
        if (z === z2) { poPartner = z1; break; }
      }

      return {
        zhi: z,
        wuxing: wx,
        yinyang: yy,
        hePartner: hePartner ? `${hePartner.partner}（合化${hePartner.hua}）` : "无",
        chongPartner: chongPartner || "无",
        sanHeGroup: sanHeGroup || "无",
        sanHuiGroup: sanHuiGroup || "无",
        haiPartner: haiPartner || "无",
        xing: xingStr,
        poPartner: poPartner || "无",
      };
    });
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <h1 className="text-xl font-bold text-primary mb-4">五行查询</h1>

      {/* 标签切换 */}
      <div className="mb-4 flex rounded-lg border bg-muted/30 p-1">
        <button
          onClick={() => setActiveTab("tiangan")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            activeTab === "tiangan"
              ? "bg-background shadow-sm text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          天干五行
        </button>
        <button
          onClick={() => setActiveTab("dizhi")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            activeTab === "dizhi"
              ? "bg-background shadow-sm text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          地支五行
        </button>
      </div>

      {/* 天干五行 Tab */}
      {activeTab === "tiangan" && (
        <>
          {/* 表格 */}
          <div className="rounded-xl border bg-card overflow-hidden mb-4">
            <div className="border-b bg-muted/30 px-4 py-2">
              <p className="text-xs font-medium text-muted-foreground">十天干五行属性</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="py-2 px-2 text-muted-foreground">天干</th>
                    <th className="py-2 px-2 text-muted-foreground">五行</th>
                    <th className="py-2 px-2 text-muted-foreground">阴阳</th>
                    <th className="py-2 px-2 text-muted-foreground">五合</th>
                  </tr>
                </thead>
                <tbody>
                  {ganData.map((g) => (
                    <tr key={g.gan} className="border-b hover:bg-accent/20 transition-colors">
                      <td className="py-2.5 px-2">
                        <span className="text-lg font-bold">{g.gan}</span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`inline-block rounded-full border px-2 py-0.5 ${WUXING_COLORS[g.wuxing] || ''}`}>
                          {g.wuxing}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={g.yinyang === '阳' ? 'text-red-600 font-medium' : 'text-blue-600 font-medium'}>
                          {g.yinyang}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-sm">{g.hePartner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 天干五合说明 */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <h3 className="mb-2 text-sm font-semibold">天干五合</h3>
            <div className="flex flex-wrap gap-2">
              {GAN_WU_HE.map(([g1, g2, wx], i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full border bg-accent/20 px-3 py-1.5 text-xs">
                  <span className="font-semibold">{g1}</span>
                  <span className="text-muted-foreground">+</span>
                  <span className="font-semibold">{g2}</span>
                  <span className="text-muted-foreground">=</span>
                  <span className={`rounded-full border px-1.5 py-0.5 ${WUXING_COLORS[wx] || ''}`}>
                    合化{wx}
                  </span>
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              口诀：甲己合化土，乙庚合化金，丙辛合化水，丁壬合化木，戊癸合化火。
            </p>
          </div>
        </>
      )}

      {/* 地支五行 Tab */}
      {activeTab === "dizhi" && (
        <>
          <div className="rounded-xl border bg-card overflow-hidden mb-4">
            <div className="border-b bg-muted/30 px-4 py-2">
              <p className="text-xs font-medium text-muted-foreground">十二地支五行属性</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="py-2 px-1 text-muted-foreground">地支</th>
                    <th className="py-2 px-1 text-muted-foreground">五行</th>
                    <th className="py-2 px-1 text-muted-foreground">阴阳</th>
                    <th className="py-2 px-1 text-muted-foreground">六合</th>
                    <th className="py-2 px-1 text-muted-foreground">六冲</th>
                    <th className="py-2 px-1 text-muted-foreground">三合</th>
                    <th className="py-2 px-1 text-muted-foreground">三会</th>
                    <th className="py-2 px-1 text-muted-foreground">六害</th>
                    <th className="py-2 px-1 text-muted-foreground">相刑</th>
                    <th className="py-2 px-1 text-muted-foreground">相破</th>
                  </tr>
                </thead>
                <tbody>
                  {zhiData.map((z) => (
                    <tr key={z.zhi} className="border-b hover:bg-accent/20 transition-colors">
                      <td className="py-2 px-1">
                        <span className="text-sm font-bold">{z.zhi}</span>
                      </td>
                      <td className="py-2 px-1">
                        <span className={`inline-block rounded-full border px-1.5 py-0.5 text-[10px] ${WUXING_COLORS[z.wuxing] || ''}`}>
                          {z.wuxing}
                        </span>
                      </td>
                      <td className="py-2 px-1">
                        <span className={z.yinyang === '阳' ? 'text-red-600' : 'text-blue-600'}>
                          {z.yinyang}
                        </span>
                      </td>
                      <td className="py-2 px-1 text-[10px]">{z.hePartner}</td>
                      <td className="py-2 px-1 text-[10px] text-red-500">{z.chongPartner}</td>
                      <td className="py-2 px-1 text-[10px]">{z.sanHeGroup}</td>
                      <td className="py-2 px-1 text-[10px]">{z.sanHuiGroup}</td>
                      <td className="py-2 px-1 text-[10px] text-orange-500">{z.haiPartner}</td>
                      <td className="py-2 px-1 text-[10px] text-red-500">{z.xing}</td>
                      <td className="py-2 px-1 text-[10px]">{z.poPartner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 地支关系说明 */}
          <div className="space-y-3">
            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">地支六合</h3>
              <div className="flex flex-wrap gap-2">
                {ZHI_LIU_HE.map(([z1, z2, h], i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full border bg-accent/20 px-2 py-1 text-xs">
                    <span className="font-semibold">{z1}</span>
                    <span className="text-muted-foreground">合</span>
                    <span className="font-semibold">{z2}</span>
                    <span className="text-muted-foreground">化{h}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">地支六冲</h3>
              <div className="flex flex-wrap gap-2">
                {ZHI_LIU_CHONG.map(([z1, z2], i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                    <span className="font-semibold">{z1}</span>
                    <span>冲</span>
                    <span className="font-semibold">{z2}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">地支三合</h3>
              <div className="flex flex-wrap gap-2">
                {ZHI_SAN_HE.map(([z1, z2, z3, wx], i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full border bg-accent/20 px-2 py-1 text-xs">
                    <span className="font-semibold">{z1}{z2}{z3}</span>
                    <span className="text-muted-foreground">合</span>
                    <span className={`rounded-full border px-1 py-0.5 text-[10px] ${WUXING_COLORS[wx] || ''}`}>{wx}局</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">地支三会</h3>
              <div className="flex flex-wrap gap-2">
                {ZHI_SAN_HUI.map(([z1, z2, z3, wx], i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full border bg-accent/20 px-2 py-1 text-xs">
                    <span className="font-semibold">{z1}{z2}{z3}</span>
                    <span className="text-muted-foreground">会</span>
                    <span className={`rounded-full border px-1 py-0.5 text-[10px] ${WUXING_COLORS[wx] || ''}`}>{wx}方</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">地支六害</h3>
              <div className="flex flex-wrap gap-2">
                {ZHI_LIU_HAI.map(([z1, z2], i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-1 text-xs text-orange-700">
                    <span className="font-semibold">{z1}</span>
                    <span>害</span>
                    <span className="font-semibold">{z2}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">地支相刑</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ZHI_XING)
                  .filter(([key]) => key.length === 2 && key[0] !== key[1])
                  .filter(([key], i, arr) => {
                    const reversed = key[1] + key[0];
                    return arr.findIndex(([k]) => k === reversed) === -1 || arr.findIndex(([k]) => k === reversed) >= i;
                  })
                  .reduce<Array<[string, string]>>((acc, [key, val]) => {
                    if (!acc.find(([_, v]) => v === val)) {
                      acc.push([key, val]);
                    }
                    return acc;
                  }, [])
                  .map(([key, val], i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                      <span className="font-semibold">{key}</span>
                      <span className="text-muted-foreground">：</span>
                      <span>{val}</span>
                    </span>
                  ))}
                <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                  <span className="font-semibold">辰午酉亥</span>
                  <span>：自刑</span>
                </span>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">地支六破</h3>
              <div className="flex flex-wrap gap-2">
                {ZHI_PO.map(([z1, z2], i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full border bg-accent/20 px-2 py-1 text-xs">
                    <span className="font-semibold">{z1}</span>
                    <span className="text-muted-foreground">破</span>
                    <span className="font-semibold">{z2}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* AI智能解读 */}
      <EventDivinationPanel
        toolName="五行查询"
        chartContext={`查询类型: ${activeTab === "tiangan" ? "天干五行" : "地支五行"}\n${activeTab === "tiangan" ? ganData.map(g => g.gan + "(" + g.wuxing + "," + g.yinyang + ",五合" + g.hePartner + ")").join("; ") : zhiData.map(z => z.zhi + "(" + z.wuxing + "," + z.yinyang + ",六合" + z.hePartner + ",六冲" + z.chongPartner + ",三合" + z.sanHeGroup + ")").join("; ")}`}
        isPaidTool={false}
      />
      {/* 分享排盘结果 */}
      <div className="px-3 py-2">
        <ShareButton
          type="tool"
          title="五行查询结果"
          description="五行查询"
          variant="block"
          label="分享排盘结果"
        />
      </div>


      {/* 免责声明 */}
      <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          免责声明：本页面内容仅供传统文化学习与参考，不构成任何决策建议。
        </p>
      </div>
    </div>
  );
}