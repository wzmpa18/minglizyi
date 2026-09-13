/** 错误驱动迭代修复：node --check 定位语法错误位置，仅还原错误点附近的结构性弯引号 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const file = path.join(__dirname, "content-qizheng.js");
const CURLY = new Set(["\u201c", "\u201d"]); // “ ”

let fixed = 0;
for (let iter = 0; iter < 200; iter++) {
  const src = fs.readFileSync(file, "utf8");
  let err;
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe", encoding: "utf8" });
    console.log(`PARSE OK after ${fixed} fixes`);
    process.exit(0);
  } catch (e) {
    err = e.stderr || String(e);
  }
  const m = err.match(/:(\d+)\r?\n/);
  if (!m) { console.log("无法定位错误行，停止：\n" + err.split("\n").slice(0, 6).join("\n")); process.exit(1); }
  const lineNo = parseInt(m[1], 10) - 1;
  const lines = src.split("\n");
  const line = lines[lineNo];
  if (line === undefined) { console.log(`行${lineNo + 1}不存在`); process.exit(1); }
  // 找第一个处于结构上下文的弯引号：前一个非空字符是 : , ( [ = 或处于行首缩进
  let idx = -1;
  for (let k = 0; k < line.length; k++) {
    if (!CURLY.has(line[k])) continue;
    let j = k - 1;
    while (j >= 0 && (line[j] === " " || line[j] === "\t")) j--;
    const p = j >= 0 ? line[j] : "\n";
    if (":,([=".includes(p)) { idx = k; break; }
  }
  if (idx === -1) {
    // 兜底：行内第一个弯引号
    for (let k = 0; k < line.length; k++) if (CURLY.has(line[k])) { idx = k; break; }
  }
  if (idx === -1) { console.log(`行${lineNo + 1}未找到弯引号，停止`); process.exit(1); }
  // 结构性确认：该弯引号前面是 : , ( [ = 空白或行首，后面非“字符串结束标点”
  const prevCh = idx > 0 ? line[idx - 1] : "\n";
  lines[lineNo] = line.slice(0, idx) + '"' + line.slice(idx + 1);
  fs.writeFileSync(file, lines.join("\n"), "utf8");
  fixed++;
  console.log(`fix#${fixed} 行${lineNo + 1} 列${idx} 前导字符=[${prevCh}]`);
}
console.log("超过最大迭代次数");
process.exit(1);
