import { EXPANDED_LESSONS } from "./studyExpansion";
// Original introductory reading exercises. No diagnosis, prescribing or treatment instruction.
export interface StarterQuestion {
  id: string;
  stem: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface StarterLesson {
  id: string;
  title: string;
  summary: string;
  paragraphs: string[];
  source: string;
  href: string;
  linkLabel: string;
  questions: StarterQuestion[];
}

export const STARTER_LESSONS: StarterLesson[] = [
  {
    id: "classics",
    title: "读经典：先分清原文与注解",
    summary: "建立书名、篇章、术语和出处的阅读习惯。",
    paragraphs: [
      "打开一部典籍时，先确认书名和篇章，再区分原文、后人注解和现代编者说明。不同层次的文字应分别记录，避免把注解当成古籍原文。",
      "遇到不熟悉的术语，可先记下原词和所在篇章，再回到知识资料中查阅。自己的理解应标成学习笔记；引用或转述时，保留能够重新找到内容的出处。",
      "古籍阅读是理解历史知识与学术思想的过程。书中的病证、方药或经验记载不等于对读者本人的诊断和处方，不能按条文自行治疗。",
    ],
    source: "阅读方法练习；延伸检索：中国中医科学院中医药信息研究所/图书馆《中国中医古籍数字资源库》。本课为本站编写的学习方法说明，非古籍原文。",
    href: "/zhongyi/classic",
    linkLabel: "打开中医典籍库",
    questions: [
      { id: "classics-1", stem: "摘录典籍时，哪种记录更便于复核？", options: ["只记一句话，不记出处", "记录书名、篇章，并标明原文或注解", "把自己的理解也标成古籍原文"], answer: 1, explanation: "书名、篇章与文字层次能帮助回到资料核对；自己的理解应另作笔记。" },
      { id: "classics-2", stem: "读到古籍中的方药记载后，应如何使用？", options: ["按记载给自己开方", "直接推荐给有相似症状的人", "作为学习材料，身体不适时寻求专业诊疗"], answer: 2, explanation: "阅读不能替代专业诊疗。病证和方药记载不构成对个人的处方。" },
    ],
  },
  {
    id: "herb-reading",
    title: "查本草：分栏整理知识",
    summary: "把名称、术语与注意事项分别记录。",
    paragraphs: [
      "查阅中药资料时，可以先按名称、别名、资料出处建立卡片。相近名字不应自动视为同一种资料对象；有疑问时保留问题，继续核对可靠的教材或规范资料。",
      "性味、归经等是学习中常见的资料栏目。阅读时先理解栏目名称，再分别摘记内容；不要仅凭一个词就推断某种药物适合自己。",
      "方剂资料还涉及组成、配伍和使用条件。记住药名或方名并不等于具备安全用药能力。本课只训练资料整理，不提供剂量、处方或服用建议。",
    ],
    source: "本站编写的中药与方剂资料阅读方法练习；具体专业知识请结合正规教材及资料所列出处核对。",
    href: "/zhongyi/herb",
    linkLabel: "打开中药资料库",
    questions: [
      { id: "herb-1", stem: "遇到名称相近的两条中药资料时，应怎样处理？", options: ["核对名称、别名与出处，不直接混同", "名称相近就能替代使用", "只保留较熟悉的名称"], answer: 0, explanation: "整理资料应先核实对象和出处，相近名称不能成为替代使用的依据。" },
      { id: "herb-2", stem: "这类资料卡片主要帮助完成什么？", options: ["替代药师提供个人用药方案", "整理和复习知识栏目", "只凭归经判断个人应该服什么药"], answer: 1, explanation: "资料卡片帮助组织知识；个人用药需要专业指导，不能由栏目匹配得出。" },
    ],
  },
  {
    id: "meridian-reading",
    title: "看图谱：对照名称与位置说明",
    summary: "通过名称、所属分类与图文对照学习。",
    paragraphs: [
      "使用经络穴位资料时，可以先按名称检索，再对照所属分类和位置文字。将名称、索引与自己的疑问记在一起，下一次复习时更容易定位资料。",
      "示意图用于辅助理解，图上的点位和比例不能直接当作个人操作依据。不同资料的表达可能有差异，应回到正规教材或规范资料核对，而不是只凭一张图片记忆。",
      "经络穴位知识学习不等于取得针灸或其他操作资格。本课不提供针刺、操作深度或治疗方案，读图完成后也不要据此自行进行侵入性操作。",
    ],
    source: "本站编写的经络穴位图文学习方法练习；定位与操作规范须由正规教材和具备资质的专业人员指导。",
    href: "/zhongyi/meridian",
    linkLabel: "打开经络穴位资料",
    questions: [
      { id: "meridian-1", stem: "学习图谱时，哪种方法更合适？", options: ["只凭图上的一个点操作", "将示意图当作个人治疗方案", "结合名称、分类、文字说明核对学习"], answer: 2, explanation: "名称与图文交叉对照有助于理解；示意图不是个人操作依据。" },
      { id: "meridian-2", stem: "完成图谱阅读和本课练习意味着什么？", options: ["完成一次知识学习，不代表具备操作资质", "已经具备针灸执业资格", "可以独立制定治疗方案"], answer: 0, explanation: "练习记录仅反映本课学习情况，不是职业资格或执业资格证明。" },
    ],
  },
  {
    id: "review-method",
    title: "做复习：让错题回到知识点",
    summary: "先尝试，再核对解析，最后重练。",
    paragraphs: [
      "读完一段资料后，先合上答案，试着用自己的话解释核心概念，再完成对应练习。答题不是只记选项，而是检查是否理解了问题所考查的知识。",
      "出现错题时，记录自己的选择、正确答案和错误原因，再回到原资料核对。可以把原因分为概念不清、出处混淆或审题遗漏，下一次复习优先处理仍有疑问的部分。",
      "本入门课会在本机记录已读章节和最近一次作答，答错后可进入错题重练。数据不上传账号，卸载、清理应用数据或更换设备后可能无法保留；它与账号题库的云端学习记录分别管理。",
    ],
    source: "本站编写的阅读与自测方法练习。本课成绩仅用于个人复习，不属于考试认证。",
    href: "/academy/question-bank",
    linkLabel: "进入进阶题库",
    questions: [
      { id: "review-1", stem: "答错后，哪种做法更有助于复习？", options: ["只记正确选项字母", "核对解析和原资料，记录原因后重练", "跳过所有做错的题"], answer: 1, explanation: "将错误与知识点关联，再重练检验理解，能形成完整的复习过程。" },
      { id: "review-2", stem: "本入门课的进度存在哪里？", options: ["自动同步到所有设备", "直接写入职业资格档案", "本机浏览器或应用存储中"], answer: 2, explanation: "本课使用本机存储，不声称跨设备同步，也不产生执业资格证明。" },
    ],
  },
  ...EXPANDED_LESSONS,
];

export interface StarterProgress {
  version: 1;
  lessonId: string;
  read: string[];
  answers: Record<string, number>;
  questionVersions?: Record<string,string>;
  lessonVersions?: Record<string,string>;
}

export const STARTER_STORAGE_KEY = "yandao_study_starter_v1";
export const emptyStarterProgress = (): StarterProgress => ({ version: 1, lessonId: STARTER_LESSONS[0].id, read: [], answers: {} });

// Discard malformed or obsolete values rather than displaying fabricated completion.
export const starterQuestionVersion=(q:StarterQuestion)=>JSON.stringify([q.stem,q.options,q.answer]);
export const starterLessonVersion=(l:StarterLesson)=>JSON.stringify([l.title,l.summary,l.paragraphs]);
export function parseStarterProgress(raw: string | null,lessons:StarterLesson[]=STARTER_LESSONS): StarterProgress {
  const result = {...emptyStarterProgress(),lessonId:lessons[0]?.id||STARTER_LESSONS[0].id};
  try {
    const value = JSON.parse(raw || "null");
    if (!value || value.version !== 1) return result;
    if (lessons.some((lesson) => lesson.id === value.lessonId)) result.lessonId = value.lessonId;
    result.read = lessons.filter((lesson) => {
      const baseline=STARTER_LESSONS.find(item=>item.id===lesson.id);
      const previous=value.lessonVersions?.[lesson.id]??(baseline?starterLessonVersion(baseline):null);
      return Array.isArray(value.read)&&value.read.includes(lesson.id)&&previous===starterLessonVersion(lesson);
    }).map((lesson) => lesson.id);
    for (const question of lessons.flatMap((lesson) => lesson.questions)) {
      const answer = value.answers?.[question.id];
      const baseline=STARTER_LESSONS.flatMap(item=>item.questions).find(item=>item.id===question.id);
      const previous=value.questionVersions?.[question.id]??(baseline?starterQuestionVersion(baseline):null);
      if (previous===starterQuestionVersion(question)&&Number.isInteger(answer) && answer >= 0 && answer < question.options.length) result.answers[question.id] = answer;
    }
  } catch { /* Broken local storage is treated as a new session. */ }
  return result;
}

// Keep unavailable courses in the saved document so a temporary remote removal
// does not erase their history. Only active, unchanged content counts in the UI.
export function mergeStarterProgress(raw:string|null,next:StarterProgress,lessons:StarterLesson[]):string{
 let previous:Partial<StarterProgress>={};try{const value=JSON.parse(raw||"null");if(value?.version===1)previous=value;}catch{}
 const validId=(id:string)=>/^[a-z][a-z0-9-]{0,79}$/.test(id),activeLessons=new Set(lessons.map(l=>l.id)),activeQuestions=new Set(lessons.flatMap(l=>l.questions.map(q=>q.id)));
 const answers:Record<string,number>={},questionVersions:Record<string,string>={},lessonVersions:Record<string,string>={};
 for(const [id,value] of Object.entries(previous.answers||{}).slice(0,5000))if(validId(id)&&!activeQuestions.has(id)&&Number.isInteger(value)&&value>=0&&value<6){answers[id]=value;if(typeof previous.questionVersions?.[id]==="string")questionVersions[id]=previous.questionVersions[id];}
 const read=Array.isArray(previous.read)?previous.read.filter(id=>typeof id==="string"&&validId(id)&&!activeLessons.has(id)).slice(0,5000):[];
 for(const id of read)if(typeof previous.lessonVersions?.[id]==="string")lessonVersions[id]=previous.lessonVersions[id];
 for(const lesson of lessons){if(next.read.includes(lesson.id)){read.push(lesson.id);lessonVersions[lesson.id]=starterLessonVersion(lesson);}for(const q of lesson.questions){const answer=next.answers[q.id];if(Number.isInteger(answer)&&answer>=0&&answer<q.options.length){answers[q.id]=answer;questionVersions[q.id]=starterQuestionVersion(q);}}}
 return JSON.stringify({version:1,lessonId:next.lessonId,read:[...new Set(read)],answers,questionVersions,lessonVersions});
}
