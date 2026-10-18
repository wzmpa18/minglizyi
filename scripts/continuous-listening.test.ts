import { test } from "node:test";
import assert from "node:assert/strict";
import { splitListeningText, restoreListeningPosition } from "../src/lib/listeningQueue";

test("long lessons preserve all text, punctuation, and supplementary-plane characters", () => {
  const original = ("经络学习。𠮷字不拆开！下一段；\n".repeat(2300)).trim();
  const chunks = splitListeningText(original);
  assert.ok(original.length > 30000);
  assert.equal(chunks.join(""), original);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(chunk => Array.from(chunk).length <= 600));
});

test("empty input and invalid chunk limits do not loop or invent text", () => {
  assert.deepEqual(splitListeningText("  "), []);
  for (const limit of [0, -1, NaN, 1.5]) {
    const text = "原文".repeat(800);
    assert.equal(splitListeningText(text, limit).join(""), text);
  }
});

test("resume position rejects corrupt, stale and out-of-range local data", () => {
  const items = [{ id: "one", title: "第一篇", text: "原文".repeat(800) }];
  for (const raw of ["{", "null", '{"itemId":"gone"}', '{"itemId":"one","chunk":999}', '{"itemId":"one","chunk":-1}']) {
    assert.deepEqual(restoreListeningPosition(raw, items), { index: 0, chunk: 0 });
  }
  assert.deepEqual(restoreListeningPosition('{"itemId":"one","chunk":1}', items), { index: 0, chunk: 1 });
});
