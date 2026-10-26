const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

// Expose the actual engine inside an isolated VM, without adding browser globals
// or test hooks to the shipped game. VM timeouts catch main-thread deadlocks.
const source = fs.readFileSync(path.join(__dirname, "../js/tetris.js"), "utf8");
const marker = "  /* ---------------- screen ---------------- */";
assert.ok(source.includes(marker));
const engineSource = source.replace(marker,
  "globalThis.engine = { WIDTH, HEIGHT, TETROMINOES, NAMES, spawn, collides, dropPosition, newGame, actions };\n" + marker);

function run(code) {
  const context = vm.createContext({
    assert,
    window: { BZX: { store: { set() {} } } },
  });
  vm.runInContext(engineSource, context, { timeout: 1000 });
  vm.runInContext("const { WIDTH, HEIGHT, TETROMINOES, NAMES, spawn, collides, dropPosition, newGame, actions } = engine;\n" + code,
    context, { timeout: 1000 });
}

test("every piece keeps four occupied cells through repeated rotations", () => run(`
  for (const type of NAMES) {
    const state = newGame(0);
    state.falling = spawn(type);
    for (let rotation = 1; rotation <= 32; rotation++) {
      actions.rotate(state);
      assert.equal(state.falling.cells.flat().filter(Boolean).length, 4,
        type + " after " + rotation + " rotations");
      if (rotation % 4 === 0) {
        assert.deepEqual(state.falling.cells, TETROMINOES[type].cells);
      }
    }
  }
`));

test("ghost landing terminates and reaches the floor after any rotation", () => run(`
  for (const type of NAMES) {
    const state = newGame(0);
    state.falling = spawn(type);
    for (let rotation = 0; rotation < 8; rotation++) {
      const distance = dropPosition(state.board, state.falling);
      assert.equal(distance, HEIGHT - state.falling.cells.length);
      const landed = { ...state.falling, y: state.falling.y + distance };
      assert.equal(collides(state.board, landed), false);
      assert.equal(collides(state.board, { ...landed, y: landed.y + 1 }), true);
      actions.rotate(state);
    }
  }
`));

test("hard drop after repeated rotations locks four cells at the ghost position", () => run(`
  for (const type of NAMES) {
    for (let rotation = 0; rotation < 8; rotation++) {
      const state = newGame(0);
      state.status = "PLAYING";
      state.falling = spawn(type);
      for (let i = 0; i < rotation; i++) actions.rotate(state);
      const piece = state.falling;
      const distance = dropPosition(state.board, piece);
      actions.hardDrop(state);
      assert.equal(state.board.filter(Boolean).length, 4);
      assert.equal(state.score, distance * 2);
      assert.equal(state.status, "PLAYING");
      piece.cells.forEach((row, y) => row.forEach((filled, x) => {
        if (filled) {
          assert.equal(state.board[(piece.y + distance + y) * WIDTH + piece.x + x],
            TETROMINOES[type].id);
        }
      }));
    }
  }
`));

test("ghost and hard drop stop on an existing stack", () => run(`
  const state = newGame(0);
  state.falling = spawn("O");
  state.board[15 * WIDTH + state.falling.x] = 6;
  assert.equal(dropPosition(state.board, state.falling), 13);
  actions.hardDrop(state);
  assert.equal(state.score, 26);
  assert.equal(state.board.filter(Boolean).length, 5);
  assert.equal(state.board[15 * WIDTH + 4], 6);
`));

test("rotation near a wall preserves collision handling", () => run(`
  const state = newGame(0);
  state.falling = spawn("I");
  actions.rotate(state);
  state.falling.x = WIDTH - 1;
  actions.rotate(state);
  assert.deepEqual(state.falling.cells, [[1], [1], [1], [1]]);
  assert.equal(collides(state.board, state.falling), false);
  actions.moveLeft(state);
  actions.rotate(state);
  assert.equal(state.falling.x, 6);
  assert.deepEqual(state.falling.cells, [[1, 1, 1, 1]]);
  assert.equal(collides(state.board, state.falling), false);
`));

test("a rotated I piece clears four rows and advances the level", () => run(`
  const state = newGame(0);
  state.falling = spawn("I");
  actions.rotate(state);
  actions.rotate(state);
  actions.rotate(state);
  for (let y = HEIGHT - 4; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      if (x !== state.falling.x) state.board[y * WIDTH + x] = 2;
    }
  }
  state.lines = 6;
  actions.hardDrop(state);
  assert.equal(state.board.filter(Boolean).length, 0);
  assert.equal(state.board.length, WIDTH * HEIGHT);
  assert.equal(state.lines, 10);
  assert.equal(state.level, 2);
  assert.equal(state.score, 800 + 16 * 2);
  assert.equal(state.dropInterval, 535);
  assert.deepEqual(state.clearedRows, [16, 17, 18, 19]);
`));

test("drop calculations terminate even for an empty piece", () => run(`
  const state = newGame(0);
  state.falling.cells = [[false, false], [false, false]];
  const distance = dropPosition(state.board, state.falling);
  assert.ok(Number.isInteger(distance) && distance >= 0 && distance <= HEIGHT);
  actions.hardDrop(state);
  assert.equal(state.falling.cells.flat().filter(Boolean).length, 4);
`));

test("repeated rotate-and-drop games always make progress", () => run(`
  let randomState = 42;
  function random(max) {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState % max;
  }
  for (let game = 0; game < 20; game++) {
    const state = newGame(0);
    state.falling = spawn(NAMES[game % NAMES.length]);
    state.status = "PLAYING";
    let drops = 0;
    while (state.status === "PLAYING" && drops < 200) {
      const rotations = random(8);
      for (let i = 0; i < rotations; i++) actions.rotate(state);
      const direction = random(2) ? actions.moveLeft : actions.moveRight;
      const moves = random(WIDTH);
      for (let i = 0; i < moves; i++) direction(state);
      assert.equal(state.falling.cells.flat().filter(Boolean).length, 4);
      const distance = dropPosition(state.board, state.falling);
      assert.ok(distance >= 0 && distance < HEIGHT);
      actions.hardDrop(state);
      assert.equal(state.board.length, WIDTH * HEIGHT);
      drops++;
    }
    assert.ok(drops > 0);
    assert.equal(state.status, "OVER");
  }
`));
