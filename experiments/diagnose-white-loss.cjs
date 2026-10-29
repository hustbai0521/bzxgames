// Replay white losses from a white-only benchmark run and report, for each
// black move, black's threat profile so the losing moment can be located.
// Run: node experiments/diagnose-white-loss.cjs <resultDir> [gameNumber...]
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const dir = process.argv[2];
const onlyGames = process.argv.slice(3).map(Number);
const source = fs.readFileSync(path.resolve('js/gomoku-extreme.js'), 'utf8')
  .replace('return { chooseMove };', 'return { chooseMove, moves, updateNear, toggleHash, initCodes, setStone, candidates };');
const sandbox = { module: { exports: {} }, Date, Int8Array, Int16Array, Int32Array, Uint8Array, Uint16Array, Map };
vm.runInNewContext(source, sandbox, { timeout: 5000 });
const engine = sandbox.module.exports;

const size = 25, cells = size * size;
function context(board) {
  const ctx = {
    deadline: Date.now() + 600000, nodes: 0, timeout: {},
    scores: [null, new Int32Array(cells), new Int32Array(cells)],
    codes: [null, new Int16Array(cells * 4), new Int16Array(cells * 4)],
    hash1: 0, hash2: 0, near: new Uint16Array(cells), stones: 0,
  };
  for (let i = 0; i < cells; i++) {
    if (board[i]) engine.updateNear(ctx, i, 1);
    engine.toggleHash(ctx, i, board[i]);
    ctx.scores[1][i] = engine.initCodes(board, i, 1, ctx.codes[1]);
    ctx.scores[2][i] = engine.initCodes(board, i, 2, ctx.codes[2]);
  }
  return ctx;
}
function coord(c) { return `(${c % size},${Math.floor(c / size)})`; }
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

const games = fs.readFileSync(path.join(dir, 'games.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)
  .filter(g => g.result === 1 && (!onlyGames.length || onlyGames.includes(g.game)));

for (const g of games) {
  console.log(`\n=== game ${g.game} (${g.moves.length} plies) ===`);
  const board = new Array(cells).fill(0);
  const seq = g.opening.concat([]);
  // opening: 4 forced plies (index parity colours); remaining moves alternate
  const full = g.opening.concat(g.moves.slice(g.opening.length));
  for (let t = 0; t < full.length; t++) {
    const player = t % 2 + 1;
    const move = full[t];
    if (player === 2 && t + 1 < full.length) {
      // before white's move, report black threats white had to face next
    }
    board[move] = player;
    if (player === 1 && won(board, move, 1)) {
      console.log(`  ply ${t + 1} black wins at ${coord(move)}`);
      break;
    }
    if (player === 1 && t + 1 < full.length) {
      const ctx = context(board);
      const data = engine.moves(board, 2, ctx);
      const five = data.theirWins.length; // black five-points from white's view
      const fours = data.list.filter(m => m.defense >= 120000 && m.defense < 5000000).length;
      const openFours = data.list.filter(m => m.defense >= 5000000 && m.defense < 100000000).length;
      const openThrees = data.list.filter(m => m.defense >= 18000 && m.defense < 120000).length;
      if (five || openFours || fours > 1 || (fours && openThrees) || openThrees > 1) {
        console.log(`  after black ${coord(move)} (ply ${t + 1}): fivePts=${five} openFourPts=${openFours} fourPts=${fours} openThreePts=${openThrees} | white replies ${coord(full[t + 1])}`);
      }
    }
  }
}
