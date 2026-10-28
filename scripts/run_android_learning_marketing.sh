#!/usr/bin/env bash
set -eu
adb shell wm size 1080x1920
adb shell wm density 420
adb shell settings put system system_locales zh-CN
cd "${GITHUB_WORKSPACE:?}/app-source/android"
set +e
./gradlew connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.yandao.guoxue.AndroidLearningMarketingTest --no-daemon
test_status=$?
set -e
adb pull /sdcard/Android/data/com.yandao.guoxue/files/learning-marketing "$RUNNER_TEMP/actual-android-learning-marketing/images" || true
adb pull /sdcard/Download/yandao-learning-marketing "$RUNNER_TEMP/actual-android-learning-marketing/images" || true
exit "$test_status"
