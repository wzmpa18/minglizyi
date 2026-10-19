import type {LifeEntry} from "./lifeRecords";
// Explicit hand-off stays in this page process only. No URL payload, localStorage, server or analytics.
let pending:Partial<LifeEntry>|null=null;
export function stageLifeImport(value:Partial<LifeEntry>){pending=structuredClone(value);}
export function takeLifeImport(){const value=pending;pending=null;return value;}
