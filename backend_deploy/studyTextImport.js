'use strict';
const {TextDecoder}=require('node:util');
const crypto=require('node:crypto');
const MAX_BYTES=1024*1024,MAX_CHARACTERS=200000;
const invalid=message=>Object.assign(new Error(message),{status:400});
/** Decode before storing/starting a parse job. Never silently replace bytes or
 * truncate a book. The original bytes remain separate from the decoded text. */
function decodeStudyText(input){
 const bytes=Buffer.from(input);
 if(!bytes.length||bytes.length>MAX_BYTES)throw invalid('文字文件需为1字节至1MiB；超出时请分卷上传，未截断保存');
 let encoding,text;
 if(bytes[0]===0xff&&bytes[1]===0xfe)encoding='utf-16le';
 else if(bytes[0]===0xfe&&bytes[1]===0xff)encoding='utf-16be';
 else encoding='utf-8';
 try{text=new TextDecoder(encoding,{fatal:true}).decode(bytes);}
 catch{
  if(encoding!=='utf-8')throw invalid('文件编码不完整，请重新另存为UTF-8后上传');
  encoding='gb18030';
  try{text=new TextDecoder(encoding,{fatal:true}).decode(bytes);}catch{throw invalid('无法无损识别UTF-8、GBK/GB18030或带BOM的UTF-16，请另存为UTF-8后上传');}
 }
 if(!text.trim()||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\ufffd]/u.test(text))throw invalid('文件为空、含二进制或无法确认的文字，未保存和解析');
 // Both the historical parser and database limit use JS code units. Reject
 // beyond that boundary instead of chopping a surrogate pair/the final chapter.
 if(text.length>MAX_CHARACTERS)throw invalid('每份文字最多20万字符，请按卷分开上传，未截去后文');
 return {text,encoding,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}
function decodeStudyBase64(value){
 if(typeof value!=='string')throw invalid('文件数据格式无效');
 const raw=value.replace(/^data:[^,]*;base64,/, '');
 if(!raw.length||raw.length>Math.ceil(MAX_BYTES/3)*4||raw.length%4!==0||!(/^[A-Za-z0-9+/]*={0,2}$/).test(raw))throw invalid('文件数据不完整或超过1MiB，未保存和解析');
 const bytes=Buffer.from(raw,'base64');
 if(bytes.toString('base64')!==raw)throw invalid('文件数据校验失败，未保存和解析');
 return {...decodeStudyText(bytes),original:bytes};
}
module.exports={decodeStudyText,decodeStudyBase64,MAX_CHARACTERS};
