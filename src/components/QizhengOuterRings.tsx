import type { QizhengResult } from "@/algorithm-core/modules/qizheng";
import { xianDuAtAge } from "@/algorithm-core/modules/qizheng";
import { chartShensha } from "@/lib/qizhengPalaceInterpretation";
import type { QizhengLiunianResult } from "@/algorithm-core/modules/qizheng-liunian";

const point = (r: number, a: number) => [180+r*Math.sin(a*Math.PI/180),180-r*Math.cos(a*Math.PI/180)];
export function QizhengOuterRings({result, gan, zhi, liunian}: {
 result: QizhengResult; gan: string; zhi: string; liunian: QizhengLiunianResult | null;
}) {
 const natal = chartShensha(gan,zhi);
 const ring = (inner:number, outer:number, flow:boolean) => <g>
   <circle cx={180} cy={180} r={outer} fill="none" stroke="#8a6d3b" strokeWidth={0.6}/>
   {result.palaces.map(p => {
     const a = point(inner,p.startLon), b = point(outer,p.startLon);
     const source: Array<{name:string;branch:string}> = flow ? (liunian ? chartShensha(liunian.ganzhi.gan,liunian.ganzhi.zhi) : []) : natal;
     const items = source.filter(s => s.branch === p.branch);
     const names = items.map(s => s.name.replace(/（.*?）/g,""));
     return <g key={p.branch}>
       <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#8a6d3b" strokeWidth={0.5}/>
       {names.map((name,i) => {
         const angle = p.startLon + p.width*(i+1)/(names.length+1);
         return <g key={`${name}-${i}`}>{Array.from(name).map((char,j) => {
           const q=point(inner+9+j*8,angle);
           return <text key={j} x={q[0]} y={q[1]} textAnchor="middle" dominantBaseline="central"
             fontSize={7} fill={flow ? "#248339" : "#3156ad"}>{char}</text>;
         })}</g>;
       })}
       {flow && !liunian && (()=>{const q=point((inner+outer)/2,p.startLon+p.width/2); return <text x={q[0]} y={q[1]} textAnchor="middle" fontSize={6} fill="#888">流年未启用</text>;})()}
     </g>;
   })}
 </g>;
 return <g data-chart-detail="outer-rings">
  <circle cx={180} cy={180} r={274} fill="#fffdf4" stroke="#8a6d3b" strokeWidth={1}/>
  {ring(180,219,false)}{ring(219,253,true)}
  {Array.from({length:100},(_,i)=>i+1).map(age=>{
    const x=xianDuAtAge(result,age); if(!x) return null;
    const a=point(254,x.lon),b=point(age%5===0?264:258,x.lon),t=point(269,x.lon);
    return <g key={age}><title>{result.input.year+age-1}年 · 虚岁{age} · {x.xiuFullName}{x.xiuDegree.toFixed(2)}°</title>
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#287b37" strokeWidth={age%5===0?0.8:0.35}/>
      {age%5===0 && <text x={t[0]} y={t[1]} textAnchor="middle" dominantBaseline="central" fontSize={5.5} fill="#287b37">{age}</text>}
    </g>;
  })}
 </g>;
}
