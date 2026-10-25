'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {medicalSubjectList} from '@/lib/medicalStudyLibrary';
import {MedicalStudyReadings} from './MedicalStudyReadings';
export function DongSourceIndex({query=''}:{query?:string}){
 const [rows,setRows]=useState<Array<{key:string;name:string}>>([]);
 useEffect(()=>{let live=true;const reload=()=>{void medicalSubjectList('dong').then(value=>{if(live)setRows(value);}).catch(()=>{});};reload();window.addEventListener('medical-study-ready',reload);return()=>{live=false;window.removeEventListener('medical-study-ready',reload);};},[]);
 if(!rows.length)return <p style={{margin:12,fontSize:13}}><Link href="/offline/">准备董氏文献原页与图谱</Link>，下载后可在此按名称查阅。</p>;
 const filtered=rows.filter(row=>!query||row.name.includes(query.trim().replace(/穴$/,'')));
 return <section aria-label="董氏文献原页索引" style={{margin:12,padding:14,borderRadius:12,background:'white',lineHeight:1.8,color:'#333'}}>
  <h2 style={{fontSize:16,margin:0}}>董氏文献原页索引</h2>
  <p style={{fontSize:12}}>已收录{rows.length}个原书条目，包含单穴和多穴组合；此数不是穴位总数。打开后可放大对照定位、主治及配穴原文。</p>
  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{filtered.map(row=><Link key={row.key} href={'/zhongyi/meridian/?dong='+encodeURIComponent(row.key.slice(5))} style={{padding:'7px 10px',border:'1px solid #e4d4c9',borderRadius:8,color:'#834217',fontSize:13}}>{row.name}</Link>)}</div>
  {!filtered.length&&<p style={{fontSize:12}}>原页目录未找到该名称，可继续查看下方既有整理条目。</p>}
 </section>;
}
export function DongSourceDetail({name}:{name:string}){
 return <div style={{maxWidth:420,margin:'0 auto',padding:'12px 0 100px',background:'#f8f5fc',color:'#333'}}>
  <h1 style={{fontSize:20,padding:12}}>{name.slice(0,40)} · 文献对照</h1>
  <MedicalStudyReadings subject={'dong:'+name}/>
  <p style={{padding:12}}><Link href="/zhongyi/meridian/">返回经络与董氏目录</Link></p>
 </div>;
}
