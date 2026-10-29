// For each short white loss, compare every white move played in the benchmark
// (3s search) with a long-think choice, and report the earliest divergences.
// Run: node experiments/scan-white-divergence.cjs <resultDir> [maxPly] [longMs]
const fs = require('node:fs');
const path = require('node:path');

const { chooseMove } = require('../js/gomoku-extreme.js');
const size = 25, cells = size * size;
const coord = c => `(${c % size},${Math.floor(c / size)})`;

const dir = process.argv[2];
const maxPly = Number(process.argv[3] || 36);
const longMs = Number(process.argv[4] || 30000);

const games = fs.readFileSync(path.join(dir, 'games.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)
  .filter(g => g.result === 1 && g.moves.length <= 40)
  .sort((a, b) => a.moves.length - b.moves.length);

for (const g of games) {
  const full = g.moves; // includes the forced opening prefix
  const board = new Array(cells).fill(0);
  const divergences = [];
  for (let t = 0; t < full.length && t < maxPly; t++) {
    const player = t % 2 + 1;
    if (player !== 2) { board[full[t]] = player; continue; }
    const stats = {};
    const long = chooseMove(board.slice(), 2, { maxMs: longMs, stats });
    if (long !== full[t]) {
      divergences.push({ ply: t + 1, played: coord(full[t]), long: coord(long), depth: stats.depth });
    }
    board[full[t]] = player;
  }
  if (divergences.length) {
    console.log(`game ${g.game} (${g.moves.length} plies): ` +
      divergences.slice(0, 4).map(d => `ply${d.ply} played ${d.played} vs long ${d.long}`).join(' | '));
  } else {
    console.log(`game ${g.game} (${g.moves.length} plies): white moves match long think`);
  }
}
