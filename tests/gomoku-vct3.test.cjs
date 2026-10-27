const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../js/gomoku-extreme.js'), 'utf8')
  .replace('return { chooseMove };', 'return { shortThreatWin, updateNear, toggleHash, initCodes, setStone, moves };');
const sandbox = { module: { exports: {} }, Date, Int8Array, Int16Array, Int32Array, Uint8Array, Uint16Array, Map };
vm.runInNewContext(source, sandbox, { timeout: 1000 });
const engine = sandbox.module.exports;

function position(stones) {
  const board = new Int8Array(625);
  for (const [cell, player] of stones) board[cell] = player;
  const ctx = {
    deadline: Date.now() + 3000, nodes: 0, timeout: {},
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
function snapshot(board, ctx) {
  return { board: [...board], scores: ctx.scores.slice(1).map(a => [...a]),
    codes: ctx.codes.slice(1).map(a => [...a]), near: [...ctx.near],
    hashes: [ctx.hash1, ctx.hash2], stones: ctx.stones };
}

test('proves the preceding double-threat attack from candidate loss 8', () => {
  const sequence = [312,311,259,338,261,337,260,258,263,262,234,313,284,309,208,286,209,184,210,211];
  const { board, ctx } = position(sequence.map((cell, i) => [cell, i % 2 + 1]));
  const before = snapshot(board, ctx);
  assert.equal(engine.shortThreatWin(board, 1, 235, ctx), true);
  assert.deepEqual(snapshot(board, ctx), before);
});

// Verify the proof with a second, direct five-in-a-row evaluator. For every
// legal defender reply, there must be an immediate win or a move producing two
// distinct winning squares while also stopping any immediate counter-win.
test('a proved threat survives every legal defender reply', () => {
  const sequence = [312,311,259,338,261,337,260,258,263,262,234,313,284,309,208,286,209,184,210,211];
  const { board, ctx } = position(sequence.map((cell, i) => [cell, i % 2 + 1]));
  assert.equal(engine.shortThreatWin(board, 1, 235, ctx), true);
  function winsAt(index, player) {
    const x = index % 25, y = Math.floor(index / 25);
    return [[1,0],[0,1],[1,1],[1,-1]].some(([dx,dy]) => {
      let n = 1;
      for (const sign of [-1,1]) for (let t = 1; t < 5; t++) {
        const xx = x + dx * sign * t, yy = y + dy * sign * t;
        if (xx < 0 || xx >= 25 || yy < 0 || yy >= 25 || board[yy * 25 + xx] !== player) break;
        n++;
      }
      return n >= 5;
    });
  }
  function winningSquares(player) {
    const result = [];
    for (let i = 0; i < 625; i++) if (!board[i] && winsAt(i, player)) result.push(i);
    return result;
  }
  engine.setStone(board, 235, 1, ctx);
  try {
    for (let reply = 0; reply < 625; reply++) {
      if (board[reply]) continue;
      assert.equal(winsAt(reply, 2), false, `reply ${reply} is a counter-win`);
      engine.setStone(board, reply, 2, ctx);
      try {
        if (winningSquares(1).length) continue;
        const opponentWins = winningSquares(2);
        assert.ok(opponentWins.length <= 1, `reply ${reply} creates multiple immediate wins`);
        const attacks = engine.moves(board, 1, ctx).list.filter(m =>
          m.attack >= 5000000 && (!opponentWins.length || m.cell === opponentWins[0]));
        let proven = false;
        for (const attack of attacks) {
          engine.setStone(board, attack.cell, 1, ctx);
          try {
            if (!winningSquares(2).length && winningSquares(1).length >= 2) { proven = true; break; }
          } finally { engine.setStone(board, attack.cell, 0, ctx); }
        }
        assert.ok(proven, `reply ${reply} has no directly verifiable winning continuation`);
      } finally { engine.setStone(board, reply, 0, ctx); }
    }
  } finally { engine.setStone(board, 235, 0, ctx); }
});

test('rejects a threat when the defender can win immediately elsewhere', () => {
  const { board, ctx } = position([[100,2],[101,2],[102,2],[103,2]]);
  const before = snapshot(board, ctx);
  assert.equal(engine.shortThreatWin(board, 1, 312, ctx), false);
  assert.deepEqual(snapshot(board, ctx), before);
});

test('filling the last empty square without a five is not a win', () => {
  // Along all four directions this repeating colouring has no five in a row.
  const stones = [];
  for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {
    const index = y * 25 + x;
    if (index !== 312) stones.push([index, (x + 2 * y) % 4 < 2 ? 1 : 2]);
  }
  const { board, ctx } = position(stones);
  const completed = Int8Array.from(board);
  completed[312] = 1;
  for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {
    for (const [dx, dy] of [[1,0],[0,1],[1,1],[1,-1]]) {
      const xx = x + dx * 4, yy = y + dy * 4;
      if (xx < 0 || xx >= 25 || yy < 0 || yy >= 25) continue;
      assert.ok(Array.from({ length: 5 }, (_, k) => completed[(y + k * dy) * 25 + x + k * dx])
        .some(value => value !== completed[y * 25 + x]), 'fixture must not contain five');
    }
  }
  const before = snapshot(board, ctx);
  assert.equal(engine.shortThreatWin(board, 1, 312, ctx), false);
  assert.deepEqual(snapshot(board, ctx), before);
});

test('timeout is propagated and leaves all incremental state intact', () => {
  const { board, ctx } = position([[312,1]]);
  const before = snapshot(board, ctx);
  ctx.nodes = 15;
  ctx.deadline = 0;
  assert.throws(() => engine.shortThreatWin(board, 1, 313, ctx), error => error === ctx.timeout);
  assert.deepEqual(snapshot(board, ctx), before);
});

test('timeout after examining several defender replies restores all state', () => {
  const sequence = [312,311,259,338,261,337,260,258,263,262,234,313,284,309,208,286,209,184,210,211];
  const { board, ctx } = position(sequence.map((cell, i) => [cell, i % 2 + 1]));
  const before = snapshot(board, ctx);
  ctx.nodes = 0;
  ctx.deadline = 0;
  assert.throws(() => engine.shortThreatWin(board, 1, 235, ctx), error => error === ctx.timeout);
  assert.ok(ctx.nodes >= 16, 'several legal responses must have been examined');
  assert.deepEqual(snapshot(board, ctx), before);
});
