import {test} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {translateControlChildren} from "../src/components/InterfaceControls";
import {interfaceText,INTERFACE_LOCALES} from "../src/lib/interfaceLocale";
test("UI translation preserves explicitly protected nicknames, search words and source data",()=>{
 const dictionary:Record<string,string>={"医生":"Clinician","发给":"To "};const ui=(s:string)=>dictionary[s]||s;
 const children=["发给",React.createElement('strong',{key:'name'},React.createElement('span',{translate:'no'},'医生')),React.createElement('span',{key:'label'},'医生')];
 const html=renderToStaticMarkup(React.createElement('button',null,translateControlChildren(children,ui)));assert.ok(html.includes('To '));assert.ok(html.includes('translate="no">医生'));assert.ok(html.includes('<span>Clinician</span>'));
});
test('navigation uses selected language while quoted book passages and unknown user text stay original',()=>{
 for(const locale of INTERFACE_LOCALES){
  const ui=(s:string)=>interfaceText(s,locale);
  const book='黄帝问曰：愿闻九针之解，虚实之道。';
  const html=renderToStaticMarkup(React.createElement('button',null,translateControlChildren([
   React.createElement('span',{key:'nav'},'用户反馈'),
   React.createElement('strong',{key:'quote',translate:'no'},book),
   React.createElement('span',{key:'user',translate:'no'},'我的好友'),
  ],ui)));
  assert.ok(html.includes(book));assert.ok(html.includes('translate="no">我的好友'));
  assert.ok(html.includes(ui('用户反馈')));
 }
 assert.equal(interfaceText('清理中...','en'),'Clearing…');
 assert.equal(interfaceText('打开本来源完整章节','ja'),'出典の章全体を開く');
 assert.equal(interfaceText('原始古籍未知段落','en'),'原始古籍未知段落');
});
