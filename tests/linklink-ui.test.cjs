const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("connector follows the board at different pixel ratios and sizes", () => {
  for (const dpr of [1, 1.5, 2]) {
    const frames = [];
    const ctx = new Proxy({}, { get: (obj, key) => obj[key] || (() => {}), set: (obj, key, value) => (obj[key] = value, true) });
    class Element {
      constructor() {
        this.style = { setProperty() {} }; this.classList = { add() {}, toggle() {}, contains() { return false; } };
        this.clientWidth = 420; this.clientHeight = 650; this.isConnected = true;
      }
      appendChild(child) { return child; }
      addEventListener() {}
      getContext() { return ctx; }
    }
    const BZX = {
      el: () => new Element(), SummerColors: { SeaGlass: "#368A91", WarmRose: "#B27C78" },
      sfxButton() {}, clear() {}, animLoop: (frame) => { frames.push(frame); return () => {}; }, router: {},
    };
    const window = { BZX, devicePixelRatio: dpr };
    const marker = "    layout();\n    renderTiles();\n    renderHeader();\n\n    return () => {";
    const source = fs.readFileSync(path.join(__dirname, "../js/linklink.js"), "utf8");
    assert.ok(source.includes(marker));
    vm.runInNewContext(source.replace(marker, "    window.testApi = { connector, board, boardArea, layout, startConnector, setPath: (path) => { state.matchedPath = path; } };\n" + marker), {
      window, ResizeObserver: class { observe() {} disconnect() {} }, performance: { now: () => 0 },
      setInterval: () => 1, clearInterval() {}, setTimeout: () => 1,
    });
    BZX.LinkScreen(new Element());
    const api = window.testApi;
    for (const width of [420, 250]) {
      api.boardArea.clientWidth = width;
      api.layout();
      assert.equal(api.connector.style.width, api.board.style.width);
      assert.equal(api.connector.style.height, api.board.style.height);
      assert.equal(api.connector.width, parseFloat(api.board.style.width) * dpr);
      api.setPath([[0, 0], [1, 0]]);
      api.startConnector();
      frames.at(-1)();
    }
  }
});
