'use strict';
// Fixed Guoxue-only children. Credentials stay in the inherited process environment.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const scripts=new Set(['asc-owner-release.cjs','asc-owner-review-access.cjs','asc-owner-configure-qa-secrets.cjs','asc-internal-release.cjs']);
const [name,...args]=process.argv.slice(2);if(!scripts.has(name)||args.some(a=>!a.startsWith('--')))throw Error('Only the fixed Guoxue release or reviewer-access script is allowed');
const folder='E:/八字命理类文档包括排盘方式电子版/苹果开发者',text=fs.readFileSync(path.join(folder,'APP Stotr CONNECT API 最新秘钥.txt'),'utf8');
const unique=regex=>[...new Set([...text.matchAll(regex)].map(m=>m[1]))];
const keys=unique(/(?:KEY_ID|Key ID|KeyId|密钥ID)\s*[:=：]\s*["']?([A-Z0-9]{10})/gi),issuers=unique(/(?:Issuer\s*ID|ISSUER_ID)\s*[:=：]\s*["']?([a-f0-9-]{36})/gi);
if(keys.length!==1||issuers.length!==1)throw Error('Protected Guoxue credential identifiers are not unique');
const env={...process.env,ASC_KEY_ID:keys[0],APP_STORE_CONNECT_ISSUER_ID:issuers[0],ASC_PRIVATE_KEY_PATH:path.join(folder,'AuthKey_'+keys[0]+'.p8')};delete env.NODE_OPTIONS;
execFileSync(process.execPath,[path.join(__dirname,name),...args],{env,stdio:'inherit'});
