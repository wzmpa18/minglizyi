"use client";
import Link from "next/link";
import {BrandHeader} from "./shared";
import {TongchenEntry} from "./TongchenEntry";
import {useInterfaceLocale} from "@/lib/interfaceLocale";
export function StudyCommunityHome(){const {ui}=useInterfaceLocale();return <main className="mx-auto min-h-screen max-w-[420px] pb-24" style={{background:"var(--theme-bg)",color:"var(--theme-text-primary)"}}><BrandHeader title={ui("发现")}/><TongchenEntry/><section className="m-3 rounded-2xl p-5" style={{background:"var(--theme-card-bg)"}}><h2 className="text-lg font-semibold">{ui("学习交流")}</h2><p className="my-3 text-sm leading-7">每个易学工具下方均设文字学习交流。每条最多500字，先审核后公开；可回复、删除、举报和屏蔽。</p><Link className="block rounded-xl border p-3" href="/yixue/">打开易学工具 ›</Link><Link className="mt-3 block rounded-xl border p-3" href="/calendar/">{ui("言道日历")} ›</Link><Link className="mt-3 block rounded-xl border p-3" href="/profile/feedback/">{ui("用户反馈")} ›</Link></section></main>;}
