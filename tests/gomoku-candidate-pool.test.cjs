// The incremental candidate pool maintained by setStone must always match the
// reference scan, through placements, removals and colour replacements.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../js/gomoku-extreme.js'), 'utf8')
  .replace('return { chooseMove };', 'return { setStone, updateCandidates, candidates, updateNear, toggleHash, initCodes };');
const sandbox = { module: { exports: {} }, Date, Int8Array, Int16Array, Int32Array, Uint8Array, Uint16Array, Map };
vm.runInNewContext(source, sandbox, { timeout: 5000 });
const engine = sandbox.module.exports;

test('candidate pool matches the reference scan through random play', () => {
  const board = new Int8Array(625);
  const context = {
    scores: [null, new Int32Array(625), new Int32Array(625)],
    codes: [null, new Int16Array(2500), new Int16Array(2500)],
    near: new Uint16Array(625), stones: 0, hash1: 0, hash2: 0,
    candList: new Int32Array(625), candPos: new Int32Array(625).fill(-1), candCount: 0,
  };
  for (let i = 0; i < 625; i++) for (const player of [1, 2])
    context.scores[player][i] = engine.initCodes(board, i, player, context.codes[player]);
  for (let i = 0; i < 625; i++) {
    if (!board[i] && context.near[i]) {
      context.candPos[i] = context.candCount;
      context.candList[context.candCount++] = i;
    }
  }
  let seed = 0x2f6e2b1;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const played = [];
  for (let step = 0; step < 300; step++) {
    if (played.length && (random() >>> 8) % 4 === 0) {
      const cell = played.pop();
      engine.setStone(board, cell, 0, context);
    } else {
      let cell;
      do { cell = (random() >>> 8) % 625; } while (board[cell]);
      played.push(cell);
      engine.setStone(board, cell, 1 + (random() >>> 8) % 2, context);
    }
    // collectMoves adds the centre square itself on an empty board. Array.from
    // crosses the vm realm before comparing prototypes.
    const expected = board.some(Boolean)
      ? Array.from(engine.candidates(board, context)).sort((a, b) => a - b)
      : [];
    const pool = Array.from(context.candList.slice(0, context.candCount)).sort((a, b) => a - b);
    assert.deepEqual(pool, expected, `pool mismatch at step ${step}`);
    for (const cell of pool) assert.ok(context.candPos[cell] >= 0, `pos index at step ${step}`);
  }
});
