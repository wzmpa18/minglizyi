const { astro } = require('iztro');

const a = astro.bySolar('1990-6-15', 0, '男', true, 'zh-CN');

// Check star types in minorStars for all palaces
const typeSet = new Set();
const starTypeMap = {};
for (const p of a.palaces) {
  for (const s of p.minorStars) {
    typeSet.add(s.type);
    if (!starTypeMap[s.type]) starTypeMap[s.type] = [];
    if (!starTypeMap[s.type].includes(s.name)) starTypeMap[s.type].push(s.name);
  }
  for (const s of p.adjectiveStars) {
    typeSet.add(s.type);
    if (!starTypeMap[s.type]) starTypeMap[s.type] = [];
    if (!starTypeMap[s.type].includes(s.name)) starTypeMap[s.type].push(s.name);
  }
}

console.log('Star types found:', [...typeSet]);
for (const [type, stars] of Object.entries(starTypeMap)) {
  console.log(`  ${type}: ${stars.join(', ')}`);
}

// Check specific: what type is 禄存 and 天马?
for (const p of a.palaces) {
  for (const s of p.minorStars) {
    if (s.name === '禄存' || s.name === '天马') {
      console.log(`\n${s.name} in ${p.name}: type=${s.type}, brightness=${s.brightness}, mutagen=${s.mutagen}`);
    }
  }
}
