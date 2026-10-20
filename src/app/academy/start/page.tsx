"use client";
import {InterfaceButton} from "@/components/InterfaceControls";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandHeader } from "@/components/shared";
import { ContinuousListenPlayer } from "@/components/ContinuousListenPlayer";
import { STARTER_LESSONS, STARTER_STORAGE_KEY, emptyStarterProgress, parseStarterProgress, type StarterProgress, type StarterQuestion } from "@/data/studyStarter";

export default function StudyStarterPage() {
  const [progress, setProgress] = useState(emptyStarterProgress);
  const [ready, setReady] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [retrying, setRetrying] = useState<string[]>([]);
  useEffect(() => {
    try { setProgress(parseStarterProgress(localStorage.getItem(STARTER_STORAGE_KEY))); }
    catch { setStorageFailed(true); }
    setReady(true);
  }, []);

  function save(next: StarterProgress) {
    setProgress(next);
    try { localStorage.setItem(STARTER_STORAGE_KEY, JSON.stringify(next)); setStorageFailed(false); }
    catch { setStorageFailed(true); }
  }

  const lesson = STARTER_LESSONS.find((item) => item.id === progress.lessonId) || STARTER_LESSONS[0];
  const allQuestions = STARTER_LESSONS.flatMap((item) => item.questions);
  const wrongs = allQuestions.filter((question) => progress.answers[question.id] !== undefined && progress.answers[question.id] !== question.answer);
  const answered = allQuestions.filter((question) => progress.answers[question.id] !== undefined).length;
  const correct = allQuestions.filter((question) => progress.answers[question.id] === question.answer).length;
  const complete = progress.read.length === STARTER_LESSONS.length && correct === allQuestions.length;

  function renderQuestion(question: StarterQuestion) {
    const selected = progress.answers[question.id];
    const done = selected !== undefined && !retrying.includes(question.id);
    return (
      <fieldset key={question.id} className="mt-3 rounded-xl border border-gray-200 p-3">
        <legend className="px-1 text-sm font-semibold text-gray-800">{question.stem}</legend>
        <div className="space-y-2">
          {question.options.map((option, index) => <InterfaceButton translate="no" type="button" key={option} disabled={!ready || done} aria-pressed={selected === index && done} onClick={() => { save({ ...progress, answers: { ...progress.answers, [question.id]: index } }); setRetrying((ids) => ids.filter((id) => id !== question.id)); }} className={`block w-full rounded-lg border px-3 py-3 text-left text-sm disabled:opacity-100 ${done && selected === index ? "border-[#267364] bg-[#edf7f2] text-[#165546]" : "border-gray-200 text-gray-700"}`}>{option}</InterfaceButton>)}
        </div>
        {done && <div role="status" className="mt-3 text-xs leading-relaxed">
          <p className={`font-semibold ${selected === question.answer ? "text-[#267364]" : "text-[#a34832]"}`}>{selected === question.answer ? "回答正确" : "需要复习，已加入本课错题"}</p>
          <p className="mt-1 text-gray-600">正确答案：{question.options[question.answer]}</p>
          <p className="mt-1 text-gray-600">解析：{question.explanation}</p>
          <InterfaceButton type="button" onClick={() => setRetrying((ids) => [...ids.filter((id) => id !== question.id), question.id])} className="mt-2 rounded-lg bg-gray-100 px-3 py-2 text-gray-700">重新作答</InterfaceButton>
        </div>}
      </fieldset>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-[420px] bg-[#f5f5f5] pb-28">
      <BrandHeader title="言道学习入门" showBack backUrl="/academy" />
      <section className="mx-3 mt-3 rounded-2xl bg-[#267364] p-4 text-white">
        <h1 className="text-xl font-bold">读一课，练一课</h1><p className="mt-2 text-xs leading-6">经典阅读 · 易学基础 · 中医术语 · 天文历法 · 交流记录</p>
        <p className="mt-2 text-xs leading-relaxed">无需登录的入门学习 · 内容随包提供 · 进度保存在本机</p>
        <p className="mt-3 text-sm" aria-live="polite">{ready ? `已读 ${progress.read.length}/${STARTER_LESSONS.length} 课 · 已答 ${answered}/${allQuestions.length} 题 · 答对 ${correct} 题` : "正在读取本机进度…"}</p>
        <progress className="mt-2 h-2 w-full accent-white" max={allQuestions.length} value={correct} aria-label="自测答对题数" />
      </section>
      {storageFailed && <p role="alert" className="mx-3 mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">本机存储不可用；仍可学习和作答，但关闭页面后进度可能丢失。</p>}
      <div className="mx-3"><ContinuousListenPlayer collectionId="starter-lessons-v1" title="入门课程连续听学"
        items={STARTER_LESSONS.map(item => ({ id: item.id, title: item.title, text: item.paragraphs.join("\n\n") }))} /></div>
      <div className="mx-3 mt-3 flex gap-2">
        <InterfaceButton type="button" onClick={() => setReviewOnly(false)} aria-pressed={!reviewOnly} className={`flex-1 rounded-xl py-3 text-sm font-semibold ${!reviewOnly ? "bg-[#267364] text-white" : "bg-white text-gray-700"}`}>课程与自测</InterfaceButton>
        <InterfaceButton type="button" onClick={() => setReviewOnly(true)} aria-pressed={reviewOnly} className={`flex-1 rounded-xl py-3 text-sm font-semibold ${reviewOnly ? "bg-[#267364] text-white" : "bg-white text-gray-700"}`}>错题重练（{wrongs.length}）</InterfaceButton>
      </div>
      {reviewOnly ? <section className="mx-3 mt-3 rounded-2xl bg-white p-4">
        <h2 className="text-base font-bold text-gray-800">本入门课错题</h2>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">保留最近一次作答；答对后移出错题列表。账号题库的错题另存于账号错题本。</p>
        {wrongs.length === 0 ? <p role="status" className="py-6 text-center text-sm text-gray-500">当前没有待复习错题。可回到课程继续学习。</p> : wrongs.map(renderQuestion)}
      </section> : <>
        <details className="mx-3 mt-3 rounded-2xl bg-white p-3"><summary className="cursor-pointer text-sm font-semibold text-gray-800">选择课程（{STARTER_LESSONS.length}课）· {lesson.title}</summary><nav aria-label="入门课目录" className="mx-3 mt-3 grid grid-cols-2 gap-2">
          {STARTER_LESSONS.map((item, index) => <InterfaceButton type="button" disabled={!ready} key={item.id} aria-current={item.id === lesson.id ? "step" : undefined} onClick={() => { save({ ...progress, lessonId: item.id }); setRetrying([]); }} className={`rounded-xl border p-3 text-left text-xs leading-relaxed ${item.id === lesson.id ? "border-[#267364] bg-[#edf7f2] text-[#165546]" : "border-transparent bg-white text-gray-700"}`}><span className="mb-1 block text-[11px]">第 {index + 1} 课 · {progress.read.includes(item.id) ? "已读" : "未读"}</span><strong>{item.title}</strong></InterfaceButton>)}
        </nav></details>
        <article className="mx-3 mt-3 rounded-2xl bg-white p-4">
          <h2 className="text-lg font-bold text-gray-800">{lesson.title}</h2>
          <p className="mt-2 text-xs text-[#267364]">{lesson.summary}</p>
          {lesson.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 text-sm leading-7 text-gray-700">{paragraph}</p>)}
          <p className="mt-4 rounded-xl bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-500">资料说明：{lesson.source}</p>
          {lesson.id === "classics" && <a className="mt-2 block text-xs text-[#267364] underline" href="https://gydc-v4.cintcm.cn/">延伸查阅：中国中医古籍数字资源库（联网）</a>}
          <InterfaceButton type="button" disabled={!ready || progress.read.includes(lesson.id)} onClick={() => save({ ...progress, read: [...progress.read, lesson.id] })} className="mt-4 w-full rounded-xl bg-[#267364] px-3 py-3 text-sm font-semibold text-white disabled:bg-gray-200 disabled:text-gray-600">{progress.read.includes(lesson.id) ? "本课已读，可继续自测" : "标记已读，开始自测"}</InterfaceButton>
          <h3 className="mt-5 text-base font-bold text-gray-800">检查理解</h3>
          {lesson.questions.map(renderQuestion)}
          <Link href={lesson.href} className="mt-4 block rounded-xl bg-[#f1f7f4] px-3 py-3 text-center text-sm font-semibold text-[#267364]">{lesson.linkLabel}</Link>
          <p className="mt-2 text-[11px] text-gray-500">延伸资料和账号题库按相应页面的联网、登录与权益要求使用。</p>
          {STARTER_LESSONS.indexOf(lesson) < STARTER_LESSONS.length - 1 && <InterfaceButton type="button" disabled={!ready} onClick={() => { save({ ...progress, lessonId: STARTER_LESSONS[STARTER_LESSONS.indexOf(lesson) + 1].id }); setRetrying([]); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="mt-3 w-full rounded-xl bg-[#f5f0f8] px-3 py-3 text-sm font-semibold text-[#5c3677]">继续下一课</InterfaceButton>}
        </article>
      </>}
      {complete && <p role="status" className="mx-3 mt-3 rounded-xl bg-[#edf7f2] p-4 text-sm text-[#267364]">本入门课已完成！可以回顾资料或进入进阶知识学习。这是个人学习记录，不是执业资格证明。</p>}
      <p className="mx-4 mt-4 text-xs leading-relaxed text-gray-500">仅供知识学习，不提供诊断、处方或治疗指导。本机进度不上传账号，清理数据或更换设备可能丢失。</p>
      <Link href="/academy" className="mx-3 mt-3 block rounded-xl bg-white px-3 py-3 text-center text-sm text-[#5c3677]">返回学堂，查看完整学习专区</Link>
    </main>
  );
}
