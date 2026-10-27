// Offline benchmark: the old hard engine is frozen in gomoku-hard-baseline.cjs
// with its board size widened to 25. Run: node tests/gomoku-extreme-match.cjs 8 3000
const { chooseMove } = require('../js/gomoku-extreme.js');
const { bestMove } = require('./gomoku-hard-baseline.cjs');
const games = Number(process.argv[2] || 8);
const maxMs = Number(process.argv[3] || 3000);
const openingOffset = Number(process.argv[4] || 0);
const whiteOnly = process.argv[5] === 'white';
const size = 25;
const openings = [[13, 12], [13, 13], [14, 12], [14, 13], [14, 14], [11, 13], [12, 14], [10, 11]];
function win(board, index, p) {
  const x = index % size, y = Math.floor(index / size);
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    let count = 1;
    for (const sign of [-1, 1]) for (let k = 1; k < 5; k++) {
      const nx = x + k * dx * sign, ny = y + k * dy * sign;
      if (nx < 0 || nx >= size || ny < 0 || ny >= size || board[ny * size + nx] !== p) break;
      count++;
    }
    if (count >= 5) return true;
  }
  return false;
}
let extremeWins = 0, hardWins = 0, draws = 0;
for (let game = 0; game < games; game++) {
  const extreme = whiteOnly ? 2 : game % 2 + 1;
  const opening = openings[(openingOffset + (whiteOnly ? game : Math.floor(game / 2))) % openings.length];
  const board = Array(size * size).fill(0);
  const moves = [12 + 12 * size, opening[0] + opening[1] * size];
  board[moves[0]] = 1; board[moves[1]] = 2;
  let result = 0;
  for (let turn = 2; turn < size * size; turn++) {
    const player = turn % 2 + 1;
    const move = player === extreme ? chooseMove(board, player, { maxMs }) : bestMove(board, player, 'HARD');
    if (!Number.isInteger(move) || move < 0 || move >= board.length || board[move]) throw new Error(`Illegal move ${move} in game ${game + 1}`);
    board[move] = player; moves.push(move);
    if (win(board, move, player)) { result = player; break; }
  }
  if (!result) draws++; else if (result === extreme) extremeWins++; else hardWins++;
  console.log(JSON.stringify({ game: game + 1, extreme, result, moves }));
}
console.log(JSON.stringify({ games, maxMs, openingOffset, whiteOnly, extremeWins, hardWins, draws, hardWinRate: hardWins / games }));
