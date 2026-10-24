/** Visual identifiers only; these colours do not encode diagnosis or point accuracy. */
export const MERIDIAN_COLORS:Record<string,string>={LU:"#155e75",LI:"#9a3412",ST:"#a16207",SP:"#6d28d9",HT:"#be123c",SI:"#0f766e",BL:"#1d4ed8",KI:"#4d6015",PC:"#9d174d",TE:"#a21caf",GB:"#166534",LR:"#4338ca",GV:"#854d0e",CV:"#334155"};
export const meridianColor=(id:string)=>MERIDIAN_COLORS[id]||"#475569";
export const displayPointCode=(code:string)=>code==="GV24+"?"EX-HN3":code;
export const displayPointName=(name:string)=>name==="瘛脉"?"瘈脉":name;
export interface LabelCandidate {key:string;x:number;y:number;width:number;height:number;selected:boolean}
/** Retain selected names first, pack without overlap, and reveal more as the user zooms. */
export function arrangePointLabels<T extends LabelCandidate>(items:T[],width:number,height:number,max=42,blocked:Pick<LabelCandidate,"x"|"y"|"width"|"height">[]=[]):T[]{
 const shown:T[]=[];
 for(const item of [...items].sort((a,b)=>Number(b.selected)-Number(a.selected)||a.key.localeCompare(b.key))){
  if(item.x<4||item.y<100||item.x+item.width>width-4||item.y+item.height>height-30)continue;
  if(blocked.some(other=>item.x<other.x+other.width+4&&item.x+item.width+4>other.x&&item.y<other.y+other.height+4&&item.y+item.height+4>other.y))continue;
  if(shown.some(other=>item.x<other.x+other.width+5&&item.x+item.width+5>other.x&&item.y<other.y+other.height+4&&item.y+item.height+4>other.y))continue;
  shown.push(item);if(shown.length===max)break;
 }return shown;
}
