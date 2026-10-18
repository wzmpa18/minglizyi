'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { calculateYunqiStudy, chinaTimeInput, formatChinaTime, yunqiPhaseAt } from '@/lib/astronomyStudy';

const COLORS = ['#79cba2', '#efb489', '#f28a82', '#e3cf8d', '#b8c8d9', '#85bde0'];
const TERMS = ['春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰'];
const point = (angle: number, radius: number) => ({ x: 180 + radius * Math.cos(angle * Math.PI / 180), y: 180 - radius * Math.sin(angle * Math.PI / 180) });

export function SkyYunqiLesson({ date, sunLongitude, onObserve }: { date: Date; sunLongitude: number; onObserve: (time: string) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const study = useMemo(() => {
    const year = Number(chinaTimeInput(date).slice(0, 4));
    if (year < 1900 || year > 2099) return null;
    const current = calculateYunqiStudy(year);
    return date < current.phases[0].start ? year > 1900 ? calculateYunqiStudy(year - 1) : null : current;
  }, [date]);
  const active = study ? yunqiPhaseAt(study, date) : -1;
  const index = selected ?? Math.max(0, active);
  const phase = study?.phases[index];
  const sun = point(sunLongitude, 106);
  return <section aria-label="天文与五运六气学习" className="mt-4 rounded-2xl border border-[#375263] bg-[#102433] p-4">
    <p className="text-xs tracking-widest text-[#9cddd4]">在天空中理解时序</p><h2 className="mt-2 text-xl font-bold">太阳、节气与五运六气</h2>
    <p className="mt-3 text-sm leading-7 text-[#c5d7e1]">先观察真实的日月行星，再学习传统历法和运气术语。下图把太阳周年视运动、二十四节气和六步主气放在一起对照。</p>
    <svg viewBox="0 0 360 360" role="img" aria-label="太阳视黄经、二十四节气与六步主气的学习示意图" className="mx-auto mt-3 w-full max-w-md">
      <circle cx="180" cy="180" r="118" fill="none" stroke="#2b4658" strokeWidth="19" />
      {COLORS.map((color, i) => { const a = point(300 + i * 60, 118), b = point(360 + i * 60, 118); return <path key={color} d={`M${a.x} ${a.y} A118 118 0 0 0 ${b.x} ${b.y}`} fill="none" stroke={color} strokeWidth={i === active ? 19 : 10} opacity={i === active ? 1 : .7} />; })}
      {TERMS.map((term, i) => { const a = point(i * 15, 130), b = point(i * 15, 136), label = point(i * 15, 153); return <g key={term}><path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} stroke="#91adbd" /><text x={label.x} y={label.y + 4} fill="#d0e0e8" fontSize="11" textAnchor="middle">{term}</text></g>; })}
      <line x1="180" y1="180" x2={sun.x} y2={sun.y} stroke="#f3d078" strokeWidth="1.5" />
      <circle cx="180" cy="180" r="7" fill="#8ab9d1" /><circle cx={sun.x} cy={sun.y} r="7" fill="#f7d579" />
      <text x="180" y="151" fill="#9cddd4" fontSize="12" textAnchor="middle">太阳视黄经</text><text x="180" y="172" fill="white" fontSize="20" textAnchor="middle">{sunLongitude.toFixed(2)}°</text>
      <text x="180" y="204" fill="#9eb5c6" fontSize="11" textAnchor="middle">地心黄道平面示意</text><text x="180" y="224" fill="#9eb5c6" fontSize="11" textAnchor="middle">春分0° · 每15°一节气</text>
    </svg>
    <p className="text-xs leading-6 text-[#a9bfcd]">太阳位置按上方观测时间计算；圆环表示视黄经，不是地平线方位，也不是按真实比例绘制的轨道。节气与观测地的高低、天气及个人生日不同。</p>
    <div className="mt-4 rounded-xl bg-[#193645] p-4"><h3 className="font-bold text-[#9cddd4]">一 · 五运先看年干</h3><p className="mt-2 text-sm leading-7 text-[#d4e0e7]">五运以木、火、土、金、水组织时序。年干配中运：甲己土、乙庚金、丙辛水、丁壬木、戊癸火；阳干太过，阴干不及。主运与客运各有推步规则，不能把五步运与六步气混成同一套刻度。</p>{study && <p className="mt-2 text-sm text-[#f2d495]">本轮 {study.year} 年 · {study.ganzhi} · {study.annualMovement}</p>}</div>
    <div className="mt-3 rounded-xl bg-[#193645] p-4"><h3 className="font-bold text-[#9cddd4]">二 · 六气再分主、客</h3><p className="mt-2 text-sm leading-7 text-[#d4e0e7]">主气按厥阴风木、少阴君火、少阳相火、太阴湿土、阳明燥金、太阳寒水排列；客气另按三阴三阳次序逐年轮转，三之气为司天、终之气为在泉。两者用同一段时间对照，含义和次序并不相同。</p></div>
    {study && phase ? <div className="mt-4"><h3 className="font-bold">三 · 点击六步，对照交节时刻的天空</h3><p className="mt-2 text-xs leading-6 text-[#a9bfcd]">本页采用“大寒起点、节气分步”的学习约定，覆盖1900—2099年。不同交司学说须分别辨析；这些边界不是全部古法的唯一标准。</p>
      <div className="mt-3 grid grid-cols-3 gap-2">{study.phases.map((item, i) => <button type="button" aria-pressed={index === i} key={item.label} onClick={() => setSelected(i)} className="rounded-lg border p-2 text-left text-sm" style={{ borderColor: index === i ? COLORS[i] : '#365468', background: index === i ? '#234657' : 'transparent' }}>{item.label}<span className="mt-1 block text-[11px] text-[#b8cbd8]">{item.startTerm}至{item.endTerm}</span>{i === active && <span className="text-[11px] text-[#9cddd4]">所选时刻在此步</span>}</button>)}</div>
      <div className="mt-3 rounded-xl border border-[#547086] p-4"><h4 className="font-bold" style={{ color: COLORS[index] }}>{phase.label} · 主气{phase.mainQi}</h4><p className="mt-2 text-sm">客气{phase.guestQi} · 司天{study.siTian} · 在泉{study.zaiQuan}</p><p className="mt-2 text-xs leading-6 text-[#b8cbd8]">{formatChinaTime(phase.start)} 起<br />至 {formatChinaTime(phase.end)} 前</p><button type="button" onClick={() => onObserve(chinaTimeInput(new Date(Math.ceil(phase.start.getTime() / 60000) * 60000)))} className="mt-3 rounded-lg bg-[#9cddd4] px-4 py-3 text-sm font-bold text-[#102433]">查看此步起点的天空</button></div>
    </div> : <p className="mt-4 rounded-xl bg-[#193645] p-3 text-xs leading-6 text-[#c8d8e0]">当前日期超出本页1900—2099年的运气分步学习范围。古代星空演示可以继续使用；请选择该范围内日期，查看六步与交节时刻的联动。</p>}
    <p className="mt-4 text-xs leading-6 text-[#aec3d1]">天文计算提供位置与节气时刻；五运六气属于传统理论的文献学习，不据此预测个人疾病、处方或疗效。年干、年支的配属不能当作行星对人体影响已获科学证明。</p>
    <div className="mt-4 flex flex-wrap gap-3 text-sm text-[#a9e0d8]"><Link href="/zhongyi/yunqi/" className="underline">系统学习、原典与自测 ›</Link><Link href="/zhongyi/classic/?book=suwen-original&chapter=suwen-original-66" className="underline">《素问·天元纪大论》 ›</Link></div>
    <p className="mt-3 text-xs leading-6 text-[#9eb5c6]"><a href="https://zynj.shutcm.edu.cn/2023/0920/c4359a155053/page.htm" target="_blank" rel="noreferrer" className="underline">四时节律与运气学说的比较（上海中医药大学）</a> · <a href="https://tjzhongyiyao.tjutcm.edu.cn/html/tjzyydxxb/2024/5/20240515.htm" target="_blank" rel="noreferrer" className="underline">五运六气理论历法学探析（含交司起点讨论）</a></p>
  </section>;
}
