export interface Sealed {v:1;iv:string;ciphertext:string;etag?:string;}
const bytes=(s:string)=>new TextEncoder().encode(s);
export const b64=(a:Uint8Array)=>{let s="";for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(s);};
export const unb64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export const randomBytes=(n:number)=>crypto.getRandomValues(new Uint8Array(n));
export async function importVaultKey(raw:Uint8Array){return crypto.subtle.importKey("raw",raw as BufferSource,"AES-GCM",false,["encrypt","decrypt"]);}
export async function passwordKey(password:string,salt:string){
 if(password.length<10)throw Error("独立档案密码至少10个字符，请保管好密码与恢复密钥");
 const key=await crypto.subtle.importKey("raw",bytes(password),"PBKDF2",false,["deriveKey"]);
 return crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",iterations:600000,salt:unb64(salt) as BufferSource},key,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
export async function seal(key:CryptoKey,value:unknown,aad:string):Promise<Sealed>{const iv=randomBytes(12),ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv:iv as BufferSource,additionalData:bytes(aad)},key,bytes(JSON.stringify(value)));return {v:1,etag:crypto.randomUUID(),iv:b64(iv),ciphertext:b64(new Uint8Array(ciphertext))};}
export async function unseal<T>(key:CryptoKey,s:Sealed,aad:string):Promise<T>{
 if(s?.v!==1||typeof s.iv!=="string"||typeof s.ciphertext!=="string"||unb64(s.iv).length!==12)throw Error("密文格式无效");
 const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(s.iv) as BufferSource,additionalData:bytes(aad)},key,unb64(s.ciphertext) as BufferSource);return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(plain));
}
export async function sha256(a:Uint8Array){return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",a as BufferSource)),b=>b.toString(16).padStart(2,"0")).join("");}
