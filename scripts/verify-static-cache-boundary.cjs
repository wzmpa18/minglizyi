// This product exports files for Nginx and Capacitor, not a Next.js server.
// deploymentId introduces a server version-skew handshake which these static
// hosts do not implement. A visual SSR home page alone cannot prove navigation.
const fs=require('node:fs'),assert=require('node:assert/strict');
for(const p of ['index.html','zhongyi/meridian/index.html','zhongyi/anatomy3d/index.html']){
 const html=fs.readFileSync('out/'+p,'utf8');
 assert.ok(html.includes('<script'),'Expected exported client scripts');
 assert.ok(!/\b(?:src|href)="[^"]*[?&]dpl=/.test(html),'Static export must not depend on Next.js deployment handshake: '+p);
}
console.log('PASS: static web/native exports do not require a Next.js deployment handshake; real device navigation still required.');
