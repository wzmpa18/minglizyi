const test=require('node:test'),assert=require('node:assert/strict');
const {validateOfflineDownloadLink}=require('../src/lib/offlineDownloadLink.ts');
const pack={packId:'book',version:'1.0.0',sha256:'a'.repeat(64),size:123,downloadUrl:'/api/offline/packs/book/download'};
const response={success:true,deliveryProvider:'COS',version:pack.version,sha256:pack.sha256,size:pack.size,downloadUrl:'https://fixture-123.cos.ap-beijing.myqcloud.com/learning-content/offline-packs/book/1.0.0.pack?temporary=fixture'};
test('COS direct links retain file identity and explicitly exclude application authentication',()=>{
  const link=validateOfflineDownloadLink(response,pack);assert.equal(link.url,response.downloadUrl);assert.equal(link.applicationAuth,false);
  const local=validateOfflineDownloadLink({...response,deliveryProvider:'LOCAL',downloadUrl:pack.downloadUrl},pack);assert.deepEqual(local,{url:pack.downloadUrl,applicationAuth:true});
});
test('stale or tampered identity never enables a differently versioned content pack',()=>{
  for(const change of [{sha256:'b'.repeat(64)},{size:124},{version:'2.0.0'},{success:false}])assert.throws(()=>validateOfflineDownloadLink({...response,...change},pack));
});
test('arbitrary hosts, credential-bearing links, private partitions and other app endpoints are rejected',()=>{
  for(const downloadUrl of ['https://evil.example/book','http://fixture-123.cos.ap-beijing.myqcloud.com/learning-content/offline-packs/book','https://user:password@fixture-123.cos.ap-beijing.myqcloud.com/learning-content/offline-packs/book','https://fixture-123.cos.ap-beijing.myqcloud.com/user-content/private'])assert.throws(()=>validateOfflineDownloadLink({...response,downloadUrl},pack));
  assert.throws(()=>validateOfflineDownloadLink({...response,deliveryProvider:'LOCAL',downloadUrl:'/api/admin/anything'},pack));
});
