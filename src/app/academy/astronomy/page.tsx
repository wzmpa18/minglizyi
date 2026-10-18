"use client";
import { SectionGate } from "@/components/SectionGate";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ASTRONOMY_SOURCE, calculateStudySky, chinaTimeInput, formatChinaTime, parseChinaTime, skyDiagramPoint } from "@/lib/astronomyStudy";
import { LocalStudyNotes } from "@/components/LocalStudyNotes";
import { getLocalSkyPosition } from "@/lib/localSkyLocation";
import { SkyYunqiLesson } from "@/components/SkyYunqiLesson";

const LOCATIONS = [
  { name: "东莞", lat: 23.02, lon: 113.75 }, { name: "北京", lat: 39.90, lon: 116.40 },
  { name: "上海", lat: 31.23, lon: 121.47 }, { name: "广州", lat: 23.13, lon: 113.26 },
];
const FACTS: Record<string, string> = {
  Sun: "太阳是距离地球最近的恒星。每日视运动主要来自地球自转；太阳高度随地点、时刻和季节变化。请勿直视太阳或用无专业太阳滤镜的望远镜观日。",
  Moon: "月球反射太阳光。月相由日、地、月的相对位置形成，亮面比例并不是月面被地影遮住的比例。月食是另一种特定几何条件下的现象。",
  Mercury: "水星轨道位于地球轨道内侧，从地球看常靠近太阳方向。位于地平线上方并不表示能在强烈天光中看到。",
  Venus: "金星有时出现在黎明前或黄昏后，传统称启明或长庚，它们是同一颗行星。金星也有相位变化。",
  Mars: "火星是地球外侧的类地行星。其亮度与地火距离、照明几何共同变化，肉眼所见不是恒定的红色亮点。",
  Jupiter: "木星是太阳系最大的行星。伽利略卫星可借助望远镜观察，本页计算的是木星中心方向，没有假画卫星位置。",
  Saturn: "土星以环系著称。环的张角随观测几何改变，肉眼无法分辨环结构，需要合适的望远镜。",
  Uranus: "天王星通常需要望远镜和可靠星图才能确认。本页的亮色圆点是位置符号，不表示肉眼亮度或实际大小。",
  Neptune: "海王星不能用肉眼直接看见。确认目标需要望远镜和更详细的星图，本页用于学习坐标与时间、地点的关系。",
};

function AstronomyStudyContent() {
  const [time, setTime] = useState("2026-10-18T20:00");
  const [latitude, setLatitude] = useState("23.02"), [longitude, setLongitude] = useState("113.75");
  const [applied, setApplied] = useState({ time: "2026-10-18T20:00", lat: 23.02, lon: 113.75 });
  const [selected, setSelected] = useState("Moon"), [error, setError] = useState("");
  const [locating, setLocating] = useState(false), [locationMessage, setLocationMessage] = useState("");
  const [timePlaying, setTimePlaying] = useState(false), [stepMinutes, setStepMinutes] = useState(60);
  const [answer, setAnswer] = useState<number | null>(null);
  useEffect(() => { const current = chinaTimeInput(new Date()); setTime(current); setApplied(old => ({ ...old, time: current })); }, []);
  const sky = useMemo(() => calculateStudySky(parseChinaTime(applied.time), applied.lat, applied.lon), [applied]);
  const body = sky.bodies.find(item => item.body === selected) || sky.bodies[1];
  const update = (value = time) => {
    setTimePlaying(false);
    try {
      parseChinaTime(value);
      if (!latitude.trim() || !longitude.trim()) throw new Error("请填写经度和纬度。");
      const lat = Number(latitude), lon = Number(longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error("纬度应在-90至90，经度应在-180至180。");
      setTime(value); setApplied({ time: value, lat, lon }); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "请检查输入。"); }
  };
  const locate = async () => {
    if (locating) return;
    setLocating(true); setLocationMessage("正在请求一次定位；不会上传或保存位置。");
    try {
      const position = await getLocalSkyPosition();
      if (![position.latitude, position.longitude, position.accuracy].every(Number.isFinite) || Math.abs(position.latitude) > 90 || Math.abs(position.longitude) > 180 || position.accuracy < 0) throw Error("系统未返回有效的位置，请手动选择地点。");
      const lat = Number(position.latitude.toFixed(5)), lon = Number(position.longitude.toFixed(5));
      setLatitude(String(lat)); setLongitude(String(lon)); setTimePlaying(false);
      setApplied(old => ({ ...old, lat, lon }));
      setLocationMessage(`已按当前位置更新天空，系统报告精度约${Math.round(position.accuracy)}米。位置仅在当前页面临时使用。`); setError("");
    } catch (reason) { setLocationMessage(reason instanceof Error ? reason.message : "定位未成功，可以继续手动选择地点。"); }
    finally { setLocating(false); }
  };
  const observeTime = (value: string) => {
    try { parseChinaTime(value); setTimePlaying(false); setTime(value); setApplied(old => ({ ...old, time: value })); setError(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "日期超出可用范围。"); }
  };
  const advanceTime = (minutes: number) => observeTime(chinaTimeInput(new Date(parseChinaTime(applied.time).getTime() + minutes * 60000)));
  useEffect(() => {
    if (!timePlaying) return;
    const timer = setInterval(() => {
      const value = chinaTimeInput(new Date(parseChinaTime(applied.time).getTime() + stepMinutes * 60000));
      try { parseChinaTime(value); setApplied(old => ({ ...old, time: value })); }
      catch { setTimePlaying(false); setError("时间演示已到公元1—3000年的边界。"); }
    }, 1000);
    return () => clearInterval(timer);
  }, [timePlaying, stepMinutes, applied.time]);
  useEffect(() => { if (timePlaying) setTime(applied.time); }, [applied.time, timePlaying]);
  return <div className="mx-auto max-w-3xl bg-[#081827] px-4 py-5 text-[#e6edf5]">
    <Link href="/academy" className="text-sm text-[#a7cadb]">‹ 返回学堂</Link>
    <header className="my-5"><p className="text-xs tracking-widest text-[#8ed3ce]">观察 · 理解 · 记录</p><h1 className="mt-2 text-3xl font-bold">天文馆</h1><p className="mt-3 text-sm leading-7 text-[#b9cbd8]">把时间与地点放进天空。认识日月行星的位置，再回到传统历法，理解古人如何观察时序。</p></header>
    <details className="rounded-2xl border border-[#294251] bg-[#102433] p-4"><summary className="cursor-pointer text-sm font-semibold text-[#9cddd4]">调整观测时间与地点</summary>
    <form onSubmit={event => { event.preventDefault(); update(); }} className="mt-4">
      <label className="block text-sm">观测时间（北京时间 UTC+8）<input aria-label="观测时间" type="datetime-local" min="0001-01-01T00:00" max="3000-12-31T23:59" value={time} onInput={event => { setTimePlaying(false); setTime(event.currentTarget.value); }} onChange={event => { setTimePlaying(false); setTime(event.target.value); }} className="mt-2 block w-full min-w-0 rounded-lg border border-[#3e5d70] bg-[#081827] p-3 text-white [color-scheme:dark]" /></label>
      <div className="my-3 flex flex-wrap gap-2">{LOCATIONS.map(location => <button type="button" key={location.name} onClick={() => { setLatitude(String(location.lat)); setLongitude(String(location.lon)); }} className="rounded-full border border-[#3e5d70] px-3 py-2 text-xs">{location.name}</button>)}</div>
      <div className="grid grid-cols-2 gap-3"><label className="text-xs">北纬为正、南纬为负<input aria-label="纬度" type="number" step="any" min="-90" max="90" value={latitude} onChange={event => setLatitude(event.target.value)} className="mt-2 w-full rounded-lg bg-[#081827] p-3" required /></label><label className="text-xs">东经为正、西经为负<input aria-label="经度" type="number" step="any" min="-180" max="180" value={longitude} onChange={event => setLongitude(event.target.value)} className="mt-2 w-full rounded-lg bg-[#081827] p-3" required /></label></div>
      <div className="mt-4 flex flex-wrap gap-2"><button type="submit" className="rounded-lg bg-[#9cddd4] px-4 py-3 text-sm font-bold text-[#102433]">更新观测图</button><button type="button" onClick={() => update(chinaTimeInput(new Date()))} className="rounded-lg border border-[#3e5d70] px-4 py-3 text-sm">回到现在</button></div>
      <p className="mt-3 text-xs text-[#9eb5c6]">点击“使用当前位置”才会向系统请求一次定位，位置只在本机临时用于计算，不上传、不后台跟踪；也可手动选城。</p>{error && <p role="alert" className="mt-3 text-sm text-[#ffb0a6]">{error} 图中仍为上次有效输入。</p>}
    </form></details>
    <div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" disabled={locating} onClick={() => void locate()} className="rounded-lg border border-[#9cddd4] px-4 py-3 text-sm font-bold text-[#a9e0d8] disabled:opacity-50">{locating ? "正在定位…" : "使用当前位置"}</button><span className="text-xs text-[#a9bfce]">仅在本机使用 · 可拒绝</span></div>
    {locationMessage && <p role="status" className="mt-2 text-xs leading-6 text-[#bcd3df]">{locationMessage}</p>}
    <section aria-label="天空时间演示" className="mt-4 rounded-2xl border border-[#294251] p-4"><h2 className="font-bold">让天空随时间变化</h2><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => advanceTime(-stepMinutes)} className="rounded-lg border border-[#3e5d70] px-3 py-2 text-sm">退一步</button><button type="button" aria-pressed={timePlaying} onClick={() => setTimePlaying(old => !old)} className="rounded-lg bg-[#9cddd4] px-4 py-2 text-sm font-bold text-[#102433]">{timePlaying ? "暂停时间演示" : "播放时间演示"}</button><button type="button" onClick={() => advanceTime(stepMinutes)} className="rounded-lg border border-[#3e5d70] px-3 py-2 text-sm">进一步</button></div><label className="mt-3 block text-xs text-[#a9bfce]">每步推进<select aria-label="天文馆时间步长" value={stepMinutes} onChange={event => setStepMinutes(Number(event.target.value))} className="ml-3 rounded border border-[#3e5d70] bg-[#081827] p-2 text-white"><option value={10}>10分钟</option><option value={60}>1小时</option><option value={1440}>1天</option><option value={10080}>7天</option></select></label><p className="mt-3 text-xs leading-6 text-[#9eb5c6]">支持公元1—3000年（统一使用延伸公历与固定UTC+8，历史日期须先换算）。远古或未来结果用于计算演示，未承诺逐年、逐天体的统一观测精度；古代地球自转与历法换算会增加误差。</p></section>
    <section aria-label="日月行星观测图" className="mt-4 rounded-2xl border border-[#294251] p-4">
      <h2 className="text-lg font-bold">仰望天空</h2><p className="mt-2 text-xs leading-6 text-[#9eb5c6]">{formatChinaTime(parseChinaTime(applied.time))} · 北纬{applied.lat}° · 东经{applied.lon}°。中心为天顶，圆周为地平线，面向天空时东在左。这里只绘出地平线上方的日月行星，不是完整恒星星图。</p>
      <svg viewBox="0 0 360 360" role="img" aria-label="天顶投影，北在上东在左；天体数值见下方列表" className="mx-auto w-full max-w-md">
        <circle cx="180" cy="180" r="140" fill={sky.daylight ? "#213f55" : "#091421"} stroke="#688aa0" />
        {[30, 60].map(altitude => <g key={altitude}><circle cx="180" cy="180" r={140 * (90 - altitude) / 90} fill="none" stroke="#466174" strokeDasharray="3 5" /><text x="184" y={180 - 140 * (90 - altitude) / 90 + 12} fill="#9eb5c6" fontSize="10">{altitude}°</text></g>)}
        <path d="M40 180H320M180 40V320" stroke="#365266" />
        {[["北", 180, 23], ["东", 23, 185], ["南", 180, 346], ["西", 337, 185]].map(([name, x, y]) => <text key={name} x={x} y={y} textAnchor="middle" fill="#cadce7" fontSize="14">{name}</text>)}
        <text x="180" y="196" textAnchor="middle" fill="#91aabd" fontSize="10">天顶 90°</text>
        {sky.bodies.filter(item => item.altitude >= 0).map(item => { const point = skyDiagramPoint(item.azimuth, item.altitude); return <g key={item.body}><circle cx={point.x} cy={point.y} r={item.body === body.body ? 7 : 4} fill={item.color} stroke={item.body === body.body ? "white" : "none"} /><title>{item.name}，高度{item.altitude.toFixed(1)}度，方位{item.azimuth.toFixed(1)}度</title>{item.body === body.body && <text x={point.x} y={point.y > 62 ? point.y - 12 : point.y + 19} textAnchor="middle" fill="white" fontSize="12">{item.name}</text>}</g>; })}
      </svg>
      <p className="text-xs leading-6 text-[#b8cbd8]">{sky.daylight ? "太阳在地平线上方，天光会影响观星。" : "太阳在地平线下方。"}圆点大小和颜色用于识别；地平线上方仍可能受天光、云、地形和设备限制，不能等同于肉眼可见。</p>
      <div className="mt-4 grid grid-cols-3 gap-2" aria-label="选择天体">{sky.bodies.map(item => <button type="button" key={item.body} aria-pressed={item.body === body.body} onClick={() => setSelected(item.body)} className="rounded-lg border p-2 text-left text-xs" style={{ borderColor: item.body === body.body ? "#9cddd4" : "#294251", background: item.body === body.body ? "#1b3945" : "transparent" }}><span className="font-bold" style={{ color: item.color }}>{item.name}</span><span className="mt-1 block">高度 {item.altitude.toFixed(1)}°</span><span className="mt-1 block text-[#a9bfce]">{item.altitude < 0 ? "地平线下" : "地平线上"}</span></button>)}</div>
      <article className="mt-4 rounded-xl bg-[#152f40] p-4" aria-live="polite"><h3 className="font-bold">{body.name}</h3><p className="my-2 text-sm leading-7">{FACTS[body.body]}</p><dl className="grid grid-cols-2 gap-3 text-xs text-[#b9cbd8]"><div><dt>方位角（北0°，东90°）</dt><dd className="mt-1 text-base text-white">{body.azimuth.toFixed(2)}°</dd></div><div><dt>高度角</dt><dd className="mt-1 text-base text-white">{body.altitude.toFixed(2)}°</dd></div><div><dt>赤经 / 赤纬（当日）</dt><dd className="mt-1">{body.ra.toFixed(3)}时 / {body.dec.toFixed(2)}°</dd></div><div><dt>视星等（数值越小越亮）</dt><dd className="mt-1">{body.magnitude.toFixed(2)}</dd></div></dl></article>
    </section>
    <section className="mt-4 rounded-2xl border border-[#294251] p-4"><h2 className="font-bold">这一天的日月</h2><p className="mt-2 text-sm">月面照明比例 {(sky.bodies[1].illuminated * 100).toFixed(1)}% · 月相角 {sky.moonPhase.toFixed(1)}°</p><p className="mt-2 text-xs leading-6 text-[#a9bfce]">月相角0°为朔、90°上弦、180°望、270°下弦。下表只搜索所选北京时间自然日；没有事件时如实留空。</p>{sky.events.map(event => <div key={event.body} className="mt-3 rounded-lg bg-[#102433] p-3 text-sm"><p className="mb-2 font-bold">{event.body === "Sun" ? "太阳" : "月球"}</p><p>升起：{event.rise ? formatChinaTime(event.rise) : "本日无升起事件"}</p><p className="mt-2">落下：{event.set ? formatChinaTime(event.set) : "本日无落下事件"}</p></div>)}</section>
    <SkyYunqiLesson date={parseChinaTime(applied.time)} sunLongitude={sky.sunLongitude} onObserve={observeTime} />
    <section className="mt-4 rounded-2xl border border-[#294251] p-4"><h2 className="font-bold">观察自测</h2><p className="mt-3 text-sm">把地点换到另一座城市，为什么同一时刻的太阳高度会变化？</p><div className="mt-3 space-y-2">{["天空会根据个人生日改变", "观测者在地球表面的位置改变了", "方位角和高度角与地点无关"].map((option, index) => <button key={option} type="button" aria-pressed={answer === index} onClick={() => setAnswer(index)} className="block w-full rounded-lg border border-[#3e5d70] p-3 text-left text-sm">{option}</button>)}</div>{answer !== null && <p role="status" className="mt-3 text-sm leading-7 text-[#9cddd4]">{answer === 1 ? "答对了。" : "再想一想。"}高度角和方位角属于观测者的地平坐标，取决于时间和地点。可保留时间、修改经纬度，点击更新来比较。</p>}</section>
    <section className="mt-4 rounded-2xl bg-[#e8efea] p-4 text-[#16312f]"><h2 className="mb-3 font-bold">观察笔记</h2><LocalStudyNotes storageKey="astronomy-observation-notes-v1" placeholder="记录地点、时间、所选天体、天气与观察结果；计算位置和亲眼所见分开写。" /></section>
    <footer className="mt-5 text-xs leading-7 text-[#a9bfce]"><p>计算采用 Astronomy Engine（MIT许可）。高度加入标准大气折射模型，升落时间按标准平坦地平线估算，未计实时天气、山体与建筑遮挡；显示小数位不代表实测精度。</p><a href={ASTRONOMY_SOURCE} target="_blank" rel="noreferrer" className="underline">算法与坐标说明 ↗</a><div className="mt-3 flex flex-wrap gap-3"><Link href="/yixue/jieqi" className="underline">二十四节气</Link><Link href="/zhongyi/yunqi" className="underline">五运六气学习</Link><Link href="/zhongyi/classic" className="underline">经典阅读</Link></div></footer>
  </div>;
}

export default function AstronomyStudyPage() { return <SectionGate toolId="academy_astronomy" title="天文馆" backHref="/academy"><AstronomyStudyContent /></SectionGate>; }
