/**
 * 六爻排盘算法修复验证脚本（v25.0.44）
 * 验证：卦名、卦宫、世应、纳甲、六亲、六神
 */
import { calculateLiuyao } from "../src/algorithm-core";

let pass = 0;
let fail = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  PASS ${label} = ${JSON.stringify(actual)}`); }
  else { fail++; console.log(`  FAIL ${label}: 期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`); }
}

// 固定时间：2026-08-20 12:00（用于稳定的日干支/六神）
const T = { year: 2026, month: 8, day: 20, hour: 12 };

function run(yaoTypes: string[]) {
  return calculateLiuyao({
    ...T, minute: 0, method: "manual",
    manual: { yaoTypes: yaoTypes as never },
    question: "验证",
  });
}

console.log("=== 1. 乾为天（全阳）===");
{
  const r = run(["1", "1", "1", "1", "1", "1"]);
  check("卦名", r.benGua.name, "乾为天");
  check("卦宫", r.benGua.gong, "乾宫");
  const shi = r.benGua.yaos.findIndex(y => y.isShi);
  const ying = r.benGua.yaos.findIndex(y => y.isYing);
  check("世爻(上爻idx5)", shi, 5);
  check("应爻(三爻idx2)", ying, 2);
  const zhi = r.benGua.yaos.map(y => y.gan + y.zhi).join(" ");
  check("纳甲干支", zhi, "甲子 甲寅 甲辰 壬午 壬申 壬戌");
  check("六亲", r.benGua.yaos.map(y => y.liuQin).join(","), "子孙,妻财,父母,官鬼,兄弟,父母");
}

console.log("=== 2. 坤为地（全阴）===");
{
  const r = run(["0", "0", "0", "0", "0", "0"]);
  check("卦名", r.benGua.name, "坤为地");
  check("卦宫", r.benGua.gong, "坤宫");
  const shi = r.benGua.yaos.findIndex(y => y.isShi);
  check("世爻(上爻idx5)", shi, 5);
  const zhi = r.benGua.yaos.map(y => y.gan + y.zhi).join(" ");
  check("纳甲干支", zhi, "乙未 乙巳 乙卯 癸丑 癸亥 癸酉");
}

console.log("=== 3. 地雷复（坤宫一世，初爻阳）===");
{
  const r = run(["1", "0", "0", "0", "0", "0"]);
  check("卦名", r.benGua.name, "地雷复");
  check("卦宫", r.benGua.gong, "坤宫");
  const shi = r.benGua.yaos.findIndex(y => y.isShi);
  const ying = r.benGua.yaos.findIndex(y => y.isYing);
  check("世爻(初爻idx0)", shi, 0);
  check("应爻(四爻idx3)", ying, 3);
  check("纳甲(震卦内卦)", r.benGua.yaos.slice(0, 3).map(y => y.gan + y.zhi).join(" "), "庚子 庚寅 庚辰");
}

console.log("=== 4. 地泽临（坤宫二世，初二爻阳）===");
{
  const r = run(["1", "1", "0", "0", "0", "0"]);
  check("卦名", r.benGua.name, "地泽临");
  check("卦宫", r.benGua.gong, "坤宫");
  const shi = r.benGua.yaos.findIndex(y => y.isShi);
  check("世爻(二爻idx1)", shi, 1);
}

console.log("=== 5. 地天泰（坤宫三世）===");
{
  const r = run(["1", "1", "1", "0", "0", "0"]);
  check("卦名", r.benGua.name, "地天泰");
  check("卦宫", r.benGua.gong, "坤宫");
  const shi = r.benGua.yaos.findIndex(y => y.isShi);
  const ying = r.benGua.yaos.findIndex(y => y.isYing);
  check("世爻(三爻idx2)", shi, 2);
  check("应爻(上爻idx5)", ying, 5);
}

console.log("=== 6. 雷天大壮（坤宫四世）===");
{
  const r = run(["1", "1", "1", "1", "0", "0"]);
  check("卦名", r.benGua.name, "雷天大壮");
  check("卦宫", r.benGua.gong, "坤宫");
  const shi = r.benGua.yaos.findIndex(y => y.isShi);
  check("世爻(四爻idx3)", shi, 3);
}

console.log("=== 7. 泽天夬（坤宫五世）===");
{
  const r = run(["1", "1", "1", "1", "1", "0"]);
  check("卦名", r.benGua.name, "泽天夬");
  check("卦宫", r.benGua.gong, "坤宫");
  const shi = r.benGua.yaos.findIndex(y => y.isShi);
  const ying = r.benGua.yaos.findIndex(y => y.isYing);
  check("世爻(五爻idx4)", shi, 4);
  check("应爻(二爻idx1)", ying, 1);
}

console.log("=== 8. 水天需（坤宫游魂）===");
{
  const r = run(["1", "1", "1", "0", "1", "0"]);
  check("卦名", r.benGua.name, "水天需");
  check("卦宫", r.benGua.gong, "坤宫");
  const shi = r.benGua.yaos.findIndex(y => y.isShi);
  check("世爻(四爻idx3)", shi, 3);
  check("别名", r.benGua.alias, "游魂");
}

console.log("=== 9. 水地比（坤宫归魂）===");
{
  const r = run(["0", "0", "0", "0", "1", "0"]);
  check("卦名", r.benGua.name, "水地比");
  check("卦宫", r.benGua.gong, "坤宫");
  const shi = r.benGua.yaos.findIndex(y => y.isShi);
  const ying = r.benGua.yaos.findIndex(y => y.isYing);
  check("世爻(三爻idx2)", shi, 2);
  check("应爻(上爻idx5)", ying, 5);
  check("别名", r.benGua.alias, "归魂");
}

console.log("=== 10. 火地晋（乾宫游魂）===");
{
  const r = run(["0", "0", "0", "1", "0", "1"]);
  check("卦名", r.benGua.name, "火地晋");
  check("卦宫", r.benGua.gong, "乾宫");
  const shi = r.benGua.yaos.findIndex(y => y.isShi);
  const ying = r.benGua.yaos.findIndex(y => y.isYing);
  check("世爻(四爻idx3)", shi, 3);
  check("应爻(初爻idx0)", ying, 0);
}

console.log("=== 11. 火天大有（乾宫归魂）===");
{
  const r = run(["1", "1", "1", "1", "0", "1"]);
  check("卦名", r.benGua.name, "火天大有");
  check("卦宫", r.benGua.gong, "乾宫");
  const shi = r.benGua.yaos.findIndex(y => y.isShi);
  check("世爻(三爻idx2)", shi, 2);
}

console.log("=== 12. 天地否（乾宫三世）===");
{
  const r = run(["0", "0", "0", "1", "1", "1"]);
  check("卦名", r.benGua.name, "天地否");
  check("卦宫", r.benGua.gong, "乾宫");
  const shi = r.benGua.yaos.findIndex(y => y.isShi);
  check("世爻(三爻idx2)", shi, 2);
}

console.log("=== 13. 雷泽归妹（兑宫归魂）===");
{
  const r = run(["1", "1", "0", "1", "0", "0"]);
  check("卦名", r.benGua.name, "雷泽归妹");
  check("卦宫", r.benGua.gong, "兑宫");
  const shi = r.benGua.yaos.findIndex(y => y.isShi);
  check("世爻(三爻idx2)", shi, 2);
}

console.log("=== 14. 六神（按日干排列）===");
{
  const r = run(["1", "1", "1", "1", "1", "1"]);
  console.log(`  日干: ${r.dayGan}`);
  console.log(`  六神(初→上): ${r.benGua.yaos.map(y => y.liuShen).join(",")}`);
  const startMap: Record<string, string> = {
    "甲": "青龙", "乙": "青龙", "丙": "朱雀", "丁": "朱雀", "戊": "勾陈",
    "己": "螣蛇", "庚": "白虎", "辛": "白虎", "壬": "玄武", "癸": "玄武",
  };
  const order = ["青龙", "朱雀", "勾陈", "螣蛇", "白虎", "玄武"];
  const start = order.indexOf(startMap[r.dayGan] || "青龙");
  const expected = [0, 1, 2, 3, 4, 5].map(i => order[(start + i) % 6]).join(",");
  check("六神顺序", r.benGua.yaos.map(y => y.liuShen).join(","), expected);
}

console.log("=== 15. 动爻变卦（乾之姤：初爻老阳）===");
{
  const r = run(["1o", "1", "1", "1", "1", "1"]);
  check("本卦", r.benGua.name, "乾为天");
  check("变卦", r.bianGua?.name, "天风姤");
  check("初爻动", r.benGua.yaos[0].isDong, true);
}

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
if (fail > 0) process.exit(1);
