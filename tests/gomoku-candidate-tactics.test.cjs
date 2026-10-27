const assert = require('node:assert/strict');
const test = require('node:test');
const { chooseMove } = require('../js/gomoku-extreme.js');
const cell = (x, y) => y * 25 + x;
const board = (...stones) => {
  const result = Array(625).fill(0);
  for (const [x, y, player] of stones) result[cell(x, y)] = player;
  return result;
};

test('candidate takes its own five before blocking an opponent five', () => {
  const b = board([3, 5, 2], [4, 5, 1], [5, 5, 1], [6, 5, 1], [7, 5, 1],
    [3, 9, 1], [4, 9, 2], [5, 9, 2], [6, 9, 2], [7, 9, 2]);
  assert.equal(chooseMove(b, 1, { maxMs: 40 }), cell(8, 5));
});

test('candidate blocks a broken four at the edge', () => {
  const b = board([0, 0, 2], [1, 1, 2], [3, 3, 2], [4, 4, 2]);
  assert.equal(chooseMove(b, 1, { maxMs: 40 }), cell(2, 2));
});

test('candidate blocks an immediate win before creating an open four', () => {
  const b = board([10, 12, 1], [11, 12, 1], [12, 12, 1],
    [2, 5, 2], [3, 5, 2], [5, 5, 2], [6, 5, 2]);
  assert.equal(chooseMove(b, 1, { maxMs: 40 }), cell(4, 5));
});

test('candidate produces a legal move without changing the supplied board', () => {
  const b = board([12, 12, 1], [13, 12, 2], [11, 11, 1], [13, 13, 2], [11, 12, 1]);
  const before = b.slice();
  const move = chooseMove(b, 2, { maxMs: 50 });
  assert.ok(Number.isInteger(move) && move >= 0 && move < 625 && b[move] === 0);
  assert.deepEqual(b, before);
});
