import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {ZiweiResult} from '../src/algorithm-core';
import {ProfessionalZiweiBoard} from '../src/components/ProfessionalZiweiBoard';
const branches=['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];
const fixture={earthlyBranchOfSoulPalace:'寅',fiveElementsClass:'木三局',stars:[],palaces:branches.map((earthlyBranch,index)=>({index,name:`测试${index}宫`,heavenlyStem:'甲',earthlyBranch,majorStars:['紫微'],auspiciousStars:[],shaStars:[],otherStars:['破碎','孤辰','寡宿'],boshi:'博士',jiangqian:'将星',suiqian:'岁建'}))} as unknown as ZiweiResult;
function render(mode:'sanhe'|'feixing'|'sihua',focus=0){return renderToStaticMarkup(React.createElement(ProfessionalZiweiBoard,{result:fixture,mode,focus,onOpenBazi:()=>{},onSelect:()=>{},onDetails:()=>{},overlay:null,dynamicLabels:{0:[{abbr:'流羊',level:'year'}]}}));}
test('minor stars remain beside the main stars as vertical character columns in all three modes',()=>{
 for(const mode of ['sanhe','feixing','sihua'] as const){const html=render(mode);for(const name of ['破碎','孤辰','寡宿']){const column=html.match(new RegExp(`data-star="${name}"[^>]*>([\\s\\S]*?)</div>`));assert.ok(column,`${mode}: ${name} must not disappear`);assert.equal((column[1].match(/<span/g)||[]).length,2);assert.ok(column[0].includes('flex-col'));}assert.ok(html.includes('流羊'));}
});
test('each selected palace uses a closed triad plus one opposite-palace middle line',()=>{
 const points=[[25,75],[25,62.5],[25,37.5],[25,25],[37.5,25],[62.5,25],[75,25],[75,37.5],[75,62.5],[75,75],[62.5,75],[37.5,75]];
 for(let i=0;i<12;i++){const html=render('sanhe',i),path=html.match(/data-sanfang-focus="\d+" d="([^"]+)"/)?.[1];assert.ok(path);const vertices=[...path.matchAll(/[ML]([\d.]+),([\d.]+)/g)].map(m=>[+m[1],+m[2]]);assert.deepEqual(vertices,[points[i],points[(i+4)%12],points[(i+8)%12],points[i],points[(i+6)%12]]);assert.ok(path.includes(' Z M'));}
});
