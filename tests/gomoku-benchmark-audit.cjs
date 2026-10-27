// Independently replay and audit an on-disk gomoku-benchmark-100.cjs run.
// Usage: node tests/gomoku-benchmark-audit.cjs benchmark-results/<run>
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const dir = path.resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('Pass the benchmark result directory');
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf8'));
const records = fs.readFileSync(path.join(dir, 'games.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, file))).digest('hex');
assert.equal(hash('gomoku-extreme.snapshot.cjs'), meta.engineSHA256);
assert.equal(hash('gomoku-hard.snapshot.cjs'), meta.baselineSHA256);
assert.equal(hash('benchmark.snapshot.cjs'), meta.benchmarkSHA256);

function won(board, index, player) {
  const x = index % 25, y = Math.floor(index / 25);
  return [[1, 0], [0, 1], [1, 1], [1, -1]].some(([dx, dy]) => {
    let count = 1;
    for (const sign of [-1, 1]) for (let k = 1; k < 5; k++) {
      const nx = x + dx * k * sign, ny = y + dy * k * sign;
      if (nx < 0 || nx >= 25 || ny < 0 || ny >= 25 || board[ny * 25 + nx] !== player) break;
      count++;
    }
    return count >= 5;
  });
}

// Compare positions by colour, independent of the order of a player's moves.
function canonical(opening) {
  const keys = [];
  for (let symmetry = 0; symmetry < 8; symmetry++) {
    const players = [[], []];
    opening.forEach((index, turn) => {
      let x = index % 25 - 12, y = Math.floor(index / 25) - 12;
      if (symmetry & 4) x = -x;
      for (let r = 0; r < (symmetry & 3); r++) [x, y] = [-y, x];
      players[turn % 2].push(`${x},${y}`);
    });
    keys.push(players.map(p => p.sort().join(';')).join('|'));
  }
  return keys.sort()[0];
}

const pairs = new Map(), ids = new Set(), counts = { extremeWins: 0, hardWins: 0, draws: 0, extremeBlack: 0, extremeWhite: 0 };
for (const game of records) {
  assert.ok(Number.isInteger(game.game) && game.game >= 1 && game.game <= meta.games);
  assert.ok(!ids.has(game.game), `Duplicate game ${game.game}`);
  ids.add(game.game);
  assert.ok(game.extreme === 1 || game.extreme === 2);
  assert.equal(game.extreme, game.game % 2 ? 1 : 2);
  counts[game.extreme === 1 ? 'extremeBlack' : 'extremeWhite']++;
  assert.equal(game.opening.length, 4);
  assert.deepEqual(game.moves.slice(0, 4), game.opening);
  const pair = Math.floor((game.game - 1) / 2);
  if (pairs.has(pair)) assert.deepEqual(game.opening, pairs.get(pair));
  else pairs.set(pair, game.opening);
  const board = Array(625).fill(0);
  let winner = 0;
  game.moves.forEach((cell, turn) => {
    assert.ok(Number.isInteger(cell) && cell >= 0 && cell < 625 && !board[cell], `Illegal move ${turn + 1} in game ${game.game}`);
    const player = turn % 2 + 1;
    board[cell] = player;
    if (won(board, cell, player)) {
      assert.equal(turn, game.moves.length - 1, `Continued after a win in game ${game.game}`);
      winner = player;
    }
  });
  assert.equal(winner, game.result, `Winner mismatch in game ${game.game}`);
  if (!winner) assert.equal(game.moves.length, 625, `Incomplete draw in game ${game.game}`);
  counts[!winner ? 'draws' : winner === game.extreme ? 'extremeWins' : 'hardWins']++;
}
const unique = new Set(Array.from(pairs.values(), canonical));
assert.equal(unique.size, pairs.size, 'Symmetrically equivalent starting positions');
if (fs.existsSync(path.join(dir, 'summary.json'))) {
  const summary = JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8'));
  assert.equal(records.length, meta.games);
  for (const key of ['extremeWins', 'hardWins', 'draws']) assert.equal(counts[key], summary[key]);
  assert.equal(counts.hardWins / records.length, summary.hardWinRate);
}
console.log(JSON.stringify({ records: records.length, requested: meta.games, pairedPositions: pairs.size, uniquePositions: unique.size, ...counts }));
