const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto"),http=require("node:http");
const express=require("express"),Database=require("better-sqlite3"),jwt=require("jsonwebtoken");
test("orthopaedic previews are truncated server-side; list,point,trace and material endpoints enforce payment",async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"zhenggu-http-"));const previous={...process.env};process.env.JWT_SECRET=crypto.randomBytes(32).toString("hex");process.env.ACADEMY_DB_PATH=path.join(root,"academy.db");process.env.DB_PATH=path.join(root,"accounts.db");process.env.PRICING_DATA_DIR=root;delete process.env.ACADEMY_ADMIN_IDS;
 const accounts=new Database(process.env.DB_PATH);accounts.exec("CREATE TABLE user_entitlements(user_id INTEGER,entitlement_key TEXT,expire_at TEXT)");accounts.prepare("INSERT INTO user_entitlements VALUES (2,'zhongyi_zhenggu',NULL)").run();accounts.close();
 const academy=require("../backend_deploy/academyRoutes"),db=academy.getDb(),secret="不可向未付费用户返回的完整后文";
 db.prepare("INSERT INTO materials(id,title,track,category,status,text_content,visibility) VALUES (1,'fixture','zhongyi','中华非遗正骨','approved',?,'PUBLIC')").run("公开开头".repeat(40)+secret);
 db.prepare("INSERT INTO knowledge_points(id,material_id,title,content,status,category,track) VALUES (1,1,'fixture',?,'approved','中华非遗正骨','zhongyi')").run("可见开头".repeat(40)+secret);
 db.prepare("INSERT INTO knowledge_points(id,material_id,title,content,status,category,track) VALUES (2,1,'pending',?,'pending','中华非遗正骨','zhongyi')").run(secret);
 const app=express();app.use('/api/academy',academy.createRouter());const server=http.createServer(app);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/api/academy`;
 const get=(p,id)=>fetch(base+p,{headers:id?{Authorization:'Bearer '+jwt.sign({userId:String(id)},process.env.JWT_SECRET)}:{}});
 try{
  let r=await get('/zhenggu/preview');assert.equal(r.status,200);let d=await r.json();assert.equal(d.points.length,1);assert.equal(d.exportAllowed,false);assert.ok(Array.from(d.points[0].excerpt).length<=48);assert.ok(!JSON.stringify(d).includes(secret));assert.deepEqual(Object.keys(d.points[0]).sort(),['chapter','excerpt','id','locked','title']);
  for(const p of ['/knowledge/1','knowledge/1/trace','/materials/1']){r=await get(p.startsWith('/')?p:'/'+p,1);assert.equal(r.status,402);assert.ok(!(await r.text()).includes(secret));}
  for(const p of ['/knowledge?track=zhongyi','/materials?track=zhongyi','/questions?track=zhongyi']){r=await get(p,1);assert.equal(r.status,200);assert.ok(!(await r.text()).includes(secret));}
  r=await get('/knowledge/1',2);assert.equal(r.status,200);assert.ok((await r.text()).includes(secret));
  r=await get('/knowledge/2',2);assert.equal(r.status,403);
  fs.writeFileSync(path.join(root,'tool-matrix.json'),JSON.stringify({tools:{zhongyi_zhenggu:{status:'OFF'}}}));r=await get('/zhenggu/preview');assert.equal(r.status,403);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));db.close();for(const k of ['JWT_SECRET','ACADEMY_DB_PATH','DB_PATH','PRICING_DATA_DIR','ACADEMY_ADMIN_IDS']){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}fs.rmSync(root,{recursive:true,force:true});}
});
