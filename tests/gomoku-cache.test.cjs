// Check the search's incremental state against full recomputation. A stale
// point score or hash can silently alter move choices without illegal moves.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

let source = fs.readFileSync(require.resolve('../js/gomoku-extreme.js'), 'utf8');
const marker = '  return { chooseMove };';
assert.ok(source.includes(marker), 'engine test seam exists');
source = source.replace(marker, '  return { chooseMove, initCodes, setStone, toggleHash, updateNear, candidates };');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(source, sandbox);
const { initCodes, setStone, toggleHash, candidates } = sandbox.module.exports;

test('incremental scores and hashes match full recomputation after moves and undo', () => {
  const board = new Int8Array(625);
  const context = { scores: [null, new Int32Array(625), new Int32Array(625)],
    codes: [null, new Int16Array(2500), new Int16Array(2500)],
    near: new Uint16Array(625), stones: 0, hash1: 0, hash2: 0 };
  for (let i = 0; i < 625; i++) for (const player of [1, 2]) context.scores[player][i] = initCodes(board, i, player, context.codes[player]);
  const scratch = new Int16Array(2500);
  let seed = 0x12345678;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; }
  const played = [];
  for (let step = 0; step < 200; step++) {
    if (played.length && (random() >>> 8) % 4 === 0) setStone(board, played.pop(), 0, context);
    else {
      let cell;
      do { cell = (random() >>> 8) % 625; } while (board[cell]);
      played.push(cell);
      setStone(board, cell, 1 + (random() >>> 8) % 2, context);
    }
    const recomputed = { hash1: 0, hash2: 0 };
    for (let i = 0; i < 625; i++) toggleHash(recomputed, i, board[i]);
    assert.equal(context.hash1, recomputed.hash1, `hash1 step ${step}`);
    assert.equal(context.hash2, recomputed.hash2, `hash2 step ${step}`);
    for (const cell of candidates(board, context)) for (const player of [1, 2]) {
      assert.equal(context.scores[player][cell], initCodes(board, cell, player, scratch),
        `point score step ${step}, cell ${cell}, player ${player}`);
    }
  }
});
