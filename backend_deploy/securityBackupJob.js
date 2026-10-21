'use strict';
// CLI-only scheduled job. Dedicated private workspace; existing application
// backup configuration and user databases are not replaced or restored.
async function run() {
  require('dotenv').config({quiet:true});
  const fs=require('node:fs'),path=require('node:path');
  const root='/root/yandao-security-backup';
  fs.mkdirSync(root,{recursive:true,mode:0o700});fs.chmodSync(root,0o700);
  const auditFile=process.env.SECURITY_AUDIT_DB || path.join(process.env.ADMIN_DATA_DIR || path.join(__dirname,'data'),'security-audit.sqlite');
  process.env.BACKUP_DB_PATHS=auditFile;
  process.env.BACKUP_DATA_DIR=root;
  process.env.BACKUP_WORK_DIR=path.join(root,'backup_work');
  process.env.BACKUP_DRILL_DIR=path.join(root,'restore_drill');
  const journal=require('./securityAudit').getSecurityAudit();
  const backup=require('./backupEngine'),storage=require('./objectStorageEngine');
  let result;
  try {
    const chain=journal.verify();if(!chain.valid)throw Error('audit_chain_invalid');
    if(storage.capabilityReport().activeProvider!=='COS')throw Error('offsite_provider_not_selected');
    backup.saveConfig({retentionCount:2,drillKeepCount:1,encrypt:true});
    const saved=await backup.runBackup({actor:'security-scheduler'});
    if(!saved.ok||!saved.manifestUploaded||saved.files.length!==1||saved.files[0].status!=='OK')throw Error('offsite_upload_not_confirmed');
    const drill=await backup.runRestoreDrill({backupId:saved.backupId,actor:'security-scheduler'});
    if(!drill.ok||drill.result!=='PASS'||drill.restoredCount!==1)throw Error('offsite_restore_not_verified');
    result={ok:true,at:new Date().toISOString(),provider:'COS',encryption:'AES-256-GCM',backupId:saved.backupId,restoredCount:drill.restoredCount,chain,minimumRetentionMonths:6,sourceNeverPruned:true};
    journal.append({actor:'security-scheduler',kind:'offsite_backup_verified',status:200});
  } catch(e) {
    result={ok:false,at:new Date().toISOString(),code:/^[a-z_]+$/.test(e.message)?e.message:'backup_service_failed'};
    try{journal.append({actor:'security-scheduler',kind:'offsite_backup_failed',status:503});}catch{}
  }
  fs.writeFileSync(path.join(root,'last-result.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});
  // Isolated decrypted restore files are not production data; discard after
  // integrity verification. Keep only the result and encrypted recovery sets.
  const drills=path.join(root,'restore_drill');
  if(fs.existsSync(drills)&&!fs.lstatSync(drills).isSymbolicLink())fs.rmSync(drills,{recursive:true,force:true});
  console.log(JSON.stringify(result));return result;
}
if(require.main===module)run().then(r=>{process.exitCode=r.ok?0:1;}).catch(()=>{console.error('security_backup_failed');process.exitCode=1;});
module.exports={run};
