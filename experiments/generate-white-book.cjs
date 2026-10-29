// Generate white-side opening book entries with long searches.
// Run: node experiments/generate-white-book.cjs [msPerEntry]
const { chooseMove } = require('../js/gomoku-extreme.js');
const size = 25, cells = size * size;
const cell = (x, y) => y * size + x;
const coord = c => `(${c % size},${Math.floor(c / size)})`;
const maxMs = Number(process.argv[2] || 25000);

function emptyBoard() { return new Array(cells).fill(0); }
function search(board, player) {
  const stats = {};
  const move = chooseMove(board, player, { maxMs, maxDepth: 12, stats });
  if (!Number.isInteger(move) || move < 0 || move >= cells || board[move]) throw new Error('bad move ' + move);
  return { move, stats };
}

const entries = [];

// White's first reply for the common symmetry classes of a black first move
// near the centre. One entry per class; the matcher tries all 8 symmetries.
const centre = 312;
const firstClasses = [
  [13, 12], [13, 13], [14, 12], [14, 13], [14, 14], [15, 12], [15, 13], [16, 12],
];
for (const [x, y] of firstClasses) {
  const board = emptyBoard();
  board[cell(x, y)] = 1;
  const { move, stats } = search(board, 2);
  entries.push({ black: [cell(x, y)], white: [], move });
  console.error(`first (${x},${y}) -> ${coord(move)} depth ${stats.depth} nodes ${stats.nodes}`);
}

// Around the centre: regenerate white's reply, then cover the common black
// second moves against it with one entry each.
{
  const board = emptyBoard();
  board[centre] = 1;
  const { move: reply } = search(board, 2);
  entries.push({ black: [centre], white: [], move: reply });
  console.error(`centre reply -> ${coord(reply)}`);

  const neighbours = [287, 288, 313, 338, 337, 336, 311, 286];
  const distance2 = [262, 362, 314, 310];
  for (const second of [...neighbours, ...distance2]) {
    if (second === reply || second === centre) continue;
    const b = emptyBoard();
    b[centre] = 1; b[second] = 1; b[reply] = 2;
    const { move, stats } = search(b, 2);
    entries.push({ black: [centre, second], white: [reply], move });
    console.error(`centre + ${coord(second)} vs ${coord(reply)} -> ${coord(move)} depth ${stats.depth}`);
  }
}

console.log(JSON.stringify(entries, null, 0));
