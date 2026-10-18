import {test} from "node:test";
import assert from "node:assert/strict";
import {learningTermDates,learningReminderEvents,saveLearningReminderPreferences,DEFAULT_LEARNING_REMINDERS} from "../src/lib/calendarLearning";
test("cultural dates are 24 distinct local solar-term days and six opt-in learning steps, without birth data",()=>{
 for(const zone of ["Asia/Shanghai","America/Los_Angeles","Pacific/Auckland"]){const terms=learningTermDates(2026,zone);assert.equal(terms.length,24);assert.equal(new Set(terms.map(t=>t.name)).size,24);assert.ok(terms.every(t=>t.date.startsWith('2026-')));}
 const data=new Map<string,string>();Object.defineProperty(globalThis,"localStorage",{value:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)},configurable:true});Object.defineProperty(globalThis,"window",{value:new EventTarget(),configurable:true});
 try{
  const start=Date.UTC(2026,0,1);assert.equal(learningReminderEvents('guest',start).length,0);
  assert.equal(saveLearningReminderPreferences('alice',{...DEFAULT_LEARNING_REMINDERS,yunqi:true}),true);
  const steps=learningReminderEvents('alice',start);assert.equal(steps.length,6);assert.ok(steps.every(e=>e.title.includes('原典学习')&&e.reminders[0].offsetMinutes===0));
  assert.equal(learningReminderEvents('bob',start).length,0);
  saveLearningReminderPreferences('alice',{...DEFAULT_LEARNING_REMINDERS,terms:true});assert.equal(learningReminderEvents('alice',start).length,24);
  saveLearningReminderPreferences('alice',DEFAULT_LEARNING_REMINDERS);assert.equal(learningReminderEvents('alice',start).length,0);
 }finally{Reflect.deleteProperty(globalThis,'localStorage');Reflect.deleteProperty(globalThis,'window');}
});
