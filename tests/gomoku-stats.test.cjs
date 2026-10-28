const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const test = require("node:test");

test("extreme results persist once per game and update after undo", () => {
  const storage = new Map();
  const BZX = { store: {
    get: (key, fallback) => storage.has(key) ? JSON.parse(storage.get(key)) : fallback,
    set: (key, value) => storage.set(key, JSON.stringify(value)),
  } };
  let source = fs.readFileSync(require.resolve("../js/gomoku.js"), "utf8");
  source = source.replace(/\}\)\(\);\s*$/, "window.testEngine = { state, resetWith, applyMove, undo, extremeStats };\n})();");
  const window = { BZX };
  vm.runInNewContext(source, { window, setTimeout: () => 1, clearTimeout() {} });
  const { state, resetWith, applyMove, undo } = window.testEngine;
  const stats = () => JSON.parse(storage.get("gomokuExtremeStats"));
  const moves = cells => cells.forEach((cell, index) => applyMove(cell, index % 2 + 1));

  resetWith("PVE", "EXTREME", 1);
  moves([0, 25, 1, 26, 2, 27, 3, 28, 4]);
  assert.deepEqual(stats(), { black: { games: 1, wins: 1 }, white: { games: 0, wins: 0 } });
  undo();
  applyMove(4, 1);
  assert.deepEqual(stats(), { black: { games: 1, wins: 1 }, white: { games: 0, wins: 0 } });
  undo();
  applyMove(50, 1);
  applyMove(29, 2);
  assert.deepEqual(stats(), { black: { games: 1, wins: 0 }, white: { games: 0, wins: 0 } });

  resetWith("PVE", "EXTREME", 2);
  moves([0, 25, 1, 26, 2, 27, 3, 28, 50, 29]);
  assert.deepEqual(stats(), { black: { games: 1, wins: 0 }, white: { games: 1, wins: 1 } });
  resetWith("PVE", "EXTREME", 1);
  moves([0, 25, 1, 26, 2, 27, 50, 28, 52, 29]);
  assert.deepEqual(stats(), { black: { games: 2, wins: 0 }, white: { games: 1, wins: 1 } });
  resetWith("PVE", "HARD", 1);
  moves([0, 25, 1, 26, 2, 27, 3, 28, 4]);
  resetWith("PVP", "EXTREME", 1);
  moves([0, 25, 1, 26, 2, 27, 3, 28, 4]);
  assert.deepEqual(stats(), { black: { games: 2, wins: 0 }, white: { games: 1, wins: 1 } });
  const reloaded = { BZX };
  vm.runInNewContext(source, { window: reloaded, setTimeout: () => 1, clearTimeout() {} });
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded.testEngine.extremeStats)), stats());
});
