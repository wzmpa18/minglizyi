export type PillarRelation = {text:string;type:"he"|"chong"|"xing"|"po"|null};
const GAN_HE=["甲己","乙庚","丙辛","丁壬","戊癸"];
const GAN_CHONG=["甲庚","乙辛","丙壬","丁癸"];
const ZHI_PAIRS:ReadonlyArray<readonly[string,string,"he"|"chong"|"xing"|"po"]>=[
 ["子丑","六合","he"],["寅亥","六合","he"],["卯戌","六合","he"],["辰酉","六合","he"],["巳申","六合","he"],["午未","六合","he"],
 ["子午","相冲","chong"],["丑未","相冲","chong"],["寅申","相冲","chong"],["卯酉","相冲","chong"],["辰戌","相冲","chong"],["巳亥","相冲","chong"],
 ["子未","相害","xing"],["丑午","相害","xing"],["寅巳","相害","xing"],["卯辰","相害","xing"],["申亥","相害","xing"],["酉戌","相害","xing"],
 ["子卯","相刑","xing"],["寅巳","刑（寅巳申组）","xing"],["巳申","刑（寅巳申组）","xing"],["寅申","刑（寅巳申组）","xing"],["丑戌","刑（丑戌未组）","xing"],["戌未","刑（丑戌未组）","xing"],["丑未","刑（丑戌未组）","xing"],
 ["子酉","相破","po"],["卯午","相破","po"],["寅亥","相破","po"],["巳申","相破","po"],["辰丑","相破","po"],["未戌","相破","po"]
];
const hasPair=(pair:string,a:string,b:string)=>a!==b && pair.includes(a)&&pair.includes(b);
export function pillarRelations(pillars:ReadonlyArray<{gan:string;zhi:string}>,kind:"gan"|"zhi"):PillarRelation[]{
 const out:PillarRelation[]=[];const names=["年","月","日","时"];
 for(let i=0;i<pillars.length;i++)for(let j=i+1;j<pillars.length;j++){
  const a=pillars[i][kind],b=pillars[j][kind],prefix=`${names[i]||i+1}${names[j]||j+1}：${a}${b}`;
  if(kind==="gan"){
   if(GAN_HE.some(p=>hasPair(p,a,b)))out.push({text:prefix+"五合（合不等于化）",type:"he"});
   if(GAN_CHONG.some(p=>hasPair(p,a,b)))out.push({text:prefix+"相冲",type:"chong"});
  }else{
   for(const [p,label,type] of ZHI_PAIRS)if(hasPair(p,a,b))out.push({text:prefix+label,type});
   if(a===b&&"辰午酉亥".includes(a))out.push({text:prefix+"自刑",type:"xing"});
  }
 }
 if(kind==="zhi")for(const [group,label]of [["申子辰","三合水"],["亥卯未","三合木"],["寅午戌","三合火"],["巳酉丑","三合金"],["寅卯辰","三会木"],["巳午未","三会火"],["申酉戌","三会金"],["亥子丑","三会水"]]){
  if(Array.from(group).every(z=>pillars.some(p=>p.zhi===z)))out.push({text:group+label+"（成化另论）",type:"he"});
 }
 return out;
}
