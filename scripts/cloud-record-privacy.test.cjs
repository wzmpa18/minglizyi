const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {cloudRecordData,mergeCloudRecords}=require('../src/lib/cloudRecordPrivacy.ts');
test('compass GPS is stripped from cloud data without changing the original local reading or other tools',()=>{
 const local={location:{name:'private fixture',lat:12.12345,lon:34.56789},heading:123,details:[{latitude:12,longitude:34,label:'reading'}]};
 const result=cloudRecordData('compass',local);assert.deepEqual(result,{heading:123,details:[{label:'reading'}]});assert.equal(local.location.lat,12.12345);assert.equal(cloudRecordData('bazi',local),local);
});
test('cloud refresh and changed server record IDs retain local compass coordinates and unsynced readings',()=>{
 const a={id:'local',type:'compass',data:{measuredAt:'2026-10-20T09:30:00Z',location:{lat:12,lon:34},heading:15}};
 const remote={id:'server',type:'compass',data:{measuredAt:'2026-10-20T09:30:00Z',heading:15}};
 const merged=mergeCloudRecords([a],[remote]);assert.equal(merged.length,1);assert.equal(merged[0].id,'server');assert.deepEqual(merged[0].data,a.data);assert.deepEqual(mergeCloudRecords([a],[]),[a]);
 assert.deepEqual(cloudRecordData(merged[0].type,merged[0].data),remote.data);
});
test('both ordinary saves/offline replay and legacy bulk migration use the privacy boundary',()=>{
 const sync=fs.readFileSync('src/lib/recordSync.ts','utf8'),store=fs.readFileSync('src/lib/clientStore.ts','utf8');
 assert.match(sync,/record_data: cloudRecordData\(recordType, recordData\)/);assert.match(store,/records: localRecords\.map\(record => \(\{ \.\.\.record, data: cloudRecordData\(record.type, record.data\)/);
});
