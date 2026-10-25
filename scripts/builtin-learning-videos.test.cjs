const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const lessons = require('../src/data/builtinLearningVideos.json');
const manifest = require('../public/assets/study-videos/MANIFEST.json');

test('bundled lessons contain valid source transcripts, quiz answers and complete seekable MP4 files', () => {
  assert.equal(lessons.length, 2);
  for (const lesson of lessons) {
    assert.match(lesson.media,/^\/assets\/study-videos\/[a-z-]+\.mp4$/);
    assert.equal(lesson.sections.length,4);
    assert.equal(lesson.sections.reduce((n,s)=>n+s.seconds,0),48);
    assert.ok(Number.isInteger(lesson.answer) && lesson.answer>=0 && lesson.answer<lesson.options.length);
    assert.ok(lesson.explanation.length>20);
    const record=manifest.find(item=>item.id===lesson.id);
    assert.ok(record && record.thirdPartyVideoDownloaded===false && record.fontFileDistributed===false);
    const bytes=fs.readFileSync(path.join(root,'public',lesson.media));
    assert.equal(bytes.length,record.bytes);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),record.sha256);
    const boxes=[];
    for(let offset=0;offset<bytes.length;){
      const size=bytes.readUInt32BE(offset);
      assert.ok(size>=8 && offset+size<=bytes.length,'MP4 box must not be truncated');
      boxes.push(bytes.toString('ascii',offset+4,offset+8));offset+=size;
    }
    assert.equal(boxes[0],'ftyp');
    assert.ok(boxes.includes('moov') && boxes.includes('mdat'));
    assert.ok(boxes.indexOf('moov')<boxes.indexOf('mdat'),'metadata precedes media for prompt playback');
  }
});

test('the learning screen renders in-app media controls and the same transcript and exercise without an external page', () => {
  const load=process.env.PRIVACY_RENDER_RUNTIME ? Module.createRequire(path.resolve(process.env.PRIVACY_RENDER_RUNTIME,'package.json')) : require;
  const React=load('react'), {renderToStaticMarkup}=load('react-dom/server'), ts=load('typescript');
  const source=path.join(root,'src/components/BuiltInLearningVideos.tsx');
  const compiled=ts.transpileModule(fs.readFileSync(source,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  const component=new Module(source,module);
  component.require=id=>{
    if(id==='react')return React;
    if(id==='react/jsx-runtime')return load(id);
    if(id==='@/data/builtinLearningVideos.json')return lessons;
    throw Error(`Unexpected dependency ${id}`);
  };
  component._compile(compiled,source);
  const html=renderToStaticMarkup(React.createElement(component.exports.BuiltInLearningVideos));
  assert.match(html, /<video\b[^>]*src="\/assets\/study-videos\/classics-reading\.mp4"[^>]*controls=""[^>]*playsInline=""/);
  assert.doesNotMatch(html, /<iframe|autoPlay=|https?:\/\//);
  for(const section of lessons[0].sections)for(const line of section.lines)assert.ok(html.includes(line));
  for(const answer of lessons[0].options)assert.ok(html.includes(answer));
  assert.ok(html.includes('原创字幕课程，无配音'));
});
