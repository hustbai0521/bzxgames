// Regression positions from losses against the original hard AI.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../js/gomoku-extreme.js"), "utf8")
  .replace("return { chooseMove };", "return { chooseMove, forcingWin, moves, updateNear, toggleHash, initCodes };");
const sandbox = { module: { exports: {} }, Date, Int8Array, Int16Array, Int32Array, Uint8Array, Uint16Array, Map };
vm.runInNewContext(source, sandbox, { timeout: 1000 });
const engine = sandbox.module.exports;

function position(moves) {
  const board = new Int8Array(625);
  moves.forEach((cell, i) => { board[cell] = i % 2 + 1; });
  const ctx = {
    deadline: Date.now() + 5000, nodes: 0, timeout: {},
    scores: [null, new Int32Array(625), new Int32Array(625)],
    codes: [null, new Int16Array(2500), new Int16Array(2500)],
    hash1: 0, hash2: 0, table: new Map(), near: new Uint16Array(625), stones: 0,
  };
  for (let i = 0; i < 625; i++) {
    if (board[i]) engine.updateNear(ctx, i, 1);
    engine.toggleHash(ctx, i, board[i]);
    ctx.scores[1][i] = engine.initCodes(board, i, 1, ctx.codes[1]);
    ctx.scores[2][i] = engine.initCodes(board, i, 2, ctx.codes[2]);
  }
  return { board, ctx };
}

function checkLongForcingSequence(moves, attacker) {
  const { board, ctx } = position(moves);
  const before = Array.from(board);
  const available = engine.moves(board, attacker, ctx);
  assert.equal(engine.forcingWin(board, attacker, available, 3, ctx), false);
  assert.equal(engine.forcingWin(board, attacker, available, 8, ctx), true);
  assert.deepEqual(Array.from(board), before, "search must restore the board");
}

test("detects a longer four-threat sequence from benchmark game 15", () => {
  checkLongForcingSequence([312,263,361,239,311,191,215,313,336,286,310,288,238,287,285,363,338,289,290,339,411,386,309,308,261,237,333,357,315], 2);
});

test("detects a longer four-threat sequence from benchmark game 24", () => {
  checkLongForcingSequence([312,364,339,340,388,365,363,315,390,366,387,389,411,435,413,290,265,368,367,338,439,361], 1);
});
