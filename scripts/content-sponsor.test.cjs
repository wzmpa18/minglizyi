const { test } = require('node:test');
const assert = require('node:assert/strict');
const { safeUrl, validateSponsor } = require('../backend_deploy/contentSponsorPolicy');
test('sponsor placement permits static owned images and deliberate safe links', () => {
  assert.equal(safeUrl('https://yandaoguoxue.yandao.vip/assets/study.png',true),true);
  for(const value of ['/books/?book=huangdi_yinfujing','/zhongyi/classic/','https://example.org/study'])assert.equal(safeUrl(value),true);
  assert.doesNotThrow(()=>validateSponsor({adEnabled:true,adTitle:'古籍阅读课程',adImageUrl:'',adLinkUrl:'/books/'}));
  assert.doesNotThrow(()=>validateSponsor({adEnabled:false,adTitle:'',adImageUrl:'',adLinkUrl:''}));
});
test('sponsor configuration rejects executable, credential, internal and third-party image inputs', () => {
  for(const value of ['javascript:alert(1)','data:image/png;base64,x','//example.org/x','http://example.org/','https://user:secret@example.org/','https://127.0.0.1/','https://localhost/','https://example.internal/','/api/auth/profile','/books/\\evil'])assert.equal(safeUrl(value),false,value);
  assert.equal(safeUrl('https://third-party.example/ad.png',true),false);
  assert.throws(()=>validateSponsor({adEnabled:true,adTitle:'',adImageUrl:'',adLinkUrl:''}));
  assert.throws(()=>validateSponsor({adEnabled:true,adTitle:'<script>',adImageUrl:'',adLinkUrl:''}));
});
