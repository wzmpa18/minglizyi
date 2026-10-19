import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getGroups,getGroupMessages,saveGroupMessage,getGroupAccountId,getChatMessages,saveChatMessage,reconcileServerChatMessages} from '../src/lib/socialStore';
test('group caches use the authenticated account rather than the device visitor ID; unowned legacy data is preserved and never mounted',()=>{
 const before={window:globalThis.window,localStorage:globalThis.localStorage,sessionStorage:globalThis.sessionStorage};
 const values=new Map<string,string>(),storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)};
 Object.assign(globalThis,{window:{},localStorage:storage,sessionStorage:{getItem:()=>null}});
 try{
  values.set('yandao_user_id','same-device-visitor');values.set('yandao_groups_list',JSON.stringify([{id:'unknown-owner'}]));values.set('yandao_group_messages_12',JSON.stringify([{id:'old-sensitive-context'}]));
  const login=(id:string)=>{values.set('yandao_user_token','synthetic-test-token');values.set('yandao_user_profile',JSON.stringify({userId:id,nickname:'合成学友',memberLevel:'basic'}));};
  login('owner-1');assert.equal(getGroupAccountId(),'owner-1');assert.deepEqual(getGroups(),[]);assert.deepEqual(getGroupMessages('12'),[]);
  const item={id:'gsrv_12',senderId:'owner-1',senderName:'学友',content:'本账号的交流',type:'text' as const,timestamp:'2026-10-19',reviewStatus:'pending' as const};saveGroupMessage('12',item);assert.equal(getGroupMessages('12').length,1);
  saveGroupMessage('12',{...item,reviewStatus:'active'});assert.equal(getGroupMessages('12').length,1);assert.equal(getGroupMessages('12')[0].reviewStatus,'active');
  login('owner-2');assert.deepEqual(getGroupMessages('12'),[]);values.delete('yandao_user_token');assert.deepEqual(getGroupMessages('12'),[]);login('owner-1');assert.equal(getGroupMessages('12')[0].content,item.content);
  assert.ok(values.get('yandao_group_messages_12')?.includes('old-sensitive-context'));assert.ok(values.get('yandao_groups_list')?.includes('unknown-owner'));
  values.set('yandao_friends_chat_private_peer',JSON.stringify([{id:'legacy-private-owner-unknown'}]));
  assert.deepEqual(getChatMessages('private_peer'),[]);
  const pending={...item,id:'srv_42',reviewStatus:'pending' as const};saveChatMessage('private_peer',pending);
  const draft={...item,id:'unsent-draft',status:'failed' as const};saveChatMessage('private_peer',draft);
  reconcileServerChatMessages('private_peer',[{...pending,reviewStatus:'active'}]);
  assert.equal(getChatMessages('private_peer').filter(m=>m.id==='srv_42').length,1);assert.equal(getChatMessages('private_peer').find(m=>m.id==='srv_42')?.reviewStatus,'active');
  reconcileServerChatMessages('private_peer',[]);assert.deepEqual(getChatMessages('private_peer').map(m=>m.id),['unsent-draft']);
  login('owner-2');assert.deepEqual(getChatMessages('private_peer'),[]);login('owner-1');assert.equal(getChatMessages('private_peer')[0].id,'unsent-draft');
  assert.ok(values.get('yandao_friends_chat_private_peer')?.includes('legacy-private-owner-unknown'));
 }finally{Object.assign(globalThis,before);}
});
