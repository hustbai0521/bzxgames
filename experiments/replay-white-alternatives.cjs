// Replay each short white loss, but at the earliest engine-chosen white move
// where a long think disagrees with the benchmark move, play the long move
// instead. Reports whether the substitution flips the result.
// Run: node experiments/replay-white-alternatives.cjs <resultDir>
const fs = require('node:fs');
const path = require('node:path');

const { chooseMove } = require('../js/gomoku-extreme.js');
const { bestMove } = require('../tests/gomoku-hard-baseline.cjs');
const size = 25, cells = size * size;
const coord = c => `(${c % size},${Math.floor(c / size)})`;

function won(board, index, p) {
  const x = index % size, y = Math.floor(index / size);
  return [[1,0],[0,1],[1,1],[1,-1]].some(([dx,dy]) => {
    let n = 1;
    for (const sign of [-1,1]) for (let k = 1; k < 5; k++) {
      const nx = x + k*dx*sign, ny = y + k*dy*sign;
      if (nx < 0 || nx >= size || ny < 0 || ny >= size || board[ny*size+nx] !== p) break;
      n++;
    }
    return n >= 5;
  });
}
function playOut(board, turn) {
  for (; turn < cells; turn++) {
    const player = turn % 2 + 1;
    const move = player === 2
      ? chooseMove(board, 2, { maxMs: 3000 })
      : bestMove(board, player, 'HARD');
    if (!Number.isInteger(move) || move < 0 || move >= cells || board[move]) throw new Error('illegal move ' + move);
    board[move] = player;
    if (won(board, move, player)) return player;
  }
  return 0;
}

const dir = process.argv[2];
const games = fs.readFileSync(path.join(dir, 'games.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)
  .filter(g => g.result === 1 && g.moves.length <= 40)
  .sort((a, b) => a.moves.length - b.moves.length);

for (const g of games) {
  const full = g.moves;
  const board = new Array(cells).fill(0);
  let subPly = -1, subMove = 0;
  for (let t = 0; t < full.length && t < 30; t++) {
    const player = t % 2 + 1;
    if (player === 2 && t >= 4) {
      const stats = {};
      const long = chooseMove(board, 2, { maxMs: 30000, stats });
      if (long !== full[t]) {
        subPly = t + 1; subMove = long;
        break;
      }
    }
    board[full[t]] = player;
  }
  if (subPly < 0) { console.log(`game ${g.game}: no early divergence, skipped`); continue; }
  board[subMove] = 2;
  const result = playOut(board.slice(), subPly);
  const verdict = result === 2 ? 'FLIPPED to white win' : result === 1 ? 'still black win' : 'draw';
  console.log(`game ${g.game}: ply${subPly} played ${coord(full[subPly - 1])} -> long ${coord(subMove)}: ${verdict}`);
}
