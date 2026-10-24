const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const renderer = {};
const code = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,
  '../src/components/SafeRichText.tsx'), 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
vm.runInNewContext(code, { exports: renderer, require });
const render = content => renderToStaticMarkup(React.createElement(renderer.SafeRichText, { content }));

test('AI headings, emphasis and lists render without leaking Markdown markers', () => {
  const html = render('## 学习资料\n**原文核对**\n- 第一项\n- 第二项\n1. 先阅读\n2. 再复习');
  assert.ok(html.includes('<strong>原文核对</strong>'));
  assert.ok(html.includes('<ul')); assert.ok(html.includes('<ol'));
  assert.ok(!html.includes('##')); assert.ok(!html.includes('**'));
});

test('model HTML stays escaped and executable links cannot be activated', () => {
  const html = render('<script>alert(1)</script>\n[危险](javascript:alert)\n[来源](https://example.test/source)');
  assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('href="javascript:')); assert.ok(html.includes('rel="noopener noreferrer"'));
});
