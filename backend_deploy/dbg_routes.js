'use strict';
const fs = require('fs');
const files = process.argv.slice(2);
for (const f of files) {
  try {
    const src = fs.readFileSync(f, 'utf-8');
    const lines = src.split('\n').map(l => l.trim()).filter(l => /^router\.(get|post|put|delete|patch)\(/.test(l));
    console.log('### ' + f + '  (' + lines.length + ' routes)');
    for (const l of lines) {
      const m = l.match(/^router\.(get|post|put|delete|patch)\(\s*['"`]([^'"`]+)['"`]/);
      if (m) console.log('  ' + m[1].toUpperCase().padEnd(7) + ' ' + m[2]);
    }
  } catch (e) {
    console.log('### ' + f + ' ERROR: ' + e.message);
  }
}
