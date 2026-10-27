// The candidate maintains directional encodings and neighbouring-stone counts
// incrementally. Compare them with a full reconstruction after a mix of
// additions, removals and colour replacements, including board edges.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

function expose(file, names) {
  const marker = '  return { chooseMove };';
  const source = fs.readFileSync(require.resolve(file), 'utf8');
  assert.ok(source.includes(marker));
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(source.replace(marker, `  return { ${names} };`), sandbox);
  return sandbox.module.exports;
}
const candidate = expose('../js/gomoku-extreme.js', 'initCodes, updateNear, toggleHash, setStone, candidates');

function directCandidates(board) {
  const result = [];
  if (!board.some(Boolean)) return [312];
  for (let i = 0; i < 625; i++) {
    if (board[i]) continue;
    const x = i % 25, y = Math.floor(i / 25);
    let near = false;
    for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < 25 && yy >= 0 && yy < 25 && board[yy * 25 + xx]) { near = true; break; }
    }
    if (near) result.push(i);
  }
  return result;
}

test('candidate incremental scores, frontier and hashes match recomputation', () => {
  const board = new Int8Array(625);
  const context = {
    scores: [null, new Int32Array(625), new Int32Array(625)],
    codes: [null, new Int16Array(2500), new Int16Array(2500)],
    near: new Uint16Array(625), stones: 0, hash1: 0, hash2: 0,
  };
  for (let i = 0; i < 625; i++) for (const player of [1, 2]) {
    context.scores[player][i] = candidate.initCodes(board, i, player, context.codes[player]);
  }
  let seed = 0x9e3779b9;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const edges = [0, 24, 600, 624, 12, 300, 324, 612];
  const scratch = new Int16Array(2500);
  for (let step = 0; step < 160; step++) {
    const cell = step < edges.length ? edges[step] : random() % 625;
    const value = random() % 3;
    candidate.setStone(board, cell, value, context);
    const hash = { hash1: 0, hash2: 0 };
    let stones = 0;
    for (let i = 0; i < 625; i++) {
      if (board[i]) stones++;
      candidate.toggleHash(hash, i, board[i]);
      for (const player of [1, 2]) {
        assert.equal(context.scores[player][i], candidate.initCodes(board, i, player, scratch),
          `score step ${step}, cell ${i}, player ${player}`);
      }
    }
    assert.equal(context.stones, stones, `stone count step ${step}`);
    assert.equal(context.hash1, hash.hash1, `hash1 step ${step}`);
    assert.equal(context.hash2, hash.hash2, `hash2 step ${step}`);
    assert.deepEqual(Array.from(candidate.candidates(board, context)), directCandidates(board),
      `frontier step ${step}`);
  }
});
