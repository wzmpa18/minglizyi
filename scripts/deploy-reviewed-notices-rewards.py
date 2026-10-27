"""Deploy only reviewed learning, notice, reward and update hunks.

Inspect by default. Pin both Git revisions and fresh live hashes before --apply.
No server, credential, business configuration or historical ledger replacement.
"""
import argparse, base64, datetime, difflib, hashlib, json, re, shlex, subprocess
from pathlib import Path

MODULES = ('announcementPolicy.js', 'announcementRoutes.js', 'businessIdentityGate.js', 'register_routes.js', 'partnerEngine.js', 'commissionRouter.js', 'appVersionRoutes.js', 'chartStudyQuality.js', 'liurenStudyQuality.js')
PROTECTED_FILES = ('server.js', '.env', 'partnerRoutes.js', 'promotionPolicy.js', 'commissionEngine.js', 'data/app-release-config.json', 'data/company_download_release.json', 'data/commission_config.json', 'data/partner_config.json', 'data/announcements.json')


def ledger_snapshot(db):
    names = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    if not {'user_orders', 'commission_records'}.issubset(names):
        raise ValueError('The actual order and commission ledgers are required')
    result = {}
    tables = ('user_orders', 'commission_records', 'partner_order_log', 'invite_rewards', 'points_transactions', 'consumption_rebates', 'commission_accounts', 'withdrawals', 'user_assets', 'promotion_order_policy_snapshots', 'promotion_distribution_evidence', 'company_download_tickets')
    for table in tables:
        if table not in names:
            result[table] = {'present': False}
            continue
        rows = db.execute('SELECT * FROM '+table+' ORDER BY rowid').fetchall()
        raw = json.dumps(rows, ensure_ascii=False, default=lambda value:value.hex() if isinstance(value, bytes) else str(value), separators=(',', ':')).encode()
        result[table] = {'present': True, 'rows': len(rows), 'sha256': hashlib.sha256(raw).hexdigest()}
    return result


def merge_hunks(baseline, candidate, live):
    """Apply unique contextual source hunks, retaining all untouched live bytes."""
    if baseline is None:
        if live is not None:
            if live == candidate:
                return live
            raise ValueError('New source module already exists with different bytes')
        return candidate
    if live is None:
        raise ValueError('Existing live module is missing')
    if baseline == candidate or live == candidate:
        return live
    normalize = lambda raw: raw.decode('utf-8').splitlines()
    old, new, current = normalize(baseline), normalize(candidate), normalize(live)
    actual = live.decode('utf-8').splitlines(keepends=True)
    newline = '\r\n' if b'\r\n' in live else '\n'
    edits = []
    for group in difflib.SequenceMatcher(None, old, new, autojunk=False).get_grouped_opcodes(4):
        start, end = group[0][1], group[-1][2]
        needle = old[start:end]
        if not needle:
            raise ValueError('A source hunk has no unique surrounding context')
        matches = [i for i in range(len(current)-len(needle)+1) if current[i:i+len(needle)] == needle]
        if len(matches) != 1:
            raise ValueError('A reviewed hunk does not match the live file uniquely')
        replacement = new[group[0][3]:group[-1][4]]
        edits.append((matches[0], matches[0]+len(needle), replacement))
    for a, b in zip(edits, edits[1:]):
        if a[1] > b[0]:
            raise ValueError('Reviewed hunks overlap or are out of order')
    for start, end, replacement in reversed(edits):
        actual[start:end] = [line+newline for line in replacement]
    result = ''.join(actual).encode('utf-8')
    if not candidate.endswith((b'\n', b'\r')) and result.endswith(newline.encode()) and edits and edits[-1][1] == len(current):
        result = result[:-len(newline)]
    return result


REMOTE = r'''
import sys,os,json,base64,hashlib,sqlite3,subprocess,datetime,time,urllib.request,uuid
from pathlib import Path
payload=json.load(sys.stdin);root=Path('/www/yandaoguoxue-backend')
assert root.resolve()==root and not root.is_symlink()
assert set(payload['files'])==set(MODULES)
digest=lambda raw:hashlib.sha256(raw).hexdigest()
original={};updates={}
for name,row in payload['files'].items():
 p=root/name;assert not p.is_symlink()
 live=p.read_bytes() if p.exists() else None
 assert (digest(live) if live is not None else None)==row['expected'],'Live module changed: '+name
 baseline=base64.b64decode(row['baseline']) if row['baseline'] is not None else None
 candidate=base64.b64decode(row['candidate'],validate=True)
 assert digest(candidate)==row['candidateSha256']
 merged=merge_hunks(baseline,candidate,live);original[name]=live
 if live!=merged:updates[name]=merged
protected=PROTECTED_FILES
protected_hashes={name:digest((root/name).read_bytes()) if (root/name).is_file() else None for name in protected}
dbfile=Path('/root/backend-auth/data/yandao_users.db')
def ledgers():
 if not dbfile.exists():raise RuntimeError('Expected existing account ledger is missing')
 with sqlite3.connect('file:'+str(dbfile)+'?mode=ro',uri=True) as db:
  return ledger_snapshot(db)
before_ledger=ledgers()
proof={'source':payload['source'],'baselineSource':payload['baselineSource'],'mode':'INSPECTED_NOT_APPLIED','files':{name:{'beforeSha256':digest(original[name]) if original[name] is not None else None,'candidateSha256':payload['files'][name]['candidateSha256'],'mergedSha256':digest(updates.get(name,original[name])),'changed':name in updates,'unrelatedLiveHunksPreserved':True} for name in MODULES},'protectedFiles':protected_hashes,'ledgerBefore':before_ledger,'databaseReplaced':False,'otherProductsChanged':False,'popupCampaignLaunched':False}
if not payload['apply']:print(json.dumps(proof));sys.exit(0)
assert payload['expectedMerged']=={name:row['mergedSha256'] for name,row in proof['files'].items()},'Inspect and apply merged bytes differ'
backup=Path('/root/yandaoguoxue-backups')/('notices-rewards-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+payload['source'][:7]+'-'+uuid.uuid4().hex[:8])
backup.mkdir(mode=0o700,parents=True,exist_ok=False)
with sqlite3.connect('file:'+str(dbfile)+'?mode=ro',uri=True) as db,sqlite3.connect(backup/'account-ledger.sqlite') as out:db.backup(out)
os.chmod(backup/'account-ledger.sqlite',0o600)
for name,raw in original.items():
 if raw is not None:
  file=backup/name;file.write_bytes(raw);os.chmod(file,0o600);assert file.read_bytes()==raw
(backup/'manifest.json').write_text(json.dumps(proof,indent=2));staged=[];replaced=[]
def healthy():
 for attempt in range(20):
  try:
   with urllib.request.urlopen('http://127.0.0.1:3001/api/health',timeout=2) as r:
    if r.status==200:return True
  except Exception:pass
  time.sleep(.5)
 return False
try:
 for name,raw in updates.items():
  target=root/(name+'.reviewed-'+uuid.uuid4().hex+'.js')
  with target.open('xb') as out:out.write(raw)
  os.chmod(target,0o644);staged.append(target)
  subprocess.run(['node','--check',str(target)],check=True,capture_output=True)
  assert (root/name).read_bytes()==original[name] if original[name] is not None else not (root/name).exists()
 for name,target in zip(updates,staged):os.replace(target,root/name);replaced.append(name)
 subprocess.run(['pm2','restart','yandaoguoxue-backend'],check=True,capture_output=True)
 assert healthy(),'Backend health did not recover'
 for name,row in proof['files'].items():assert digest((root/name).read_bytes())==row['mergedSha256']
 assert protected_hashes=={name:digest((root/name).read_bytes()) if (root/name).is_file() else None for name in protected},'Protected live configuration changed'
 after_ledger=ledgers();assert before_ledger==after_ledger,'Historical ledgers changed during deployment; inspect the consistent backup before further action'
 proof.update(mode='APPLIED_READBACK_HEALTH_AND_LEDGERS_VERIFIED',backup=str(backup),ledgerAfter=after_ledger,checkedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
except BaseException as failure:
 rollback_errors=[]
 for name in reversed(replaced):
  try:
   if original[name] is not None:(root/name).write_bytes(original[name])
   else:(root/name).unlink(missing_ok=True)
  except Exception as error:rollback_errors.append({'module':name,'type':type(error).__name__})
 for target in staged:
  try:
   if target.exists():target.unlink()
  except Exception as error:rollback_errors.append({'stagedFile':target.name,'type':type(error).__name__})
 subprocess.run(['pm2','restart','yandaoguoxue-backend'],capture_output=True)
 restored={name:digest((root/name).read_bytes()) if (root/name).is_file() else None for name in MODULES}
 restored_exactly=all(restored[name]==(digest(raw) if raw is not None else None) for name,raw in original.items())
 rollback_healthy=healthy()
 proof.update(mode='ROLLED_BACK_FILES_AND_HEALTH_VERIFIED' if restored_exactly and rollback_healthy and not rollback_errors else 'ROLLBACK_RECHECK_REQUIRED',failureType=type(failure).__name__,failureReason=str(failure)[:300],rollbackHealthy=rollback_healthy,rollbackFilesRestored=restored_exactly,rollbackFileHashes=restored,rollbackErrors=rollback_errors,backup=str(backup))
 (backup/'failure.json').write_text(json.dumps(proof,indent=2));print(json.dumps(proof));sys.exit(1)
(backup/'applied.json').write_text(json.dumps(proof,indent=2));print(json.dumps(proof))
'''


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',required=True);parser.add_argument('--baseline-source',required=True)
    parser.add_argument('--expected',required=True,type=Path);parser.add_argument('--evidence',required=True,type=Path)
    parser.add_argument('--inspect-proof',type=Path);parser.add_argument('--apply',action='store_true')
    args=parser.parse_args()
    if args.evidence.exists():raise ValueError('Use a new evidence path; existing records are never overwritten')
    for sha in (args.source,args.baseline_source):
        if not re.fullmatch(r'[a-f0-9]{40}',sha):raise ValueError('Exact owned source commits required')
    expected=json.loads(args.expected.read_text('utf-8-sig'))
    if set(expected)!=set(MODULES):raise ValueError('Expected hashes must cover only the reviewed module set')
    files={}
    for name in MODULES:
        if expected[name] is not None and not re.fullmatch(r'[a-f0-9]{64}',expected[name]):raise ValueError('Invalid live hash')
        candidate=subprocess.check_output(['git','show',args.source+':backend_deploy/'+name])
        baseline=subprocess.run(['git','show',args.baseline_source+':backend_deploy/'+name],capture_output=True)
        files[name]={'expected':expected[name],'baseline':base64.b64encode(baseline.stdout).decode() if baseline.returncode==0 else None,'candidate':base64.b64encode(candidate).decode(),'candidateSha256':hashlib.sha256(candidate).hexdigest()}
    merged={}
    if args.apply:
        if not args.inspect_proof:raise ValueError('Fresh inspected merge proof required before apply')
        proof=json.loads(args.inspect_proof.read_text('utf-8-sig'))
        if proof['source']!=args.source or proof['baselineSource']!=args.baseline_source or proof['mode']!='INSPECTED_NOT_APPLIED':raise ValueError('Inspect proof identity mismatch')
        merged={name:row['mergedSha256'] for name,row in proof['files'].items()}
    payload={'source':args.source,'baselineSource':args.baseline_source,'files':files,'expectedMerged':merged,'apply':args.apply}
    import inspect
    code='MODULES='+repr(MODULES)+'\nPROTECTED_FILES='+repr(PROTECTED_FILES)+'\nimport difflib,json,hashlib\n'+inspect.getsource(ledger_snapshot)+'\n'+inspect.getsource(merge_hunks)+'\n'+REMOTE
    args.evidence.parent.mkdir(parents=True,exist_ok=True)
    with args.evidence.open('x',encoding='utf-8') as file:file.write(json.dumps({'mode':'REMOTE_OPERATION_NOT_YET_CONFIRMED','source':args.source,'apply':args.apply})+'\n')
    result=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=12','root@82.156.228.87','python3 -c '+shlex.quote(code)],input=json.dumps(payload).encode(),capture_output=True,timeout=180)
    if result.returncode:
        try:failed=json.loads(result.stdout)
        except Exception:failed={'mode':'REMOTE_OPERATION_FAILED_REVIEW_REQUIRED','source':args.source,'remoteError':result.stderr.decode('utf-8',errors='replace')[-1800:]}
        args.evidence.write_text(json.dumps(failed,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        raise RuntimeError('Deployment did not confirm success; retained proof and remote backup require review before retrying')
    proof=json.loads(result.stdout)
    args.evidence.write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'mode':proof['mode'],'source':proof['source'],'files':len(proof['files']),'databaseReplaced':False,'evidence':str(args.evidence)},ensure_ascii=False))


if __name__=='__main__':main()
