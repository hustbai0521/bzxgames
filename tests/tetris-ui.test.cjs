const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("manual hard drops open the result dialog and stop input", () => {
  for (const input of ["keyboard", "button"]) {
    const events = {};
    let start, dialog;
    const ctx = new Proxy({}, { get: (obj, key) => obj[key] || (() => {}), set: (obj, key, value) => (obj[key] = value, true) });
    class Element {
      constructor() {
        this.style = { setProperty() {} }; this.classList = { add() {} };
        this.events = {}; this.clientWidth = 400; this.clientHeight = 600; this.isConnected = true;
      }
      appendChild(child) { return child; }
      addEventListener(name, fn) { this.events[name] = fn; }
      setAttribute() {}
      remove() {}
      getContext() { return ctx; }
      querySelector() { return new Element(); }
    }
    const palette = { key: "neon", background: ["#000", "#000"], titleColors: ["#000"], primary: "#000", secondary: "#000", tertiary: "#000", pieceColors: Array(8).fill("#000") };
    const BZX = {
      el: () => new Element(), getTheme: () => palette,
      store: { get: (_key, fallback) => fallback, set() {} },
      sfxButton() {}, roundAction: () => new Element(), scoreCard: () => ({ el: new Element(), set() {} }),
      hintPill: () => new Element(), hexA: () => "#000", techGrid: () => () => {},
      fitCanvas: () => ({ ctx, resize() {} }), autoPauseOnHide: () => () => {},
      startOverlay: (_palette, _root, callback) => { start = callback; return new Element(); },
      dialog: (_root, options) => { dialog = options; }, router: {},
    };
    const window = { BZX, devicePixelRatio: 1 };
    const document = { addEventListener: (name, fn) => { events[name] = fn; }, removeEventListener() {} };
    const marker = "    renderAll();\n    startLoop();\n\n    return () => {";
    const source = fs.readFileSync(path.join(__dirname, "../js/tetris.js"), "utf8");
    assert.ok(source.includes(marker));
    vm.runInNewContext(source.replace(marker, "    window.testApi = { state, spawn, btnHard };\n" + marker), {
      window, document, ResizeObserver: class { observe() {} disconnect() {} },
      performance: { now: () => 0 }, setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    });
    BZX.TetrisScreen(new Element());
    start();
    const { state, spawn, btnHard } = window.testApi;
    state.falling = spawn("O"); state.next = "O";
    state.board[20 + state.falling.x] = 1;
    if (input === "keyboard") events.keydown({ key: " ", preventDefault() {} });
    else btnHard.events.pointerdown({ button: 0, pointerType: "mouse" });
    assert.equal(state.status, "OVER");
    assert.ok(dialog, input + " should show the result");
    const board = state.board.slice();
    events.keydown({ key: " ", preventDefault() {} });
    assert.deepEqual(state.board, board);
  }
});
