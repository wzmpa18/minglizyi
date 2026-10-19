import type {LifeEntry} from "./lifeRecords";
// Explicit hand-off stays in this page process only. No URL payload, localStorage, server or analytics.
let pending:{owner:string;value:Partial<LifeEntry>}|null=null;
export function stageLifeImport(value:Partial<LifeEntry>,owner:string){if(!owner)throw Error("请先刷新登录状态后留档");pending={owner,value:structuredClone(value)};}
export function takeLifeImport(owner:string){const record=pending;pending=null;return record?.owner===owner?record.value:null;}
