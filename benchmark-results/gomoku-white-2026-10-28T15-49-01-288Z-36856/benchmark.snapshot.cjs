// White-only variant of gomoku-benchmark-100.cjs. Same seeded opening
// generator and snapshot layout, but every game has the engine on white so a
// run isolates the metric the extreme stats card reports for AI 白棋.
// Example: node tests/gomoku-benchmark-white.cjs 40 3000 4
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const size = 25, cells = size * size;
function won(board, index, p) {
  const x = index % size, y = Math.floor(index / size);
  return [[1,0],[0,1],[1,1],[1,-1]].some(([dx,dy]) => {
    let count = 1;
    for (const sign of [-1,1]) for (let k = 1; k < 5; k++) {
      const nx = x + k * dx * sign, ny = y + k * dy * sign;
      if (nx < 0 || nx >= size || ny < 0 || ny >= size || board[ny * size + nx] !== p) break;
      count++;
    }
    return count >= 5;
  });
}
// Same seed and generation rules as the paired benchmark, so the first N
// openings of a white-only run match the first N paired openings.
function openings(count, seedArg) {
  let seed = Number(seedArg) || 0x1e775eed;
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  const seen = new Set(), result = [];
  function canonical(prefix) {
    const keys = [];
    for (let symmetry = 0; symmetry < 8; symmetry++) {
      keys.push(prefix.map(i => {
        let x = i % size - 12, y = Math.floor(i / size) - 12;
        if (symmetry & 4) x = -x;
        for (let r = 0; r < (symmetry & 3); r++) [x,y] = [-y,x];
        return `${x},${y}`;
      }).join(';'));
    }
    return keys.sort()[0];
  }
  while (result.length < count) {
    const prefix = [312];
    for (let turn = 1; turn < 4; turn++) {
      const options = [];
      for (let y = 9; y <= 15; y++) for (let x = 9; x <= 15; x++) {
        const cell = y * size + x;
        if (prefix.includes(cell)) continue;
        if (prefix.some(p => Math.max(Math.abs(p % size - x), Math.abs(Math.floor(p / size) - y)) <= 2)) options.push(cell);
      }
      prefix.push(options[Math.floor(random() * options.length)]);
    }
    const key = canonical(prefix);
    if (!seen.has(key)) { seen.add(key); result.push(prefix); }
  }
  return result;
}
if (!isMainThread) {
  const { chooseMove } = require(workerData.engine);
  const { bestMove } = require(workerData.baseline);
  parentPort.on('message', ({ game, opening, maxMs }) => {
    const board = Array(cells).fill(0), moves = opening.slice();
    opening.forEach((cell, i) => { board[cell] = i % 2 + 1; });
    const extreme = 2;
    const started = Date.now(); let result = 0;
    for (let turn = opening.length; turn < cells; turn++) {
      const player = turn % 2 + 1;
      const move = player === extreme ? chooseMove(board, player, { maxMs }) : bestMove(board, player, 'HARD');
      if (!Number.isInteger(move) || move < 0 || move >= cells || board[move]) throw new Error(`Illegal move ${move} in game ${game}`);
      board[move] = player; moves.push(move);
      if (won(board, move, player)) { result = player; break; }
    }
    parentPort.postMessage({ game, opening, extreme, result, moves, elapsedMs: Date.now() - started });
  });
} else {
  const games = Number(process.argv[2] || 40), maxMs = Number(process.argv[3] || 3000), concurrency = Number(process.argv[4] || 4);
  const seed = process.argv[6] ? Number(process.argv[6]) : 0x1e775eed;
  if (!Number.isInteger(games) || games < 1 || !Number.isInteger(concurrency) || concurrency < 1 || !Number.isFinite(maxMs) || maxMs < 20) throw new Error('Use a game count, positive concurrency, and >=20ms budget');
  const dir = path.resolve('benchmark-results', `gomoku-white-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`);
  fs.mkdirSync(dir, { recursive: true });
  const engine = path.join(dir, 'gomoku-extreme.snapshot.cjs'), baseline = path.join(dir, 'gomoku-hard.snapshot.cjs');
  fs.copyFileSync(path.resolve(process.argv[5] || 'js/gomoku-extreme.js'), engine);
  fs.copyFileSync(path.resolve('tests/gomoku-hard-baseline.cjs'), baseline);
  fs.copyFileSync(__filename, path.join(dir, 'benchmark.snapshot.cjs'));
  const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const generated = openings(games, seed), jobs = generated.map((opening, i) => ({ game: i + 1, opening, maxMs }));
  const metadata = { games, maxMs, concurrency, whiteOnly: true, seed: '0x' + (seed >>> 0).toString(16), openingDescription: `${games} dihedrally unique, randomly forced four-ply openings near centre; engine always white`, engineSHA256: hash(engine), baselineSHA256: hash(baseline), benchmarkSHA256: hash(path.join(dir, 'benchmark.snapshot.cjs')), cpu: os.cpus()[0].model, logicalCPUs: os.cpus().length, started: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  fs.writeFileSync(path.join(dir, 'games.jsonl'), '');
  console.log(JSON.stringify({ directory: dir, ...metadata }));
  let next = 0, done = 0, engineWins = 0, hardWins = 0, draws = 0;
  function assign(worker) {
    if (next < jobs.length) worker.postMessage(jobs[next++]);
    else worker.terminate();
  }
  for (let i = 0; i < Math.min(concurrency, games); i++) {
    const worker = new Worker(__filename, { workerData: { engine, baseline } });
    worker.on('message', game => {
      fs.appendFileSync(path.join(dir, 'games.jsonl'), JSON.stringify(game) + '\n');
      done++;
      if (!game.result) draws++; else if (game.result === game.extreme) engineWins++; else hardWins++;
      console.log(JSON.stringify({ done, game: game.game, engineWins, hardWins, draws, elapsedMs: game.elapsedMs }));
      if (done === games) {
        const summary = { ...metadata, completed: new Date().toISOString(), elapsedMs: Date.now() - Date.parse(metadata.started), engineWins, hardWins, draws, engineWhiteWinRate: engineWins / games };
        fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2));
        console.log(JSON.stringify(summary));
      }
      assign(worker);
    });
    worker.on('error', error => { console.error(error); process.exitCode = 1; });
    assign(worker);
  }
}
