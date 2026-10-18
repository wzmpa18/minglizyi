'use strict';
// Shared by the client bundle and the server. Node 22 / supported iOS WebViews
// use Unicode grapheme segmentation; unsupported clients cannot publish.
const MAX_STUDY_CHARACTERS = 500;
const MAX_STUDY_BYTES = 65536;
function countStudyCharacters(text) {
  if (typeof Intl.Segmenter !== 'function') throw new Error('当前系统不支持文字计数，请更新系统后再留言');
  return Array.from(new Intl.Segmenter('zh', { granularity: 'grapheme' }).segment(text)).length;
}
function normalizeStudyText(text) { return typeof text === 'string' ? text.replace(/\r\n?/g, '\n').trim() : ''; }
function validateStudyText(value) {
  if (typeof value !== 'string') return { ok: false, error: '只支持纯文字留言' };
  const text = normalizeStudyText(value);
  if (!text) return { ok: false, error: '请输入留言' };
  if (new TextEncoder().encode(text).length > MAX_STUDY_BYTES) return { ok: false, error: '留言数据过大' };
  const count = countStudyCharacters(text);
  if (count > MAX_STUDY_CHARACTERS) return { ok: false, error: '单条留言或回复最多500个字', count };
  if (/<\/?[a-z][^>]*>|!\[[\s\S]*?\]\s*\(|\[img\]|data\s*:|blob\s*:|(?:^|\s)[A-Za-z0-9+/]{160,}={0,2}(?:\s|$)/i.test(text)) {
    return { ok: false, error: '仅支持纯文字，不支持图片、附件、富文本或编码媒体' };
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(text)) return { ok: false, error: '留言含不支持的控制字符' };
  if (/(?:1[3-9]\d{9})|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:加我|联系我|私聊|招代理|返佣|包治|保证治愈)|(?:直刺|斜刺|平刺|进针|放血).{0,16}(?:\d|寸|厘米)|(?:自己|自行|在家).{0,10}(?:针刺|正骨|开方)/i.test(text)) {
    return { ok: false, error: '请勿发布个人联系方式、广告或危险医疗操作指导' };
  }
  return { ok: true, text, count };
}
module.exports = { MAX_STUDY_CHARACTERS, MAX_STUDY_BYTES, countStudyCharacters, normalizeStudyText, validateStudyText };
