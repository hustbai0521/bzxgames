// Dump the board around a critical white move with both sides' threat data.
// Run: node experiments/dump-position.cjs <resultDir> <gameNumber> <ply>
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const [dir, gameNo, plyArg] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4])];
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
const coord = c => `(${c % size},${Math.floor(c / size)})`;

const game = fs.readFileSync(path.join(dir, 'games.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)
  .find(g => g.game === gameNo);
const full = game.opening.concat(game.moves.slice(game.opening.length));
const board = new Array(cells).fill(0);
for (let t = 0; t < plyArg - 1 && t < full.length; t++) board[full[t]] = t % 2 + 1;

console.log(`game ${gameNo} before ply ${plyArg} (player ${plyArg % 2 + 1})`);
for (let y = 6; y <= 18; y++) {
  let row = '';
  for (let x = 6; x <= 18; x++) {
    const v = board[y * size + x];
    row += v === 1 ? ' X' : v === 2 ? ' O' : ' .';
  }
  console.log(`y${String(y).padStart(2)} ${row}`);
}
const ctx = context(board);
const toMove = plyArg % 2 + 1;
const data = engine.moves(board, toMove, ctx);
const foe = 3 - toMove;
const label = toMove === 2 ? 'white' : 'black';
console.log(`${label} to move. myWins=${data.myWins.length} theirWins=${data.theirWins.length}`);
const foeFours = data.list.filter(m => m.defense >= 120000);
console.log(`opponent four/open-four points: ${foeFours.slice(0, 8).map(m => `${coord(m.cell)}:${m.defense}`).join(' ')}`);
const mineTop = data.list.slice(0, 6).map(m => `${coord(m.cell)}:${Math.round(m.rank)}`);
console.log(`top ranks for ${label}: ${mineTop.join(' ')}`);
const stats = {};
const t0 = Date.now();
const chosen = engine.chooseMove(board, toMove, { maxMs: Number(process.argv[5] || 3000), stats });
console.log(`long search plays ${coord(chosen)} (benchmark played ${coord(full[plyArg - 1])}) depth=${stats.depth} nodes=${stats.nodes} ms=${Date.now() - t0}`);
