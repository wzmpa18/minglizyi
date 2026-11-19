'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {localFlags,capability}=require('../backend_deploy/studyCommentSafety');

test('local filter covers mainland-sensitive, porn, gambling, drugs, fraud and violence',()=>{
 const cases=[
  ['鼓吹台独','POLITY'],
  ['宣扬恐怖主义','VIOLENCE'],
  ['发送色情成人视频','SEXUAL'],
  ['组织赌博博彩','GAMBLING'],
  ['出售冰毒','DRUGS'],
  ['诈骗洗钱','FRAUD'],
  ['加我微信做代理','AD_CONTACT'],
  ['加 V-X：abc12345','AD_CONTACT'],
  ['保证治愈并自行针刺','DANGEROUS_MEDICAL'],
 ];
 for(const [text,flag] of cases)assert.ok(localFlags(text).includes(flag),text);
 assert.deepEqual(localFlags('一起核对黄帝内经原文'),[]);
});

test('capability is local-only and needs no external credentials',()=>{
 const cap=capability({});
 assert.equal(cap.provider,'platform-local');
 assert.equal(cap.configured,true);
 assert.equal(cap.automatic,true);
 assert.equal(cap.manualReviewRequired,false);
});
