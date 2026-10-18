const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),http=require('node:http'),Module=require('node:module');
const express=require('express'),jwt=require('jsonwebtoken');
test('resolved COS download links preserve the real router public/member gates and legacy redirect',async()=>{
  const originalSecret=process.env.JWT_SECRET;process.env.JWT_SECRET=crypto.randomBytes(32).toString('hex');
  const route=require.resolve('../backend_deploy/offlinePackRoutes'),originalLoad=Module._load;
  const pack=id=>({ok:true,deliveryProvider:'COS',objectKey:`offline-packs/${id}/1.0.0.pack`,size:123,sha256:'a'.repeat(64),row:{version:'1.0.0',access_level:id==='public-book'?'PUBLIC':'MEMBER'}});
  const sourceUrl='https://fixture-123.cos.ap-beijing.myqcloud.com/learning-content/offline-packs/book/1.0.0.pack?temporary=fixture';
  Module._load=function(name,parent,...rest){
    if(parent?.filename===route){
      if(name==='./offlinePackEngine')return {getPackFile:id=>['public-book','member-book'].includes(id)?pack(id):{ok:false,error:'not found'}};
      if(name==='./objectStorageEngine')return {ObjectStorageService:{temporaryDownloadUrl:async()=>({ok:true,url:sourceUrl})}};
      if(name==='./adminRoles')return {adminAuth:()=>((req,res,next)=>next()),audit:()=>{}};
      if(name==='./middleware/auth')return {getMembershipFromDB:id=>({level:id==='member'?'monthly':'free'}),MEMBER_LEVELS:{free:0,monthly:1}};
    }
    return originalLoad.call(this,name,parent,...rest);
  };
  let router;
  try{delete require.cache[route];router=require(route)();}finally{Module._load=originalLoad;}
  const app=express();app.use('/api/offline',router);const server=http.createServer(app);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
  const request=(id,headers={},query='?resolve=1')=>fetch(`${origin}/api/offline/packs/${id}/download${query}`,{headers,redirect:'manual'});
  try{
    let r=await request('public-book');assert.equal(r.status,200);let data=await r.json();assert.equal(data.downloadUrl,sourceUrl);assert.equal(data.sha256,pack('public-book').sha256);assert.equal(r.headers.get('cache-control'),'private, no-store');
    r=await request('member-book');assert.equal(r.status,401);assert.ok(!(await r.text()).includes('temporary'));
    r=await request('member-book',{Authorization:'Bearer '+jwt.sign({userId:'ordinary'},process.env.JWT_SECRET)});assert.equal(r.status,403);assert.ok(!(await r.text()).includes('temporary'));
    r=await request('member-book',{Authorization:'Bearer '+jwt.sign({userId:'member'},process.env.JWT_SECRET)});assert.equal(r.status,200);assert.equal((await r.json()).deliveryProvider,'COS');
    r=await request('unknown-book');assert.equal(r.status,404);
    r=await request('public-book',{},'');assert.equal(r.status,307);assert.equal(r.headers.get('location'),sourceUrl);
  }finally{
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));delete require.cache[route];
    if(originalSecret===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=originalSecret;
  }
});
