"use client";
import Link from "next/link";
export default function AstronomyError({reset}:{error:Error;reset:()=>void}){return <main className="mx-auto max-w-xl p-6 leading-7"><h1 className="text-xl font-semibold">天文馆暂未打开</h1><p className="my-4">本次显示未完成，未改动你的笔记或定位资料。请重试；仍无法打开时，可在用户反馈中说明设备与操作步骤。</p><button className="rounded-lg bg-purple-800 px-4 py-2 text-white" onClick={reset}>重新打开天文馆</button><div className="mt-4 flex flex-wrap gap-4"><Link href="/academy/">返回言道学堂</Link><Link href="/guide/astronomy/">查看使用说明</Link><Link href="/profile/feedback/">用户反馈</Link></div></main>;}
