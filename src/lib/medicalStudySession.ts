import type {ConstitutionResult} from '../algorithm-core/modules/tcm/constitution';
// Route hand-off only. No storage, URL, network or analytics receives answers/results.
let pending:{owner:string;at:number;result:ConstitutionResult}|null=null;
export function stageMedicalStudyResult(owner:string,result:ConstitutionResult){pending={owner,at:Date.now(),result:structuredClone(result)};}
export function readMedicalStudyResult(owner:string){if(!pending)return null;if(pending.owner!==owner||Date.now()-pending.at>30*60*1000){pending=null;return null;}return structuredClone(pending.result);}
export function clearMedicalStudyResult(owner:string){if(pending?.owner===owner)pending=null;}
