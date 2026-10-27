// Compare nodes reached in the same three-second position at one and four
// concurrent searches. This instruments a copy in a VM; production is untouched.
const fs = require('node:fs');
const vm = require('node:vm');
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
if (!isMainThread) {
  let source = fs.readFileSync(require.resolve('../js/gomoku-extreme.js'), 'utf8').replace(/\r\n/g, '\n');
  source = source.replace('      best = iterationBest;', '      best = iterationBest; context.completedDepth = depth;');
  source = source.replace('    return best;\n  }\n\n  return { chooseMove };', '    globalThis.searchStats = { nodes: context.nodes, depth: context.completedDepth || 0 }; return best;\n  }\n\n  return { chooseMove };');
  if (!source.includes('globalThis.searchStats')) throw new Error('Instrumentation marker missing');
  const context = { module: { exports: {} }, Date, Int8Array, Int32Array, Uint8Array, Uint32Array, Map, Math, Number };
  vm.runInNewContext(source, context);
  const board = Array(625).fill(0); [312,339,287,314].forEach((p, i) => { board[p] = i % 2 + 1; });
  const start = Date.now(), cpu = process.cpuUsage();
  const move = context.module.exports.chooseMove(board, 1, { maxMs: 3000 });
  parentPort.postMessage({ move, ...context.searchStats, elapsedMs: Date.now() - start, processCpu: process.cpuUsage(cpu), index: workerData.index });
} else {
  async function trial(count) {
    const start = Date.now();
    const result = await Promise.all(Array.from({length: count}, (_, index) => new Promise((resolve, reject) => {
      const worker = new Worker(__filename, {workerData: {index}});
      worker.on('message', resolve); worker.on('error', reject);
    })));
    return { concurrency: count, elapsedMs: Date.now() - start, result };
  }
  const schedule = process.argv.length > 2 ? process.argv.slice(2).map(Number) : [1,1,1,4,4,4];
  (async () => { for (const count of schedule) console.log(JSON.stringify(await trial(count))); })().catch(error => { console.error(error); process.exitCode = 1; });
}
