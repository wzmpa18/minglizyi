import test from 'node:test';
import assert from 'node:assert/strict';
import {LEGACY_CONSULT_CLIENT_DISABLED,applyConsultProvider,auditConsultProvider,setProviderFrozen,publishConsultService,setConsultServiceStatus,createConsultOrder,acceptConsultOrder,deliverConsultOrder,confirmConsultOrder,startAfterSale,arbitrateAfterSale,settleDueConsultOrders,checkDeliveryTimeouts,runConsultMaintenance} from '../src/lib/consultServiceStore';
test('old browser prototype cannot mint approvals, paid orders, refunds or wallet funds, even with forged local rows',()=>{
 assert.equal(LEGACY_CONSULT_CLIENT_DISABLED,true);const writes:string[]=[];const target=globalThis as unknown as {window:unknown;localStorage:unknown};const oldWindow=target.window,oldStorage=target.localStorage;
 target.window={};target.localStorage={getItem:()=>JSON.stringify([{status:'confirmed',settleDueAt:'2000-01-01',settleAmount:999999,providerId:'forged'}]),setItem:(key:string)=>writes.push(key),removeItem:(key:string)=>writes.push(key)};
 try{
  for(const fn of [applyConsultProvider,auditConsultProvider,setProviderFrozen,publishConsultService,setConsultServiceStatus,createConsultOrder,acceptConsultOrder,deliverConsultOrder,confirmConsultOrder,startAfterSale,arbitrateAfterSale])assert.equal((fn as (...args:unknown[])=>{success:boolean})(null,true,'forged').success,false);
  assert.equal(settleDueConsultOrders(),0);assert.equal(checkDeliveryTimeouts(),0);runConsultMaintenance();assert.deepEqual(writes,[]);
 }finally{target.window=oldWindow;target.localStorage=oldStorage;}
});
