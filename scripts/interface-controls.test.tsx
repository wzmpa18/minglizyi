import {test} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {translateControlChildren} from "../src/components/InterfaceControls";
test("UI translation preserves explicitly protected nicknames, search words and source data",()=>{
 const dictionary:Record<string,string>={"医生":"Clinician","发给":"To "};const ui=(s:string)=>dictionary[s]||s;
 const children=["发给",React.createElement('strong',{key:'name'},React.createElement('span',{translate:'no'},'医生')),React.createElement('span',{key:'label'},'医生')];
 const html=renderToStaticMarkup(React.createElement('button',null,translateControlChildren(children,ui)));assert.ok(html.includes('To '));assert.ok(html.includes('translate="no">医生'));assert.ok(html.includes('<span>Clinician</span>'));
});
