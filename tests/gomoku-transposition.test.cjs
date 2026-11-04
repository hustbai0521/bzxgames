const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(require.resolve('../js/gomoku-extreme.js'), 'utf8')
  .replace('return { chooseMove };', 'return { search, initCodes, updateNear, toggleHash, ttMeta, ttLock, ttScore, TT_MASK };');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(source, sandbox);
const e = sandbox.module.exports;

test('negative-depth cache entries do not mask a different extension count or player', () => {
  const board = new Int8Array(625);
  [312, 339, 287, 314].forEach((cell, i) => { board[cell] = 1 + i % 2; });
  const c = { deadline: Date.now() + 10000, nodes: 0, timeout: {}, hash1: 0, hash2: 0,
    scores: [null, new Int32Array(625), new Int32Array(625)],
    codes: [null, new Int16Array(2500), new Int16Array(2500)], near: new Uint16Array(625), stones: 0 };
  for (let i = 0; i < 625; i++) {
    if (board[i]) e.updateNear(c, i, 1);
    e.toggleHash(c, i, board[i]);
    for (const player of [1, 2]) c.scores[player][i] = e.initCodes(board, i, player, c.codes[player]);
  }
  const index = (c.hash1 ^ Math.imul(c.hash2, 0x9e3779b1)) & e.TT_MASK;
  e.ttLock[index] = c.hash2;
  e.ttMeta[index] = ((-1 + 1024) << 3) | (1 << 19) | 3;
  e.ttScore[index] = 123456789;
  assert.notEqual(e.search(board, 1, -1, -1e9, 1e9, 1, c, 1), 123456789);
  e.ttMeta[index] = ((-1 + 1024) << 3) | (1 << 19) | 3;
  e.ttScore[index] = 123456789;
  assert.notEqual(e.search(board, 2, -1, -1e9, 1e9, 1, c, 0), 123456789);
});
