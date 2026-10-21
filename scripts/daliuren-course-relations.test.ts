import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateDaLiuRen} from '../src/algorithm-core/modules/daliuren';

test('2026-10-21 displayed first course stem is counted: 寅克戊 is direct克, not遥克',()=>{
 const r=calculateDaLiuRen(2026,10,21,14,0,true,1980,undefined,0,0,0);
 assert.equal(r.dayGan+r.dayZhi,'戊辰');
 assert.equal(r.siKe[0].shangShen,'寅');assert.equal(r.siKe[0].xiaShen,'戊');
 assert.deepEqual(r.sanChuan.map(x=>x.zhi),['寅','亥','申']);
 assert.equal(r.sanChuanMethod,'贼克');assert.equal(r.keTi,'元首课');
});
