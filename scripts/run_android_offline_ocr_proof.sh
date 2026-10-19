#!/usr/bin/env bash
# CI-only emulator acceptance; the fixture has no real patient or user data.
set +e
(cd android && ./gradlew app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.yandao.guoxue.plugins.LifeOfflineOcrTest --stacktrace)
result=$?
mkdir -p android/app/build/reports/androidTests
adb pull /sdcard/Android/data/com.yandao.guoxue/files/qa-ocr-synthetic.json android/app/build/reports/androidTests/ || true
adb shell settings get global airplane_mode_on > android/app/build/reports/androidTests/airplane-mode.txt
exit "$result"
