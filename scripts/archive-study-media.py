"""Archive inventoried system study images to private COS and verify every byte.

No user uploads, credentials, or protected source-folder writes are included.
"""
import argparse
import hashlib
import json
import subprocess
import zipfile
from pathlib import Path


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--originals', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--photo-only', action='store_true', help='Archive only the separately inventoried real-photo increment')
    a = p.parse_args()
    root = Path(__file__).resolve().parents[1]
    animation = json.loads((root / 'public/assets/meridians/ANIMATION-MANIFEST.json').read_bytes())
    revision = str(json.loads((root / 'public/assets/acupoint-photos/MANIFEST.json').read_bytes())['revision'] if a.photo_only else animation['revision'])
    files = {}
    media_root = root / ('public/assets/acupoint-photos' if a.photo_only else 'public/assets')
    for f in sorted(media_root.rglob('*')):
        if f.is_file() and (a.photo_only or f.suffix.lower() in {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'}):
            files[f.relative_to(root).as_posix()] = f
    for r in ([] if a.photo_only else animation['records']):
        if r.get('originalFile'):
            f = a.originals / r['originalFile']
            assert sha(f.read_bytes()) == r['sourceSha256'], 'Original changed; stop'
            files['originals/meridians/' + f.name] = f
    for name in ([] if a.photo_only else ['ANIMATION-MANIFEST.json', 'SOURCE-MANIFEST.json']):
        f = root / 'public/assets/meridians' / name
        files[f.relative_to(root).as_posix()] = f
    records = [{'path': k, 'bytes': f.stat().st_size, 'sha256': sha(f.read_bytes()),
                'individualObject': f.suffix.lower() != '.svg'} for k, f in files.items()]
    prefix = 'system-media/' + revision + '/'
    manifest = {'schemaVersion': 1, 'revision': revision, 'partition': 'learning_content',
                'cosPrefix': 'learning-content/' + prefix, 'records': records,
                'regionalAcupointPhotosRecovered': False,
                'note': 'Private preservation archive, not a claim of new public delivery, copyright permission or clinical review.'}
    if a.photo_only:
        manifest.update(newLicensedRealPhotos=True, doNotDelete=True)
    a.output.mkdir(parents=True, exist_ok=True)
    archive = a.output / ('system-study-media_' + revision + '.zip')
    if archive.exists():
        # A retry must reuse the same archive, including ZIP metadata, rather
        # than changing bytes under an immutable revision/key.
        with zipfile.ZipFile(archive) as z:
            assert json.loads(z.read('MEDIA-INVENTORY.json')) == manifest, 'Revision inventory differs; stop'
            assert set(z.namelist()) == {*files, 'MEDIA-INVENTORY.json'}, 'Archive entries differ; stop'
            for r in records:
                assert sha(z.read(r['path'])) == r['sha256'], 'Archive bytes differ; stop'
    else:
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
            for k, f in files.items():
                z.write(f, k)
            z.writestr('MEDIA-INVENTORY.json', json.dumps(manifest, ensure_ascii=False, indent=2))
    digest = sha(archive.read_bytes())
    remote = '/tmp/yandao-study-media-' + digest[:16]
    subprocess.run(['scp', '-o', 'BatchMode=yes', str(archive), 'root@82.156.228.87:' + remote + '.zip'], check=True)
    # The extraction target is fixed beneath /tmp and validated before cleanup.
    setup = "import zipfile;zipfile.ZipFile(" + repr(remote + '.zip') + ").extractall(" + repr(remote) + ")"
    subprocess.run(['ssh', '-o', 'BatchMode=yes', 'root@82.156.228.87', 'python3 -'], input=setup.encode(), check=True)
    code = r"""
const base='/www/yandaoguoxue-backend';process.chdir(base);
require(base+'/node_modules/dotenv').config({path:base+'/.env',quiet:true});
const {ObjectStorageService:s,getConfig}=require(base+'/objectStorageEngine');
const fs=require('fs'),crypto=require('crypto'),path=require('path');
const dir=REMOTE,prefix=PREFIX,expectedArchive=ARCHIVE_SHA;
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
(async()=>{
 if(!/^\/tmp\/yandao-study-media-[a-f0-9]{16}$/.test(dir))throw Error('Unsafe staging path');
 if(digest(dir+'.zip')!==expectedArchive)throw Error('Staging archive mismatch');
 const m=JSON.parse(fs.readFileSync(dir+'/MEDIA-INVENTORY.json'));
 const items=m.records.filter(r=>r.individualObject).map(r=>({...r,file:path.join(dir,r.path)}));
 items.push({path:'MEDIA-INVENTORY.json',file:dir+'/MEDIA-INVENTORY.json',sha256:digest(dir+'/MEDIA-INVENTORY.json')});
 items.push({path:'system-study-media.zip',file:dir+'.zip',sha256:expectedArchive});
 const verified=[];
 for(const r of items){
  if(digest(r.file)!==r.sha256)throw Error('Local media checksum mismatch');
  const key=prefix+r.path,prior=await s.statObject({partition:'learning_content',objectKey:key});
  if(!prior.ok){const w=await s.putObject({partition:'learning_content',objectKey:key,filePath:r.file,sha256:r.sha256,owner:'system'});if(!w.ok)throw Error('COS upload failed');}
  const read=await s.getObject({partition:'learning_content',objectKey:key,destPath:dir+'/readback.bin',requester:'system'});
  if(!read.ok||read.sha256!==r.sha256)throw Error('COS readback mismatch; never overwrite an existing differing object');
  verified.push({key:'learning-content/'+key,sha256:read.sha256,bytes:read.size});
 }
 const cfg=getConfig().cos;
 console.log('MEDIA_PROOF:'+JSON.stringify({ok:true,bucket:cfg.bucket,region:cfg.region,partition:'learning_content',visibility:'PRIVATE',verifiedAt:new Date().toISOString(),verified,originalSourceUntouched:true,publicReaderChanged:false}));
 fs.rmSync(dir,{recursive:true});fs.unlinkSync(dir+'.zip');
})().catch(()=>{console.error('Media archive failed; inspect state, no blind retry or public ACL fallback');process.exitCode=1});
""".replace('REMOTE', json.dumps(remote)).replace('PREFIX', json.dumps(prefix)).replace('ARCHIVE_SHA', json.dumps(digest))
    result = subprocess.run(['ssh', '-o', 'BatchMode=yes', 'root@82.156.228.87', 'node -'], input=code.encode(), capture_output=True, check=True)
    line = next(x for x in result.stdout.decode().splitlines() if x.startswith('MEDIA_PROOF:'))
    proof = json.loads(line.split(':', 1)[1])
    manifest['archiveSha256'] = digest
    (a.output / 'MEDIA-INVENTORY.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf8')
    (a.output / 'COS媒体归档回读.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2), encoding='utf8')
    print(json.dumps({'ok': proof['ok'], 'objectsVerified': len(proof['verified']), 'archiveSha256': digest, 'bytes': archive.stat().st_size}))


if __name__ == '__main__':
    main()
