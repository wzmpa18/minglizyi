const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const manifest=require('../public/assets/meridians/ANIMATION-MANIFEST.json'),db=require('../src/algorithm-core/modules/tcm/data/meridians.json');
test('all fourteen meridians retain real multiframe anatomy and skeletal flow images at full source resolution',()=>{
 assert.equal(manifest.records.length,28);assert.equal(new Set(manifest.records.map(r=>r.slug)).size,14);
 for(const r of manifest.records){const b=fs.readFileSync('public'+r.asset);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(b.length,r.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),r.sha256);let frames=0,w=0,h=0,durations=[];
  for(let offset=12;offset+8<=b.length;){const kind=b.toString('ascii',offset,offset+4),size=b.readUInt32LE(offset+4),start=offset+8;assert.ok(start+size<=b.length);if(kind==='VP8X'){w=b.readUIntLE(start+4,3)+1;h=b.readUIntLE(start+7,3)+1;}if(kind==='ANMF'){frames++;durations.push(b.readUIntLE(start+12,3));}offset=start+size+(size%2);}
  assert.equal(frames,r.frames);assert.ok(frames>1);assert.equal(w,r.width);assert.equal(h,r.height);assert.ok(w>=639);assert.deepEqual(durations,r.durationsMs);
 }
 const owner=manifest.records.filter(r=>r.sourceType==='owner-provided-original');assert.equal(owner.length,11);for(const r of owner){assert.equal(r.width,r.originalWidth);assert.equal(r.height,r.originalHeight);assert.equal(r.pixelLosslessVerified,true);assert.match(r.sourceSha256,/^[a-f0-9]{64}$/);}
 assert.equal(db.meridians.length,14);assert.equal(db.acupoints.length,361);
});
