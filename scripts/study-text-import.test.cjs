const {test}=require('node:test'),assert=require('node:assert/strict');
const {decodeStudyText,decodeStudyBase64}=require('../backend_deploy/studyTextImport');
test('complete UTF-8/GBK/GB18030/UTF-16 text survives file decoding, including final chapter',()=>{
 const utf='阴符经\n末卷：原件与编码逐字核对。𠀀';
 assert.equal(decodeStudyText(Buffer.from(utf)).text,utf);
 const gbk=Buffer.from('d6d0cec4b9c5bcaec4a9beed','hex');
 assert.equal(decodeStudyText(gbk).text,'中文古籍末卷');
 assert.equal(decodeStudyText(gbk).encoding,'gb18030');
 const b64=decodeStudyBase64('data:text/plain;base64,'+gbk.toString('base64'));
 assert.equal(b64.original.compare(gbk),0);assert.equal(b64.text,'中文古籍末卷');
 assert.equal(decodeStudyText(Buffer.concat([Buffer.from([255,254]),Buffer.from(utf,'utf16le')])).text,utf);
 const be=Buffer.from(utf,'utf16le').swap16();assert.equal(decodeStudyText(Buffer.concat([Buffer.from([254,255]),be])).text,utf);
});
test('invalid, binary, too long or malformed file imports fail before truncation/storage',()=>{
 for(const bytes of [Buffer.from([0x81]),Buffer.from('abc\x00def'),Buffer.from('x'.repeat(200001)),Buffer.alloc(1024*1024+1,65)])assert.throws(()=>decodeStudyText(bytes),e=>e.status===400);
 for(const b64 of ['@@@=','YQ','YR==','AA=='])assert.throws(()=>decodeStudyBase64(b64));
 assert.equal(decodeStudyText(Buffer.from('x'.repeat(199999)+'末')).text.at(-1),'末');
});
