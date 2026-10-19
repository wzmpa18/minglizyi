'use strict';
// Verify the actual copied assets against the single Gradle/package version,
// rather than a stale second version number embedded in the workflow.
const fs=require('node:fs'),assert=require('node:assert/strict');
const gradle=fs.readFileSync('android/app/build.gradle','utf8');
const code=Number(gradle.match(/\bversionCode\s+(\d+)/)?.[1]);
const name=gradle.match(/\bversionName\s+"([^"]+)"/)?.[1];
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.ok(Number.isSafeInteger(code)&&code>0&&/^\d+\.\d+\.\d+$/.test(name));
assert.equal(name,pkg.version.replace(/^v/,''));
const marker=JSON.parse(fs.readFileSync('android/app/src/main/assets/public/app-native.json','utf8'));
assert.equal(marker.versionCode,code);assert.equal(marker.versionName,name);assert.equal(marker.isNativeApp,true);
assert.equal(marker.sourceCommit,process.env.GITHUB_SHA);
const config=JSON.parse(fs.readFileSync('android/app/src/main/assets/capacitor.config.json','utf8'));
assert.equal(config.appId,'com.yandao.guoxue');assert.ok(!config.server?.url);
if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,`APP_VERSION_CODE=${code}\nAPP_VERSION_NAME=${name}\n`);
console.log(`版本门禁 OK: versionCode ${code} / versionName ${name} / copied source ${marker.sourceCommit}`);
