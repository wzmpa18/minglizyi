const { astro } = require('iztro');

// Check what properties mark soul/body palace
const a = astro.bySolar('1990-6-15', 0, '男', true, 'zh-CN');
console.log('Sample palace [4] (午宫) keys:', Object.keys(a.palaces[4]));
console.log('Palace [4]:', JSON.stringify(a.palaces[4], null, 2).substring(0, 1000));
