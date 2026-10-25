/* ============================================================
   minesweeper.js — 扫雷（Win98 经典风格）
   逻辑对应 game/Minesweeper.kt + MinesweeperViewModel.kt。
   桌面适配：左键翻开（命中的数字自动弦开）、右键插旗、
   长按插旗（触屏）保留，插旗模式仍为纯旗模式。
   ============================================================ */
(function () {
  "use strict";
  const BZX = window.BZX;
  const el = BZX.el;

  /* colors (MinesweeperScreen.kt) */
  const FACE = "#C0C0C0", BEVEL_SHADOW = "#808080", INK = "#1A1A1A",
    INK_MUTED = "#5A5A5A", LED_RED = "#FF2A1F", DANGER = "#E23B2E";
  const NUMBER_COLORS = ["#1D1DE8", "#0E7E12", "#E01B1B", "#101A8C", "#7E1010", "#0E7E7E", "#000000", "#6E6E6E"];

  const LEVELS = {
    EASY: { title: "简单", rows: 10, cols: 8, mines: 10 },
    MEDIUM: { title: "中等", rows: 16, cols: 12, mines: 30 },
    HARD: { title: "困难", rows: 20, cols: 15, mines: 50 },
  };

  /* ---------------- engine (Minesweeper.kt) ---------------- */

  function emptyCell() { return { mine: false, revealed: false, flagged: false, adjacent: 0, exploded: false, wrongFlag: false }; }

  function neighbors(index, level) {
    const x = index % level.cols, y = Math.floor(index / level.cols);
    const result = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < level.cols && ny >= 0 && ny < level.rows) result.push(ny * level.cols + nx);
    }
    return result;
  }

  function placeMines(board, safeIndex, level) {
    const banned = neighbors(safeIndex, level).concat([safeIndex]);
    const candidates = [];
    for (let i = 0; i < level.rows * level.cols; i++) if (!banned.includes(i)) candidates.push(i);
    shuffle(candidates);
    const mines = new Set(candidates.slice(0, level.mines));
    return board.map((cell, index) => {
      if (mines.has(index)) return Object.assign({}, cell, { mine: true });
      return Object.assign({}, cell, { adjacent: neighbors(index, level).filter((n) => mines.has(n)).length });
    });
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function toggleFlag(board, index) {
    const cell = board[index];
    if (cell.revealed) return board;
    const next = board.slice();
    next[index] = Object.assign({}, cell, { flagged: !cell.flagged });
    return next;
  }

  function flagsUsed(board) { return board.filter((c) => c.flagged).length; }

  function isWon(board) { return board.every((c) => c.mine || c.revealed); }

  function loseAt(board, hit) {
    return board.map((cell, index) => {
      if (index === hit) return Object.assign({}, cell, { revealed: true, exploded: true });
      if (cell.mine && !cell.flagged) return Object.assign({}, cell, { revealed: true });
      if (!cell.mine && cell.flagged) return Object.assign({}, cell, { wrongFlag: true });
      return cell;
    });
  }

  function winAt(board) {
    return board.map((c) => (c.mine && !c.flagged ? Object.assign({}, c, { flagged: true }) : c));
  }

  function reveal(board, index, level) {
    const cell = board[index];
    if (cell.flagged || cell.revealed) {
      if (cell.revealed && cell.adjacent > 0 &&
        neighbors(index, level).filter((n) => board[n].flagged).length === cell.adjacent) {
        return chord(board, index, level);
      }
      return { board, status: isWon(board) ? "WON" : "PLAYING", opened: [] };
    }
    let field = board;
    if (!field.some((c) => c.mine)) field = placeMines(field, index, level);
    if (cell.mine) return { board: loseAt(field, index), status: "LOST", opened: [] };
    const opened = [];
    const next = field.slice();
    const queue = [index];
    while (queue.length) {
      const current = queue.shift();
      const target = next[current];
      if (target.revealed || target.flagged || target.mine) continue;
      next[current] = Object.assign({}, target, { revealed: true });
      opened.push(current);
      if (target.adjacent === 0) neighbors(current, level).forEach((n) => queue.push(n));
    }
    const won = isWon(next);
    return { board: won ? winAt(next) : next, status: won ? "WON" : "PLAYING", opened };
  }

  function chord(board, index, level) {
    const targets = neighbors(index, level).filter((n) => !board[n].flagged && !board[n].revealed);
    if (!targets.length) return { board, status: isWon(board) ? "WON" : "PLAYING", opened: [] };
    const hit = targets.find((n) => board[n].mine);
    if (hit !== undefined) return { board: loseAt(board, hit), status: "LOST", opened: [] };
    let next = board;
    let opened = [];
    targets.forEach((target) => {
      const move = reveal(next, target, level);
      next = move.board;
      opened = opened.concat(move.opened);
    });
    const won = isWon(next);
    return { board: won ? winAt(next) : next, status: won ? "WON" : "PLAYING", opened };
  }

  /* ---------------- state (MinesweeperViewModel.kt) ---------------- */

  const state = {
    level: LEVELS[BZX.store.get("minesDifficulty", "HARD")] || LEVELS.HARD,
    levelKey: BZX.store.get("minesDifficulty", "HARD"),
    board: null,
    status: "PLAYING",
    flagsUsed: 0,
    timeSeconds: 0,
    flagMode: false,
    opened: [],
    moveId: 0,
  };
  state.board = new Array(state.level.rows * state.level.cols).fill(0).map(emptyCell);
  if (!LEVELS[state.levelKey]) { state.levelKey = "HARD"; state.level = LEVELS.HARD; }

  let timer = null;
  function startTimer() {
    stopTimer();
    timer = setInterval(() => {
      if (state.status === "PLAYING" && state.timeSeconds < 999) {
        state.timeSeconds++;
        renderStatus();
      }
    }, 1000);
  }
  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  // 屏幕挂载时注入的渲染钩子：sync = 轻量刷新（含弹窗），full = 重建整盘
  let renderHook = null;

  function applyMove(move) {
    if (move.status === "PLAYING" && !move.opened.length) return;
    const started = !state.board.some((c) => c.mine) && move.board.some((c) => c.mine);
    state.board = move.board;
    state.status = move.status;
    state.flagsUsed = flagsUsed(move.board);
    state.opened = move.opened;
    state.moveId++;
    if (started) startTimer();
    if (move.status !== "PLAYING") stopTimer();
  }

  function doReveal(index) {
    if (state.status !== "PLAYING") return;
    if (state.flagMode) return; // 插旗模式下永不翻开
    const cell = state.board[index];
    if (cell.flagged) return;
    if (cell.revealed && cell.adjacent === 0) return;
    applyMove(reveal(state.board, index, state.level));
    if (renderHook) renderHook.sync();
  }

  function doToggleFlag(index) {
    if (state.status !== "PLAYING") return;
    const cell = state.board[index];
    if (cell.revealed && cell.adjacent === 0) return;
    const board = toggleFlag(state.board, index);
    if (board === state.board) return;
    state.board = board;
    state.flagsUsed = flagsUsed(board);
    state.moveId++;
    if (renderHook) renderHook.sync();
  }

  function restart() {
    stopTimer();
    state.board = new Array(state.level.rows * state.level.cols).fill(0).map(emptyCell);
    state.status = "PLAYING";
    state.flagsUsed = 0;
    state.timeSeconds = 0;
    state.opened = [];
    state.moveId++;
    if (renderHook) renderHook.full();
  }

  function selectLevel(key) {
    BZX.store.set("minesDifficulty", key);
    if (state.levelKey === key) return;
    stopTimer();
    state.levelKey = key;
    state.level = LEVELS[key];
    state.board = new Array(state.level.rows * state.level.cols).fill(0).map(emptyCell);
    state.status = "PLAYING";
    state.flagsUsed = 0;
    state.timeSeconds = 0;
    state.opened = [];
    state.moveId++;
    if (renderHook) renderHook.full();
  }

  /* ---------------- screen ---------------- */

  BZX.MinesweeperScreen = function (root) {
    root.classList.add("game-screen", "mines");

    const col = el("div", "portrait-col scroll-col");
    col.style.padding = "14px 18px 0";
    root.appendChild(col);

    const backBtn = el("button", "back-btn", "‹  返回游戏大厅");
    BZX.sfxButton(backBtn, () => BZX.router.backToLibrary());
    col.appendChild(backBtn);

    /* title */
    const titleRow = el("div", "mines-title-row");
    titleRow.style.justifyContent = "center";
    titleRow.appendChild(svgWrap(mineIcon(24, INK)));
    titleRow.appendChild(el("div", "mt-title", "扫雷"));
    titleRow.appendChild(el("div", "mt-sub", ""));
    col.appendChild(titleRow);
    col.appendChild(spacer(10));

    const diffRow = el("div", "difficulty-row");
    col.appendChild(diffRow);
    col.appendChild(spacer(12));

    /* status panel */
    const statusPanel = bevelBox("sunken");
    statusPanel.style.width = "100%";
    const statusRow = el("div", "mines-status");
    statusRow.style.width = "100%";
    const ledMines = ledDisplay();
    const smiley = el("button", "smiley-btn");
    const ledTime = ledDisplay();
    const springL = el("div"); springL.style.flex = "1";
    const springR = el("div"); springR.style.flex = "1";
    statusRow.appendChild(ledMines.box);
    statusRow.appendChild(springL);
    statusRow.appendChild(smiley);
    statusRow.appendChild(springR);
    statusRow.appendChild(ledTime.box);
    statusPanel.appendChild(statusRow);
    col.appendChild(statusPanel);
    col.appendChild(spacer(12));

    /* board */
    const boardFrame = bevelBox("sunken");
    boardFrame.style.width = "fit-content";
    boardFrame.style.alignSelf = "center";
    const boardInner = el("div", "mines-board");
    boardFrame.appendChild(boardInner);
    col.appendChild(boardFrame);
    col.appendChild(spacer(12));

    /* flag mode toggle */
    const flagToggle = el("button", "bevel-box flag-mode-btn");
    col.appendChild(flagToggle);
    col.appendChild(spacer(10));
    const hint1 = el("div");
    hint1.style.cssText = "color:" + INK_MUTED + ";font-size:12px;text-align:center;";
    col.appendChild(hint1);
    const hint2 = el("div", null, "数字是周围的雷数 · 排清所有雷即胜");
    hint2.style.cssText = "color:" + INK_MUTED + ";font-size:9px;letter-spacing:1.2px;text-align:center;padding:5px 0 14px;";
    col.appendChild(hint2);

    let cellEls = [];
    let cellPx = 26;

    function bevelBox(kind) {
      const box = el("div", "bevel-box " + kind);
      return box;
    }

    function ledDisplay() {
      const box = bevelBox("sunken");
      const inner = el("div", "led-inner", "000");
      box.appendChild(inner);
      return {
        box,
        set(v) {
          const text = v < 0 ? String(Math.max(v, -99)) : String(v).padStart(3, "0");
          inner.textContent = text;
        },
      };
    }

    function renderStatus() {
      ledMines.set(state.level.mines - state.flagsUsed);
      ledTime.set(state.timeSeconds);
      const face = state.status === "WON" ? "cool" : state.status === "LOST" ? "dead" : "happy";
      smiley.innerHTML = smileySvg(36, face);
      hint1.textContent = state.flagMode
        ? "插旗模式：点按插旗或取消，不会翻开"
        : "左键翻开 · 右键插旗（长按插旗）";
    }

    function renderDifficulty() {
      BZX.clear(diffRow);
      Object.keys(LEVELS).forEach((key) => {
        const level = LEVELS[key];
        const btn = el("button", "bevel-box difficulty-btn" + (state.levelKey === key ? " selected sunken" : " raised"));
        btn.appendChild(el("div", "bevel-content", level.title));
        BZX.sfxButton(btn, () => selectLevel(key));
        diffRow.appendChild(btn);
      });
    }

    function renderFlagToggle() {
      flagToggle.className = "bevel-box flag-mode-btn " + (state.flagMode ? "sunken active" : "raised");
      flagToggle.innerHTML = "";
      const content = el("div", "bevel-content");
      content.appendChild(svgWrap(flagIcon(15), 15, 15));
      content.appendChild(el("div", "fm-label", "插旗模式"));
      content.appendChild(el("div", "fm-state", state.flagMode ? "开" : "关"));
      flagToggle.appendChild(content);
    }

    function computeCellSize() {
      // 宽屏时列会放宽到 560px，格子按可用宽度与高度取小
      const maxW = Math.min(window.innerWidth - 36, 524);
      const maxH = window.innerHeight - 350;
      const byW = (maxW - 12) / state.level.cols;
      const byH = Math.max(13, maxH) / state.level.rows;
      cellPx = Math.max(13, Math.floor(Math.min(byW, byH)));
    }

    function renderBoard() {
      computeCellSize();
      BZX.clear(boardInner);
      cellEls = [];
      for (let row = 0; row < state.level.rows; row++) {
        const rowEl = el("div", "cell-row");
        for (let col2 = 0; col2 < state.level.cols; col2++) {
          const index = row * state.level.cols + col2;
          const cell = el("div", "mine-cell");
          cell.style.width = cellPx + "px";
          cell.style.height = cellPx + "px";
          attachCellEvents(cell, index);
          rowEl.appendChild(cell);
          cellEls.push(cell);
        }
        boardInner.appendChild(rowEl);
      }
      renderCells(new Set());
    }

    function renderCells(openedSet) {
      state.board.forEach((cellData, index) => {
        const node = cellEls[index];
        if (!node) return;
        const fresh = state.status === "PLAYING" && openedSet.has(index);
        node.classList.toggle("pop", fresh);
        if (cellData.revealed) {
          let inner;
          if (cellData.mine) {
            inner = '<div class="cell-open" style="' + (cellData.exploded ? "background:" + DANGER + ";" : "") + '">' +
              mineIcon(cellPx - 6, "#000") + "</div>";
          } else if (cellData.adjacent > 0) {
            inner = '<div class="cell-open" style="font-size:' + Math.round(cellPx * 0.5) + "px;color:" +
              NUMBER_COLORS[cellData.adjacent - 1] + ';">' + cellData.adjacent + "</div>";
          } else {
            inner = '<div class="cell-open"></div>';
          }
          if (node.dataset.state !== "open" + cellData.adjacent + cellData.exploded) {
            node.dataset.state = "open" + cellData.adjacent + cellData.exploded;
            node.innerHTML = inner;
          }
        } else {
          const flag = cellData.flagged ? '<div style="position:absolute;inset:0;padding:3px;">' + flagIcon(999, true) + "</div>" : "";
          if (node.dataset.state !== "raised" + cellData.flagged) {
            node.dataset.state = "raised" + cellData.flagged;
            node.innerHTML = '<div class="cell-raised bevel-box raised"></div>' + flag;
          }
        }
        if (cellData.wrongFlag) {
          if (!node.querySelector(".wrong-x")) {
            const x = el("div", "wrong-x");
            x.style.cssText = "position:absolute;inset:2px;pointer-events:none;";
            x.appendChild(wrongFlagX());
            node.appendChild(x);
          }
        } else {
          const x = node.querySelector(".wrong-x");
          if (x) x.remove();
        }
      });
    }

    function attachCellEvents(node, index) {
      let longPressTimer = null;
      let longPressFired = false;

      node.addEventListener("click", () => {
        if (longPressFired) { longPressFired = false; return; }
        if (state.flagMode) doToggleFlag(index);
        else doReveal(index);
        syncAll();
      });
      node.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        doToggleFlag(index);
        syncAll();
      });
      node.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        longPressFired = false;
        longPressTimer = setTimeout(() => {
          longPressFired = true;
          doToggleFlag(index);
          syncAll();
        }, 420);
      });
      const cancel = () => {
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      };
      node.addEventListener("pointerup", cancel);
      node.addEventListener("pointerleave", cancel);
      node.addEventListener("pointercancel", cancel);
    }

    function syncAll() {
      renderStatus();
      renderCells(new Set(state.opened));
      renderFlagToggle();
      if (state.status !== "PLAYING") maybeResultDialog();
    }

    let dialogOpen = false;
    function maybeResultDialog() {
      if (dialogOpen || state.status === "PLAYING") return;
      dialogOpen = true;
      const won = state.status === "WON";
      const d = BZX.dialog(root, {
        surface: FACE,
        title: won ? "排雷成功！" : "踩到雷了",
        titleColor: won ? "#0E7E12" : DANGER,
        body: won
          ? "所有地雷排清，用时 " + state.timeSeconds + " 秒，稳。"
          : "这一局停在第 " + state.timeSeconds + " 秒，看看雷都在哪，再来一局。",
        bodyColor: INK_MUTED,
        confirm: { label: "再来一局", onClick: () => { dialogOpen = false; restart(); } },
        dismiss: {
          label: "看看棋盘",
          onClick: () => { dialogOpen = false; },
        },
        dismissible: true,
        onDismissRequest: () => { dialogOpen = false; },
      });
      // dialog-btn-text 默认色偏深，这里按 Win98 墨色调整
      d.close && setTimeout(() => {
        root.querySelectorAll(".dialog-btn-text").forEach((b) => { b.style.color = INK_MUTED; });
      }, 0);
    }

    function renderAll() {
      titleRow.querySelector(".mt-sub").textContent =
        state.level.rows + "×" + state.level.cols + " · " + state.level.mines + " 雷";
      renderDifficulty();
      renderStatus();
      renderBoard();
      renderFlagToggle();
      dialogOpen = false;
    }

    BZX.sfxButton(smiley, restart);
    BZX.sfxButton(flagToggle, () => {
      state.flagMode = !state.flagMode;
      renderFlagToggle();
      renderStatus();
    });

    // 引擎（模块级）通过钩子驱动本屏刷新
    renderHook = { sync: syncAll, full: renderAll };

    const onResize = () => renderBoard();
    window.addEventListener("resize", onResize);

    renderAll();

    return () => {
      stopTimer();
      renderHook = null;
      window.removeEventListener("resize", onResize);
    };
  };

  /* ---------------- Win98 icons ---------------- */

  // SVG 字符串包装成节点；可给定尺寸避免 100% 宽高失控
  function svgWrap(svgHtml, w, h) {
    const span = el("span");
    span.style.cssText = "display:inline-flex;align-items:center;justify-content:center;line-height:0;" +
      (w ? "width:" + w + "px;height:" + (h || w) + "px;flex:0 0 " + w + "px;" : "");
    span.innerHTML = svgHtml;
    return span;
  }

  function mineIcon(size, color) {
    const w = size;
    const c = w / 2;
    let spikes = "";
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      spikes += '<line x1="' + (c + Math.cos(a) * w * 0.14) + '" y1="' + (c + Math.sin(a) * w * 0.14) +
        '" x2="' + (c + Math.cos(a) * w * 0.36) + '" y2="' + (c + Math.sin(a) * w * 0.36) +
        '" stroke="' + color + '" stroke-width="' + w * 0.08 + '" stroke-linecap="round"/>';
    }
    return '<svg width="' + w + '" height="' + w + '" viewBox="0 0 ' + w + " " + w + '">' +
      spikes +
      '<circle cx="' + c + '" cy="' + c + '" r="' + w * 0.24 + '" fill="' + color + '"/>' +
      '<circle cx="' + (c - w * 0.09) + '" cy="' + (c - w * 0.09) + '" r="' + w * 0.07 + '" fill="rgba(255,255,255,.85)"/>' +
      "</svg>";
  }

  function flagIcon(size, fillBox) {
    // Red pennant on a black pole with a base; fills its box like FlagIcon.
    const w = size === 999 ? 40 : size;
    const svg = '<svg width="100%" height="100%" viewBox="0 0 40 40" preserveAspectRatio="xMidYMid meet">' +
      '<line x1="' + 40 * 0.45 + '" y1="' + 40 * 0.08 + '" x2="' + 40 * 0.45 + '" y2="' + 40 * 0.78 + '" stroke="#000" stroke-width="' + 40 * 0.1 + '"/>' +
      '<path d="M' + 40 * 0.45 + " " + 40 * 0.08 + " L" + 40 * 0.05 + " " + 40 * 0.27 + " L" + 40 * 0.45 + " " + 40 * 0.46 + ' Z" fill="' + DANGER + '"/>' +
      '<rect x="' + 40 * 0.12 + '" y="' + 40 * 0.78 + '" width="' + 40 * 0.66 + '" height="' + 40 * 0.14 + '" fill="#000"/>' +
      "</svg>";
    return svg;
  }

  function wrongFlagX() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%"); svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.innerHTML =
      '<line x1="4" y1="4" x2="96" y2="96" stroke="' + DANGER + '" stroke-width="7" stroke-linecap="round"/>' +
      '<line x1="4" y1="96" x2="96" y2="4" stroke="' + DANGER + '" stroke-width="7" stroke-linecap="round"/>';
    return svg;
  }

  function smileySvg(size, face) {
    const w = size, c = w / 2;
    const parts = ['<circle cx="' + c + '" cy="' + c + '" r="' + w * 0.46 + '" fill="none" stroke="#000" stroke-width="' + w * 0.05 + '"/>'];
    // drawArc: bounding-box topLeft given, arc center = topLeft + r; angles in y-down degrees.
    function arcPath(cx, cy, r, startDeg, sweepDeg) {
      const a0 = (startDeg * Math.PI) / 180;
      const a1 = ((startDeg + sweepDeg) * Math.PI) / 180;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const large = sweepDeg > 180 ? 1 : 0;
      return "M" + x0.toFixed(2) + " " + y0.toFixed(2) + " A " + r + " " + r + " 0 " + large + " 1 " + x1.toFixed(2) + " " + y1.toFixed(2);
    }
    if (face === "happy") {
      parts.push(
        '<circle cx="' + (c - w * 0.17) + '" cy="' + (c - w * 0.1) + '" r="' + w * 0.06 + '" fill="#000"/>',
        '<circle cx="' + (c + w * 0.17) + '" cy="' + (c - w * 0.1) + '" r="' + w * 0.06 + '" fill="#000"/>',
        '<path d="' + arcPath(c, c - w * 0.03, w * 0.21, 20, 140) + '" fill="none" stroke="#000" stroke-width="' + w * 0.05 + '" stroke-linecap="round"/>'
      );
    } else if (face === "cool") {
      parts.push(
        '<rect x="' + (c - w * 0.33) + '" y="' + (c - w * 0.22) + '" width="' + w * 0.66 + '" height="' + w * 0.18 + '" fill="#000"/>',
        '<line x1="' + (c - w * 0.33) + '" y1="' + (c - w * 0.2) + '" x2="' + (c - w * 0.41) + '" y2="' + (c - w * 0.1) + '" stroke="#000" stroke-width="' + w * 0.05 + '"/>',
        '<line x1="' + (c + w * 0.33) + '" y1="' + (c - w * 0.2) + '" x2="' + (c + w * 0.41) + '" y2="' + (c - w * 0.1) + '" stroke="#000" stroke-width="' + w * 0.05 + '"/>',
        '<path d="' + arcPath(c, c + w * 0.01, w * 0.21, 20, 140) + '" fill="none" stroke="#000" stroke-width="' + w * 0.05 + '" stroke-linecap="round"/>'
      );
    } else {
      [-1, 1].forEach((side) => {
        const ex = c + side * w * 0.17, ey = c - w * 0.12, r = w * 0.07;
        parts.push(
          '<line x1="' + (ex - r) + '" y1="' + (ey - r) + '" x2="' + (ex + r) + '" y2="' + (ey + r) + '" stroke="#000" stroke-width="' + w * 0.045 + '" stroke-linecap="round"/>',
          '<line x1="' + (ex - r) + '" y1="' + (ey + r) + '" x2="' + (ex + r) + '" y2="' + (ey - r) + '" stroke="#000" stroke-width="' + w * 0.045 + '" stroke-linecap="round"/>'
        );
      });
      parts.push(
        '<path d="' + arcPath(c, c + w * 0.25, w * 0.21, 200, 140) + '" fill="none" stroke="#000" stroke-width="' + w * 0.05 + '" stroke-linecap="round"/>'
      );
    }
    return '<svg width="' + w + '" height="' + w + '" viewBox="0 0 ' + w + " " + w + '">' + parts.join("") + "</svg>";
  }

  function spacer(h) {
    const s = el("div");
    s.style.height = h + "px";
    return s;
  }
})();
