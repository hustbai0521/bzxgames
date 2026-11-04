// Independently validate a white/black-only benchmark and its engine snapshots.
// Usage: node tests/gomoku-benchmark-white-audit.cjs <result-directory>
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
if (!process.argv[2]) throw new Error('Pass a result directory');
const dir = path.resolve(process.argv[2]);
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf8'));
const hash = name => crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, name))).digest('hex');
assert.equal(hash('gomoku-extreme.snapshot.cjs'), meta.engineSHA256);
assert.equal(hash('gomoku-hard.snapshot.cjs'), meta.baselineSHA256);
assert.equal(hash('benchmark.snapshot.cjs'), meta.benchmarkSHA256);
const source = fs.readFileSync(path.join(dir, 'benchmark.snapshot.cjs'), 'utf8');
const boundary = source.indexOf('if (!isMainThread) {');
assert.ok(boundary > 0);
const sandbox = { require, globalThis: {} };
vm.runInNewContext(source.slice(0, boundary) + '\nglobalThis.getOpenings = openings;', sandbox);
const openings = sandbox.globalThis.getOpenings(meta.games, Number(meta.seed));
function canonicalPosition(opening) {
  const keys = [];
  for (let symmetry = 0; symmetry < 8; symmetry++) {
    const sides = [[], []];
    opening.forEach((cell, turn) => {
      let x = cell % 25 - 12, y = Math.floor(cell / 25) - 12;
      if (symmetry & 4) x = -x;
      for (let k = 0; k < (symmetry & 3); k++) [x, y] = [-y, x];
      sides[turn % 2].push(`${x},${y}`);
    });
    keys.push(sides.map(side => side.sort().join(';')).join('|'));
  }
  return keys.sort()[0];
}
const distinctPositions = new Set(Array.from(openings, canonicalPosition)).size;
function won(board, index, p) {
  const x = index % 25, y = Math.floor(index / 25);
  return [[1,0],[0,1],[1,1],[1,-1]].some(([dx,dy]) => {
    let n = 1;
    for (const sign of [-1,1]) for (let k = 1; k < 5; k++) {
      const xx = x + dx * k * sign, yy = y + dy * k * sign;
      if (xx < 0 || xx >= 25 || yy < 0 || yy >= 25 || board[yy * 25 + xx] !== p) break;
      n++;
    }
    return n >= 5;
  });
}
const lines = fs.readFileSync(path.join(dir, 'games.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean);
const ids = new Set(); let wins = 0, losses = 0, draws = 0;
for (const line of lines) {
  const g = JSON.parse(line);
  assert.ok(Number.isInteger(g.game) && g.game >= 1 && g.game <= meta.games && !ids.has(g.game));
  ids.add(g.game);
  assert.equal(g.extreme, meta.extreme);
  assert.deepEqual(g.opening, Array.from(openings[g.game - 1]));
  assert.deepEqual(g.moves.slice(0, 4), g.opening);
  const board = new Int8Array(625); let outcome = 0;
  g.moves.forEach((cell, i) => {
    assert.ok(!outcome && Number.isInteger(cell) && cell >= 0 && cell < 625 && !board[cell]);
    board[cell] = 1 + i % 2;
    if (won(board, cell, board[cell])) outcome = board[cell];
  });
  assert.equal(g.result, outcome);
  assert.ok(outcome || g.moves.length === 625, 'game without terminal outcome');
  if (!outcome) draws++; else if (outcome === g.extreme) wins++; else losses++;
}
if (fs.existsSync(path.join(dir, 'summary.json'))) {
  const s = JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8'));
  assert.equal(ids.size, meta.games);
  assert.equal(s.engineWins, wins); assert.equal(s.hardWins, losses); assert.equal(s.draws, draws);
}
console.log(JSON.stringify({ games: ids.size, requested: meta.games, distinctPositions, wins, losses, draws, fresh: !!meta.fresh }));
