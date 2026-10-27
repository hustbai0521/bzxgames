// Exercise both board skins and the board-size transitions without a browser.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

class Element {
  constructor(tag, className = "", text = "") {
    this.tagName = tag; this.className = className; this.textContent = text;
    this.children = []; this.style = { setProperty() {} }; this.events = {};
    this.classList = { add() {}, toggle() {} }; this.isConnected = true;
  }
  appendChild(child) { this.children.push(child); return child; }
  addEventListener(name, fn) { this.events[name] = fn; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 600, height: 600 }; }
  getContext() { return ctx; }
  querySelector() { return new Element("span"); }
}
const gradient = { addColorStop() {} };
const ctx = new Proxy({}, { get(target, prop) { return target[prop] || (() => gradient); }, set(target, prop, value) { target[prop] = value; return true; } });
const store = new Map();
const BZX = {
  el: (tag, className, text) => new Element(tag, className, text),
  store: { get: (key, fallback) => store.has(key) ? store.get(key) : fallback, set: (key, value) => store.set(key, value) },
  inkWash: () => () => {}, sfxButton: (element, fn) => { element.click = fn; },
  clear: (element) => { element.children = []; },
  fitCanvas: () => ({ ctx, state: { w: 600, h: 600 }, resize() {} }),
  animLoop: () => () => {}, router: {}, dialog: () => {},
};
const window = { BZX, devicePixelRatio: 1, GomokuExtreme: { chooseMove: () => 312 } };
const document = { createElementNS: () => ({ setAttribute() {}, innerHTML: "" }), createTextNode: (text) => new Element("text", "", text) };
let source = fs.readFileSync(require.resolve("../js/gomoku.js"), "utf8");
source = source.replace(/\}\)\(\);\s*$/, "window.__gomokuTest = { state, resetWith, undo, play };\n})();");
vm.runInNewContext(source, { window, document, Path2D: class {}, setTimeout: () => 1, clearTimeout() {}, console });
const root = new Element("div");
BZX.GomokuScreen(root);
const api = window.__gomokuTest;
function find(element, predicate) {
  if (predicate(element)) return element;
  for (const child of element.children || []) { const result = find(child, predicate); if (result) return result; }
  return null;
}
const canvas = find(root, (e) => e.tagName === "canvas" && e.events.click);
assert.ok(canvas, "board canvas exists");
api.resetWith("PVE", "EXTREME", 1);
assert.equal(api.state.board.length, 625);
// The classic grid's first and last intersections include an inset of 12 px.
canvas.events.click({ clientX: 12, clientY: 12 });
assert.equal(api.state.board[0], 1, "classic top-left intersection");
// Timers are suppressed in this harness; allow undo after the simulated thinking phase.
api.state.aiThinking = false;
api.undo();
assert.equal(api.state.board[0], 0, "undo on 25×25 board");
api.state.boardSkin = "EXERCISE";
canvas.events.click({ clientX: 588, clientY: 588 });
assert.equal(api.state.board[624], 1, "exercise bottom-right square");
api.resetWith("PVP", "EXTREME", 1);
assert.equal(api.state.board.length, 225, "PVP stays 15×15");
api.resetWith("PVE", "HARD", 1);
assert.equal(api.state.board.length, 225, "older difficulties stay 15×15");
console.log("Gomoku board size, both skins, edge input and undo: passed");
