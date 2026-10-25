/* ============================================================
   linklink.js — 连连看（8×12 · 果蔬工具图标 · 双折线连接）
   逻辑对应 game/LinkLink.kt + LinkViewModel.kt。
   经典规则：≤2 个转折、可走棋盘外圈空边。
   ============================================================ */
(function () {
  "use strict";
  const BZX = window.BZX;
  const el = BZX.el;

  const COLS = 8, ROWS = 12, TYPES = 10, TOTAL_PAIRS = COLS * ROWS / 2;
  const TYPE_NAMES = ["苹果", "橙子", "香蕉", "葡萄", "西瓜", "胡萝卜", "蘑菇", "玉米", "扳手", "锤子"];

  const LINK_BG = "#F2F8F5", LINK_CARD = "#F9FCF8";
  const C = BZX.SummerColors;

  /* ---------------- engine (LinkLink.kt) ---------------- */

  function newGame() {
    const types = [];
    for (let pair = 0; pair < TOTAL_PAIRS; pair++) types.push(pair % TYPES);
    const tiles = types.concat(types);
    shuffle(tiles);
    let grid = decluster(tiles.map((type, index) => ({ id: index, type })), COLS, ROWS);
    let stateObj = { grid, cols: COLS, rows: ROWS, selected: null, matched: 0, totalPairs: TOTAL_PAIRS, shuffles: 0, elapsedSeconds: 0, hint: null, hintSerial: 0, status: "PLAYING", matchedPath: null, clearId: 0 };
    let tries = 0;
    while (!hasMoves(grid) && tries < 30) {
      grid = decluster(shuffleTypes(stateObj).map((t, i) => ({ id: i, type: t.type })), COLS, ROWS);
      stateObj.grid = grid;
      tries++;
    }
    return stateObj;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function tileAt(grid, cols, rows, x, y) {
    if (x >= 0 && x < cols && y >= 0 && y < rows) return grid[y * cols + x];
    return null;
  }

  function clearSegment(grid, cols, rows, x1, y1, x2, y2) {
    if (y1 === y2) {
      for (let x = Math.min(x1, x2) + 1; x < Math.max(x1, x2); x++) {
        if (tileAt(grid, cols, rows, x, y1) !== null) return false;
      }
      return true;
    }
    if (x1 === x2) {
      for (let y = Math.min(y1, y2) + 1; y < Math.max(y1, y2); y++) {
        if (tileAt(grid, cols, rows, x1, y) !== null) return false;
      }
      return true;
    }
    return false;
  }

  function connectPath(grid, cols, rows, a, b) {
    if (a === b || a < 0 || b < 0 || a >= grid.length || b >= grid.length) return null;
    const tileA = grid[a], tileB = grid[b];
    if (!tileA || !tileB || tileA.type !== tileB.type) return null;
    const ax = a % cols, ay = Math.floor(a / cols);
    const bx = b % cols, by = Math.floor(b / cols);
    // zero bends
    if ((ax === bx || ay === by) && clearSegment(grid, cols, rows, ax, ay, bx, by)) {
      return [[ax, ay], [bx, by]];
    }
    // one bend
    for (const corner of [[ax, by], [bx, ay]]) {
      if (tileAt(grid, cols, rows, corner[0], corner[1]) === null &&
        clearSegment(grid, cols, rows, ax, ay, corner[0], corner[1]) &&
        clearSegment(grid, cols, rows, corner[0], corner[1], bx, by)) {
        return [[ax, ay], corner, [bx, by]];
      }
    }
    // two bends: slide a bar across the extended board
    for (let x = -1; x <= cols; x++) {
      if (tileAt(grid, cols, rows, x, ay) === null && tileAt(grid, cols, rows, x, by) === null &&
        clearSegment(grid, cols, rows, ax, ay, x, ay) &&
        clearSegment(grid, cols, rows, x, ay, x, by) &&
        clearSegment(grid, cols, rows, x, by, bx, by)) {
        return [[ax, ay], [x, ay], [x, by], [bx, by]];
      }
    }
    for (let y = -1; y <= rows; y++) {
      if (tileAt(grid, cols, rows, ax, y) === null && tileAt(grid, cols, rows, bx, y) === null &&
        clearSegment(grid, cols, rows, ax, ay, ax, y) &&
        clearSegment(grid, cols, rows, ax, y, bx, y) &&
        clearSegment(grid, cols, rows, bx, y, bx, by)) {
        return [[ax, ay], [ax, y], [bx, y], [bx, by]];
      }
    }
    return null;
  }

  function hasMoves(grid) {
    const occupied = [];
    grid.forEach((t, i) => { if (t) occupied.push(i); });
    for (let i = 0; i < occupied.length; i++) {
      for (let j = i + 1; j < occupied.length; j++) {
        const a = occupied[i], b = occupied[j];
        if (grid[a].type === grid[b].type && connectPath(grid, COLS, ROWS, a, b)) return true;
      }
    }
    return false;
  }

  function shuffleTypes(stateObj) {
    const occupied = [];
    stateObj.grid.forEach((t, i) => { if (t) occupied.push(i); });
    const types = shuffle(occupied.map((i) => stateObj.grid[i].type));
    const grid = stateObj.grid.slice();
    occupied.forEach((index, position) => { grid[index] = { id: grid[index].id, type: types[position] }; });
    stateObj.grid = grid;
    stateObj.selected = null;
    stateObj.hint = null;
    return grid;
  }

  function firstOrthogonalPair(grid, cols, rows) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const index = y * cols + x;
        const tile = grid[index];
        if (!tile) continue;
        if (x + 1 < cols) {
          const right = grid[index + 1];
          if (right && right.type === tile.type) return [index, index + 1];
        }
        if (y + 1 < rows) {
          const below = grid[index + cols];
          if (below && below.type === tile.type) return [index, index + cols];
        }
      }
    }
    return null;
  }

  function decluster(grid, cols, rows, passes) {
    let current = grid;
    const maxPasses = passes || 2000;
    for (let pass = 0; pass < maxPasses; pass++) {
      const clash = firstOrthogonalPair(current, cols, rows);
      if (!clash) return current;
      const others = [];
      current.forEach((tile, index) => {
        if (tile && tile.type !== current[clash[0]].type && index !== clash[1]) others.push(index);
      });
      if (!others.length) return current;
      const swapWith = others[Math.floor(Math.random() * others.length)];
      const swapped = current.slice();
      const moved = swapped[clash[0]];
      swapped[clash[0]] = swapped[swapWith];
      swapped[swapWith] = moved;
      current = swapped;
    }
    return current;
  }

  function reshuffle(stateObj) {
    function hardScramble(base) {
      const copy = Object.assign({}, base);
      copy.grid = base.grid.map((t) => (t ? { id: t.id, type: t.type } : null));
      shuffleTypes(copy);
      return decluster(copy.grid, base.cols, base.rows);
    }
    let candidate = Object.assign({}, stateObj, { grid: hardScramble(stateObj) });
    let tries = 0;
    while (!hasMoves(candidate.grid) && tries < 30) {
      candidate = Object.assign({}, candidate, { grid: hardScramble(candidate) });
      tries++;
    }
    let fallback = 0;
    while (!hasMoves(candidate.grid) && fallback < 60) {
      const copy = Object.assign({}, candidate);
      copy.grid = candidate.grid.map((t) => (t ? { id: t.id, type: t.type } : null));
      shuffleTypes(copy);
      candidate = Object.assign({}, candidate, { grid: copy.grid });
      fallback++;
    }
    candidate.selected = null;
    candidate.hint = null;
    candidate.shuffles = stateObj.shuffles + 1;
    return candidate;
  }

  function select(stateObj, index) {
    if (stateObj.status !== "PLAYING" || !stateObj.grid[index]) return stateObj;
    const selected = stateObj.selected;
    if (selected === null || selected === index) {
      const next = Object.assign({}, stateObj);
      next.selected = selected === index ? null : index;
      return next;
    }
    const tileA = stateObj.grid[selected], tileB = stateObj.grid[index];
    if (tileA.type === tileB.type) {
      const path = connectPath(stateObj.grid, stateObj.cols, stateObj.rows, selected, index);
      if (path) {
        const grid = stateObj.grid.slice();
        grid[selected] = null;
        grid[index] = null;
        const matched = stateObj.matched + 1;
        const next = Object.assign({}, stateObj, {
          grid, selected: null, matched, matchedPath: path,
          clearId: stateObj.clearId + 1, hint: null,
          status: matched === stateObj.totalPairs ? "OVER" : "PLAYING",
        });
        if (next.status === "OVER") return next;
        if (!hasMoves(next.grid)) return reshuffle(next);
        return next;
      }
    }
    const next = Object.assign({}, stateObj);
    next.selected = index;
    return next;
  }

  function findHint(stateObj) {
    const occupied = [];
    stateObj.grid.forEach((t, i) => { if (t) occupied.push(i); });
    for (let i = 0; i < occupied.length; i++) {
      for (let j = i + 1; j < occupied.length; j++) {
        const a = occupied[i], b = occupied[j];
        if (stateObj.grid[a].type === stateObj.grid[b].type && connectPath(stateObj.grid, stateObj.cols, stateObj.rows, a, b)) {
          return [a, b];
        }
      }
    }
    return null;
  }

  /* ---------------- screen ---------------- */

  BZX.LinkScreen = function (root) {
    root.classList.add("game-screen", "linklink");
    root.style.setProperty("--bg", LINK_BG);
    root.style.setProperty("--hint-color", C.WarmRose);

    let state = newGame();

    const col = el("div", "portrait-col");
    col.style.paddingTop = "12px";
    root.appendChild(col);

    /* header */
    const head = el("div", "linklink-head");
    const backBtn = el("button", "back-btn", "‹  返回游戏大厅");
    BZX.sfxButton(backBtn, () => BZX.router.backToLibrary());
    head.appendChild(backBtn);
    const titles = el("div", "ll-titles");
    titles.appendChild(el("div", "ll-title", "连连看"));
    titles.appendChild(el("div", "ll-sub", "果蔬工具 · 成双成对"));
    head.appendChild(titles);
    const clock = el("div", "ll-clock");
    clock.appendChild(el("div", "cl-label", "用时"));
    const clockValue = el("div", "cl-value", "00:00");
    clock.appendChild(clockValue);
    head.appendChild(clock);
    col.appendChild(head);

    const actions = el("div", "linklink-actions");
    const matchedText = el("div", "ll-matched", "已消除 0 / " + TOTAL_PAIRS + " 对");
    actions.appendChild(matchedText);
    const hintPill = el("button", "link-pill", "提示");
    const shufflePill = el("button", "link-pill", "重排");
    const restartPill = el("button", "link-pill", "重开");
    [hintPill, shufflePill, restartPill].forEach((p) => actions.appendChild(p));
    col.appendChild(actions);
    col.appendChild(spacer(10));

    const boardArea = el("div", "link-board-area");
    const board = el("div", "link-board");
    const connector = el("canvas", "connector");
    board.appendChild(connector);
    const tileLayer = el("div");
    board.appendChild(tileLayer);
    boardArea.appendChild(board);
    col.appendChild(boardArea);
    col.appendChild(spacer(10));

    const foot = el("div", null, "点中两张相同图案，连线转折不超过两次即可消除");
    foot.style.cssText = "color:" + C.SoftInk + ";font-size:10px;text-align:center;padding-bottom:12px;";
    col.appendChild(foot);

    /* layout */
    let cell = 30;
    function layout() {
      const availW = boardArea.clientWidth - 4;
      const availH = boardArea.clientHeight - 4;
      cell = Math.max(10, Math.floor(Math.min((availW - 20) / (COLS + 2), (availH - 20) / (ROWS + 2))));
      board.style.width = cell * (COLS + 2) + "px";
      board.style.height = cell * (ROWS + 2) + "px";
      const dpr = window.devicePixelRatio || 1;
      connector.width = cell * (COLS + 2) * dpr;
      connector.height = cell * (ROWS + 2) * dpr;
    }

    /* tiles */
    const tileEls = [];
    function renderTiles() {
      BZX.clear(tileLayer);
      tileEls.length = 0;
      state.grid.forEach((tile, index) => {
        if (!tile) { tileEls.push(null); return; }
        const colI = index % COLS, rowI = Math.floor(index / COLS);
        const node = el("div", "link-tile" + (state.selected === index ? " selected" : ""));
        node.style.width = cell - 4 + "px";
        node.style.height = cell - 4 + "px";
        node.style.left = cell * (colI + 1) + 2 + "px";
        node.style.top = cell * (rowI + 1) + 2 + "px";
        node.title = TYPE_NAMES[tile.type];
        const icon = drawLinkIcon(tile.type, Math.round(cell * 0.58));
        node.appendChild(icon);
        node.addEventListener("click", () => {
          state = select(state, index);
          if (state.clearId !== lastClearId) {
            lastClearId = state.clearId;
            startConnector();
          }
          if (state.shuffles !== lastShuffles) {
            lastShuffles = state.shuffles;
            BZX.toast(root, "重排完成，找找新的配对吧");
          }
          renderTiles();
          renderHeader();
          if (state.status === "OVER") showWinDialog();
        });
        tileLayer.appendChild(node);
        tileEls.push(node);
      });
    }

    function renderHint() {
      tileEls.forEach((node, index) => {
        if (!node) return;
        const hinted = state.hint && (state.hint[0] === index || state.hint[1] === index);
        node.classList.toggle("hinted", !!hinted);
      });
    }

    function renderHeader() {
      matchedText.textContent = "已消除 " + state.matched + " / " + state.totalPairs + " 对";
      clockValue.textContent = fmtClock(state.elapsedSeconds);
    }

    /* connector line (480ms fade) */
    let lastClearId = 0;
    let lastShuffles = 0;
    let connectorStop = null;
    function startConnector() {
      if (connectorStop) connectorStop();
      const path = state.matchedPath;
      if (!path) return;
      const dpr = window.devicePixelRatio || 1;
      const ctx = connector.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const start = performance.now();
      connectorStop = BZX.animLoop(
        () => {
          const p = (performance.now() - start) / 480;
          ctx.clearRect(0, 0, connector.width, connector.height);
          if (p >= 1) return;
          const alpha = 1 - p;
          const points = path.map(([x, y]) => ({ x: (x + 1.5) * cell, y: (y + 1.5) * cell }));
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = hexA(C.SeaGlass, 0.18 * alpha);
          ctx.lineWidth = 7;
          strokePolyline(ctx, points);
          ctx.strokeStyle = hexA(C.SeaGlass, alpha);
          ctx.lineWidth = 2.6;
          strokePolyline(ctx, points);
          ctx.fillStyle = hexA(C.SeaGlass, alpha);
          points.forEach((pt) => {
            ctx.beginPath(); ctx.arc(pt.x, pt.y, 3.2, 0, Math.PI * 2); ctx.fill();
          });
        },
        () => connector.isConnected
      );
    }

    /* hint pulse + timer */
    const stopPulse = BZX.animLoop(
      (_now, dt) => {
        const t = (pulsePhase + dt / 0.48) % 1;
        pulsePhase = t;
        const v = t < 0.5 ? t * 2 : 2 - t * 2; // 0..1..0
        const alpha = 0.45 + 0.55 * v;
        tileEls.forEach((node) => {
          if (node && node.classList.contains("hinted")) {
            node.style.setProperty("--hint-color", hexA(C.WarmRose, alpha));
          }
        });
      },
      () => root.isConnected
    );
    let pulsePhase = 0;

    let timerId = setInterval(() => {
      if (state.status === "PLAYING") {
        state.elapsedSeconds++;
        clockValue.textContent = fmtClock(state.elapsedSeconds);
      }
    }, 1000);

    BZX.sfxButton(hintPill, () => {
      state.hint = findHint(state);
      state.hintSerial++;
      if (state.hint) {
        renderHint();
        setTimeout(() => {
          if (state.hint) { state.hint = null; renderHint(); }
        }, 1600);
      }
    });
    BZX.sfxButton(shufflePill, () => {
      state = reshuffle(state);
      lastShuffles = state.shuffles;
      BZX.toast(root, "重排完成，找找新的配对吧");
      renderTiles();
      renderHint();
    });
    BZX.sfxButton(restartPill, () => {
      state = newGame();
      lastClearId = 0;
      lastShuffles = 0;
      renderTiles();
      renderHeader();
      renderHint();
    });

    function showWinDialog() {
      BZX.dialog(root, {
        surface: "#F5FAF7",
        titleColor: C.DeepInk,
        title: "全部配对完成！",
        body: "用时 " + fmtClock(state.elapsedSeconds) + "，重排 " + state.shuffles + " 次。苹果找苹果，扳手会扳手——整版清清爽爽。",
        bodyColor: C.SoftInk,
        confirm: {
          label: "再来一局",
          onClick: () => {
            state = newGame();
            lastClearId = 0;
            lastShuffles = 0;
            renderTiles();
            renderHeader();
          },
        },
        confirmBg: C.SeaGlass,
        dismissible: false,
      });
    }

    const ro = new ResizeObserver(() => {
      layout();
      renderTiles();
    });
    ro.observe(boardArea);

    layout();
    renderTiles();
    renderHeader();

    return () => {
      clearInterval(timerId);
      stopPulse();
      if (connectorStop) connectorStop();
      ro.disconnect();
    };
  };

  function fmtClock(seconds) {
    const m = Math.floor(seconds / 60), s = seconds % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function strokePolyline(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
  }

  /* ---------------- 图标绘制（对应 drawLinkIcon，矢量风格） ---------------- */

  function drawLinkIcon(type, size) {
    const canvas = el("canvas");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const s = size;
    const cx = s / 2, cy = s / 2;
    const off = (x, y) => ({ x: cx + x * s, y: cy + y * s });
    const line = (a, b, color, w2, cap) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = w2 * s;
      ctx.lineCap = cap || "butt";
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    };
    const circle = (p, r, color) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(p.x, p.y, r * s, 0, Math.PI * 2); ctx.fill();
    };
    const oval = (p, w2, h, color) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(p.x + (w2 * s) / 2, p.y + (h * s) / 2, (w2 * s) / 2, (h * s) / 2, 0, 0, Math.PI * 2); ctx.fill();
    };

    switch (type) {
      case 0: { // 苹果
        circle(off(0, 0.07), 0.3, "#D9483B");
        circle(off(-0.11, -0.03), 0.08, "rgba(255,255,255,.25)");
        line(off(0, -0.18), off(0.02, -0.34), "#7A5230", 0.05, "round");
        oval(off(0.01, -0.4), 0.24, 0.13, "#7FB575");
        break;
      }
      case 1: { // 橙子
        circle(off(0, 0.06), 0.3, "#F0A04B");
        circle(off(-0.1, -0.03), 0.07, "rgba(255,255,255,.3)");
        oval(off(-0.02, -0.42), 0.2, 0.11, "#7FB575");
        circle(off(0, -0.27), 0.04, "#C97B2D");
        break;
      }
      case 2: { // 香蕉
        ctx.strokeStyle = "#F4C430";
        ctx.lineWidth = 0.17 * s;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(cx, cy, 0.34 * s, (150 * Math.PI) / 180, (330 * Math.PI) / 180);
        ctx.stroke();
        circle(off(-0.28, -0.02), 0.035, "#B98A1F");
        circle(off(0.28, -0.02), 0.035, "#B98A1F");
        break;
      }
      case 3: { // 葡萄
        line(off(0, -0.4), off(0, -0.16), "#7A5230", 0.05, "round");
        const r = 0.1;
        [[-0.2, -0.03], [0, -0.03], [0.2, -0.03], [-0.1, 0.14], [0.1, 0.14], [0, 0.3]].forEach((p) => {
          circle(off(p[0], p[1]), r, "#8E6BB8");
        });
        circle(off(-0.23, -0.06), r * 0.32, "rgba(255,255,255,.3)");
        break;
      }
      case 4: { // 西瓜（半圆弧口向下 + 深绿瓜皮）
        ctx.fillStyle = "#E5544B";
        ctx.beginPath();
        ctx.arc(cx, cy - 0.34 * s, 0.34 * s, 0, Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#3E8E4E";
        ctx.lineWidth = 0.07 * s;
        ctx.beginPath();
        ctx.arc(cx, cy - 0.4 * s, 0.4 * s, 0, Math.PI);
        ctx.stroke();
        [[-0.15, -0.07], [0, 0.01], [0.15, -0.07]].forEach((p) => circle(off(p[0], p[1]), 0.028, "#33291C"));
        break;
      }
      case 5: { // 胡萝卜
        ctx.fillStyle = "#E8833A";
        ctx.beginPath();
        ctx.moveTo(cx - 0.16 * s, cy - 0.1 * s);
        ctx.lineTo(cx + 0.16 * s, cy - 0.1 * s);
        ctx.lineTo(cx, cy + 0.42 * s);
        ctx.closePath();
        ctx.fill();
        [-0.12, 0, 0.12].forEach((angle) => {
          line(off(angle, -0.12), off(angle * 2.2, -0.4), "#5C8B4C", 0.05, "round");
        });
        break;
      }
      case 6: { // 蘑菇
        ctx.fillStyle = "#C25B4E";
        ctx.beginPath();
        ctx.arc(cx, cy - 0.04 * s, 0.34 * s, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#E8D9B8";
        roundRectPath(ctx, cx - 0.11 * s, cy - 0.04 * s, 0.22 * s, 0.4 * s, 0.05 * s);
        ctx.fill();
        [[-0.14, -0.17], [0.05, -0.24], [0.16, -0.09]].forEach((p) => circle(off(p[0], p[1]), 0.045, "rgba(255,255,255,.8)"));
        break;
      }
      case 7: { // 玉米
        oval(off(-0.17, -0.36), 0.34, 0.72, "#F2C14E");
        for (let i = -1; i <= 1; i++) {
          line(off(i * 0.09, -0.3), off(i * 0.09, 0.3), "#C99A2E", 0.02);
        }
        line(off(-0.15, -0.05), off(0.15, -0.05), "#C99A2E", 0.02);
        line(off(-0.16, 0.13), off(0.16, 0.13), "#C99A2E", 0.02);
        ctx.fillStyle = "#7FA36B";
        ctx.beginPath();
        ctx.moveTo(cx - 0.17 * s, cy - 0.1 * s);
        ctx.quadraticCurveTo(cx - 0.34 * s, cy + 0.1 * s, cx - 0.1 * s, cy + 0.38 * s);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 0.17 * s, cy - 0.1 * s);
        ctx.quadraticCurveTo(cx + 0.34 * s, cy + 0.1 * s, cx + 0.1 * s, cy + 0.38 * s);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 8: { // 扳手
        ctx.strokeStyle = "#6B7B8C";
        ctx.lineWidth = 0.13 * s;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(cx - 0.17 * s, cy - 0.17 * s, 0.25 * s, (-50 * Math.PI) / 180, ((-50 + 280) * Math.PI) / 180);
        ctx.stroke();
        line(off(0.15, 0.15), off(0.4, 0.4), "#6B7B8C", 0.14, "round");
        break;
      }
      default: { // 锤子
        line(off(0, -0.16), off(0, 0.42), "#A9825F", 0.13, "round");
        ctx.fillStyle = "#5A6672";
        roundRectPath(ctx, cx - 0.33 * s, cy - 0.4 * s, 0.66 * s, 0.2 * s, 0.05 * s);
        ctx.fill();
      }
    }
    return canvas;
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

  function hexA(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

  function spacer(h) {
    const s = el("div");
    s.style.height = h + "px";
    return s;
  }
})();
