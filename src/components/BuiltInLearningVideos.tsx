"use client";
import { useState } from "react";
import lessons from "@/data/builtinLearningVideos.json";

/** Original, bundled media: playback never depends on opening a third-party site. */
export function BuiltInLearningVideos() {
  const [selected, setSelected] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const lesson = lessons[selected];
  return <section aria-label="应用内学习微课" className="rounded-xl bg-white p-4 shadow-sm">
    <h2 className="text-base font-bold text-gray-800">应用内学习微课</h2>
    <p className="mt-1 text-xs leading-5 text-gray-500">原创字幕课程，无配音。视频随应用提供，播放无需打开其他网站；下方附文字要点与自测。</p>
    <div className="my-3 flex flex-col gap-2" role="group" aria-label="选择微课">
      {lessons.map((item, index) => <button type="button" key={item.id} aria-pressed={selected === index}
        onClick={() => {setSelected(index); setAnswer(null); setFailed(false);}}
        className={`rounded-lg border px-3 py-2 text-left text-sm ${selected === index ? "border-purple-500 bg-purple-50 text-purple-800" : "border-gray-200 text-gray-700"}`}>
        {item.title}
      </button>)}
    </div>
    <video key={lesson.id} src={lesson.media} controls playsInline preload="metadata"
      aria-label={lesson.title} onError={() => setFailed(true)}
      className="max-h-[440px] w-full rounded-lg bg-[#241238]" />
    {failed && <p role="status" className="mt-2 text-sm text-amber-800">视频暂时无法播放，请阅读下方同一课程的完整文字要点；可稍后重新打开课程重试。</p>}
    <p className="my-3 text-xs leading-6 text-gray-500">{lesson.description}</p>
    <details className="rounded-lg bg-purple-50 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-purple-900">查看完整文字要点</summary>
      {lesson.sections.map(section => <div className="mt-3" key={section.title}>
        <h3 className="text-sm font-semibold text-gray-800">{section.title}</h3>
        <ul className="mt-1 list-disc pl-5 text-sm leading-7 text-gray-700">{section.lines.map(line => <li key={line}>{line}</li>)}</ul>
      </div>)}
    </details>
    <div className="mt-4" role="group" aria-label="课程自测">
      <p className="text-sm font-semibold text-gray-800">学习自测：{lesson.question}</p>
      <div className="mt-2 flex flex-col gap-2">{lesson.options.map((option, index) => <button type="button" key={option}
        aria-pressed={answer === index} onClick={() => setAnswer(index)}
        className={`rounded-lg border p-2 text-left text-sm ${answer === index ? "border-purple-500 bg-purple-50" : "border-gray-200"}`}>
        {String.fromCharCode(65 + index)}. {option}
      </button>)}</div>
      {answer !== null && <p role="status" className="mt-3 text-sm leading-6 text-purple-900">
        {answer === lesson.answer ? "回答正确。" : "再核对一下文字要点。"}{lesson.explanation}
      </p>}
    </div>
  </section>;
}
