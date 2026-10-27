const assert = require('node:assert/strict');
const test = require('node:test');
const { chooseMove } = require('../js/gomoku-extreme.js');

const size = 25;
const cell = (x, y) => y * size + x;
const position = (...stones) => {
  const board = Array(size * size).fill(0);
  for (const [x, y, player] of stones) board[cell(x, y)] = player;
  return board;
};

test('opens at the centre and does not mutate its input', () => {
  const board = position();
  assert.equal(chooseMove(board, 1, { maxMs: 40 }), cell(12, 12));
  assert.deepEqual(board, position());
});

test('takes a winning move before blocking the opponent', () => {
  const board = position([3, 5, 2], [4, 5, 1], [5, 5, 1], [6, 5, 1], [7, 5, 1],
    [3, 9, 1], [4, 9, 2], [5, 9, 2], [6, 9, 2], [7, 9, 2]);
  const before = board.slice();
  assert.equal(chooseMove(board, 1, { maxMs: 40 }), cell(8, 5));
  assert.deepEqual(board, before);
});

test('blocks a broken four diagonally at the edge', () => {
  const board = position([0, 0, 2], [1, 1, 2], [3, 3, 2], [4, 4, 2]);
  assert.equal(chooseMove(board, 1, { maxMs: 40 }), cell(2, 2));
});

test('blocks a single open winning square on the far border', () => {
  const board = position([20, 24, 2], [21, 24, 2], [22, 24, 2], [23, 24, 2], [19, 24, 1]);
  assert.equal(chooseMove(board, 1, { maxMs: 40 }), cell(24, 24));
});

test('creates an open four when it can force a win', () => {
  const board = position([10, 12, 1], [11, 12, 1], [12, 12, 1],
    [8, 10, 2], [9, 11, 2], [13, 13, 2]);
  assert.ok([cell(9, 12), cell(13, 12)].includes(chooseMove(board, 1, { maxMs: 300 })));
});

test('blocks an immediate five even when it can create an open four', () => {
  const board = position([10, 12, 1], [11, 12, 1], [12, 12, 1],
    [2, 5, 2], [3, 5, 2], [5, 5, 2], [6, 5, 2]);
  assert.equal(chooseMove(board, 1, { maxMs: 300 }), cell(4, 5));
});

test('returns a legal move after a search timeout without changing the board', () => {
  const board = position([12, 12, 1], [13, 12, 2], [11, 11, 1], [13, 13, 2], [11, 12, 1]);
  const before = board.slice();
  const move = chooseMove(board, 2, { maxMs: 50 });
  assert.ok(Number.isInteger(move) && move >= 0 && move < board.length && board[move] === 0);
  assert.deepEqual(board, before);
});

test('rejects boards and colours outside the supported game', () => {
  assert.throws(() => chooseMove([], 1));
  assert.throws(() => chooseMove(position(), 3));
});
