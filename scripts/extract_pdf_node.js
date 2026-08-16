const path = require("path");
const fs = require("fs");

const dest = "C:\\Users\\ZhuanZ\\AppData\\Roaming\\TRAE SOLO CN\\ModularData\\ai-agent\\work-mode-projects\\6a7ee9cd6fc0b776ac94034b\\minglizyi\\docs\\materials\\yixue_import\\extracted";
const e = "E:\\八字命理类文档包括排盘方式电子版\\整理出来的命理类核心文件";

const jobs = [
  { src: path.join(e, "陈红平【干支命理】从入门到精通.pdf"), out: "ganzhi_mingli.txt" },
  { src: path.join(e, "466-善天道-道家奇门预测术82集（从彩色版）.pdf"), out: "shantiandao_qimen.txt" },
];

function clean(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

(async () => {
  const { PDFParse } = await import("pdf-parse");
  for (const j of jobs) {
    try {
      const buf = fs.readFileSync(j.src);
      const parser = new PDFParse({ data: new Uint8Array(buf) });
      const data = await parser.getText();
      const text = clean(data.text);
      const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
      fs.writeFileSync(path.join(dest, j.out), text, "utf8");
      console.log(`OK: ${j.out} (${text.length.toLocaleString()} chars, CJK=${cjk.toLocaleString()}, pages=${data.pages?.length || "?"})`);
      await parser.destroy();
    } catch (err) {
      console.log(`FAIL: ${j.out} -> ${err.message}`);
    }
  }
})();
