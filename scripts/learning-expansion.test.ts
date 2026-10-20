import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {STARTER_LESSONS,parseStarterProgress} from "../src/data/studyStarter";
import surfaces from "../public/assets/astronomy/surfaces/manifest.json";

test("expanded curriculum preserves old IDs and progress and has answerable explanations and real module routes",()=>{
 assert.equal(STARTER_LESSONS.length,16);
 assert.deepEqual(STARTER_LESSONS.slice(0,4).map(x=>x.id),["classics","herb-reading","meridian-reading","review-method"]);
 const old=parseStarterProgress(JSON.stringify({version:1,lessonId:"herb-reading",read:["classics"],answers:{"classics-1":1}}));
 assert.equal(old.lessonId,"herb-reading");assert.deepEqual(old.read,["classics"]);assert.equal(old.answers["classics-1"],1);
 const questions=STARTER_LESSONS.flatMap(x=>x.questions);assert.equal(questions.length,44);assert.equal(new Set(questions.map(x=>x.id)).size,44);
 for(const lesson of STARTER_LESSONS){assert.ok(lesson.paragraphs.length>=3);assert.ok(lesson.source.length>20);const page=path.join(process.cwd(),"src/app",lesson.href.replace(/^\//,""),"page.tsx");assert.ok(fs.existsSync(page),lesson.href);for(const question of lesson.questions){assert.ok(question.answer>=0&&question.answer<question.options.length);assert.ok(question.explanation.length>=12);}}
});
test("planet image provenance is explicit and lower-resolution sources are not advertised as 8K",()=>{
 assert.deepEqual(surfaces.bodies.map(x=>x.id),["moon","earth","mars","jupiter"]);
 for(const body of surfaces.bodies){assert.ok(body.credit&&body.license&&body.sourceUrl&&body.note);assert.ok(body.sourceSha256.length===64);for(const image of body.maps){assert.ok(image.width<=body.sourceDimensions[0]);assert.equal(image.height,image.width/2);const data=fs.readFileSync(path.join(process.cwd(),"public",image.url));assert.equal(data.length,image.bytes);assert.equal(crypto.createHash("sha256").update(data).digest("hex"),image.sha256);}}
 assert.equal(Math.max(...surfaces.bodies.find(x=>x.id==="jupiter")!.maps.map(x=>x.width)),4096);
 const viewer=fs.readFileSync("src/components/PlanetSurfaceExplorer.tsx","utf8");assert.ok(viewer.includes("if(!enabled||!mount.current)return"));assert.ok(viewer.includes("renderer.capabilities.maxTextureSize"));assert.ok(viewer.includes("renderer.forceContextLoss()"));assert.ok(viewer.includes("AbortController"));assert.ok(!viewer.includes("requestAnimationFrame("));
});
