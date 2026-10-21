'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPack } = require('../backend_deploy/build_tcm_original_editions_pack');
const { isCompatibleTcmEditionPack, mergeTcmEditionPack } = require('../src/lib/tcmEditionPack.ts');

test('expanded text editions validate, retain old study links and accept a corrected paragraph', () => {
  const pack = buildPack();
  assert.equal(pack.books.length, 36);
  assert.equal(pack.books.reduce((sum, book) => sum + book.chapters.length, 0), 622);
  const legacy = { ...pack.books[0], id: 'suwen-notes', sourceUrl: undefined };
  const baseline = [...pack.books, legacy];
  assert.equal(isCompatibleTcmEditionPack(pack, baseline), true);
  const updated = structuredClone(pack);
  updated.books[0].chapters[0].content += '\n校勘补充说明';
  assert.equal(isCompatibleTcmEditionPack(updated, baseline), true);
  const merged = mergeTcmEditionPack(baseline, updated);
  assert.equal(merged.length, 37);
  assert.equal(merged.at(-1), legacy);
  assert.equal(merged[0], updated.books[0]);
});

test('incomplete, duplicate, unsafe-source and unsupported content packs never replace bundled originals', () => {
  const baseline = buildPack();
  const mutations = [
    p => { p.schema = 'remote-code'; },
    p => { p.books.pop(); },
    p => { p.books[0].chapters.pop(); },
    p => { p.books[0].chapters[0].content = '节选'; },
    p => { p.books[0].sourceUrl = 'javascript:alert(1)'; },
    p => { p.books[0].sourceRevisionUrl = 'https://user:pass@example.com'; },
    p => { p.books[0].license = ''; },
    p => { p.books[0].chapters.push(p.books[0].chapters[0]); },
    p => { p.books.push(p.books[0]); },
  ];
  for (const mutate of mutations) {
    const bad = structuredClone(baseline); mutate(bad);
    assert.equal(isCompatibleTcmEditionPack(bad, baseline.books), false);
  }
});


test('original ten editions stay intact; expanded bibliography resolves and modern protected works are not presented as copied full texts',()=>{
 const fs=require('node:fs'),pack=buildPack('1.2.0'),bibliography=JSON.parse(fs.readFileSync('backend_deploy/data/jingfang-bibliography.json','utf8'));
 assert.equal(pack.books.slice(0,10).reduce((n,b)=>n+b.chapters.length,0),340);
 assert.equal(pack.books.filter(b=>b.id.startsWith('xu-')).length,8);
 for(const entry of bibliography.entries)for(const id of entry.bookIds)assert.ok(pack.books.some(b=>b.id===id),id);
 assert.equal(bibliography.profiles.length,15);assert.equal(bibliography.entries.length,21);
 const modern=bibliography.entries.filter(e=>['经方实验录','思考中医','疾病预测学','单穴治病选萃','伤寒论新义','金匮要略新义'].includes(e.title));assert.equal(modern.length,6);for(const entry of modern)assert.deepEqual(entry.bookIds,[]);
 assert.equal(modern.find(e=>e.title==='经方实验录').authors,'姜佐景');
 const added=pack.books.slice(10);assert.equal(added.reduce((n,b)=>n+(b.unresolvedIllustrationCount||0),0),256);
 for(const book of added){assert.equal(book.chapters.reduce((n,c)=>n+(c.content.match(/〔原书插图位置：/g)||[]).length,0),book.unresolvedIllustrationCount);if(book.unresolvedIllustrationCount)assert.ok(book.name.includes('不含原图'));}
 const cao=added.filter(b=>b.id.startsWith('cao-'));for(const book of cao)assert.ok(!book.chapters.some(c=>['秦伯未序','再版前言','章次公序'].includes(c.title)));
 assert.equal(added.find(b=>b.id==='tang-shanghan-buzheng-original').chapters[0].title,'傷寒論淺註補正序');
 assert.ok(added.find(b=>b.id==='fu-qingzhu-nvke-original').chapters[0].content.includes('陽曲傅山青主手著'));
 assert.equal(isCompatibleTcmEditionPack(pack,pack.books.slice(0,10)),true);
});
