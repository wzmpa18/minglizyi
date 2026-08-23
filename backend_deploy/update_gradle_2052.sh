#!/bin/bash
# 更新 build.gradle 版本号到 25.0.52 / 2052
set -e
cd /root/yandaoguoxue-source/android
sed -i 's/versionCode 2051/versionCode 2052/' app/build.gradle
sed -i 's/versionName "25.0.51"/versionName "25.0.52"/' app/build.gradle
echo "--- 更新后 ---"
grep -n 'versionCode\|versionName' app/build.gradle | head -4
grep -q 'versionCode 2052' app/build.gradle || { echo "FATAL: versionCode 未更新"; exit 1; }
grep -q 'versionName "25.0.52"' app/build.gradle || { echo "FATAL: versionName 未更新"; exit 1; }
echo "GRADLE-UPDATE-OK"
