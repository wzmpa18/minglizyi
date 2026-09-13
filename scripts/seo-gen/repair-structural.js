/** 修复 fix-quotes 误伤的结构性引号：弯引号出现在结构位置时还原为直引号
 *  模式：1) "“;" / "”;" 末尾闭合  2) "= “/ 或 : “/ 的 URL 开引号
 */
const fs = require("fs");
const path = require("path");

const files = ["content-zixue.js", "content-yikao.js", "content-qizheng.js"];
for (const f of files) {
  const file = path.join(__dirname, f);
  let src = fs.readFileSync(file, "utf8");
  const before = src;
  // 模式1：弯引号 + 可选空白 + 行尾分号 → 还原闭合直引号
  src = src.replace(/[“”][ \t]*;/g, '";');
  // 模式2：等号/冒号 + 空格 + 弯引号 + 斜杠 → 还原开直引号
  src = src.replace(/([=:][ \t]*)[“”](?=\/)/g, '$1"');
  // 模式3：左方括号/逗号后紧跟弯引号开URL（数组内字符串）
  src = src.replace(/([[(,][ \t]*)[“”](?=\/[a-z])/g, '$1"');
  if (src !== before) {
    fs.writeFileSync(file, src, "utf8");
    console.log("repaired", f);
  } else {
    console.log("no structural damage", f);
  }
}

// 校验：能否被 require
for (const f of files) {
  try {
    require(path.join(__dirname, f));
    console.log("PARSE OK", f);
  } catch (e) {
    console.log("PARSE FAIL", f, "-", e.message.split("\n")[0]);
  }
}
