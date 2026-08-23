const fs = require("fs");
const t = fs.readFileSync("C:/Users/ZhuanZ/Projects/minglizyi/src/app/invite/page.tsx", "utf8");
const idx = t.indexOf("保存相册只有二维");
console.log("---'保存相册只有二维码'上下文（确认是否用户可见）---");
console.log(t.slice(Math.max(0, idx - 300), idx + 200));
