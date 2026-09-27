import type { Ref } from "react";
import { Solar } from "lunar-javascript";
import { xianDuAtAge, type QizhengResult } from "@/algorithm-core/modules/qizheng";
import { calcQizhengDuanyu } from "@/algorithm-core/modules/qizheng-duanyu";
import type { QizhengLiunianResult } from "@/algorithm-core/modules/qizheng-liunian";
import { allHuayao, chartShensha, PALACE_AUX, buildPalaceBasicInterpretation } from "@/lib/qizhengPalaceInterpretation";

const CX=445, CY=490;
const P=(r:number,a:number)=>[CX+r*Math.sin(a*Math.PI/180),CY-r*Math.cos(a*Math.PI/180)];
const SHORT:Record<string,string>={sun:"日",moon:"月",jupiter:"木",mars:"火",saturn:"土",venus:"金",mercury:"水",qi:"炁",luo:"罗",ji:"计",bei:"孛"};
const ZODIAC:Record<string,string>={子:"Aqu",丑:"Cap",寅:"Sag",卯:"Sco",辰:"Lib",巳:"Vir",午:"Leo",未:"Can",申:"Gem",酉:"Tau",戌:"Ari",亥:"Pis"};
const dm=(d:number)=>{const n=Math.round(d*60);return `${Math.floor(n/60).toString().padStart(2,"0")}°${(n%60).toString().padStart(2,"0")}′`;};
const sector=(a:number,b:number,inner:number,outer:number)=>{const x=P(inner,a),y=P(outer,a),z=P(outer,b),w=P(inner,b);return `M${x} L${y} A${outer},${outer} 0 0 1 ${z} L${w} A${inner},${inner} 0 0 0 ${x} Z`;};

/** Original SVG layout built from live chart data; no reference-image pixels or sample values. */
export function QizhengDetailedChart({chart,transit,name,age,onPalace,svgRef}: {
 chart:QizhengResult;transit:QizhengLiunianResult|null;name:string;age?:number;
 onPalace:(branch:string)=>void;svgRef:Ref<SVGSVGElement>;
}) {
 const i=chart.input, lunar=Solar.fromYmdHms(i.year,i.month,i.day,i.hour,i.minute,0).getLunar();
 const solarClock=new Date(Date.UTC(i.year,i.month-1,i.day,i.hour,i.minute+chart.trueSolar.totalOffsetMin));
 const pillars=Solar.fromYmdHms(solarClock.getUTCFullYear(),solarClock.getUTCMonth()+1,solarClock.getUTCDate(),solarClock.getUTCHours(),solarClock.getUTCMinutes(),0).getLunar();
 const dy=calcQizhengDuanyu(chart), natal=chartShensha(dy.yearGanzhi.gan,dy.yearGanzhi.zhi,Math.abs(lunar.getMonth()));
 const flow=transit?chartShensha(transit.ganzhi.gan,transit.ganzhi.zhi):[];
 const hua=allHuayao(dy.yearGanzhi.gan);
 const basics=chart.palaces.map(p=>buildPalaceBasicInterpretation(chart,p,transit,age));
 const huaItems=(gan:string,stars:ReadonlyArray<{key:string;palaceBranch:string}>)=>allHuayao(gan).flatMap(h=>{const star=stars.find(s=>s.key===h.starKey);return star?[{id:`hua-${h.huaName}`,name:h.huaName,branch:star.palaceBranch,level:"zhong" as const,text:"",source:"知识库§1.6"}]:[];});
 const xian=age && age>0?xianDuAtAge(chart,age):null;
 const text=(r:number,a:number,label:string,color="#222",size=14,rotate=false)=>{const [x,y]=P(r,a);return <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill={color} fontSize={size} transform={rotate?`rotate(${a>90&&a<270?a+180:a} ${x} ${y})`:undefined}>{label}</text>;};
 const ray=(a:number,from:number,to:number,color="#777",width=.6)=>{const p=P(from,a),q=P(to,a);return <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={color} strokeWidth={width}/>;};
 const ringNames=(items:typeof natal,inner:number,outer:number,color:string)=>chart.palaces.map(p=>{
  const list=items.filter(s=>s.branch===p.branch);
  return <g key={p.branch}>{list.map((s,n)=>{const a=p.startLon+p.width*(n+1)/(list.length+1);const chars=Array.from(s.name.replace(/（.*?）/g,""));return <g key={`${s.name}-${n}`}><title>{p.branch}宫 · {s.name}</title>{chars.map((c,k)=><g key={k}>{text(inner+11+(outer-inner-22)*k/Math.max(chars.length-1,1),a,c,color,13)}</g>)}</g>;})}</g>;
 });
 const clock=(utc:string|null)=>utc?new Date(utc).toLocaleTimeString("zh-CN",{timeZone:"Asia/Shanghai",hour:"2-digit",minute:"2-digit"}):"—";
 return <svg ref={svgRef} data-testid="qizheng-detailed-chart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1000" width="100%" height="100%" style={{fontFamily:"'Microsoft YaHei','PingFang SC',sans-serif"}}>
  <rect width={1200} height={1000} fill="white"/>
  <text data-chart-private="true" x={28} y={30} fontSize={22} fontWeight="bold" fill="#151515">{name||"七政四余"} · 详细星盘</text>
  <text x={28} y={53} fontSize={12} fill="#666">蓝：本命　绿：流年　外沿：行限虚岁／年份　点击任一宫位查看本地解读</text>
  {[52,95,119,146,178,253,291,343,398,412].map(r=><circle key={r} cx={CX} cy={CY} r={r} fill="none" stroke="#333" strokeWidth={r===412?1:.65}/>)}
  {chart.palaces.filter(p=>p.branch===chart.mingGong.branch||p.branch===chart.shenGong.branch).map(p=><path key={`shade-${p.branch}`} d={sector(p.startLon,p.startLon+p.width,119,146)} fill={p.branch===chart.mingGong.branch?"#7B2FBE":"#2196F3"} opacity={.14}/>)}
  {chart.palaces.map(p=>{const a=p.startLon+p.width/2;return <g key={p.branch}>
   {ray(p.startLon,52,178)}{ray(p.startLon,291,398)}
   {text(71,a,`${p.owner.replace("太阳","日").replace("太阴","月")} ${p.branch}`,"#222",16)}
   {text(107,a,ZODIAC[p.branch],"#333",13,true)}
   {text(132,a,p.renshiGong,"#178736",16,true)}
   {text(162,a,PALACE_AUX[p.branch].bagua,"#555",13)}
  </g>;})}
  {Array.from({length:360},(_,d)=><g key={d}>{ray(d,253,d%10===0?244:d%5===0?248:250,"#444",d%5===0?.65:.3)}</g>)}
  {chart.mansions.map(m=><g key={m.name}>
    {ray(m.startLon,253,291,"#c52222",.8)}
    {text(274,m.startLon+m.width/2,m.name,["火","日"].includes(m.owner)?"#b82424":"#222",15,true)}
  </g>)}
  {ray(chart.mingDu.lon,149,252,"#e53935",1.2)}
  {ray(chart.shenDu.lon,149,252,"#4fc3f7",1.2)}
  {chart.stars.map((s,n)=>{const r=194+(n%3)*19;return <g key={s.key} data-star={s.key}>
   <title>{s.name} · {s.palaceBranch}{dm(s.palaceDegree)} · {s.xiuFullName}{dm(s.xiuDegree)}</title>
   {ray(s.lon,r+10,251,"#4464aa",.45)}{text(r,s.lon,SHORT[s.key]||s.name,"#182ca8",20)}
  </g>;})}
  {transit?.stars.map((s,n)=><g key={s.key}>{text(181+(n%2)*12,s.lon,SHORT[s.key]||s.name,"#159438",13)}</g>)}
  {ringNames([...natal,...huaItems(dy.yearGanzhi.gan,chart.stars)],292,342,"#243ca8")}{ringNames([...flow,...(transit?huaItems(transit.ganzhi.gan,transit.stars):[])],344,397,"#198b37")}
  {!transit && <text x={CX} y={CY-368} textAnchor="middle" fontSize={12} fill="#666">开启流年后显示流年神煞</text>}
  {Array.from({length:100},(_,n)=>n+1).map(a=>{const x=xianDuAtAge(chart,a);if(!x)return null;return <g key={a} data-age={a}>
   {ray(x.lon,398,a%5===0?411:405,"#238b39",.6)}
   {text(405,x.lon,String(a),"#238b39",6)}
   {a%5===0&&text(425,x.lon,String(i.year+a-1),"#333",10,true)}
  </g>;})}
  {text(0,0,`${chart.mingGong.branch}宫立命`,"#1a9a36",17)}
  <text x={CX} y={CY+22} textAnchor="middle" fontSize={12} fill="#1a9a36">命度主 {chart.mingDuZhu}</text>
  <text x={CX} y={CY-22} textAnchor="middle" fontSize={12} fill="#1a9a36">身宫 {chart.shenGong.branch}</text>
  {chart.palaces.map(p=><path key={`hit-${p.branch}`} d={sector(p.startLon,p.startLon+p.width,52,398)} fill="transparent" role="button" tabIndex={0}
    aria-label={`解读${p.renshiGong}（${p.branch}宫）`} style={{cursor:"pointer"}} onClick={()=>onPalace(p.branch)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onPalace(p.branch);}}}/>)}
  <g transform="translate(884,30)" fill="#222" fontSize={13} data-testid="qizheng-parameter-table">
   <g data-chart-private="true"><text y={0} fontSize={17} fontWeight="bold">出生与四柱（真太阳时）</text>
   <text y={25}>{i.year}/{i.month}/{i.day} {String(i.hour).padStart(2,"0")}:{String(i.minute).padStart(2,"0")}　{i.gender==="female"?"女":"男"}</text>
   <text y={49}>年　月　日　时</text>
   <text y={73} fontSize={17}>{pillars.getYearInGanZhiExact()}　{pillars.getMonthInGanZhiExact()}　{pillars.getDayInGanZhi()}　{pillars.getTimeInGanZhi()}</text>
   <text y={97}>真太阳时 {chart.trueSolar.trueSolarTime}　{chart.dayNight.isDay?"昼生":"夜生"}</text></g>
   <text y={121}>命：{chart.mingGong.branch}{dm(chart.mingDu.palaceDegree)}　{chart.mingDu.xiuName}{dm(chart.mingDu.xiuDegree)}</text>
   <text y={145}>身：{chart.shenGong.branch}　{chart.shenDu.xiuName}{dm(chart.shenDu.xiuDegree)}</text>
   <text y={173} fontSize={17} fontWeight="bold">十一曜宫度 · 宿度</text>
   <text y={196} fill="#666">星曜　宫内度数　　 宿内度数</text>
   {chart.stars.map((s,n)=><text key={s.key} y={221+n*24} data-table-star={s.key}>
     {SHORT[s.key]}　{s.palaceBranch}{dm(s.palaceDegree)}　{s.xiuName}{dm(s.xiuDegree)}{s.retrograde?" 逆":""}
   </text>)}
   <text y={505} fontSize={17} fontWeight="bold">化曜与星曜状态</text>
   {chart.stars.map((s,n)=>{const info=basics.flatMap(b=>b.stars).find(t=>t.key===s.key);const hs=hua.filter(h=>h.starKey===s.key).map(h=>h.huaName);return <text key={s.key} y={531+n*23} fontSize={11}>
     {SHORT[s.key]}　{[...hs,...(info?.states||[]),info?.seasonStrength||""].join(" · ")||"—"}
   </text>;})}
   <text y={802} fontSize={17} fontWeight="bold">限度与流年</text>
   <text y={829}>流年：{transit?`${transit.year}年 ${transit.ganzhi.gan}${transit.ganzhi.zhi}`:"未开启"}</text>
   <text y={854}>大限：{xian?`${age}岁 ${xian.row.palaceBranch}宫 ${xian.xiuName}${dm(xian.xiuDegree)}`:"选择行限年龄后显示"}</text>
   <text y={879}>小限／月限：资料未提供完整起算法</text>
  </g>
  <g fontSize={13} fill="#333">
   <text data-chart-private="true" x={30} y={920}>{i.placeName||"出生地"}　经度 {i.lon.toFixed(4)}°　纬度 {i.lat.toFixed(4)}°　UTC{(i.tzOffset??8)>=0?"+":""}{i.tzOffset??8}</text>
   <text x={30} y={944}>日出 {clock(chart.dayNight.sunriseUtc)}　日落 {clock(chart.dayNight.sunsetUtc)}（北京时间）　{chart.frame==="sidereal"?"恒星制（郑案）":"黄道回归今制"}</text>
   <text x={30} y={968}>命主 {chart.palaces.find(p=>p.branch===chart.mingGong.branch)?.owner}　身主 {chart.palaces.find(p=>p.branch===chart.shenGong.branch)?.owner}　命度主 {chart.mingDuZhu}　身度主 {chart.shenDuZhu}</text>
  </g>
 </svg>;
}
