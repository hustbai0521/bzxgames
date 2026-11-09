const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function screen() {
  let now = 0, nextTimer = 1;
  const timers = new Map(), timeouts = new Map(), listeners = {};
  const document = { activeElement: null };
  class Element {
    constructor(tag, className = "", text = "") {
      this.tagName = tag; this.className = className || ""; this.textContent = text || "";
      this.children = []; this.events = {}; this.attributes = {};
      this.style = { setProperty() {} }; this.value = ""; this.readOnly = false;
      this.selectionStart = 0; this.selectionEnd = 0; this.scrollTop = 0;
      const classes = new Set(this.className.split(/\s+/).filter(Boolean));
      this.classList = { add: n => classes.add(n), toggle: (n, on) => on ? classes.add(n) : classes.delete(n) };
    }
    appendChild(node) { node.parent = this; this.children.push(node); return node; }
    replaceChildren(...nodes) { this.children = nodes; nodes.forEach(n => n.parent = this); }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); }
    addEventListener(name, fn) { this.events[name] = fn; }
    setAttribute(name, value) { this.attributes[name] = value; }
    getBoundingClientRect() { return { top: 0, bottom: 20 }; }
    focus() { document.activeElement = this; this.fire("focus"); }
    setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
    fire(name, event = {}) { this.events[name]?.(event); }
  }
  const root = new Element("root");
  const BZX = { el: (tag, cls, text) => new Element(tag, cls, text), sfxButton: (node, cb) => node.addEventListener("click", cb), router: {} };
  const window = { BZX, innerWidth: 800, addEventListener: (n, f) => listeners[n] = f, removeEventListener: n => delete listeners[n] };
  const context = { window, document, performance: { now: () => now },
    setInterval: fn => { const id = nextTimer++; timers.set(id, fn); return id; },
    clearInterval: id => timers.delete(id),
    setTimeout: fn => { const id = nextTimer++; timeouts.set(id, fn); return id; },
    clearTimeout: id => timeouts.delete(id) };
  for (const filename of ["typing-engine.js", "typing.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../js", filename), "utf8"), context);
  }
  const unmount = BZX.TypingScreen(root);
  function findAll(className) {
    const found = [];
    function walk(node) { if (node.className.split(/\s+/).includes(className)) found.push(node); node.children.forEach(walk); }
    walk(root); return found;
  }
  const find = name => { const node = findAll(name)[0]; assert.ok(node, "missing " + name); return node; };
  const modes = find("typing-modes").children, values = find("typing-metrics").children.map(box => box.children[1]);
  function enter(input, value, event = {}) {
    input.value = value; input.selectionStart = input.selectionEnd = value.length; input.fire("input", event);
  }
  return { root, window, document, listeners, find, findAll, input: i => findAll("typing-line-input")[i],
    zh: modes[0], en: modes[1], restart: find("typing-restart"), progress: find("typing-progress-text"),
    status: find("typing-status"), speed: values[0], accuracy: values[1], time: values[2], engine: BZX.TypingEngine, unmount, enter,
    advance(ms) { now += ms; for (const fn of [...timers.values()]) fn(); },
    flushTimeouts() { const pending = [...timeouts.values()]; timeouts.clear(); pending.forEach(fn => fn()); },
    timerCount: () => timers.size };
}

test("IME candidates do not count until committed, including at a line break", () => {
  const s = screen(), first = s.engine.passages[0].text;
  const field = s.input(0);
  field.fire("compositionstart");
  s.enter(field, first.slice(0, 1), { isComposing: true });
  s.advance(1000);
  assert.match(s.progress.textContent, /^0 \/ /);
  field.fire("compositionend");
  s.flushTimeouts();
  assert.match(s.progress.textContent, /^1 \/ /);
  assert.equal(s.accuracy.textContent, "100%");
  field.fire("compositionstart");
  field.value = first.slice(0, 25); field.selectionStart = field.selectionEnd = field.value.length;
  field.fire("compositionend");
  s.flushTimeouts();
  assert.equal(s.input(0).value, first.slice(0, 23));
  assert.equal(s.input(1).value, first.slice(23, 25));
  assert.equal(s.document.activeElement, s.input(1));
  assert.equal(s.input(1).selectionStart, 2);
  s.unmount();
});

test("IME final input after compositionend commits once and moves to the right caret", () => {
  const s = screen(), text = s.engine.passages[0].text, field = s.input(0);
  field.fire("compositionstart");
  field.value = text.slice(0, 22); field.selectionStart = field.selectionEnd = 22;
  field.fire("compositionend");
  s.enter(field, text.slice(0, 25), { isComposing: false });
  s.flushTimeouts();
  assert.equal(s.input(0).value, text.slice(0, 23));
  assert.equal(s.input(1).value, text.slice(23, 25));
  assert.equal(s.document.activeElement, s.input(1));
  assert.equal(s.input(1).selectionStart, 2);
  s.enter(s.input(1), text.slice(23, 26));
  assert.match(s.progress.textContent, /^26 \/ /);
  assert.equal(s.accuracy.textContent, "100%");
  s.unmount();
});

test("a multi-character commit advances across multiple lines without losing caret position", () => {
  const s = screen(), text = s.engine.passages[0].text;
  s.enter(s.input(0), text.slice(0, 50));
  assert.equal(s.document.activeElement, s.input(2));
  assert.equal(s.input(2).value, text.slice(46, 50));
  assert.equal(s.input(2).selectionStart, 4);
  s.enter(s.input(2), text.slice(46, 51));
  assert.match(s.progress.textContent, /^51 \/ /);
  assert.equal(s.accuracy.textContent, "100%");
  s.unmount();
});

test("English translation opens and closes without resetting the practice", () => {
  const s = screen();
  assert.equal(s.find("typing-translation-toggle").hidden, true);
  s.en.fire("click");
  const button = s.find("typing-translation-toggle"), panel = s.find("typing-translation");
  assert.equal(button.hidden, false);
  assert.equal(panel.hidden, true);
  s.enter(s.input(0), "It");
  button.fire("click");
  assert.equal(panel.hidden, false);
  assert.match(s.find("typing-translation-text").textContent, /真理/);
  assert.equal(button.attributes["aria-expanded"], "true");
  assert.match(s.progress.textContent, /^2 \/ /);
  button.fire("click");
  assert.equal(panel.hidden, true);
  assert.equal(s.input(0).value, "It");
  s.zh.fire("click");
  assert.equal(button.hidden, true);
  s.unmount();
});

test("errors and corrections update individual original lines", () => {
  const s = screen(), text = s.engine.passages[0].text, field = s.input(0);
  s.enter(field, text[0] + "错");
  assert.equal(s.accuracy.textContent, "50%");
  assert.equal(s.findAll("typing-line-source")[0].children[1].className, "typing-error");
  s.enter(field, text.slice(0, 2));
  assert.equal(s.accuracy.textContent, "100%");
  assert.equal(s.findAll("typing-line-source")[0].children[1].className, "typing-correct");
  s.unmount();
});

test("typing across lines and backspace at a line start preserve progress", () => {
  const s = screen(), text = s.engine.passages[0].text;
  s.enter(s.input(0), text.slice(0, 23));
  assert.equal(s.document.activeElement, s.input(1));
  let prevented = false;
  s.input(1).setSelectionRange(0, 0);
  s.input(1).fire("beforeinput", { inputType: "deleteContentBackward", preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(s.input(0).value, text.slice(0, 22));
  assert.equal(s.document.activeElement, s.input(0));
  assert.match(s.progress.textContent, /^22 \/ /);
  s.unmount();
});

test("backspace before a filled next line keeps the caret at the deletion point", () => {
  const s = screen(), text = s.engine.passages[0].text;
  s.enter(s.input(0), text.slice(0, 23));
  s.enter(s.input(1), text.slice(23, 26));
  s.input(1).setSelectionRange(0, 0);
  s.input(1).fire("beforeinput", { inputType: "deleteContentBackward", preventDefault() {} });
  assert.equal(s.input(0).value, text.slice(0, 22) + text[23]);
  assert.equal(s.input(0).selectionStart, 22);
  assert.equal(s.input(1).value, text.slice(24, 26));
  s.unmount();
});

test("English spaces are visible and remain attached to the preceding line", () => {
  const s = screen();
  s.window.innerWidth = 375;
  s.en.fire("click");
  const source = s.findAll("typing-line-source")[0];
  const original = s.input(0).attributes["aria-label"];
  assert.match(original, /truth $/);
  assert.equal(source.children.at(-1).textContent, "·");
  s.enter(s.input(0), "It is a truth ");
  assert.equal(s.document.activeElement, s.input(1));
  assert.equal(s.accuracy.textContent, "100%");
  s.unmount();
});

test("completion freezes statistics, shows result and restarts from the dialog", () => {
  const s = screen(), text = s.engine.passages[0].text;
  s.input(0).fire("beforeinput", { inputType: "insertText" });
  s.advance(5000);
  for (let i = 0, offset = 0; offset < text.length; i++) {
    const source = s.findAll("typing-line-source")[i];
    const count = source.children.length;
    s.enter(s.input(i), text.slice(offset, offset + count));
    offset += count;
  }
  assert.equal(s.timerCount(), 0);
  assert.ok(s.find("typing-result"));
  assert.equal(s.findAll("typing-confetti-piece").length, 36);
  assert.ok(s.findAll("typing-line-input").every(input => input.readOnly));
  const displayed = [s.time.textContent, s.speed.textContent, s.accuracy.textContent];
  s.advance(5000);
  assert.deepEqual([s.time.textContent, s.speed.textContent, s.accuracy.textContent], displayed);
  s.find("typing-result-again").fire("click");
  assert.equal(s.findAll("typing-result").length, 0);
  assert.equal(s.input(0).value, "");
  assert.equal(s.time.textContent, "00:00");
  assert.equal(s.document.activeElement, s.input(0));
  s.unmount();
});

test("both full poems can be completed line by line", () => {
  for (const id of ["changhen", "pipa"]) {
    const s = screen(), select = s.find("typing-select");
    select.value = id; select.fire("change");
    const text = s.engine.passages.find(p => p.id === id).text;
    for (let i = 0, offset = 0; offset < text.length; i++) {
      const count = s.findAll("typing-line-source")[i].children.length;
      s.enter(s.input(i), text.slice(offset, offset + count));
      offset += count;
    }
    assert.ok(s.find("typing-result"), id);
    assert.equal(s.accuracy.textContent, "100%", id);
    s.unmount();
  }
});

test("language switch and viewport resize preserve or reset progress appropriately", () => {
  const s = screen();
  s.enter(s.input(0), "予观夫");
  s.advance(3000);
  s.window.innerWidth = 375; s.listeners.resize();
  assert.equal(s.input(0).value, "予观夫");
  assert.match(s.progress.textContent, /^3 \/ /);
  s.en.fire("click");
  assert.equal(s.root.attributes["data-language"], "en");
  assert.equal(s.input(0).value, "");
  assert.equal(s.timerCount(), 0);
  assert.match(s.speed.textContent, /WPM$/);
  s.enter(s.input(0), "I");
  s.restart.fire("click");
  assert.equal(s.input(0).value, "");
  assert.equal(s.timerCount(), 0);
  s.enter(s.input(0), "I");
  s.unmount();
  assert.equal(s.timerCount(), 0);
});
