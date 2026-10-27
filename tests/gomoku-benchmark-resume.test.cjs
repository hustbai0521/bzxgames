const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

test('resume verifies snapshots and records, then plays only missing games', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gomoku-resume-test-'));
  const run = path.join(tempRoot, 'run');
  fs.mkdirSync(run);
  try {
    fs.copyFileSync(path.join(__dirname, 'gomoku-benchmark-100.cjs'), path.join(run, 'benchmark.snapshot.cjs'));
    // Small deterministic stub players allow this test to exercise the actual
    // worker and resume protocol without consuming minutes of search time.
    fs.writeFileSync(path.join(run, 'gomoku-extreme.snapshot.cjs'), 'exports.chooseMove = board => board.findIndex(x => !x);\n');
    fs.writeFileSync(path.join(run, 'gomoku-hard.snapshot.cjs'), 'exports.bestMove = board => board.findIndex(x => !x);\n');
    const hash = name => crypto.createHash('sha256').update(fs.readFileSync(path.join(run, name))).digest('hex');
    const meta = { games: 4, maxMs: 20, concurrency: 2, seed: '0x1e775eed', started: new Date().toISOString(),
      benchmarkSHA256: hash('benchmark.snapshot.cjs'), engineSHA256: hash('gomoku-extreme.snapshot.cjs'), baselineSHA256: hash('gomoku-hard.snapshot.cjs') };
    fs.writeFileSync(path.join(run, 'metadata.json'), JSON.stringify(meta));
    fs.writeFileSync(path.join(run, 'games.jsonl'), '');
    const resume = (...args) => spawnSync(process.execPath, [path.join(__dirname, 'gomoku-benchmark-resume.cjs'), run, ...args], { encoding: 'utf8', timeout: 30000 });
    let result = resume();
    assert.equal(result.status, 0, result.stderr);
    const file = path.join(run, 'games.jsonl');
    const all = fs.readFileSync(file, 'utf8').trim().split('\n');
    assert.equal(all.length, 4);
    // Simulate an interrupted run, retaining two completed records.
    fs.unlinkSync(path.join(run, 'summary.json'));
    fs.writeFileSync(file, all.slice(0, 2).join('\n') + '\n');
    result = resume('--dry-run');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).remaining, 2);
    result = resume();
    assert.equal(result.status, 0, result.stderr);
    const completed = fs.readFileSync(file, 'utf8').trim().split('\n');
    assert.deepEqual(completed.slice(0, 2), all.slice(0, 2));
    assert.equal(new Set(completed.map(line => JSON.parse(line).game)).size, 4);
    assert.ok(fs.existsSync(path.join(run, 'summary.json')));
    assert.ok(!fs.existsSync(path.join(run, 'resume.lock')));
    // Duplicate results and modified snapshots must fail before starting workers.
    fs.unlinkSync(path.join(run, 'summary.json'));
    fs.appendFileSync(file, completed[0] + '\n');
    assert.notEqual(resume('--dry-run').status, 0);
    fs.writeFileSync(file, completed.join('\n') + '\n');
    fs.appendFileSync(path.join(run, 'gomoku-extreme.snapshot.cjs'), '// altered\n');
    assert.notEqual(resume('--dry-run').status, 0);
  } finally {
    // The unique, resolved temp directory is created by this test itself.
    assert.ok(path.resolve(tempRoot).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
