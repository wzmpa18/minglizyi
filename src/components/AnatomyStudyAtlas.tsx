"use client";
import {useState} from "react";
import Link from "next/link";
import sources from "../../public/assets/anatomy/sources.json";
const JOINTS=["颞下颌关节","寰枕关节与寰枢关节","肩关节","肘关节","桡腕关节","掌指关节与指间关节","骶髂关节","髋关节","膝关节","踝关节","跗跖关节与趾间关节"];
export function AnatomyStudyAtlas(){const [tab,setTab]=useState<"skeleton"|"fascia">("skeleton"),[scale,setScale]=useState(1);
 const source=sources[tab==="skeleton"?0:1];
 return <section className="m-3 rounded-xl border border-gray-200 bg-white p-3 text-gray-800" data-local-zoom="true"><h2 className="font-bold">骨骼、关节与筋膜图解</h2><Link href="/zhongyi/anatomy3d/" className="my-3 block rounded-lg border border-purple-200 bg-purple-50 p-3 text-purple-800">打开三维人体图谱：分层、隔离与全屏观察 →</Link><div className="flex gap-3 my-3"><button aria-pressed={tab==="skeleton"} onClick={()=>{setTab("skeleton");setScale(1);}} className="border rounded px-3 py-2">全身骨骼</button><button aria-pressed={tab==="fascia"} onClick={()=>{setTab("fascia");setScale(1);}} className="border rounded px-3 py-2">腰背筋膜</button></div>
 <label className="text-sm">图谱放大 {scale.toFixed(1)}倍 <input aria-label="解剖图谱放大" type="range" min="1" max="3" step="0.25" value={scale} onChange={e=>setScale(Number(e.target.value))}/></label><div className="overflow-auto max-h-[70vh] mt-2 border"><img src={`/assets/anatomy/${source.file}`} alt={tab==="skeleton"?"全身骨骼正面图（原图英文标注）":"腰背筋膜在腹后壁横断面中的层次图（Gray388）"} style={{width:`${scale*100}%`,maxWidth:"none",height:"auto"}}/></div>
 {tab==="skeleton"?<><p className="text-sm leading-6 my-3">沿中轴观察颅骨、脊柱、胸廓与骨盆，再对照肩带、上肢及下肢。原图保留英文标注，红线指单块骨、蓝线指骨群。</p><h3 className="font-semibold">主要关节定位索引</h3><ul className="grid grid-cols-2 gap-2 my-3 text-sm">{JOINTS.map(n=><li key={n}>{n}</li>)}</ul></>:<p className="text-sm leading-6 my-3">此图为腹后壁横断面，展示腰背筋膜及其与竖脊肌、腰方肌和腹壁肌的关系；属于局部层次图，不表示全身筋膜分布。筋膜、肌腱和韧带在结构与功能上需要分别学习。</p>}
 <p className="text-xs text-gray-600 leading-5">来源：{source.author}；{source.license}。<a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">原图与授权</a>。历史图谱用于解剖认知，不用于自行实施正骨或针刺。</p></section>;
}
