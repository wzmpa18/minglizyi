import test from "node:test";
import assert from "node:assert/strict";
import classics from "../src/data/guoxueClassics.json";
import { classicReadingBlocks, isCompatibleGuoxuePack } from "../src/lib/classicReading";

test("reader paragraph layout preserves every non-whitespace character in all bundled editions", () => {
  for (const book of classics.books) {
    const blocks = classicReadingBlocks(book.content);
    assert.ok(blocks.length);
    assert.equal(blocks.map(block => block.text).join("").replace(/\s/g, ""), book.content.replace(/\s/g, ""), book.id);
    assert.equal(new Set(blocks.map(block => block.id)).size, blocks.length);
  }
  const yinfu = classics.books.find(book => book.id === "huangdi_yinfujing")!;
  assert.equal(classicReadingBlocks(yinfu.content).filter(block => block.heading).length, 3);
});

test("remote content packs require actual compatible full-text records, unique IDs and source fields", () => {
  const pack = { schema: "yandao.guoxue.classics.v1", version: "test", books: classics.books };
  assert.equal(isCompatibleGuoxuePack(pack), true);
  const book = classics.books[0];
  for (const broken of [
    { ...pack, schema: "remote-code-v2" }, { ...pack, books: [] },
    { ...pack, books: [{ ...book, content: null }] },
    { ...pack, books: [{ ...book, completeness: "excerpt" }] },
    { ...pack, books: [{ ...book, sourceUrl: "javascript:alert(1)" }] },
    { ...pack, books: [{ ...book, sourceUrl: "https://user:password@example.com/source" }] },
    { ...pack, books: [book, book] },
  ]) assert.equal(isCompatibleGuoxuePack(broken), false);
});
