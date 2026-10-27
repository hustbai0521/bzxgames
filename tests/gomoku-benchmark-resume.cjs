// Resume an interrupted benchmark using its original, hash-verified snapshots.
// Usage: node tests/gomoku-benchmark-resume.cjs <run-directory> [--dry-run]
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { Worker } = require('node:worker_threads');
const assert = require('node:assert/strict');

const dir = path.resolve(process.argv[2] || '');
const dryRun = process.argv[3] === '--dry-run';
if (!process.argv[2] || (process.argv[3] && !dryRun)) throw new Error('Usage: node tests/gomoku-benchmark-resume.cjs <run-directory> [--dry-run]');
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf8'));
assert.ok(Number.isInteger(meta.games) && meta.games >= 2 && meta.games % 2 === 0);
assert.ok(Number.isInteger(meta.concurrency) && meta.concurrency >= 1);
assert.ok(Number.isFinite(meta.maxMs) && meta.maxMs >= 20);
assert.equal(meta.seed, '0x1e775eed', 'Unsupported opening seed');
const snapshot = path.join(dir, 'benchmark.snapshot.cjs');
const engine = path.join(dir, 'gomoku-extreme.snapshot.cjs');
const baseline = path.join(dir, 'gomoku-hard.snapshot.cjs');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert.equal(hash(snapshot), meta.benchmarkSHA256, 'Benchmark snapshot hash mismatch');
assert.equal(hash(engine), meta.engineSHA256, 'Engine snapshot hash mismatch');
assert.equal(hash(baseline), meta.baselineSHA256, 'Baseline snapshot hash mismatch');

// Reuse the audited snapshot's exact opening generator rather than a copy.
const source = fs.readFileSync(snapshot, 'utf8');
const boundary = source.indexOf('if (!isMainThread) {');
assert.ok(boundary > 0, 'Unknown benchmark snapshot format');
const context = { require, globalThis: {} };
vm.runInNewContext(source.slice(0, boundary) + '\nglobalThis.generate = openings;', context, { timeout: 10000 });
const generated = context.globalThis.generate(meta.games / 2);
const records = fs.readFileSync(path.join(dir, 'games.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
// Audit replays every move, checks results and verifies unique IDs and hashes.
const audit = spawnSync(process.execPath, [path.join(__dirname, 'gomoku-benchmark-audit.cjs'), dir], { encoding: 'utf8' });
if (audit.status !== 0) throw new Error('Existing records failed audit: ' + (audit.stderr || audit.stdout));
const completed = new Set();
let extremeWins = 0, hardWins = 0, draws = 0;
for (const game of records) {
  assert.deepEqual(game.opening, Array.from(generated[Math.floor((game.game - 1) / 2)]), `Opening mismatch for game ${game.game}`);
  completed.add(game.game);
  if (!game.result) draws++; else if (game.result === game.extreme) extremeWins++; else hardWins++;
}
const jobs = [];
for (let game = 1; game <= meta.games; game++) {
  if (!completed.has(game)) jobs.push({ game, opening: Array.from(generated[Math.floor((game - 1) / 2)]), extreme: game % 2 ? 1 : 2, maxMs: meta.maxMs });
}
console.log(JSON.stringify({ directory: dir, completed: records.length, remaining: jobs.length, extremeWins, hardWins, draws, concurrency: meta.concurrency, maxMs: meta.maxMs }));
if (dryRun || !jobs.length) process.exit(0);
if (fs.existsSync(path.join(dir, 'summary.json'))) throw new Error('Incomplete run already has a summary');

// An exclusive lock prevents two resume processes from appending duplicate games.
const lock = path.join(dir, 'resume.lock');
const fd = fs.openSync(lock, 'wx');
fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, started: new Date().toISOString() }));
fs.closeSync(fd);
function unlock() { try { fs.unlinkSync(lock); } catch (_) {} }
process.on('exit', unlock);
process.on('SIGINT', () => process.exit(130));
process.on('SIGTERM', () => process.exit(143));
const resumedAt = new Date().toISOString();
const resumedMs = Date.now();
let next = 0, done = records.length, failed = false;
const workers = [];
function fail(error) {
  if (failed) return;
  failed = true;
  console.error(error);
  Promise.all(workers.map(worker => worker.terminate())).finally(() => process.exit(1));
}
function assign(worker) {
  if (failed) return;
  if (next < jobs.length) {
    const job = jobs[next++]; worker.expectedGame = job.game; worker.postMessage(job);
  } else { worker.expectedGame = null; worker.terminate(); }
}
for (let i = 0; i < Math.min(meta.concurrency, jobs.length); i++) {
  // This is the original worker code, so engine behavior is unchanged.
  const worker = new Worker(snapshot, { workerData: { engine, baseline } });
  workers.push(worker);
  worker.on('message', game => {
    try {
      assert.equal(game.game, worker.expectedGame);
      assert.ok(!completed.has(game.game), 'Duplicate result');
      assert.deepEqual(game.opening, Array.from(generated[Math.floor((game.game - 1) / 2)]));
      assert.equal(game.extreme, game.game % 2 ? 1 : 2);
      fs.appendFileSync(path.join(dir, 'games.jsonl'), JSON.stringify(game) + '\n');
      completed.add(game.game); done++;
      if (!game.result) draws++; else if (game.result === game.extreme) extremeWins++; else hardWins++;
      console.log(JSON.stringify({ done, game: game.game, extremeWins, hardWins, draws, elapsedMs: game.elapsedMs }));
      if (done === meta.games) {
        // Replay all games before declaring completion.
        const check = spawnSync(process.execPath, [path.join(__dirname, 'gomoku-benchmark-audit.cjs'), dir], { encoding: 'utf8' });
        if (check.status !== 0) throw new Error('Final audit failed: ' + (check.stderr || check.stdout));
        const summary = { ...meta, resumedAt, resumedElapsedMs: Date.now() - resumedMs, completed: new Date().toISOString(), extremeWins, hardWins, draws, hardWinRate: hardWins / meta.games };
        fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2));
        console.log(JSON.stringify(summary));
      }
      assign(worker);
    } catch (error) { fail(error); }
  });
  worker.on('error', fail);
  worker.on('exit', code => {
    if (!failed && worker.expectedGame != null) fail(new Error(`Worker exited with code ${code} before completing game ${worker.expectedGame}`));
  });
  assign(worker);
}
