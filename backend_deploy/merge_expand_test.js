// 单测 mergeExpand + articleWordCount（从引擎文件提取，不依赖DB）
const src = require('fs').readFileSync(String.raw`C:\Users\ZhuanZ\Projects\minglizyi\backend_deploy\wechatContentEngine.js`, 'utf8');

function extractFn(name) {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error('not found: ' + name);
  let depth = 0, i = src.indexOf('{', start);
  const end0 = i;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  return src.slice(start, i + 1);
}
const mergeExpand = eval('(' + extractFn('mergeExpand') + ')');
const articleWordCount = eval('(' + extractFn('articleWordCount') + ')');

const parsed = {
  intro: '玄奘出发那一年，二十八岁。',
  sections: [
    { h: '学语言先学什么', paragraphs: ['先学发音。'] },
    { h: '词汇本', paragraphs: ['他记词汇。'] },
  ],
  takeaway: '一句话',
};
const raw = `【开场】
贞观三年，长安闹饥荒，官府准许百姓自谋出路。玄奘混在逃荒的人流里出了城。

【小节1】
（本节标题：学语言先学什么）
他每到一国，先做的事不是讲经，而是把当地的音韵记下来。西行路上，他过了至少八十多个国家。

【小节2】
那本词汇笔记，后来成就了《大唐西域记》。`;

const merged = mergeExpand(JSON.parse(JSON.stringify(parsed)), raw);
console.log('intro段数:', merged.intro.split('\n').length);
console.log('小节1段数:', merged.sections[0].paragraphs.length, JSON.stringify(merged.sections[0].paragraphs));
console.log('小节2段数:', merged.sections[1].paragraphs.length, JSON.stringify(merged.sections[1].paragraphs));
const wc1 = articleWordCount(parsed), wc2 = articleWordCount(merged);
console.log('字数:', wc1, '->', wc2, wc2 > wc1 ? 'PASS' : 'FAIL');

// 边界：空响应/无标记响应不影响原稿
const m2 = mergeExpand(JSON.parse(JSON.stringify(parsed)), '随便说点什么没有标记');
console.log('无标记响应不变:', JSON.stringify(m2) === JSON.stringify(parsed) ? 'PASS' : 'FAIL');
