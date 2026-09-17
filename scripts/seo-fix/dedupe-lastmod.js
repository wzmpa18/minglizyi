// 一次性修复 public/sitemap.xml 中重复的连续 lastmod 标签
const fs = require('fs');
const p = require('path').join(__dirname, '..', '..', 'public', 'sitemap.xml');
let s = fs.readFileSync(p, 'utf8');
const before = (s.match(/<lastmod>/g) || []).length;
s = s.replace(/(<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>)(?:<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>)+/g, '$1');
const after = (s.match(/<lastmod>/g) || []).length;
fs.writeFileSync(p, s, 'utf8');
console.log('lastmod tags before:', before, ' after:', after);
console.log('remaining dup:', /<lastmod>[^<]*<\/lastmod><lastmod>/.test(s));
console.log('total locs:', (s.match(/<loc>/g) || []).length);
