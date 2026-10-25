/* ============================================================
   game2048.js — 2048（NEON/NATURE 双主题）
   逻辑完全对应 game/Game2048.kt + GameViewModel.kt；
   滑动 150ms 位移、合并弹跳、能量粒子爆发、键盘/手势双输入。
   ============================================================ */
(function () {
  "use strict";
  const BZX = window.BZX;
  const el = BZX.el;

  /* ---------------- logic (Game2048.kt) ---------------- */

  const SIZE = 4;

  function emptyBoard() { return new Array(16).fill(0); }

  function addRandomTile(board) {
    const empty = [];
    for (let i = 0; i < 16; i++) if (board[i] === 0) empty.push(i);
    if (!empty.length) return board;
    const result = board.slice();
    result[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4;
    return result;
  }

  function newGame() { return addRandomTile(addRandomTile(emptyBoard())); }

  function indexAt(line, offset, direction) {
    switch (direction) {
      case "LEFT": return line * SIZE + offset;
      case "RIGHT": return line * SIZE + (SIZE - 1 - offset);
      case "UP": return offset * SIZE + line;
      case "DOWN": return (SIZE - 1 - offset) * SIZE + line;
    }
  }

  function mergeLine(line) {
    const compact = line.filter((v) => v !== 0);
    const merged = [];
    const mergedOffsets = [];
    let gained = 0;
    let i = 0;
    while (i < compact.length) {
      if (i + 1 < compact.length && compact[i] === compact[i + 1]) {
        const value = compact[i] * 2;
        mergedOffsets.push(merged.length);
        merged.push(value);
        gained += value;
        i += 2;
      } else {
        merged.push(compact[i]);
        i++;
      }
    }
    while (merged.length < SIZE) merged.push(0);
    return { values: merged, gained, mergedOffsets };
  }

  function move(board, direction) {
    let score = 0;
    const result = new Array(16).fill(0);
    const mergedIndices = [];
    const motions = [];
    for (let line = 0; line < SIZE; line++) {
      const values = [];
      for (let offset = 0; offset < SIZE; offset++) values.push(board[indexAt(line, offset, direction)]);
      const sources = [];
      for (let i = 0; i < SIZE; i++) if (values[i] !== 0) sources.push(i);
      let source = 0, destination = 0;
      while (source < sources.length) {
        const first = sources[source];
        const target = indexAt(line, destination, direction);
        motions.push({ from: indexAt(line, first, direction), to: target, value: values[first] });
        if (source + 1 < sources.length && values[first] === values[sources[source + 1]]) {
          const second = sources[source + 1];
          motions.push({ from: indexAt(line, second, direction), to: target, value: values[second] });
          source += 2;
        } else source++;
        destination++;
      }
      const merged = mergeLine(values);
      score += merged.gained;
      merged.values.forEach((v, offset) => { result[indexAt(line, offset, direction)] = v; });
      merged.mergedOffsets.forEach((offset) => mergedIndices.push(indexAt(line, offset, direction)));
    }
    const moved = result.join() !== board.join();
    return { board: result, gainedScore: score, moved, mergedIndices, motions };
  }

  function hasWon(board) { return board.some((v) => v >= 2048); }

  function isGameOver(board) {
    if (board.some((v) => v === 0)) return false;
    for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) {
      const value = board[row * SIZE + col];
      if (col < SIZE - 1 && value === board[row * SIZE + col + 1]) return false;
      if (row < SIZE - 1 && value === board[(row + 1) * SIZE + col]) return false;
    }
    return true;
  }

  /* ---------------- state (GameViewModel.kt, kept across theme remounts) ---------------- */

  const state = {
    board: newGame(),
    score: 0,
    best: BZX.store.get("best", 0),
    canUndo: false,
    gameOver: false,
    won: false,
    keepPlaying: false,
    moveId: 0,
    mergedCells: [],
    previous: null,
  };

  function applyMove(direction) {
    if (state.gameOver || (state.won && !state.keepPlaying)) return false;
    const result = move(state.board, direction);
    if (!result.moved) return false;
    state.previous = { board: state.board, score: state.score };
    state.board = addRandomTile(result.board);
    state.score += result.gainedScore;
    if (state.score > state.best) {
      state.best = state.score;
      BZX.store.set("best", state.best);
    }
    state.canUndo = true;
    state.gameOver = isGameOver(state.board);
    state.won = state.won || hasWon(state.board);
    state.moveId++;
    state.mergedCells = result.mergedIndices;
    return true;
  }

  function undo() {
    if (!state.previous) return;
    state.board = state.previous.board;
    state.score = state.previous.score;
    state.canUndo = false;
    state.gameOver = false;
    state.won = hasWon(state.board);
    state.keepPlaying = false;
    state.moveId++;
    state.mergedCells = [];
    state.previous = null;
  }

  function restart() {
    state.previous = null;
    state.board = newGame();
    state.moveId++;
    state.gameOver = false;
    state.won = false;
    state.keepPlaying = false;
    state.mergedCells = [];
  }

  /* ---------------- screen ---------------- */

  BZX.Game2048Screen = function (root) {
    const palette = BZX.getTheme();
    root.classList.add("game-screen");
    root.setAttribute("data-theme", palette.key);
    root.style.setProperty("--bg", "linear-gradient(to bottom," + palette.background.join(",") + ")");

    const backdrop = el("canvas", "backdrop-canvas");
    root.appendChild(backdrop);
    const glow = el("canvas", "glow-canvas");
    root.appendChild(glow);

    const col = el("div", "portrait-col scroll-col");
    col.style.paddingTop = "22px";
    root.appendChild(col);

    const backBtn = el("button", "back-btn", "‹  返回游戏大厅");
    BZX.sfxButton(backBtn, () => BZX.router.backToLibrary());
    col.appendChild(backBtn);

    /* header */
    const header = el("div");
    const hRow = el("div");
    hRow.style.cssText = "display:flex;align-items:center;";
    const titleBox = el("div");
    const h1 = el("div", "brush-title", "2048");
    h1.style.fontSize = "44px";
    h1.style.backgroundImage = "linear-gradient(90deg," + palette.titleColors.join(",") + ")";
    h1.style.letterSpacing = "-2px";
    titleBox.appendChild(h1);
    titleBox.appendChild(el("div", "sub-caption", palette.isNature ? "NATURE GARDEN" : "NEON MATRIX"));
    hRow.appendChild(titleBox);
    const spring = el("div");
    spring.style.flex = "1";
    hRow.appendChild(spring);

    const undoBtn = BZX.roundAction("↶", "撤销", state.canUndo, palette, () => { undo(); renderAll(); });
    hRow.appendChild(undoBtn);
    const gap1 = el("div"); gap1.style.width = "9px"; hRow.appendChild(gap1);
    hRow.appendChild(BZX.roundAction("↻", "重新开始", true, palette, () => { restart(); renderAll(); }));
    header.appendChild(hRow);
    header.appendChild(spacer(20));
    col.appendChild(header);

    /* score cards */
    const scoreRow = el("div");
    scoreRow.style.cssText = "display:flex;gap:11px;";
    const scoreCard = BZX.scoreCard("SCORE", palette.primary);
    const bestCard = BZX.scoreCard("BEST", palette.tertiary);
    scoreRow.appendChild(scoreCard.el);
    scoreRow.appendChild(bestCard.el);
    col.appendChild(scoreRow);
    scoreCard.set(state.score);
    bestCard.set(state.best);

    /* theme picker */
    col.appendChild(themePicker(palette, (key) => {
      BZX.setTheme(key);
      // 换主题即时生效：原地重挂当前屏（对局状态保存在模块级单例中，不会丢失）
      setTimeout(remountSelf, 0);
    }));
    col.appendChild(spacer(24));

    const tagline = el("div", null, palette.isNature ? "慢慢生长 · 合成美好" : "COMBINE · EVOLVE · ASCEND");
    tagline.style.cssText = "color:" + palette.mutedText + ";font-size:10px;letter-spacing:2px;text-align:center;";
    col.appendChild(tagline);
    col.appendChild(spacer(17));

    /* board */
    const boardWrap = el("div", "g2048-board-wrap");
    const board = el("div", "g2048-board");
    boardWrap.appendChild(board);
    const burstCanvas = el("canvas");
    burstCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;border-radius:26px;";
    boardWrap.appendChild(burstCanvas);
    col.appendChild(boardWrap);
    col.appendChild(spacer(18));

    const hint = BZX.hintPill(palette, palette.isNature ? "  轻轻滑动，让数字在绿意中生长" : "  每次移动后将生成新的能量方块");
    col.appendChild(hint);
    col.appendChild(spacer(24));
    const foot = el("div", null, palette.isNature ? "指尖轻滑，让每一次合并焕发生机" : "SWIPE TO MOVE  /  MATCH TO MERGE");
    foot.style.cssText = "color:" + palette.mutedText + ";font-size:9px;letter-spacing:1.4px;text-align:center;padding-bottom:18px;";
    col.appendChild(foot);

    /* backdrops */
    const stopGrid = palette.isNature
      ? BZX.natureBackdrop(backdrop)
      : BZX.techGrid(backdrop, palette, 0.045, false);
    const stopParticles = palette.isNature ? null : BZX.ambientParticles(glow, palette);

    /* board internals */
    const slotLayer = el("div");
    board.appendChild(slotLayer);
    const tileLayer = el("div");
    board.appendChild(tileLayer);

    let moving = false;
    let dragX = 0, dragY = 0;

    function cellMetrics() {
      const w = board.getBoundingClientRect().width;
      const cell = (w - 27) / 4;
      return { w, cell, gap: 9 };
    }

    function posStyle(index) {
      const { cell, gap } = cellMetrics();
      const x = (cell + gap) * (index % 4);
      const y = (cell + gap) * Math.floor(index / 4);
      return { x, y, size: cell };
    }

    function buildSlots() {
      BZX.clear(slotLayer);
      const emptyGradient = palette.isNature
        ? "linear-gradient(90deg,#DCE7D0,#D2E1C6)"
        : "linear-gradient(90deg,#11182C,#0D1324)";
      for (let i = 0; i < 16; i++) {
        const slot = el("div", "g2048-cell-slot");
        const { x, y, size } = posStyle(i);
        slot.style.cssText += "left:" + x + "px;top:" + y + "px;width:" + size + "px;height:" + size + "px;background:" + emptyGradient + ";border:1px solid " + hexA(palette.tileAccent[0], 0.1) + ";";
        slotLayer.appendChild(slot);
      }
    }

    function tileStyle(value) {
      const accent = palette.tileAccent[value] || palette.tileFallback;
      let background;
      if (value === 0) background = "linear-gradient(90deg,#11182C,#0D1324)";
      else if (palette.isNature) background = "linear-gradient(90deg," + accent + "," + mix(accent, palette.tileBase, 0.12) + ")";
      else background = "linear-gradient(90deg," + hexA(accent, 0.94) + "," + hexA(accent, 0.54) + "," + palette.tileBase + ")";
      const color = palette.isNature && value <= 16 ? "#173D2C" : "#FFFFFF";
      const fontSize = value < 100 ? 28 : value < 1000 ? 25 : value < 10000 ? 21 : 17;
      return { accent, background, color, fontSize };
    }

    function renderStaticTiles(spawnInfo) {
      BZX.clear(tileLayer);
      state.board.forEach((value, index) => {
        if (value === 0) return;
        const { x, y, size } = posStyle(index);
        const t = tileStyle(value);
        const merged = state.mergedCells.includes(index);
        const spawned = spawnInfo && spawnInfo.prevBoard[index] === 0;
        const tile = el("div", "g2048-tile" + (merged ? " pop-merge" : spawned ? " pop-spawn" : ""));
        tile.style.cssText +=
          "left:" + x + "px;top:" + y + "px;width:" + size + "px;height:" + size + "px;" +
          "background:" + t.background + ";border:1px solid " + hexA(t.accent, 0.72) + ";" +
          "box-shadow:0 " + (merged ? 20 : 10) + "px 22px " + hexA(t.accent, merged ? 0.55 : 0.4) + ";";
        const num = el("div", "tile-num", String(value));
        num.style.cssText = "color:" + t.color + ";font-size:" + t.fontSize + "px;";
        tile.appendChild(num);
        tileLayer.appendChild(tile);
      });
    }

    /* one animated move: slide the motions for 150ms, then commit */
    function animateMove(direction, commit) {
      const result = move(state.board, direction);
      if (!result.moved) return false;
      moving = true;
      BZX.clear(tileLayer);
      const { cell, gap } = cellMetrics();
      const startX = {};
      result.motions.forEach((m) => { startX[m.from] = m.from; });
      const startTime = performance.now();
      const stopTween = BZX.tween(0, 1, 150, BZX.easeInOut,
        (p) => {
          BZX.clear(tileLayer);
          result.motions.forEach((m) => {
            const fx = (m.from % 4) + ((m.to % 4) - (m.from % 4)) * p;
            const fy = Math.floor(m.from / 4) + (Math.floor(m.to / 4) - Math.floor(m.from / 4)) * p;
            const x = (cell + gap) * fx;
            const y = (cell + gap) * fy;
            const t = tileStyle(m.value);
            const tile = el("div", "g2048-tile");
            tile.style.cssText +=
              "left:" + x + "px;top:" + y + "px;width:" + cell + "px;height:" + cell + "px;" +
              "background:" + t.background + ";border:1px solid " + hexA(t.accent, 0.72) + ";" +
              "box-shadow:0 10px 22px " + hexA(t.accent, 0.4) + ";z-index:2;";
            const num = el("div", "tile-num", String(m.value));
            num.style.cssText = "color:" + t.color + ";font-size:" + t.fontSize + "px;";
            tile.appendChild(num);
            tileLayer.appendChild(tile);
          });
        },
        () => {
          moving = false;
          commit(result);
        });
      return true;
    }

    function doMove(direction) {
      if (moving) return;
      // preview: only animate when the move would change the board
      const probe = move(state.board, direction);
      if (!probe.moved) return;
      if (state.gameOver || (state.won && !state.keepPlaying)) return;
      animateMove(direction, (result) => {
        state.previous = { board: state.board, score: state.score };
        const prevBoard = state.board;
        state.board = addRandomTile(result.board);
        state.score += result.gainedScore;
        if (state.score > state.best) {
          state.best = state.score;
          BZX.store.set("best", state.best);
        }
        state.canUndo = true;
        state.gameOver = isGameOver(state.board);
        state.won = state.won || hasWon(state.board);
        state.moveId++;
        state.mergedCells = result.mergedIndices;
        undoBtn.disabled = false;
        scoreCard.set(state.score);
        bestCard.set(state.best);
        renderStaticTiles({ prevBoard });
        burst(result.mergedIndices);
        maybeResultDialog();
      });
    }

    /* MergeParticleBurst */
    let burstStop = null;
    function burst(cells) {
      if (burstStop) burstStop();
      if (!cells.length) return;
      const fit = BZX.fitCanvas(burstCanvas);
      const start = performance.now();
      const progress = { v: 0 };
      burstStop = BZX.animLoop(
        () => {
          progress.v = Math.min(1, (performance.now() - start) / 760);
          fit.resize();
          const { ctx, state: s } = fit;
          const { w, h } = s;
          ctx.clearRect(0, 0, w, h);
          const p = progress.v;
          if (p >= 1) return;
          const fade = 1 - p;
          const gap = 9, inset = 10;
          const cellSize = (w - inset * 2 - gap * 3) / 4;
          cells.forEach((cellIndex) => {
            const row = Math.floor(cellIndex / 4);
            const column = cellIndex % 4;
            const cx = inset + column * (cellSize + gap) + cellSize / 2;
            const cy = inset + row * (cellSize + gap) + cellSize / 2;
            const accent = palette.tileAccent[state.board[cellIndex]] || palette.tileFallback;
            ctx.strokeStyle = hexA(accent, fade * 0.76);
            ctx.lineWidth = (2.8 * fade + 0.4);
            ctx.beginPath(); ctx.arc(cx, cy, cellSize * (0.12 + p * 0.58), 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = "rgba(255,255,255," + fade * 0.55 + ")";
            ctx.lineWidth = (1.4 * fade + 0.3);
            ctx.beginPath(); ctx.arc(cx, cy, cellSize * (0.05 + p * 0.4), 0, Math.PI * 2); ctx.stroke();
            for (let ray = 0; ray < 18; ray++) {
              const angle = ray * (6.283185 / 18) + cellIndex * 0.41;
              const dx = Math.cos(angle), dy = Math.sin(angle);
              const distance = cellSize * (0.18 + p * (0.58 + (ray % 4) * 0.08));
              const px = cx + dx * distance, py = cy + dy * distance;
              const pc = ray % 3 === 0 ? "#FFFFFF" : ray % 3 === 1 ? accent : palette.primary;
              ctx.strokeStyle = hexA(pc, fade * 0.55);
              ctx.lineWidth = 1.2 + (ray % 2);
              ctx.beginPath(); ctx.moveTo(cx + dx * distance * 0.58, cy + dy * distance * 0.58); ctx.lineTo(px, py); ctx.stroke();
              ctx.fillStyle = hexA(pc, fade);
              ctx.beginPath(); ctx.arc(px, py, (1.4 + (ray % 3) * 0.7) * fade, 0, Math.PI * 2); ctx.fill();
            }
          });
        },
        () => burstCanvas.isConnected
      );
    }

    /* inputs: swipe + keyboard (desktop adaptation) */
    board.addEventListener("pointerdown", (e) => {
      dragX = 0; dragY = 0;
      board.setPointerCapture(e.pointerId);
    });
    board.addEventListener("pointermove", (e) => {
      if (e.buttons === 0 && e.pointerType === "mouse") return;
      dragX += e.movementX;
      dragY += e.movementY;
    });
    board.addEventListener("pointerup", () => {
      const threshold = 42;
      if (!moving && Math.max(Math.abs(dragX), Math.abs(dragY)) >= threshold) {
        doMove(Math.abs(dragX) > Math.abs(dragY)
          ? (dragX > 0 ? "RIGHT" : "LEFT")
          : (dragY > 0 ? "DOWN" : "UP"));
      }
      dragX = 0; dragY = 0;
    });

    const keyHandler = (e) => {
      if (!root.isConnected) return;
      const map = {
        ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
        w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT", W: "UP", S: "DOWN", A: "LEFT", D: "RIGHT",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        doMove(dir);
      }
    };
    document.addEventListener("keydown", keyHandler);

    /* result dialogs */
    let dialogOpen = false;
    function maybeResultDialog() {
      if (dialogOpen) return;
      if (state.gameOver) {
        dialogOpen = true;
        BZX.dialog(root, {
          surface: palette.surface,
          title: palette.isNature ? "歇一歇，再出发" : "SYSTEM HALTED",
          titleColor: palette.tertiary,
          body: palette.isNature
            ? "本轮收获 " + state.score + " 分，开启新一轮的生长吧。"
            : "本轮能量得分 " + state.score + "，重新启动矩阵继续挑战。",
          bodyColor: palette.mutedText,
          confirm: { label: palette.isNature ? "重新开始" : "重新启动", onClick: () => { restart(); dialogOpen = false; renderAll(); } },
          confirmBg: palette.secondary,
          dismissible: false,
        });
      } else if (state.won && !state.keepPlaying) {
        dialogOpen = true;
        BZX.dialog(root, {
          surface: palette.surface,
          title: palette.isNature ? "收获 2048" : "CORE UNLOCKED",
          titleColor: palette.primary,
          body: palette.isNature
            ? "成功合成 2048，收获 " + state.score + " 分，继续探索吧。"
            : "成功合成 2048，能量得分 " + state.score + "。",
          bodyColor: palette.mutedText,
          confirm: { label: palette.isNature ? "重新开始" : "重新启动", onClick: () => { restart(); dialogOpen = false; renderAll(); } },
          confirmBg: palette.secondary,
          dismiss: {
            label: palette.isNature ? "继续生长" : "继续突破",
            onClick: () => { state.keepPlaying = true; dialogOpen = false; },
          },
          dismissColor: palette.primary,
          dismissible: false,
        });
      }
    }

    function renderAll() {
      buildSlots();
      renderStaticTiles(null);
      undoBtn.disabled = !state.canUndo;
      scoreCard.set(state.score);
      bestCard.set(state.best);
    }

    buildSlots();
    renderStaticTiles(null);
    maybeResultDialog();

    const ro = new ResizeObserver(() => { if (!moving) renderStaticTiles(null); });
    ro.observe(board);

    function remountSelf() {
      const host = root.parentNode;
      if (!host) return;
      const next = el("div", "screen");
      host.parentNode.insertBefore(next, host.nextSibling);
      BZX.Game2048Screen(next);
      next.classList.add("entering");
      setTimeout(() => next.classList.remove("entering"), 560);
      const old = host;
      old.classList.add("exiting");
      setTimeout(() => old.remove(), 390);
      if (BZX.router.currentEl === host) BZX.router.currentEl = next;
    }

    return () => {
      document.removeEventListener("keydown", keyHandler);
      ro.disconnect();
      stopGrid();
      if (stopParticles) stopParticles();
    };
  };

  function spacer(h) {
    const s = el("div");
    s.style.height = h + "px";
    return s;
  }

  /* ThemePicker（2048 专属） */
  function themePicker(palette, onSelect) {
    const row = el("div");
    row.style.cssText = "display:flex;gap:10px;width:100%;";
    [
      { key: "neon", title: "炫彩科技", preview: ["#22D3EE", "#A855F7", "#F43F8E"] },
      { key: "nature", title: "清新自然", preview: ["#D5ECA9", "#7FB575", "#2B7554"] },
    ].forEach((theme) => {
      const selected = palette.key === theme.key;
      const option = el("button");
      option.style.cssText =
        "flex:1;min-height:48px;border-radius:16px;padding:10px 12px;display:flex;align-items:center;gap:8px;text-align:left;" +
        "background:" + (selected ? hexA(palette.primary, 0.12) : hexA(palette.surface, 0.72)) + ";" +
        "border:" + (selected ? "1.5px" : "1px") + " solid " + (selected ? palette.primary : hexA(palette.mutedText, 0.3)) + ";";
      const dot = el("div");
      dot.style.cssText = "width:18px;height:18px;border-radius:50%;flex:0 0 18px;background:linear-gradient(90deg," + theme.preview.join(",") + ");";
      option.appendChild(dot);
      option.appendChild(el("div", null, theme.title)).style.cssText =
        "flex:1;font-size:12px;color:" + palette.text + ";font-weight:" + (selected ? 700 : 500) + ";";
      const radio = el("div");
      radio.style.cssText = "width:14px;height:14px;border-radius:50%;border:1.5px solid " + (selected ? palette.primary : hexA(palette.mutedText, 0.3)) + ";display:flex;align-items:center;justify-content:center;";
      if (selected) {
        const inner = el("div");
        inner.style.cssText = "width:6px;height:6px;border-radius:50%;background:" + palette.primary + ";";
        radio.appendChild(inner);
      }
      option.appendChild(radio);
      BZX.sfxButton(option, () => onSelect(theme.key));
      row.appendChild(option);
    });
    return row;
  }

  function hexA(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

  function mix(hex, hex2, t) {
    const p = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const a = p(hex), b = p(hex2);
    const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
    return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
  }
})();
