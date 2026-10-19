/** Async private results belong to the view that requested them. Locking,
 * switching accounts or replacing a vault invalidates both reads and callbacks. */
export function scopedPrivateView<T extends object>(target:T,isCurrent:()=>boolean):T {
 const check=()=>{if(!isCurrent())throw Error("私人视图已锁定或切换，本次操作未继续");};
 return new Proxy(target,{get(object,key){check();const value=Reflect.get(object,key,object);if(typeof value!=="function")return value;
  return (...args:unknown[])=>{check();const result=Reflect.apply(value,object,args);if(result&&typeof result.then==="function")return Promise.resolve(result).then(data=>{check();return data;});return result;};
 }});
}
