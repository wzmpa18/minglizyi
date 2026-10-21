'use strict';
const fs=require('fs'),path=require('path'),{stripTypeScriptTypes}=require('node:module');
const {validateStudyCatalog}=require('../backend_deploy/studyContentPolicy');
function starterModule(){
 // Build-time evaluation of trusted repository data, never server-supplied code.
 const expansion=stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,'../src/data/studyExpansion.ts'),'utf8')).replace(/^export /gm,'');
 const expanded=Function(expansion+';return EXPANDED_LESSONS')();
 const starter=stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,'../src/data/studyStarter.ts'),'utf8')).replace(/import \{ EXPANDED_LESSONS \} from "\.\/studyExpansion";/,'').replace(/^export /gm,'');
 return Function('EXPANDED_LESSONS',starter+';return {STARTER_LESSONS,parseStarterProgress,mergeStarterProgress,starterQuestionVersion,starterLessonVersion}')(expanded);
}
function bundledLessons(){return starterModule().STARTER_LESSONS;}
if(require.main===module){
 if(!process.argv.includes('--write'))throw Error('Use --write only after reviewing the original course source');
 const file=path.join(__dirname,'../backend_deploy/data/study-starter-public.json');if(fs.existsSync(file))throw Error('Existing catalog must be revised and published through the reviewed content workflow');
 const practice=JSON.parse(fs.readFileSync(path.join(__dirname,'../src/data/studyPractice.json'),'utf8'));
 const catalog={schemaVersion:1,readerVersion:1,revision:1,publishedAt:new Date().toISOString(),releaseNotes:'新增八字、紫微、卦爻、七政及中医原典实践课；支持课程资料远程更新与离线复习。',lessons:[...bundledLessons(),...practice]};
 const result=validateStudyCatalog(catalog);if(!result.ok)throw Error(result.errors.join('; '));
 fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');console.log(`Reviewed catalog: ${catalog.lessons.length} lessons, ${catalog.lessons.flatMap(l=>l.questions).length} questions`);
}
module.exports={bundledLessons,starterModule};
