/** Single-use, owner-scoped RAM handoff. No URL payload, storage or network. */
export interface LiveComposeRecord {tool:string;title:string;result:Record<string,unknown>}
let pending:{owner:string;record:LiveComposeRecord;until:number}|null=null;
export function stageLiveCompose(owner:string,record:LiveComposeRecord){
 if(!owner)throw Error('请先登录后选择定向交流，私人原件仍保留本机');
 pending={owner,record:structuredClone(record),until:Date.now()+300000};
}
export function takeLiveCompose(owner:string):LiveComposeRecord|null{
 const selected=pending;pending=null;
 return selected&&selected.owner===owner&&selected.until>=Date.now()?selected.record:null;
}
