import assert from "node:assert/strict";
import { isNativeShellOutdated, type AppReleaseInfo, type NativeShellInfo } from "../src/lib/nativeDetect";

const release: AppReleaseInfo = {
  latestVersion: "25.0.99",
  latestVersionCode: 2086,
  downloadUrl: "https://www.yandao.vip/app-download/latest.apk",
  downloadPage: "https://yandaoguoxue.yandao.vip/friend",
  releaseNotes: [],
  forceUpdate: false,
  publishedAt: "2026-10-04T00:00:00Z",
};

function shell(versionCode: number | null, versionName: string | null, source: NativeShellInfo["source"] = "asset"): NativeShellInfo {
  return { isShell: true, versionCode, versionName, source };
}

assert.equal(isNativeShellOutdated(shell(2086, "25.0.99"), release), false, "exact versionCode must be current");
assert.equal(isNativeShellOutdated(shell(2084, "25.0.97"), release), true, "older versionCode must upgrade");
assert.equal(isNativeShellOutdated(shell(null, "25.0.99"), release), false, "embedded version fallback must prevent false upgrade");
assert.equal(isNativeShellOutdated(shell(null, "25.0.97"), release), true, "older embedded version fallback must upgrade");
assert.equal(isNativeShellOutdated(shell(null, null, "legacy"), release), true, "true legacy shell must upgrade");
assert.equal(isNativeShellOutdated(shell(null, "25.0.100"), release), false, "newer patch version must not downgrade");

console.log("native_version_gate_test: PASS");
