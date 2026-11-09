const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = { window: { BZX: {} } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../js/typing-engine.js"), "utf8"), context);
const { passages, getStats } = context.window.BZX.TypingEngine;

test("each language has three identifiable public-domain passages of practical length", () => {
  for (const language of ["zh", "en"]) {
    const items = passages.filter((p) => p.language === language);
    assert.equal(items.length, 3);
    assert.equal(new Set(items.map((p) => p.id)).size, 3);
    for (const item of items) {
      assert.ok(item.title && item.author && item.sourceUrl);
      assert.ok(Array.from(item.text).length >= 80 && Array.from(item.text).length <= 400);
    }
  }
});

test("Chinese average speed counts correct Unicode characters and punctuation", () => {
  const p = { language: "zh", text: "你好，世界😀" };
  const stats = getStats(p, "你好，世错😀", 30000);
  assert.equal(stats.typed, 6);
  assert.equal(stats.correct, 5);
  assert.equal(stats.accuracy, 83);
  assert.equal(stats.speed, 10);
  assert.equal(stats.unit, "字符/分");
  assert.equal(stats.complete, true);
});

test("English WPM is correct characters including spaces divided by five and minutes", () => {
  const p = { language: "en", text: "Hello world!" };
  const stats = getStats(p, "Hello world!", 30000);
  assert.equal(stats.correct, 12);
  assert.equal(stats.speed, 5);
  assert.equal(stats.accuracy, 100);
  assert.equal(stats.unit, "WPM");
});

test("accuracy accounts for mismatches and extra input; corrections update it", () => {
  const p = { language: "en", text: "abcd" };
  assert.equal(getStats(p, "abXde", 60000).accuracy, 60);
  const fixed = getStats(p, "abc", 60000);
  assert.equal(fixed.accuracy, 100);
  assert.equal(fixed.progress, 75);
  assert.equal(fixed.complete, false);
  assert.equal(getStats(p, "abcde", 60000).progress, 100);
});

test("empty input and invalid or zero elapsed time have finite values", () => {
  const p = { language: "zh", text: "山水" };
  const empty = getStats(p, "", 0);
  assert.equal(empty.accuracy, 100);
  assert.equal(empty.speed, 0);
  assert.equal(empty.complete, false);
  assert.equal(getStats(p, "山", 0).speed, 0);
  assert.equal(getStats(p, "山", -1).speed, 0);
  assert.equal(getStats(p, "山", Infinity).speed, 0);
});
