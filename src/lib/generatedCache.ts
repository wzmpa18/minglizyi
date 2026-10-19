/** Only reproducible AI response caches. Never clear private records, settings,
 * credentials, reminders, draft messages, attachments or vault metadata. */
export function generatedCacheKeys(storage: Pick<Storage, 'length'|'key'>): string[] {
  const keys:string[]=[];
  for(let i=0;i<storage.length;i++){
    const key=storage.key(i);
    if(key?.startsWith('yandao_ai_cache_'))keys.push(key);
  }
  return keys;
}
export function generatedCacheBytes(storage: Pick<Storage,'length'|'key'|'getItem'>):number {
  return generatedCacheKeys(storage).reduce((bytes,key)=>bytes+2*(key.length+(storage.getItem(key)||'').length),0);
}
export function clearGeneratedCache(storage: Pick<Storage,'length'|'key'|'removeItem'>):number {
  const keys=generatedCacheKeys(storage);
  keys.forEach(key=>storage.removeItem(key));
  return keys.length;
}
