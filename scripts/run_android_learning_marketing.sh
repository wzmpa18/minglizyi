#!/usr/bin/env bash
set -eu
adb shell wm size 1080x1920
adb shell wm density 420
adb shell settings put system system_locales zh-CN
cd "${GITHUB_WORKSPACE:?}/app-source/android"
./gradlew :app:installDebug :app:installDebugAndroidTest --no-daemon
# Invoke instrumentation directly so Gradle does not uninstall the target and
# erase capture evidence before adb can retrieve it.
test_log="$RUNNER_TEMP/android-marketing-instrumentation.txt"
adb shell am instrument -w -r -e class com.yandao.guoxue.AndroidLearningMarketingTest com.yandao.guoxue.test/androidx.test.runner.AndroidJUnitRunner > "$test_log" 2>&1
test_status=1
if grep -q '^OK (1 test)' "$test_log"; then test_status=0; fi
grep -E 'AssertionError|AndroidLearningMarketingTest.java:|FAILURES|OK \(' "$test_log" || true
adb pull /sdcard/Android/data/com.yandao.guoxue/files/learning-marketing "$RUNNER_TEMP/actual-android-learning-marketing/images" || true
adb pull /sdcard/Download/yandao-learning-marketing "$RUNNER_TEMP/actual-android-learning-marketing/images" || true
if [ "$test_status" -ne 0 ]; then
  adb exec-out screencap -p > "$RUNNER_TEMP/actual-android-learning-marketing/FAILED_last_actual_device.png"
fi
exit "$test_status"
