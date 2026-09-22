// 复现 V8 "Expected ':' after property name (line N column 1)" 的 JSON 损坏形态
const cases = {
  fullWidthColon: '{\n"a"："b"\n}',
  keyThenValueNextLine: '{\n"a"\n"b"\n}',
  unescapedInner: '{"a": "他说"你好"就走"}',
  unescapedEndLine: '{\n"a": "他说\n"你好"\n}',
  fullWidthQuoteKey: '{\n"a"： "b"\n}',
  missingColonFlat: '{\n"digest"\n"摘要内容"\n}',
  trailingContent: '{"a": "b" "c"}',
  newlineInString: '{"a": "b\nc"}',
};
for (const [name, s] of Object.entries(cases)) {
  try { JSON.parse(s); console.log(name, '=> OK'); }
  catch (e) { console.log(name, '=>', e.message); }
}
