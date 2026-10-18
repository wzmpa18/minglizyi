"use strict";
function knowledgePreview(row){
 const content=String(row.content||"").replace(/<[^>]*>/g,"").trim();const chars=Array.from(content),size=Math.max(0,Math.min(48,Math.floor(chars.length/5)));
 return {id:String(row.id),title:String(row.title||"").slice(0,160),chapter:String(row.chapter||"").slice(0,120),excerpt:chars.slice(0,size).join(""),locked:true};
}
module.exports={knowledgePreview};
