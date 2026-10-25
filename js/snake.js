/* ============================================================
   snake.js — 贪吃蛇（NEON/GARDEN 双主题）
   逻辑对应 game/Snake.kt + SnakeViewModel.kt。
   桌面适配：方向键 / WASD 转向；滑动手势与十字方向键保留。
   ============================================================ */
(function () {
  "use strict";
  const BZX = window.BZX;
  const el = BZX.el;

  const SIZE = 15;
  const BASE_INTERVAL = 180, FASTEST_INTERVAL = 90;

  /* ---------------- engine (Snake.kt) ---------------- */

  function newGame(best) {
    const snake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
    return {
      snake, food: randomFreeCell(snake), dir: "RIGHT", pendingDir: "RIGHT",
      score: 0, best, eaten: 0, status: "READY", moveId: 0, tickInterval: BASE_INTERVAL,
    };
  }

  function randomFreeCell(snake) {
    const free = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      const p = { x: i % SIZE, y: Math.floor(i / SIZE) };
      if (!snake.some((s) => s.x === p.x && s.y === p.y)) free.push(p);
    }
    return free[Math.floor(Math.random() * free.length)];
  }

  const dx = (d) => (d === "LEFT" ? -1 : d === "RIGHT" ? 1 : 0);
  const dy = (d) => (d === "UP" ? -1 : d === "DOWN" ? 1 : 0);
  const opposite = (d) => ({ UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" }[d]);

  function turn(state, dir) {
    if (state.status !== "PLAYING" || dir === opposite(state.dir)) return;
    state.pendingDir = dir;
  }

  function tick(state) {
    if (state.status !== "PLAYING") return state;
    const dir = state.pendingDir;
    const head = state.snake[0];
    const next = { x: head.x + dx(dir), y: head.y + dy(dir) };
    if (next.x < 0 || next.x >= SIZE || next.y < 0 || next.y >= SIZE) return died(state);
    const eating = next.x === state.food.x && next.y === state.food.y;
    const body = eating ? state.snake : state.snake.slice(0, -1);
    if (body.some((p) => p.x === next.x && p.y === next.y)) return died(state);
    const grown = [next].concat(state.snake);
    if (!eating) {
      state.snake = grown.slice(0, -1);
      state.dir = dir;
      state.moveId++;
      return state;
    }
    state.score += 10;
    state.eaten += 1;
    const free = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      const p = { x: i % SIZE, y: Math.floor(i / SIZE) };
      if (!grown.some((s) => s.x === p.x && s.y === p.y)) free.push(p);
    }
    state.snake = grown;
    state.dir = dir;
    state.moveId++;
    if (!free.length) {
      state.best = Math.max(state.best, state.score);
      BZX.store.set("snakeBest", state.best);
      state.status = "WON";
      return state;
    }
    state.food = free[Math.floor(Math.random() * free.length)];
    state.best = Math.max(state.best, state.score);
    state.tickInterval = Math.max(FASTEST_INTERVAL, BASE_INTERVAL - state.eaten * 4);
    return state;
  }

  function died(state) {
    state.status = "OVER";
    state.best = Math.max(state.best, state.score);
    BZX.store.set("snakeBest", state.best);
    return state;
  }

  /* ---------------- screen ---------------- */

  BZX.SnakeScreen = function (root) {
    const palette = BZX.getTheme();
    root.classList.add("game-screen");
    root.setAttribute("data-theme", palette.key);
    root.style.setProperty("--bg", "linear-gradient(to bottom," + palette.background.join(",") + ")");

    const state = newGame(BZX.store.get("snakeBest", 0));

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
    const h1 = el("div", "brush-title", "贪吃蛇");
    h1.style.fontSize = "36px";
    h1.style.backgroundImage = "linear-gradient(90deg," + palette.titleColors.join(",") + ")";
    h1.style.letterSpacing = "-1px";
    titleBox.appendChild(h1);
    titleBox.appendChild(el("div", "sub-caption", palette.isNature ? "GARDEN RUNNER" : "NEON SERPENT"));
    hRow.appendChild(titleBox);
    const spring = el("div"); spring.style.flex = "1"; hRow.appendChild(spring);
    const pauseBtn = BZX.roundAction("⏸", "暂停或继续", false, palette, () => {
      if (state.status === "PLAYING") pause();
      else if (state.status === "PAUSED") resume();
    });
    hRow.appendChild(pauseBtn);
    const gap = el("div"); gap.style.width = "9px"; hRow.appendChild(gap);
    hRow.appendChild(BZX.roundAction("↻", "重新开始", true, palette, () => {
      Object.assign(state, newGame(BZX.store.get("snakeBest", 0)));
      startLoop();
      renderAll();
    }));
    header.appendChild(hRow);
    header.appendChild(spacer(14));
    col.appendChild(header);

    /* score cards */
    const scoreRow = el("div");
    scoreRow.style.cssText = "display:flex;gap:11px;";
    const scoreCard = BZX.scoreCard("SCORE", palette.primary);
    scoreCard.el.style.padding = "13px 14px";
    scoreCard.el.querySelector(".sc-value").style.fontSize = "21px";
    const bestCard = BZX.scoreCard("BEST", palette.tertiary);
    bestCard.el.style.padding = "13px 14px";
    bestCard.el.querySelector(".sc-value").style.fontSize = "21px";
    const lenCard = BZX.scoreCard("长度", palette.secondary);
    lenCard.el.style.padding = "13px 14px";
    lenCard.el.querySelector(".sc-value").style.fontSize = "21px";
    scoreRow.appendChild(scoreCard.el);
    scoreRow.appendChild(bestCard.el);
    scoreRow.appendChild(lenCard.el);
    col.appendChild(scoreRow);
    col.appendChild(spacer(14));

    /* board */
    const boardArea = el("div", "snake-board-area");
    const well = el("div", "snake-well");
    const wellInner = el("div", "snake-well-inner");
    const canvas = el("canvas");
    wellInner.appendChild(canvas);
    well.appendChild(wellInner);
    boardArea.appendChild(well);
    col.appendChild(boardArea);
    col.appendChild(spacer(12));

    /* controls (cross D-pad) */
    const controls = el("div", "snake-controls");
    const topRow = el("div");
    const midRow = el("div", "sc-mid");
    const keyUp = makeKey("▲", "向上", () => doTurn("UP"));
    topRow.appendChild(keyUp);
    const keyLeft = makeKey("◀", "向左", () => doTurn("LEFT"));
    const keyDown = makeKey("▼", "向下", () => doTurn("DOWN"));
    const keyRight = makeKey("▶", "向右", () => doTurn("RIGHT"));
    midRow.appendChild(keyLeft); midRow.appendChild(keyDown); midRow.appendChild(keyRight);
    controls.appendChild(topRow);
    controls.appendChild(midRow);
    col.appendChild(controls);
    col.appendChild(spacer(10));

    col.appendChild(BZX.hintPill(palette, "  在棋盘上滑动或用方向键转向 · 吃到果实就会变长"));
    col.appendChild(spacer(12));

    function makeKey(symbol, label, fn) {
      const b = BZX.roundAction(symbol, label, true, palette, fn);
      b.classList.add("snake-key");
      return b;
    }

    /* board rendering */
    const fit = BZX.fitCanvas(canvas);
    let pulseT = 0;
    let lastMoveId = -1;

    function layoutBoard() {
      const availW = boardArea.clientWidth - 16;
      const availH = boardArea.clientHeight - 16;
      const cell = Math.max(8, Math.floor(Math.min(availW / SIZE, availH / SIZE)));
      canvas.style.width = cell * SIZE + "px";
      canvas.style.height = cell * SIZE + "px";
      canvas.width = cell * SIZE * (window.devicePixelRatio || 1);
      canvas.height = cell * SIZE * (window.devicePixelRatio || 1);
      fit.resize();
      return cell;
    }

    function draw() {
      const cell = layoutBoard();
      const { ctx } = fit;
      const w = cell * SIZE, h = cell * SIZE;
      ctx.clearRect(0, 0, w, h);
      // faint plot marks
      ctx.strokeStyle = BZX.hexA(palette.primary, 0.06);
      ctx.lineWidth = 1;
      for (let i = 1; i < SIZE; i++) {
        ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(w, i * cell); ctx.stroke();
      }
      const center = (p) => ({ x: (p.x + 0.5) * cell, y: (p.y + 0.5) * cell });
      // food pulses
      const radius = cell * 0.3 * (1 + 0.1 * pulseT);
      const fc = center(state.food);
      ctx.fillStyle = BZX.hexA(palette.tertiary, 0.25);
      ctx.beginPath(); ctx.arc(fc.x, fc.y, radius * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = palette.tertiary;
      ctx.beginPath(); ctx.arc(fc.x, fc.y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.5)";
      ctx.beginPath(); ctx.arc(fc.x - radius * 0.3, fc.y - radius * 0.3, radius * 0.3, 0, Math.PI * 2); ctx.fill();
      // snake fading toward the tail
      const total = Math.max(1, state.snake.length);
      state.snake.forEach((part, index) => {
        const t = index / total;
        ctx.fillStyle = index === 0 ? palette.secondary : lerpToBoard(t);
        const pad = 1;
        roundRectPath(ctx, part.x * cell + pad, part.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.3);
        ctx.fill();
      });
      // eyes oriented by travel direction
      if (state.snake.length) {
        const head = state.snake[0];
        const c = center(head);
        const eye = cell * 0.11;
        const fx = dx(state.dir), fy = dy(state.dir);
        const sx = -fy, sy = fx;
        [1, -1].forEach((s) => {
          ctx.fillStyle = palette.boardSurface;
          ctx.beginPath();
          ctx.arc(c.x + fx * cell * 0.16 + sx * eye * 1.6 * s, c.y + fy * cell * 0.16 + sy * eye * 1.6 * s, eye, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      // death ring
      if (state.status === "OVER" && state.snake.length) {
        const c = center(state.snake[0]);
        ctx.strokeStyle = BZX.hexA(palette.tertiary, 0.5);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(c.x, c.y, cell * 0.45, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // lerp(primary → boardSurface, .1 + .5 * t)：boardSurface 是 rgba，此处取其基色近似
    function lerpToBoard(t) {
      const from = hex2rgb(palette.primary);
      const to = palette.isNature ? [233, 241, 222] : [9, 14, 32];
      const mixv = 0.1 + 0.5 * t;
      const c = from.map((v, i) => Math.round(v + (to[i] - v) * mixv));
      return "rgb(" + c.join(",") + ")";
    }

    let pulsePhase = 0;
    const stopLoop = BZX.animLoop(
      (_now, dt) => {
        // 食物脉冲：700ms 来回（RepeatMode.Reverse）
        pulsePhase = (pulsePhase + dt / 0.7) % 1;
        pulseT = pulsePhase < 0.5 ? pulsePhase * 2 : 2 - pulsePhase * 2;
        draw();
      },
      () => canvas.isConnected
    );

    /* game loop */
    let timer = null;
    function startLoop() {
      stopLoop2();
      timer = setTimeout(function run() {
        if (state.status === "PLAYING") {
          tick(state);
          renderScores();
          if (state.status === "OVER" || state.status === "WON") {
            showResultDialog();
            timer = null;
            return;
          }
        }
        if (state.status === "PLAYING") timer = setTimeout(run, state.tickInterval);
        else timer = null;
      }, state.status === "PLAYING" ? state.tickInterval : 120);
    }
    function stopLoop2() {
      if (timer) { clearTimeout(timer); timer = null; }
    }

    function doTurn(dir) {
      turn(state, dir);
    }

    function pause() {
      if (state.status === "PLAYING") {
        state.status = "PAUSED";
        showOverlays();
        renderAll();
      }
    }
    function resume() {
      if (state.status === "PAUSED") {
        state.status = "PLAYING";
        showOverlays();
        startLoop();
      }
    }

    function renderScores() {
      scoreCard.set(state.score);
      bestCard.set(state.best);
      lenCard.set(state.snake.length);
      pauseBtn.disabled = !(state.status === "PLAYING" || state.status === "PAUSED");
      pauseBtn.textContent = state.status === "PAUSED" ? "▶" : "⏸";
    }

    function renderAll() {
      renderScores();
      showOverlays();
    }

    /* overlays */
    let currentOverlay = null;
    function showOverlays() {
      if (currentOverlay) { currentOverlay.remove(); currentOverlay = null; }
      if (state.status === "READY") {
        currentOverlay = BZX.startOverlay(palette, root, () => {
          if (state.status === "READY") state.status = "PLAYING";
          currentOverlay.remove(); currentOverlay = null;
          startLoop();
          renderScores();
        }, () => BZX.router.backToLibrary(), "滑动棋盘或用方向键转向，别咬到自己");
      } else if (state.status === "PAUSED") {
        currentOverlay = BZX.pauseOverlay(palette, root, resume, () => BZX.router.backToLibrary());
      }
    }

    let dialogOpen = false;
    function showResultDialog() {
      if (dialogOpen) return;
      dialogOpen = true;
      const won = state.status === "WON";
      BZX.dialog(root, {
        surface: palette.surface,
        title: won
          ? (palette.isNature ? "整个花园都是你" : "PLOT CONQUERED")
          : (palette.isNature ? "撞到了" : "GAME OVER"),
        titleColor: won ? palette.primary : palette.tertiary,
        body: won
          ? "15×15 的棋盘全部占满，得分 " + state.score + "，无解的完美贪吃蛇。"
          : "本轮得分 " + state.score + "，长度 " + state.snake.length + "。缓缓再来，别咬到自己。",
        bodyColor: palette.mutedText,
        confirm: {
          label: "再来一局",
          onClick: () => {
            dialogOpen = false;
            Object.assign(state, newGame(BZX.store.get("snakeBest", 0)));
            renderAll();
            startLoop();
          },
        },
        confirmBg: palette.secondary,
        dismissible: false,
      });
    }

    /* swipe steering（一次长滑可多次转向） */
    let dragX = 0, dragY = 0;
    canvas.addEventListener("pointerdown", (e) => {
      dragX = 0; dragY = 0;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (e.buttons === 0 && e.pointerType === "mouse") return;
      dragX += e.movementX;
      dragY += e.movementY;
      const threshold = 26;
      if (Math.abs(dragX) > threshold || Math.abs(dragY) > threshold) {
        const dir = Math.abs(dragX) > Math.abs(dragY)
          ? (dragX > 0 ? "RIGHT" : "LEFT")
          : (dragY > 0 ? "DOWN" : "UP");
        doTurn(dir);
        dragX = 0; dragY = 0;
      }
    });

    /* keyboard (desktop adaptation) */
    const keyHandler = (e) => {
      if (!root.isConnected) return;
      const map = {
        ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
        w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT", W: "UP", S: "DOWN", A: "LEFT", D: "RIGHT",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        doTurn(dir);
      } else if (e.key === " " || e.key === "p" || e.key === "P") {
        e.preventDefault();
        if (state.status === "PLAYING") pause();
        else if (state.status === "PAUSED") resume();
        else if (state.status === "READY") {
          state.status = "PLAYING";
          showOverlays();
          startLoop();
          renderScores();
        }
      }
    };
    document.addEventListener("keydown", keyHandler);

    const stopAutoPause = BZX.autoPauseOnHide(pause);

    renderAll();
    startLoop();

    return () => {
      stopLoop();
      stopLoop2();
      stopGrid();
      document.removeEventListener("keydown", keyHandler);
      stopAutoPause();
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

  function hex2rgb(hex) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  }

  function spacer(h) {
    const s = el("div");
    s.style.height = h + "px";
    return s;
  }
})();
