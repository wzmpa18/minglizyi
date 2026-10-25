"""Read actual simulator Application Support files after the restart UI test."""
import base64
import hashlib
import json
import sys
from pathlib import Path

container, output = map(Path, sys.argv[1:3])
directory = container / 'Library/Application Support/OfflineLearning'
assert directory.is_dir(), 'Real iOS learning directory absent'


def read(key):
    name = hashlib.sha256(key.encode('utf-8')).hexdigest() + '.json'
    file = directory / name
    if not file.is_file():
        diagnostic={}
        for marker in ['qa-offline-installation-proof','qa-offline-js-state']:
            marker_file=directory/(hashlib.sha256(marker.encode()).hexdigest()+'.json')
            diagnostic[marker]=json.loads(marker_file.read_text()) if marker_file.is_file() else None
        raise AssertionError({'missing':key,'diagnostic':diagnostic})
    assert not file.is_symlink()
    return json.loads(file.read_text(encoding='utf-8'))


assert read('learning-storage-readback-check')['content'] == 'offline-learning-storage-check'
network_proof=read('qa-offline-network-proof')
assert network_proof == {'fetchBlocked': True, 'xhrBlocked': True,'imageFetchBlocked':True,'bundledRouteAllowed':True}, network_proof
records = json.loads(Path('public/data/tcm-study-media.json').read_text())['records']
verified = []
for path in ['/assets/acupoint-photos/hegu-li4-mk2010.jpg', '/assets/meridians/large-intestine.webp']:
    record = next(item for item in records if item['path'] == path)
    saved = read('study-image-' + record['sha256'])
    data = base64.b64decode(saved['data'], validate=True)
    assert len(data) == record['bytes'] and hashlib.sha256(data).hexdigest() == record['sha256']
    verified.append({'path': path, 'sha256': record['sha256'], 'bytes': len(data)})
proof = {'nativeApplicationSupport': True, 'webkitCacheRequired': False,
         'restartUiTestPassed': True, 'ciRemoteApiAndImageFetchBlockedOnSecondLaunch': True,
         'bundledApplicationRoutesRemainAvailable':True,
         'retainedOriginalImagesVerified': verified, 'physicalDevice': False}
output.write_text(json.dumps(proof, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'nativeImagesVerified': len(verified), 'restartAndCiOfflineInjection': True}))
