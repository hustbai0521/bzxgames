const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("restarting resets score and undo but retains the best score", () => {
  const marker = "  /* ---------------- screen ---------------- */";
  const source = fs.readFileSync(path.join(__dirname, "../js/game2048.js"), "utf8");
  assert.ok(source.includes(marker));
  const context = { window: { BZX: { store: { get: () => 128 } } } };
  vm.runInNewContext(source.replace(marker, "window.testApi = { state, restart, undo };\n" + marker), context);
  const { state, restart, undo } = context.window.testApi;
  state.score = 64;
  state.canUndo = true;
  state.previous = { board: state.board, score: 32 };
  restart();
  undo();
  assert.equal(state.score, 0);
  assert.equal(state.best, 128);
  assert.equal(state.canUndo, false);
  assert.equal(state.previous, null);
});
