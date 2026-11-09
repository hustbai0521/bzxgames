const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function screen() {
  let now = 0;
  let nextTimer = 1;
  const timers = new Map();
  class Element {
    constructor(tag, className = "", text = "") {
      this.tagName = tag; this.className = className || ""; this.textContent = text || "";
      this.children = []; this.events = {}; this.attributes = {}; this.style = {};
      this.value = ""; this.readOnly = false; this.clientHeight = 100; this.scrollTop = 0;
      const classes = new Set(this.className.split(/\s+/).filter(Boolean));
      this.classList = { add: (name) => classes.add(name), toggle: (name, force) => force ? classes.add(name) : classes.delete(name), contains: (name) => classes.has(name) };
    }
    appendChild(node) { this.children.push(node); return node; }
    replaceChildren(...nodes) { this.children = nodes; }
    addEventListener(name, fn) { this.events[name] = fn; }
    setAttribute(name, value) { this.attributes[name] = value; }
    getBoundingClientRect() { return { top: 0, bottom: 20 }; }
    focus() { this.focused = true; }
    fire(name, event = {}) { this.events[name]?.(event); }
  }
  const root = new Element("root");
  const BZX = { el: (tag, className, text) => new Element(tag, className, text), sfxButton: (node, cb) => node.addEventListener("click", cb), router: {} };
  const context = {
    window: { BZX },
    document: { createDocumentFragment: () => new Element("fragment") },
    performance: { now: () => now },
    setInterval: (fn) => { const id = nextTimer++; timers.set(id, fn); return id; },
    clearInterval: (id) => timers.delete(id),
  };
  for (const filename of ["typing-engine.js", "typing.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../js", filename), "utf8"), context);
  }
  const unmount = BZX.TypingScreen(root);
  function find(className) {
    function descend(node) {
      if (node.className.split(/\s+/).includes(className)) return node;
      for (const child of node.children) { const match = descend(child); if (match) return match; }
      return null;
    }
    const node = descend(root);
    assert.ok(node, "missing " + className);
    return node;
  }
  const nodes = Object.fromEntries(["typing-input", "typing-mode", "typing-select", "typing-restart", "typing-progress-text", "typing-progress-track", "typing-metrics", "typing-status", "typing-reading"].map((name) => [name, find(name)]));
  const modes = find("typing-modes").children;
  const values = nodes["typing-metrics"].children.map((box) => box.children[1]);
  return {
    root, input: nodes["typing-input"], zh: modes[0], en: modes[1], restart: nodes["typing-restart"],
    progress: nodes["typing-progress-text"], status: nodes["typing-status"], reading: nodes["typing-reading"],
    speed: values[0], accuracy: values[1], time: values[2], engine: BZX.TypingEngine, unmount,
    advance(ms) { now += ms; for (const fn of [...timers.values()]) fn(); },
    timerCount: () => timers.size,
  };
}

test("Chinese IME composition does not count uncommitted text", () => {
  const s = screen();
  const first = s.engine.passages.find((p) => p.language === "zh");
  s.input.fire("compositionstart");
  s.input.value = first.text.slice(0, 1);
  s.input.fire("input", { isComposing: true });
  s.advance(1000);
  assert.match(s.progress.textContent, /^0 \/ /);
  s.input.fire("compositionend");
  assert.match(s.progress.textContent, /^1 \/ /);
  assert.equal(s.accuracy.textContent, "100%");
  s.unmount();
});

test("errors and corrections update the highlighted text and accuracy", () => {
  const s = screen();
  const text = s.engine.passages.find((p) => p.language === "zh").text;
  s.input.value = text[0] + "错";
  s.input.fire("input", {});
  assert.equal(s.accuracy.textContent, "50%");
  assert.equal(s.reading.children[0].children[1].className, "typing-error");
  s.input.value = text.slice(0, 2);
  s.input.fire("input", {});
  assert.equal(s.accuracy.textContent, "100%");
  assert.equal(s.reading.children[0].children[1].className, "typing-correct");
  s.unmount();
});

test("completion freezes timer and makes the input read only", () => {
  const s = screen();
  const text = s.engine.passages.find((p) => p.language === "zh").text;
  s.input.fire("beforeinput", { inputType: "insertText" });
  s.advance(5000);
  s.input.value = text;
  s.input.fire("input", {});
  assert.equal(s.input.readOnly, true);
  assert.equal(s.timerCount(), 0);
  assert.match(s.status.textContent, /练习完成/);
  const displayed = [s.time.textContent, s.speed.textContent, s.accuracy.textContent];
  s.advance(5000);
  s.input.fire("beforeinput", { inputType: "insertText" });
  assert.deepEqual([s.time.textContent, s.speed.textContent, s.accuracy.textContent], displayed);
  assert.equal(s.timerCount(), 0);
  s.unmount();
});

test("language switch and restart reset the session; unmount stops the timer", () => {
  const s = screen();
  s.input.value = "予";
  s.input.fire("input", {});
  s.advance(3000);
  assert.equal(s.timerCount(), 1);
  s.en.fire("click");
  assert.equal(s.root.attributes["data-language"], "en");
  assert.equal(s.input.value, "");
  assert.equal(s.timerCount(), 0);
  assert.equal(s.time.textContent, "00:00");
  assert.match(s.speed.textContent, /WPM$/);
  s.input.value = "I";
  s.input.fire("input", {});
  assert.equal(s.timerCount(), 1);
  s.restart.fire("click");
  assert.equal(s.input.value, "");
  assert.equal(s.input.readOnly, false);
  assert.equal(s.timerCount(), 0);
  assert.equal(s.input.focused, true);
  s.input.value = "I";
  s.input.fire("input", {});
  assert.equal(s.timerCount(), 1);
  s.unmount();
  assert.equal(s.timerCount(), 0);
});
