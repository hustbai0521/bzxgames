/* ============================================================
   sudoku.js — 数独（经典规则，固定清新自然风格）
   引擎：随机生成完整终盘 → 挖洞并保证唯一解（MRV 回溯计数）；
   三档难度（简单 40 提示数 / 中等 31 / 困难 26）。
   功能：笔记（候选数）、冲突高亮、同行同列同宫与同数字联动高亮、
   撤销、橡皮、点击开始后出题与计时、最佳纪录（按难度持久化）。
   桌面适配：方向键移动选格、1-9 填数、退格擦除、N 切换笔记。
   ============================================================ */
(function () {
  "use strict";
  const BZX = window.BZX;
  const el = BZX.el;

  /* ---------------- 引擎 ---------------- */

  const POP = (function () {
    const t = new Array(512);
    for (let i = 0; i < 512; i++) {
      let n = 0, x = i;
      while (x) { n += x & 1; x >>= 1; }
      t[i] = n;
    }
    return t;
  })();
  const BIT = (v) => 1 << (v - 1);
  const VAL = (bit) => 31 - Math.clz32(bit) + 1;

  function shuffled(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // 生成一个随机完整终盘
  function generateSolved() {
    const grid = new Array(81).fill(0);
    const rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
    function fill(i) {
      if (i === 81) return true;
      const r = (i / 9) | 0, c = i % 9, b = ((r / 3) | 0) * 3 + ((c / 3) | 0);
      const used = rows[r] | cols[c] | boxes[b];
      for (const v of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
        const bit = BIT(v);
        if (used & bit) continue;
        grid[i] = v;
        rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
        if (fill(i + 1)) return true;
        grid[i] = 0;
        rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
      }
      return false;
    }
    fill(0);
    return grid;
  }

  // 解数独并统计解的数量（上限 limit 即停）；grid 会被还原
  function countSolutions(grid, limit) {
    const rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
    for (let i = 0; i < 81; i++) {
      if (grid[i] === 0) continue;
      const r = (i / 9) | 0, c = i % 9, b = ((r / 3) | 0) * 3 + ((c / 3) | 0);
      const bit = BIT(grid[i]);
      if ((rows[r] | cols[c] | boxes[b]) & bit) return 0; // 给定盘面自相矛盾
      rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
    }
    let count = 0;
    function dfs() {
      if (count >= limit) return;
      let best = -1, bestMask = 0, bestCount = 10;
      for (let i = 0; i < 81; i++) {
        if (grid[i] !== 0) continue;
        const r = (i / 9) | 0, c = i % 9, b = ((r / 3) | 0) * 3 + ((c / 3) | 0);
        const mask = ~(rows[r] | cols[c] | boxes[b]) & 0x1FF;
        const n = POP[mask];
        if (n === 0) return; // 死局
        if (n < bestCount) {
          bestCount = n; best = i; bestMask = mask;
          if (n === 1) break;
        }
      }
      if (best === -1) { count++; return; }
      const r = (best / 9) | 0, c = best % 9, b = ((r / 3) | 0) * 3 + ((c / 3) | 0);
      let m = bestMask;
      while (m && count < limit) {
        const bit = m & -m; m ^= bit;
        grid[best] = VAL(bit);
        rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
        dfs();
        grid[best] = 0;
        rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
      }
    }
    dfs();
    return count;
  }

  const CLUE_TARGETS = { EASY: 40, MEDIUM: 31, HARD: 25 };

  // 从完整终盘挖洞：每一步都保持唯一解
  function makePuzzle(solution, targetClues) {
    const puzzle = solution.slice();
    const positions = shuffled([...Array(81).keys()]);
    let clues = 81;
    const startedAt = performance.now();
    for (const p of positions) {
      if (clues <= targetClues || performance.now() - startedAt > 1600) break;
      const backup = puzzle[p];
      puzzle[p] = 0;
      if (countSolutions(puzzle, 2) !== 1) puzzle[p] = backup;
      else clues--;
    }
    return { puzzle, clues };
  }

  function generate(difficulty) {
    const solution = generateSolved();
    const { puzzle } = makePuzzle(solution, CLUE_TARGETS[difficulty] || 40);
    return { puzzle, solution };
  }

  // 某一格在当前盘面下是否与同行/列/宫的另一格重复
  function conflictAt(cells, index) {
    const v = cells[index];
    if (v === 0) return false;
    const r = (index / 9) | 0, c = index % 9, br = ((r / 3) | 0) * 3, bc = ((c / 3) | 0) * 3;
    for (let i = 0; i < 81; i++) {
      if (i === index || cells[i] !== v) continue;
      const ri = (i / 9) | 0, ci = i % 9;
      if (ri === r || ci === c || (((ri / 3) | 0) === br && ((ci / 3) | 0) === bc)) return true;
    }
    return false;
  }

  function hasConflict(cells) {
    for (let i = 0; i < 81; i++) if (conflictAt(cells, i)) return true;
    return false;
  }

  // 供自动化测试使用
  window.__bzxSudokuTest = { generate, countSolutions, makePuzzle };

  /* ---------------- 局面状态（每次进入新开一局） ---------------- */

  const DIFFS = {
    EASY: { title: "简单", caption: "提示数较多" },
    MEDIUM: { title: "中等", caption: "稳扎稳打" },
    HARD: { title: "困难", caption: "深呼吸再来" },
  };
  const DIFF_ORDER = ["EASY", "MEDIUM", "HARD"];

  BZX.SudokuScreen = function (root) {
    const palette = BZX.THEMES.NATURE;
    root.classList.add("game-screen");
    root.setAttribute("data-theme", "nature");
    root.style.setProperty("--bg", "linear-gradient(to bottom," + palette.background.join(",") + ")");

    const difficulty = BZX.store.get("sudokuDifficulty", "EASY");
    const state = {
      difficulty,
      puzzle: new Array(81).fill(0), solution: null,
      cells: new Array(81).fill(0),
      notes: new Array(81).fill(0),
      selected: null,
      noteMode: BZX.store.get("sudokuNoteMode", false),
      timeSeconds: 0,
      status: "READY", // READY | PLAYING | DONE
      undoStack: [],
      moveId: 0,
    };
    let best = BZX.store.get("sudokuBest_" + difficulty, 0);
    let timer = null;

    function newGame() {
      clearInterval(timer);
      timer = null;
      state.puzzle = new Array(81).fill(0);
      state.solution = null;
      state.cells = new Array(81).fill(0);
      state.notes = new Array(81).fill(0);
      state.selected = null;
      state.timeSeconds = 0;
      state.status = "READY";
      state.undoStack = [];
      state.moveId++;
      best = BZX.store.get("sudokuBest_" + state.difficulty, 0);
    }

    function startGame() {
      if (state.status !== "READY") return;
      const g = generate(state.difficulty);
      state.puzzle = g.puzzle;
      state.solution = g.solution;
      state.cells = g.puzzle.slice();
      state.status = "PLAYING";
      renderAll();
      startTimer();
    }

    /* ---------------- 界面骨架 ---------------- */

    const backdrop = el("canvas", "backdrop-canvas");
    root.appendChild(backdrop);
    const stopNature = BZX.natureBackdrop(backdrop);

    const col = el("div", "portrait-col scroll-col");
    col.style.paddingTop = "16px";
    root.appendChild(col);

    const backBtn = el("button", "back-btn", "‹  返回游戏大厅");
    BZX.sfxButton(backBtn, () => BZX.router.backToLibrary());
    col.appendChild(backBtn);

    /* header */
    const header = el("div");
    const hRow = el("div");
    hRow.style.cssText = "display:flex;align-items:center;";
    const titleBox = el("div");
    const h1 = el("div", "brush-title", "数独");
    h1.style.fontSize = "36px";
    h1.style.backgroundImage = "linear-gradient(90deg," + palette.titleColors.join(",") + ")";
    h1.style.letterSpacing = "-1px";
    titleBox.appendChild(h1);
    titleBox.appendChild(el("div", "sub-caption", "CLASSIC SUDOKU"));
    hRow.appendChild(titleBox);
    const spring = el("div"); spring.style.flex = "1"; hRow.appendChild(spring);
    const undoBtn = BZX.roundAction("↶", "撤销", false, palette, () => undo());
    hRow.appendChild(undoBtn);
    const gap = el("div"); gap.style.width = "9px"; hRow.appendChild(gap);
    hRow.appendChild(BZX.roundAction("↻", "重新开始", true, palette, () => {
      newGame();
      renderAll();
    }));
    header.appendChild(hRow);
    header.appendChild(spacer(14));
    col.appendChild(header);

    /* score cards */
    const scoreRow = el("div");
    scoreRow.style.cssText = "display:flex;gap:11px;";
    const timeCard = BZX.scoreCard("用时", palette.primary);
    const bestCard = BZX.scoreCard("最佳", palette.tertiary);
    scoreRow.appendChild(timeCard.el);
    scoreRow.appendChild(bestCard.el);
    col.appendChild(scoreRow);
    timeCard.set(fmt(state.timeSeconds));
    bestCard.set(best ? fmt(best) : "--");
    col.appendChild(spacer(12));

    /* difficulty segments */
    const diffRow = el("div", "sudoku-diff-row");
    col.appendChild(diffRow);
    col.appendChild(spacer(12));

    const startRow = el("div");
    const startBtn = el("button", "overlay-pill pill-themed-filled", "开始游戏");
    startBtn.style.width = "100%";
    BZX.sfxButton(startBtn, startGame);
    startRow.appendChild(startBtn);
    startRow.appendChild(spacer(12));
    col.appendChild(startRow);

    /* board */
    const boardWrap = el("div", "sudoku-board-wrap");
    const board = el("div", "sudoku-grid");
    boardWrap.appendChild(board);
    col.appendChild(boardWrap);
    col.appendChild(spacer(12));

    /* number pad + tools */
    const pad = el("div", "sudoku-pad");
    const numBtns = [];
    for (let v = 1; v <= 9; v++) {
      const b = el("button", "round-action ra-themed sudoku-num", String(v));
      b.title = "填入 " + v;
      BZX.sfxButton(b, () => inputDigit(v));
      pad.appendChild(b);
      numBtns.push(b);
    }
    col.appendChild(pad);
    col.appendChild(spacer(10));

    const tools = el("div", "sudoku-tools");
    const eraseBtn = BZX.roundAction("⌫", "擦除", true, palette, () => erase());
    tools.appendChild(eraseBtn);
    const noteToggle = el("button", "sudoku-note-toggle" + (state.noteMode ? " active" : ""));
    renderNoteToggle();
    BZX.sfxButton(noteToggle, () => {
      state.noteMode = !state.noteMode;
      BZX.store.set("sudokuNoteMode", state.noteMode);
      renderNoteToggle();
    });
    tools.appendChild(noteToggle);
    col.appendChild(tools);
    col.appendChild(spacer(10));

    col.appendChild(BZX.hintPill(palette, "  每行每列每宫都是 1-9 · 打开笔记记录候选数"));
    col.appendChild(spacer(12));

    function renderNoteToggle() {
      noteToggle.className = "sudoku-note-toggle" + (state.noteMode ? " active" : "");
      noteToggle.innerHTML = "";
      const pen = el("span", "snt-pen", "✎");
      noteToggle.appendChild(pen);
      noteToggle.appendChild(el("span", "snt-label", "笔记"));
      noteToggle.appendChild(el("span", "snt-state", state.noteMode ? "开" : "关"));
    }

    /* ---------------- 棋盘渲染 ---------------- */

    const cellEls = [];
    function buildBoard() {
      BZX.clear(board);
      cellEls.length = 0;
      for (let i = 0; i < 81; i++) {
        const r = (i / 9) | 0, c = i % 9;
        const cell = el("div", "sudoku-cell");
        cell.dataset.idx = i;
        if (c === 2 || c === 5) cell.classList.add("b-right");
        if (r === 2 || r === 5) cell.classList.add("b-bottom");
        cell.addEventListener("click", () => {
          if (state.status !== "PLAYING") return;
          state.selected = i;
          renderBoard();
        });
        board.appendChild(cell);
        cellEls.push(cell);
      }
    }

    function renderBoard() {
      const playing = state.status === "PLAYING";
      startRow.hidden = state.status !== "READY";
      const conflicts = {};
      for (let i = 0; i < 81; i++) if (conflictAt(state.cells, i)) conflicts[i] = true;
      const selVal = state.selected !== null ? state.cells[state.selected] : 0;
      const selR = state.selected !== null ? (state.selected / 9) | 0 : -1;
      const selC = state.selected !== null ? state.selected % 9 : -1;
      const selB = state.selected !== null ? (((selR / 3) | 0) * 3 + ((selC / 3) | 0)) : -1;

      for (let i = 0; i < 81; i++) {
        const cell = cellEls[i];
        const r = (i / 9) | 0, c = i % 9, b = ((r / 3) | 0) * 3 + ((c / 3) | 0);
        const given = state.puzzle[i] !== 0;
        const v = state.cells[i];
        cell.className = "sudoku-cell" +
          (c === 2 || c === 5 ? " b-right" : "") +
          (r === 2 || r === 5 ? " b-bottom" : "") +
          (given ? " given" : " user") +
          (state.selected === i ? " sel" : "") +
          (state.selected !== null && i !== state.selected && (r === selR || c === selC || b === selB) ? " peer" : "") +
          (selVal !== 0 && v === selVal && i !== state.selected ? " same" : "") +
          (conflicts[i] ? " conflict" : "");
        BZX.clear(cell);
        if (v !== 0) {
          cell.appendChild(el("span", "sudoku-val", String(v)));
        } else if (state.notes[i]) {
          const notes = el("div", "sudoku-notes");
          for (let n = 1; n <= 9; n++) {
            notes.appendChild(el("span", null, (state.notes[i] & BIT(n)) ? String(n) : ""));
          }
          cell.appendChild(notes);
        }
      }
      // 数字按钮余量
      const counts = new Array(10).fill(0);
      state.cells.forEach((v) => { if (v) counts[v]++; });
      numBtns.forEach((b, idx) => {
        const v = idx + 1;
        b.classList.toggle("num-done", counts[v] >= 9);
        b.disabled = !playing;
      });
      undoBtn.disabled = !playing || state.undoStack.length === 0;
      eraseBtn.disabled = !playing;
      noteToggle.disabled = !playing;
      timeCard.set(fmt(state.timeSeconds));
      bestCard.set(best ? fmt(best) : "--");
    }

    function renderAll() {
      renderDiffRow();
      renderBoard();
    }

    /* ---------------- 难度选择 ---------------- */

    function renderDiffRow() {
      BZX.clear(diffRow);
      DIFF_ORDER.forEach((key) => {
        const d = DIFFS[key];
        const option = el("button", "sudoku-seg" + (state.difficulty === key ? " selected" : ""));
        const row = el("div", "so-row");
        row.appendChild(el("div", "so-dot"));
        row.appendChild(el("div", "so-label", d.title));
        option.appendChild(row);
        option.appendChild(el("div", "so-caption", d.caption));
        BZX.sfxButton(option, () => {
          if (state.difficulty === key) return;
          BZX.store.set("sudokuDifficulty", key);
          state.difficulty = key;
          newGame();
          renderAll();
        });
        diffRow.appendChild(option);
      });
    }

    /* ---------------- 操作 ---------------- */

    function pushUndo(idx) {
      state.undoStack.push({ idx, val: state.cells[idx], notes: state.notes[idx] });
      if (state.undoStack.length > 200) state.undoStack.shift();
    }

    function inputDigit(v) {
      if (state.status !== "PLAYING" || state.selected === null) return;
      const idx = state.selected;
      if (state.puzzle[idx] !== 0) return; // 给定数字不可改
      if (state.noteMode) {
        if (state.cells[idx] !== 0) return;
        pushUndo(idx);
        state.notes[idx] ^= BIT(v);
      } else {
        if (state.cells[idx] === v) {
          pushUndo(idx);
          state.cells[idx] = 0; // 再点同数字 = 擦除
        } else {
          pushUndo(idx);
          state.cells[idx] = v;
          state.notes[idx] = 0;
        }
        checkWin();
      }
      state.moveId++;
      renderBoard();
    }

    function erase() {
      if (state.status !== "PLAYING" || state.selected === null) return;
      const idx = state.selected;
      if (state.puzzle[idx] !== 0) return;
      if (state.cells[idx] === 0 && state.notes[idx] === 0) return;
      pushUndo(idx);
      state.cells[idx] = 0;
      state.notes[idx] = 0;
      state.moveId++;
      renderBoard();
    }

    function undo() {
      if (state.status !== "PLAYING" || !state.undoStack.length) return;
      const u = state.undoStack.pop();
      state.cells[u.idx] = u.val;
      state.notes[u.idx] = u.notes;
      state.moveId++;
      renderBoard();
    }

    function checkWin() {
      if (state.cells.some((v) => v === 0)) return;
      if (hasConflict(state.cells)) return;
      state.status = "DONE";
      const t = state.timeSeconds;
      let isRecord = false;
      if (!best || t < best) {
        best = t;
        BZX.store.set("sudokuBest_" + state.difficulty, best);
        isRecord = true;
      }
      renderBoard();
      BZX.dialog(root, {
        surface: palette.surface,
        title: "拼图完成！",
        titleColor: palette.primary,
        body: "用时 " + fmt(t) + "（" + DIFFS[state.difficulty].title + "难度）" + (isRecord ? "，这是你的新纪录！" : "，最佳纪录 " + fmt(best) + "。"),
        bodyColor: palette.mutedText,
        confirm: {
          label: "再来一局",
          onClick: () => { newGame(); renderAll(); },
        },
        confirmBg: palette.secondary,
        dismissible: false,
      });
    }

    /* ---------------- 计时与输入 ---------------- */

    function startTimer() {
      clearInterval(timer);
      timer = setInterval(() => {
        if (state.status === "PLAYING" && !document.hidden) {
          state.timeSeconds++;
          timeCard.set(fmt(state.timeSeconds));
        }
      }, 1000);
    }

    const keyHandler = (e) => {
      if (!root.isConnected || state.status !== "PLAYING") return;
      if (e.key >= "1" && e.key <= "9") { inputDigit(Number(e.key)); e.preventDefault(); return; }
      if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") { erase(); e.preventDefault(); return; }
      if (e.key === "n" || e.key === "N") {
        state.noteMode = !state.noteMode;
        BZX.store.set("sudokuNoteMode", state.noteMode);
        renderNoteToggle();
        return;
      }
      const delta = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (delta && state.selected !== null) {
        const next = state.selected + delta;
        if (next >= 0 && next < 81 && !(delta === -1 && next % 9 === 8) && !(delta === 1 && next % 9 === 0)) {
          state.selected = next;
          renderBoard();
        }
        e.preventDefault();
      } else if (delta && state.selected === null) {
        state.selected = 40;
        renderBoard();
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", keyHandler);

    buildBoard();
    newGame();
    renderAll();

    // 测试钩子：端到端验证用
    window.__bzxSudokuDebug = { state, inputDigit, erase, newGame };

    return () => {
      clearInterval(timer);
      stopNature();
      document.removeEventListener("keydown", keyHandler);
      delete window.__bzxSudokuDebug;
    };
  };

  /* ---------------- 工具 ---------------- */

  function fmt(seconds) {
    const m = Math.floor(seconds / 60), s = seconds % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function spacer(h) {
    const s = el("div");
    s.style.height = h + "px";
    return s;
  }
})();
