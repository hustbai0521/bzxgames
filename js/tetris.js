/* ============================================================
   tetris.js — 俄罗斯方块（NEON/GARDEN 双主题）
   逻辑对应 game/Tetris.kt + TetrisViewModel.kt。
   桌面适配：← → 移动、↓ 软降、↑/X 旋转、空格硬降、P 暂停、
   R 重开；屏幕按钮长按连发（300ms 后 115ms）同样保留。
   ============================================================ */
(function () {
  "use strict";
  const BZX = window.BZX;
  const el = BZX.el;

  const WIDTH = 10, HEIGHT = 20;
  const TETROMINOES = {
    I: { id: 1, cells: [[1, 1, 1, 1]] },
    O: { id: 2, cells: [[1, 1], [1, 1]] },
    T: { id: 3, cells: [[0, 1, 0], [1, 1, 1]] },
    S: { id: 4, cells: [[0, 1, 1], [1, 1, 0]] },
    Z: { id: 5, cells: [[1, 1, 0], [0, 1, 1]] },
    J: { id: 6, cells: [[1, 0, 0], [1, 1, 1]] },
    L: { id: 7, cells: [[0, 0, 1], [1, 1, 1]] },
  };
  const NAMES = Object.keys(TETROMINOES);
  const LINE_SCORES = [0, 100, 300, 500, 800];

  /* ---------------- engine (Tetris.kt) ---------------- */

  function rotateCells(cells) {
    const rows = cells.length, columns = cells[0].length;
    const out = [];
    for (let newY = 0; newY < columns; newY++) {
      const line = [];
      // Preserve numeric 0/1 cells so repeated rotations do not erase the piece.
      for (let newX = 0; newX < rows; newX++) line.push(cells[rows - 1 - newX][newY]);
      out.push(line);
    }
    return out;
  }

  function shuffledBag() {
    const bag = NAMES.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
  }

  function spawn(type) {
    const t = TETROMINOES[type];
    return { type, x: Math.floor((WIDTH - t.cells[0].length) / 2), y: 0, cells: t.cells.map((r) => r.slice()) };
  }

  function collides(board, piece) {
    for (let row = 0; row < piece.cells.length; row++) {
      for (let col = 0; col < piece.cells[row].length; col++) {
        if (!piece.cells[row][col]) continue;
        const x = piece.x + col, y = piece.y + row;
        if (x < 0 || x >= WIDTH || y >= HEIGHT) return true;
        if (y >= 0 && board[y * WIDTH + x] !== 0) return true;
      }
    }
    return false;
  }

  function dropPosition(board, piece) {
    let distance = 0;
    // Spawned pieces reach the floor within HEIGHT steps. Bound the search so
    // malformed (e.g. empty) cells cannot hang ghost rendering or hard drops.
    while (distance < HEIGHT) {
      const next = Object.assign({}, piece, { y: piece.y + distance + 1 });
      if (collides(board, next)) break;
      distance++;
    }
    return distance;
  }

  function newGame(best) {
    const bag = shuffledBag();
    return {
      board: new Array(WIDTH * HEIGHT).fill(0),
      falling: spawn(bag[0]),
      next: bag[1],
      queue: bag.slice(2),
      score: 0, best, lines: 0, level: 1,
      status: "READY", moveId: 0, clearedRows: [], clearId: 0, dropInterval: 600,
    };
  }

  function shifted(state, dx2, dy2) {
    if (!state.falling) return;
    const moved = Object.assign({}, state.falling, { x: state.falling.x + dx2, y: state.falling.y + dy2 });
    if (!collides(state.board, moved)) {
      state.falling = moved;
      state.moveId++;
    }
  }

  function lock(state) {
    const piece = state.falling;
    if (!piece) return;
    const board = state.board.slice();
    piece.cells.forEach((line, row) => {
      line.forEach((filled, column) => {
        if (!filled) return;
        const x = piece.x + column, y = piece.y + row;
        if (y >= 0 && y < HEIGHT && x >= 0 && x < WIDTH) board[y * WIDTH + x] = TETROMINOES[piece.type].id;
      });
    });
    const fullRows = [];
    for (let row = 0; row < HEIGHT; row++) {
      if (board.slice(row * WIDTH, row * WIDTH + WIDTH).every((v) => v !== 0)) fullRows.push(row);
    }
    let nextBoard = board;
    if (fullRows.length) {
      const cleared = new Set(fullRows);
      const kept = [];
      for (let i = 0; i < board.length; i++) {
        if (!cleared.has(Math.floor(i / WIDTH))) kept.push(board[i]);
      }
      nextBoard = new Array(fullRows.length * WIDTH).fill(0).concat(kept);
    }
    const lines = state.lines + fullRows.length;
    const level = 1 + Math.floor(lines / 10);
    const score = state.score + LINE_SCORES[Math.min(fullRows.length, 4)] * state.level;
    const rest = state.queue.slice();
    if (rest.length <= 1) rest.push(...shuffledBag());
    const nextType = state.next;
    const spawned = spawn(nextType);
    const over = collides(nextBoard, spawned);
    state.board = nextBoard;
    state.falling = spawned;
    state.next = rest.shift();
    state.queue = rest;
    state.score = score;
    state.best = Math.max(state.best, score);
    state.lines = lines;
    state.level = level;
    state.status = over ? "OVER" : "PLAYING";
    state.moveId++;
    state.clearedRows = fullRows;
    state.clearId += fullRows.length ? 1 : 0;
    state.dropInterval = Math.max(90, 600 - (level - 1) * 65);
    if (state.score > state.best || over) BZX.store.set("tetrisBest", state.best);
  }

  const actions = {
    moveLeft: (s) => shifted(s, -1, 0),
    moveRight: (s) => shifted(s, 1, 0),
    rotate(s) {
      if (!s.falling) return;
      const rotated = rotateCells(s.falling.cells);
      for (const dx2 of [0, -1, 1, -2, 2]) {
        const candidate = { type: s.falling.type, x: s.falling.x + dx2, y: s.falling.y, cells: rotated.map((r) => r.slice()) };
        if (!collides(s.board, candidate)) {
          s.falling = candidate;
          s.moveId++;
          return;
        }
      }
    },
    softDrop(s) {
      if (!s.falling) return;
      const down = Object.assign({}, s.falling, { y: s.falling.y + 1 });
      if (!collides(s.board, down)) {
        s.falling = down;
        s.score += 1;
        s.moveId++;
      } else lock(s);
    },
    hardDrop(s) {
      if (!s.falling) return;
      const distance = dropPosition(s.board, s.falling);
      s.falling = Object.assign({}, s.falling, { y: s.falling.y + distance });
      s.score += distance * 2;
      lock(s);
    },
    tick(s) {
      if (!s.falling) return;
      const down = Object.assign({}, s.falling, { y: s.falling.y + 1 });
      if (!collides(s.board, down)) {
        s.falling = down;
        s.moveId++; // lockTimer bookkeeping
      } else lock(s);
    },
  };

  /* ---------------- screen ---------------- */

  BZX.TetrisScreen = function (root) {
    const palette = BZX.getTheme();
    root.classList.add("game-screen");
    root.setAttribute("data-theme", palette.key);
    root.style.setProperty("--bg", "linear-gradient(to bottom," + palette.background.join(",") + ")");

    const state = newGame(BZX.store.get("tetrisBest", 0));

    const backdrop = el("canvas", "backdrop-canvas");
    root.appendChild(backdrop);
    const glow = el("canvas", "glow-canvas");
    root.appendChild(glow);
    const stopGrid = palette.isNature
      ? BZX.natureBackdrop(backdrop)
      : BZX.techGrid(backdrop, palette, 0.05, false);

    const col = el("div", "portrait-col");
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
    const h1 = el("div", "brush-title", "俄罗斯方块");
    h1.style.fontSize = "36px";
    h1.style.backgroundImage = "linear-gradient(90deg," + palette.titleColors.join(",") + ")";
    h1.style.letterSpacing = "-1px";
    titleBox.appendChild(h1);
    titleBox.appendChild(el("div", "sub-caption", palette.isNature ? "GARDEN STACKS" : "NEON STACKS"));
    hRow.appendChild(titleBox);
    const spring = el("div"); spring.style.flex = "1"; hRow.appendChild(spring);
    const pauseBtn = BZX.roundAction("⏸", "暂停或继续", false, palette, () => {
      if (state.status === "PLAYING") pause();
      else if (state.status === "PAUSED") resume();
    });
    hRow.appendChild(pauseBtn);
    const gap = el("div"); gap.style.width = "9px"; hRow.appendChild(gap);
    hRow.appendChild(BZX.roundAction("↻", "重新开始", true, palette, () => {
      Object.assign(state, newGame(BZX.store.get("tetrisBest", 0)));
      renderAll();
      startLoop();
    }));
    header.appendChild(hRow);
    header.appendChild(spacer(14));
    col.appendChild(header);

    const scoreRow = el("div");
    scoreRow.style.cssText = "display:flex;gap:11px;";
    const scoreCard = BZX.scoreCard("SCORE", palette.primary);
    const bestCard = BZX.scoreCard("BEST", palette.tertiary);
    scoreRow.appendChild(scoreCard.el);
    scoreRow.appendChild(bestCard.el);
    col.appendChild(scoreRow);
    col.appendChild(spacer(14));

    /* main row: well + side panel */
    const mainRow = el("div", "tetris-main-row");
    const boardArea = el("div", "tetris-board-area");
    const well = el("div", "tetris-well");
    const wellInner = el("div", "tetris-well-inner");
    const canvas = el("canvas");
    wellInner.appendChild(canvas);
    well.appendChild(wellInner);
    boardArea.appendChild(well);
    mainRow.appendChild(boardArea);

    const side = el("div", "tetris-side");
    const nextCard = el("div", "tcard next-card");
    nextCard.style.setProperty("--accent", palette.tertiary);
    nextCard.innerHTML = '<div class="nc-label">NEXT</div>';
    const nextCanvas = el("canvas");
    nextCard.appendChild(nextCanvas);
    side.appendChild(nextCard);
    const miniLines = miniStat("消行", palette.primary);
    const miniLevel = miniStat("等级", palette.secondary);
    side.appendChild(miniLines.el);
    side.appendChild(miniLevel.el);
    mainRow.appendChild(side);
    col.appendChild(mainRow);
    col.appendChild(spacer(12));

    function miniStat(label, accent) {
      const box = el("div", "tcard mini-stat");
      box.style.setProperty("--accent", accent);
      box.innerHTML = '<div class="ms-label">' + label + '</div><div class="ms-value">0</div>';
      return { el: box, set(v) { box.querySelector(".ms-value").textContent = v; } };
    }

    /* controls */
    const controls = el("div", "tetris-controls");
    const btnLeft = holdButton("◀", "左移", true, () => actions.moveLeft(state) && renderBoard());
    const btnDown = holdButton("▼", "软降", true, () => { actions.softDrop(state); renderBoard(); });
    const btnRight = holdButton("▶", "右移", true, () => actions.moveRight(state) && renderBoard());
    const btnRotate = holdButton("⟳", "旋转", false, () => { actions.rotate(state); renderBoard(); });
    const btnHard = holdButton("⇓", "硬降", false, () => { actions.hardDrop(state); renderBoard(); }, palette.secondary);
    [btnLeft, btnDown, btnRight, btnRotate, btnHard].forEach((b) => controls.appendChild(b));
    col.appendChild(controls);
    col.appendChild(spacer(10));
    col.appendChild(BZX.hintPill(palette, "  长按 ◀ ▶ ▼ 连续移动 · 每消 10 行升一级"));
    col.appendChild(spacer(12));

    function holdButton(symbol, label, repeatOnHold, action, accent) {
      // HoldButton 无按键音（对应 Compose clickable indication=null），长按连发：
      // 按下立即执行一次，300ms 后每 115ms 重复。
      const tone = accent || palette.primary;
      const b = el("button", "round-action hold-btn ra-themed");
      b.textContent = symbol;
      b.title = label;
      b.setAttribute("aria-label", label);
      b.style.borderColor = BZX.hexA(tone, 0.55);
      let timer1 = null, timer2 = null;
      const stop = () => {
        if (timer1) { clearTimeout(timer1); timer1 = null; }
        if (timer2) { clearInterval(timer2); timer2 = null; }
      };
      b.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        stop();
        action();
        if (repeatOnHold) {
          timer1 = setTimeout(() => {
            timer2 = setInterval(action, 115);
          }, 300);
        }
      });
      ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, stop));
      void tone;
      return b;
    }

    /* board rendering */
    const fit = BZX.fitCanvas(canvas);
    const nextFit = BZX.fitCanvas(nextCanvas);

    function layoutWell() {
      const availW = boardArea.clientWidth - 16;
      const availH = boardArea.clientHeight - 16;
      const cell = Math.max(8, Math.floor(Math.min((availW - 14) / WIDTH, (availH - 14) / HEIGHT)));
      canvas.style.width = cell * WIDTH + "px";
      canvas.style.height = cell * HEIGHT + "px";
      const dpr = window.devicePixelRatio || 1;
      canvas.width = cell * WIDTH * dpr;
      canvas.height = cell * HEIGHT * dpr;
      fit.resize();
      return cell;
    }

    function drawCellRect(ctx, x, y, color, cellPx) {
      const inset = 1;
      ctx.fillStyle = color;
      roundRectPath(ctx, x * cellPx + inset, y * cellPx + inset, cellPx - inset * 2, cellPx - inset * 2, Math.min(3, cellPx * 0.12));
      ctx.fill();
      ctx.strokeStyle = palette.isNature ? "rgba(0,0,0,.18)" : "rgba(255,255,255,.3)";
      ctx.lineWidth = 1;
      roundRectPath(ctx, x * cellPx + inset, y * cellPx + inset, cellPx - inset * 2, cellPx - inset * 2, Math.min(3, cellPx * 0.12));
      ctx.stroke();
    }

    function renderBoard() {
      const cell = layoutWell();
      const { ctx } = fit;
      const w = cell * WIDTH, h = cell * HEIGHT;
      ctx.clearRect(0, 0, w, h);
      // keyed flash start（clearId 只在真实消行时 +1）
      if (state.clearId !== flashId) {
        flashId = state.clearId;
        flashStart = flashId > 0 ? performance.now() : null;
      }
      state.board.forEach((value, index) => {
        if (value !== 0) drawCellRect(ctx, index % WIDTH, Math.floor(index / WIDTH), palette.pieceColors[value], cell);
      });
      if (state.status !== "OVER" && state.falling) {
        const piece = state.falling;
        const distance = dropPosition(state.board, piece);
        // ghost
        if (distance > 0) {
          ctx.strokeStyle = BZX.hexA(palette.primary, 0.4);
          ctx.lineWidth = 1.2;
          piece.cells.forEach((line, row) => {
            line.forEach((filled, column) => {
              if (!filled) return;
              const x = piece.x + column, y = piece.y + row + distance;
              if (y < 0 || y >= HEIGHT) return;
              roundRectPath(ctx, x * cell + 2, y * cell + 2, cell - 4, cell - 4, 2);
              ctx.stroke();
            });
          });
        }
        piece.cells.forEach((line, row) => {
          line.forEach((filled, column) => {
            if (!filled) return;
            const x = piece.x + column, y = piece.y + row;
            if (y >= 0 && x >= 0 && x < WIDTH && y < HEIGHT) {
              drawCellRect(ctx, x, y, palette.pieceColors[TETROMINOES[piece.type].id], cell);
            }
          });
        });
      }
      // line-clear flash（340ms，keyed on clearId）
      if (flashStart !== null && state.clearedRows.length) {
        const p = Math.min(1, (performance.now() - flashStart) / 340);
        const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        if (p < 1) {
          ctx.fillStyle = "rgba(255,255,255," + (1 - eased) * 0.85 + ")";
          state.clearedRows.forEach((row) => ctx.fillRect(0, row * cell, w, cell));
        }
      }
      renderNext();
    }

    let flashId = -1;
    let flashStart = null;

    function renderNext() {
      const t = TETROMINOES[state.next];
      const mini = 11;
      const cols = t.cells[0].length, rows = t.cells.length;
      const w = 56, h = 26;
      nextCanvas.style.width = w + "px";
      nextCanvas.style.height = h + "px";
      const dpr = window.devicePixelRatio || 1;
      nextCanvas.width = w * dpr;
      nextCanvas.height = h * dpr;
      nextFit.resize();
      const ctx = nextFit.ctx;
      ctx.clearRect(0, 0, w, h);
      const ox = (w - cols * mini) / 2, oy = (h - rows * mini) / 2;
      t.cells.forEach((line, row) => {
        line.forEach((filled, column) => {
          if (!filled) return;
          ctx.fillStyle = palette.pieceColors[t.id];
          roundRectPath(ctx, ox + column * mini + 1, oy + row * mini + 1, mini - 2, mini - 2, 2);
          ctx.fill();
        });
      });
    }

    /* game loop */
    let timer = null;
    function startLoop() {
      if (timer) { clearTimeout(timer); timer = null; }
      if (state.status !== "PLAYING") return;
      timer = setTimeout(function run() {
        if (state.status !== "PLAYING") { timer = null; return; }
        actions.tick(state);
        renderBoard();
        renderScores();
        if (state.status === "OVER") {
          timer = null;
          showResultDialog();
          return;
        }
        timer = setTimeout(run, state.dropInterval);
      }, state.dropInterval);
    }

    function pause() {
      if (state.status === "PLAYING") {
        state.status = "PAUSED";
        if (timer) { clearTimeout(timer); timer = null; }
        renderAll();
      }
    }
    function resume() {
      if (state.status === "PAUSED") {
        state.status = "PLAYING";
        renderAll();
        startLoop();
      }
    }

    function renderScores() {
      scoreCard.set(state.score);
      bestCard.set(state.best);
      miniLines.set(state.lines);
      miniLevel.set(state.level);
      pauseBtn.disabled = !(state.status === "PLAYING" || state.status === "PAUSED");
      pauseBtn.textContent = state.status === "PAUSED" ? "▶" : "⏸";
    }

    function renderAll() {
      renderScores();
      renderBoard();
      showOverlays();
    }

    let currentOverlay = null;
    function showOverlays() {
      if (currentOverlay) { currentOverlay.remove(); currentOverlay = null; }
      if (state.status === "READY") {
        currentOverlay = BZX.startOverlay(palette, root, () => {
          if (state.status === "READY") state.status = "PLAYING";
          currentOverlay.remove(); currentOverlay = null;
          renderScores();
          startLoop();
        }, () => BZX.router.backToLibrary(), "◀ ▼ ▶ 可长按连移，⟳ 旋转，⇓ 直落井底");
      } else if (state.status === "PAUSED") {
        currentOverlay = BZX.pauseOverlay(palette, root, resume, () => BZX.router.backToLibrary());
      }
    }

    let dialogOpen = false;
    function showResultDialog() {
      if (dialogOpen) return;
      dialogOpen = true;
      BZX.dialog(root, {
        surface: palette.surface,
        title: palette.isNature ? "叠到顶了" : "STACK OVERFLOW",
        titleColor: palette.tertiary,
        body: "本轮 " + state.score + " 分，消行 " + state.lines + "。" +
          (state.score >= state.best && state.score > 0 ? "这是你的新纪录！" : "再来一局，把空隙填得更聪明。"),
        bodyColor: palette.mutedText,
        confirm: {
          label: "再来一局",
          onClick: () => {
            dialogOpen = false;
            Object.assign(state, newGame(BZX.store.get("tetrisBest", 0)));
            flashStart = null;
            renderAll();
            startLoop();
          },
        },
        confirmBg: palette.secondary,
        dismissible: false,
      });
    }

    /* keyboard (desktop adaptation) */
    const keyHandler = (e) => {
      if (!root.isConnected) return;
      if (e.repeat && (e.key === " " || e.key === "ArrowUp" || e.key === "x" || e.key === "X")) return;
      switch (e.key) {
        case "ArrowLeft": case "a": case "A": e.preventDefault(); actions.moveLeft(state); renderBoard(); break;
        case "ArrowRight": case "d": case "D": e.preventDefault(); actions.moveRight(state); renderBoard(); break;
        case "ArrowDown": case "s": case "S": e.preventDefault(); actions.softDrop(state); renderBoard(); break;
        case "ArrowUp": case "x": case "X": case "w": case "W": e.preventDefault(); actions.rotate(state); renderBoard(); break;
        case " ": e.preventDefault(); actions.hardDrop(state); renderBoard(); break;
        case "p": case "P":
          if (state.status === "PLAYING") pause();
          else if (state.status === "PAUSED") resume();
          break;
        case "r": case "R":
          Object.assign(state, newGame(BZX.store.get("tetrisBest", 0)));
          renderAll();
          startLoop();
          break;
      }
    };
    document.addEventListener("keydown", keyHandler);

    const stopAutoPause = BZX.autoPauseOnHide(pause);

    const ro = new ResizeObserver(() => renderBoard());
    ro.observe(boardArea);

    renderAll();
    startLoop();

    return () => {
      if (timer) clearTimeout(timer);
      stopGrid();
      document.removeEventListener("keydown", keyHandler);
      stopAutoPause();
      ro.disconnect();
    };
  };

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
