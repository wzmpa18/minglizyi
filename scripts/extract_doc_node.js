const path = require("path");
const fs = require("fs");
const WordExtractor = require("word-extractor");

const dest = path.join(__dirname, "..", "docs", "materials", "yixue_import", "extracted");
const e = "E:\\八字命理类文档包括排盘方式电子版\\整理出来的命理类核心文件";

const jobs = [
  {
    src: "c:\\Users\\ZhuanZ\\.trae-cn\\attachments\\6a7ee9cd6fc0b776ac94034e\\1f29f28b-2f63-42fc-980f-621167f9b70f_7e4728de-931a-47ac-bd45-1c63a11a5ef6_倪海夏《神农本草经》完整版——可直接打印.doc",
    out: "shennong_bencao.md",
  },
  { src: path.join(e, "易经推命批法V20170928.doc"), out: "yijing_tuiming.txt" },
  { src: path.join(e, "地脉道听课笔记.doc"), out: "dimaidao.txt" },
];

function clean(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/\t+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const extractor = new WordExtractor();
(async () => {
  for (const j of jobs) {
    try {
      const doc = await extractor.extract(j.src);
      const body = doc.getBody();
      const text = clean(body && body.length > 100 ? body : doc.getText());
      fs.writeFileSync(path.join(dest, j.out), text, "utf8");
      console.log(`OK: ${j.out} (${text.length.toLocaleString()} chars)`);
    } catch (err) {
      console.log(`FAIL: ${j.out} -> ${err.message}`);
    }
  }
})();
