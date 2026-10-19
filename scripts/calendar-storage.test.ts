import {test} from "node:test";
import assert from "node:assert/strict";
import {calendarStorageOwner,createEvent,listEvents,updateEvent,claimUnassignedCalendar,hasUnassignedCalendar,getUpcomingEvents,getOccurrenceReminders,completeNextEventOccurrence,undoEventCompletion,snoozeNextEventOccurrence,deleteEvent} from "../src/lib/calendarEventsStore";
class MemoryStorage{
 data=new Map<string,string>();fail=false;
 getItem(key:string){return this.data.get(key)??null;}
 setItem(key:string,value:string){if(this.fail)throw new Error("quota");this.data.set(key,String(value));}
 removeItem(key:string){this.data.delete(key);}
 clear(){this.data.clear();}
}
test("calendar ownership, explicit migration, lunar month/day and completion/snooze remain private and durable",()=>{
 const storage=new MemoryStorage(),session=new MemoryStorage();
 Object.defineProperty(globalThis,"window",{value:new EventTarget(),configurable:true});
 Object.defineProperty(globalThis,"localStorage",{value:storage,configurable:true});
 Object.defineProperty(globalThis,"sessionStorage",{value:session,configurable:true});
 const login=(id:string)=>{storage.setItem("yandao_user_token","isolated-test-token");storage.setItem("yandao_user_profile",JSON.stringify({userId:id}));};
 const now=Date.UTC(2026,9,19,0),originalNow=Date.now;Date.now=()=>now;
 try{
  storage.setItem("yandao_user_id","fixture-device");
  assert.equal(calendarStorageOwner(),"guest:fixture-device");
  const guest=createEvent({type:"birthday",title:"本人农历生日",year:2000,month:1,day:1,dateMode:"lunar",lunarMonth:-2,lunarDay:1,birthYearKnown:false,repeat:"yearly",eventTime:"09:00",timeZone:"Asia/Shanghai",reminders:[]});
  assert.equal(guest.success,true);assert.equal(guest.event!.birthYearKnown,false);
  assert.equal(updateEvent(guest.event!.id,{title:"修改标题"}).success,true);assert.equal(listEvents()[0].lunarMonth,-2);
  login("alice");assert.equal(calendarStorageOwner(),"account:alice");assert.equal(listEvents().length,0);assert.equal(hasUnassignedCalendar(),true);
  assert.equal(claimUnassignedCalendar(false).success,false);assert.equal(listEvents().length,0);
  assert.equal(claimUnassignedCalendar(true).success,true);assert.equal(listEvents().length,1);assert.equal(listEvents()[0].lunarMonth,-2);assert.equal(hasUnassignedCalendar(),false);
  login("bob");assert.equal(listEvents().length,0);assert.equal(hasUnassignedCalendar(),false);
  login("alice");assert.equal(listEvents().length,1);
  const weekly=createEvent({type:"todo",title:"复习",year:2026,month:10,day:19,dateMode:"solar",repeat:"weekly",eventTime:"09:00",timeZone:"Asia/Shanghai",reminders:[{offsetMinutes:60}]}).event!;
  let next=getUpcomingEvents(14).find(o=>o.event.id===weekly.id)!;
  assert.equal(getOccurrenceReminders(next)[0].at,Date.UTC(2026,9,19,0));
  assert.equal(snoozeNextEventOccurrence(weekly.id,15).success,true);next=getUpcomingEvents(14).find(o=>o.event.id===weekly.id)!;
  assert.equal(getOccurrenceReminders(next)[0].at,now+15*60000);assert.equal(getOccurrenceReminders(next)[0].snoozed,true);
  assert.equal(completeNextEventOccurrence(weekly.id).success,true);assert.equal(getUpcomingEvents(14).find(o=>o.event.id===weekly.id)!.d,26);
  assert.equal(undoEventCompletion(weekly.id).success,true);assert.equal(getUpcomingEvents(14).find(o=>o.event.id===weekly.id)!.d,19);
  const sourceRule=createEvent({type:"todo",title:"有一项私人安排",year:2026,month:11,day:1,dateMode:"solar",sourceRef:"life:private-vault:private-entry",sourceRuleId:"original-reminder-id",reminders:[]});assert.equal(sourceRule.success,true);assert.equal(createEvent({type:"todo",title:"不重复恢复",year:2026,month:11,day:1,dateMode:"solar",sourceRef:"life:restored-vault:private-entry",sourceRuleId:"original-reminder-id",reminders:[]}).success,false);assert.equal(updateEvent(sourceRule.event!.id,{title:"仍是同一安排"}).success,true);
  storage.fail=true;assert.equal(updateEvent(weekly.id,{title:"不能假装保存成功"}).success,false);assert.equal(deleteEvent(weekly.id),false);storage.fail=false;
  assert.equal(listEvents().find(e=>e.id===weekly.id)!.title,"复习");assert.equal(deleteEvent(weekly.id),true);
  login("bob");assert.equal(listEvents().length,0);
 }finally{Date.now=originalNow;for(const key of ["window","localStorage","sessionStorage"])Reflect.deleteProperty(globalThis,key);}
});
