const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const gradle = fs.readFileSync(path.join(root, 'android', 'app', 'build.gradle'), 'utf8');
const versionName = String(pkg.version || '').replace(/^v/, '');
const versionCode = Number((gradle.match(/\bversionCode\s+(\d+)/) || [])[1]);
const gradleVersion = (gradle.match(/\bversionName\s+"([^"]+)"/) || [])[1];

if (!/^\d+\.\d+\.\d+$/.test(versionName) || !Number.isInteger(versionCode) || versionCode <= 0) {
  throw new Error('无法从 package.json / android/app/build.gradle 读取有效原生版本');
}
if (gradleVersion !== versionName) {
  throw new Error(`版本不一致：package=${versionName}, android=${gradleVersion}`);
}

const webDir = path.join(root, 'www');
if (!fs.existsSync(webDir)) throw new Error('www 不存在，请先把 out 同步到 www');
const marker = {
  isNativeApp: true,
  versionCode,
  versionName,
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(webDir, 'app-native.json'), JSON.stringify(marker, null, 2) + '\n');
console.log(`NATIVE_MARKER=${versionName}/${versionCode}`);
