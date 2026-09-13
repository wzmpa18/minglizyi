/** 修复内容文件中双引号字符串内的直引号 → 中文弯引号（保留HTML属性/结构性引号） */
const fs = require("fs");

const CJK = /[\u4e00-\u9fff]/;
const CJKP = /[\u4e00-\u9fff，。：；？！、（）……——·「」『』《》×→°]/;

function fix(file) {
  const src = fs.readFileSync(file, "utf8");
  let out = "";
  let i = 0;
  let inDQ = false;
  let inBT = false;
  let openCount = 0;
  let btOpenCount = 0;
  while (i < src.length) {
    const ch = src[i];
    if (inBT) {
      if (ch === "`") { inBT = false; out += ch; i++; continue; }
      if (ch === '"') {
        const prev = src[i - 1] || "";
        const next = src[i + 1] || "";
        if (CJK.test(prev) && (CJK.test(next) || CJKP.test(next))) {
          out += btOpenCount++ % 2 === 0 ? "\u201c" : "\u201d";
        } else if (CJKP.test(prev) && CJK.test(next)) {
          out += btOpenCount++ % 2 === 0 ? "\u201c" : "\u201d";
        } else {
          out += ch;
        }
      } else out += ch;
      i++;
      continue;
    }
    if (inDQ) {
      if (ch === '"') {
        let j = i + 1;
        while (j < src.length && (src[j] === " " || src[j] === "\t")) j++;
        const nxt = src[j];
        if (nxt === "," || nxt === "]" || nxt === ")" || nxt === "}" || nxt === "\n" || nxt === "\r" || nxt === ":" || j >= src.length) {
          out += '"';
          inDQ = false;
        } else {
          out += openCount++ % 2 === 0 ? "\u201c" : "\u201d";
        }
      } else out += ch;
      i++;
      continue;
    }
    if (ch === "`") { inBT = true; btOpenCount = 0; out += ch; i++; continue; }
    if (ch === '"') { inDQ = true; openCount = 0; out += ch; i++; continue; }
    out += ch;
    i++;
  }
  fs.writeFileSync(file, out, "utf8");
  console.log("fixed", file);
}

for (const f of ["content-zixue.js", "content-yikao.js", "content-qizheng.js"]) {
  fix(require("path").join(__dirname, f));
}
