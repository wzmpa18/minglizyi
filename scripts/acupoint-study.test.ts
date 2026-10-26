import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { triggerScrape, getCachedAcupointInfo } from "../src/lib/tcmScraper";

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
} });

test("an exact sourced point replaces empty notices without inventing a needling depth", () => {
  storage.clear();
  const point = triggerScrape("LU2", "云门", "手太阴肺经")!;
  assert.match(point.detail, /巨骨|气户/);
  assert.doesNotMatch(point.needling_method, /0\.5|1寸|直刺|斜刺/);
  assert.match(point.indications, /主/);
  assert.doesNotMatch(point.indications + point.combinations, /暂无|待补充/);
  assert.match(point.source, /针灸大成/);
  // Existing specifically recorded learning text is retained.
  assert.match(triggerScrape("LU5", "尺泽", "手太阴肺经")!.detail, /肘/);
  const unknown = triggerScrape('UNKNOWN', '不存在的穴位测试', '测试经络')!;
  assert.equal(unknown.detail, '');
  assert.equal(unknown.indications, '');
  assert.equal(unknown.combinations, '');
  assert.equal(unknown.needling_method, '');
});

test("old cached defaults are discarded and corrupt cache shapes are tolerated", () => {
  storage.clear();
  storage.set("tcm_scrape_cache", JSON.stringify({ LU2: {
    cachedAt: Date.now(), data: { detail: "旧数据", needling_method: "一般可直刺0.5-1寸" },
  } }));
  assert.equal(getCachedAcupointInfo("LU2"), null);
  assert.doesNotMatch(triggerScrape("LU2", "云门", "手太阴肺经")!.needling_method, /直刺/);
  for (const raw of ["null", "[]", "{", '{"LU2":{"data":{}}}']) {
    storage.set("tcm_scrape_cache", raw);
    assert.equal(getCachedAcupointInfo("LU2"), null);
  }
});

test("the licensed lung figure is unchanged and its 11 labels map to actual catalog points", () => {
  const sources = JSON.parse(fs.readFileSync("src/data/acupointOpenSources.json", "utf8"));
  const catalog = JSON.parse(fs.readFileSync("src/algorithm-core/modules/tcm/data/meridians.json", "utf8"));
  const figure = sources.images[0];
  const bytes = fs.readFileSync(`public${figure.asset}`);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), figure.sha256);
  assert.equal(figure.license, "CC BY-SA 3.0");
  assert.match(figure.revision, /oldid=\d+/);
  assert.ok(figure.author && figure.licenseUrl && figure.changes);
  const svg = bytes.toString("utf8");
  assert.doesNotMatch(svg, /<script\b|<foreignObject\b|\son\w+\s*=|(?:href|src)\s*=\s*["']https?:/i);
  assert.equal(figure.points.length, 11);
  figure.points.forEach((point: { label: string; code: string; name: string }, index: number) => {
    assert.equal(point.code, `LU${index + 1}`);
    assert.match(svg, new RegExp(`id="p${index + 1}"`));
    assert.ok(catalog.acupoints.some((item: { code: string; name: string }) => item.code === point.code && item.name === point.name));
  });
});
