#!/usr/bin/env bash
# CI-only emulator acceptance; the fixture has no real patient or user data.
set +e
(cd android && ./gradlew app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.yandao.guoxue.plugins.LifeOfflineOcrTest --stacktrace)
result=$?
mkdir -p android/app/build/reports/androidTests
adb logcat -d -v raw -s YandaoOcrProof:I > android/app/build/reports/androidTests/ocr-synthetic-only.log
adb logcat -d -v raw -s YandaoVaultProof:I > android/app/build/reports/androidTests/vault-capacity-only.log
python3 - <<'PY'
import json,pathlib
root=pathlib.Path('android/app/build/reports/androidTests');data=[]
for line in (root/'ocr-synthetic-only.log').read_text().splitlines():
 try:
  item=json.loads(line)
  if item.get('fixtureOnly') is True:data.append(item)
 except ValueError:pass
assert len(data)>=2 and all(x.get('confirmed') is False for x in data),'Actual native OCR evidence is missing'
(root/'qa-ocr-synthetic.json').write_text(json.dumps(data,ensure_ascii=False))
capacity=[]
for line in (root/'vault-capacity-only.log').read_text().splitlines():
 try:
  item=json.loads(line)
  if item.get('nativeBridge') is True:capacity.append(item)
 except ValueError:pass
assert len(capacity)==1 and capacity[0]['availableBytes']>0 and capacity[0]['airplaneMode']==1,'Actual offline native capacity evidence is missing'
(root/'qa-vault-capacity.json').write_text(json.dumps(capacity))
PY
proof=$?
if [ "$proof" -ne 0 ]; then result="$proof"; fi
adb shell settings get global airplane_mode_on > android/app/build/reports/androidTests/airplane-mode.txt
exit "$result"
