/* ============================================================
   gomoku.js — 五子棋（水墨木盘 / 作业本双皮肤）
   逻辑对应 game/Gomoku.kt + GomokuViewModel.kt。
   桌面适配：鼠标悬停显示落子预览（幽灵子）。
   ============================================================ */
(function () {
  "use strict";
  const BZX = window.BZX;
  const el = BZX.el;

  /* ---------------- palette (GomokuScreen.kt) ---------------- */

  const P = {
    Paper: "#FBF6E9", PaperDeep: "#F1E9D4", Paper3: "#E8DCC0",
    InkText: "#33291C", InkMuted: "#8A7A60", Seal: "#B23A2E",
    Grain: "#9A7031", GridInk: "#42301B",
    Slate: ["#5E6878", "#1A1E28", "#06080D"],
    Clam: ["#FFFFFF", "#F5EEDC", "#D8CCA5"],
    ClamRim: "#B6A87F", WhiteSide: "#A08D62",
    SheetWhite: ["#FEFDF4", "#F5F2E4"], SheetDesk: ["#EFEBDF", "#DFD9C6"],
    SheetPaperEdge: "#FCFAF2", GridGreen: "#9CC29A", RedRule: "#E08A86",
    PenBlue: "#3A5A8C", PenBlueLight: "#6D8DB8", PenRed: "#D9483B", PenRedDeep: "#B23227",
  };

  /* ---------------- engine (Gomoku.kt) ---------------- */

  const G = {
    SIZE: 15, EMPTY: 0, BLACK: 1, WHITE: 2,
    SCORE_FIVE: 1e7, SCORE_LIVE_FOUR: 1e6, SCORE_FOUR: 1e5,
    SCORE_LIVE_THREE: 5e4, SCORE_THREE: 5e3, SCORE_LIVE_TWO: 800,
    SCORE_TWO: 120, SCORE_ONE: 20,
  };
  const WIN_SCORE = G.SCORE_FIVE * 100;
  const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];
  const MEDIUM_SEARCH = { depth: 2, rootWidth: 14, nodeWidth: 12 };
  const HARD_SEARCH = { depth: 6, rootWidth: 10, nodeWidth: 6 };

  const opponent = (p) => (p === G.BLACK ? G.WHITE : G.BLACK);
  let cellCount = G.SIZE * G.SIZE;

  function winningLine(board, index) {
    const player = board[index];
    const x = index % G.SIZE, y = Math.floor(index / G.SIZE);
    for (const [dx, dy] of DIRECTIONS) {
      const backward = [], forward = [];
      for (const sign of [1, -1]) {
        let step = 1;
        for (;;) {
          const cx = x + dx * step * sign, cy = y + dy * step * sign;
          if (cx < 0 || cx >= G.SIZE || cy < 0 || cy >= G.SIZE) break;
          const cell = cy * G.SIZE + cx;
          if (board[cell] !== player) break;
          (sign === 1 ? forward : backward).push(cell);
          step++;
        }
      }
      if (backward.length + forward.length + 1 >= 5) {
        return backward.reverse().concat([index], forward);
      }
    }
    return null;
  }

  function pointScore(grid, index, player) {
    const x = index % G.SIZE, y = Math.floor(index / G.SIZE);
    const foe = opponent(player);
    let total = 0;
    for (const [dx, dy] of DIRECTIONS) {
      let five = false, fours = 0, threes = 0, twos = 0;
      for (let start = -4; start <= 0; start++) {
        let count = 1, valid = true;
        for (let offset = start; offset < start + 5; offset++) {
          if (offset === 0) continue;
          const cx = x + dx * offset, cy = y + dy * offset;
          if (cx < 0 || cx >= G.SIZE || cy < 0 || cy >= G.SIZE) { valid = false; break; }
          const value = grid[cy * G.SIZE + cx];
          if (value === foe) { valid = false; break; }
          if (value === player) count++;
        }
        if (!valid) continue;
        if (count === 5) five = true;
        else if (count === 4) fours++;
        else if (count === 3) threes++;
        else if (count === 2) twos++;
      }
      total += five ? G.SCORE_FIVE
        : fours >= 2 ? G.SCORE_LIVE_FOUR
        : fours === 1 ? G.SCORE_FOUR
        : threes >= 2 ? G.SCORE_LIVE_THREE
        : threes === 1 ? G.SCORE_THREE
        : twos >= 2 ? G.SCORE_LIVE_TWO
        : twos === 1 ? G.SCORE_TWO
        : G.SCORE_ONE;
    }
    return total;
  }

  function candidateCells(grid) {
    const result = [];
    let hasStone = false;
    for (let y = 0; y < G.SIZE; y++) {
      for (let x = 0; x < G.SIZE; x++) {
        if (grid[y * G.SIZE + x] !== G.EMPTY) { hasStone = true; continue; }
        let near = false;
        search:
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const cx = x + dx, cy = y + dy;
            if (cx >= 0 && cx < G.SIZE && cy >= 0 && cy < G.SIZE && grid[cy * G.SIZE + cx] !== G.EMPTY) {
              near = true; break search;
            }
          }
        }
        if (near) result.push(y * G.SIZE + x);
      }
    }
    return hasStone ? result : [];
  }

  function orderMoves(grid, cells, player, foe) {
    return cells
      .map((cell) => [cell, pointScore(grid, cell, player) + pointScore(grid, cell, foe)])
      .sort((a, b) => b[1] - a[1]);
  }

  function negamax(grid, depth, toMove, alphaIn, betaIn, mySum, foeSum, profile) {
    if (depth === 0) return mySum - foeSum;
    const foe = opponent(toMove);
    const moves = orderMoves(grid, candidateCells(grid), toMove, foe).slice(0, profile.nodeWidth);
    if (!moves.length) return 0;
    let best = -Number.MAX_SAFE_INTEGER;
    let alpha = alphaIn;
    for (const [cell] of moves) {
      const gain = pointScore(grid, cell, toMove);
      if (gain >= G.SCORE_FIVE) return WIN_SCORE + depth;
      grid[cell] = toMove;
      const score = -negamax(grid, depth - 1, foe, -betaIn, -alpha, foeSum, mySum + gain, profile);
      grid[cell] = G.EMPTY;
      if (score > best) {
        best = score;
        if (score > alpha) alpha = score;
        if (alpha >= betaIn) break;
      }
    }
    return best;
  }

  function pickSearch(grid, candidates, player, foe, profile) {
    const ordered = orderMoves(grid, candidates, player, foe).slice(0, profile.rootWidth);
    let bestCell = ordered[0][0];
    let alpha = -Number.MAX_SAFE_INTEGER;
    const beta = Number.MAX_SAFE_INTEGER;
    for (const [cell] of ordered) {
      const gain = pointScore(grid, cell, player);
      grid[cell] = player;
      const score = gain >= G.SCORE_FIVE
        ? WIN_SCORE
        : -negamax(grid, profile.depth - 1, foe, -beta, -alpha, 0, gain, profile);
      grid[cell] = G.EMPTY;
      if (score > alpha) { alpha = score; bestCell = cell; }
    }
    return bestCell;
  }

  function pickEasy(grid, candidates, player, foe) {
    const scored = candidates.map((cell) => {
      const base = pointScore(grid, cell, player) + pointScore(grid, cell, foe) * 0.75;
      return [cell, base * (0.7 + Math.random() * 0.6)];
    }).sort((a, b) => b[1] - a[1]);
    const pool = scored.slice(0, 3);
    return pool[Math.floor(Math.random() * pool.length)][0];
  }

  function bestMove(board, player, difficulty) {
    if (difficulty === "EXTREME") return window.GomokuExtreme.chooseMove(board, player);
    const foe = opponent(player);
    const grid = Int32Array.from(board);
    const candidates = candidateCells(grid);
    if (!candidates.length) return Math.floor(cellCount / 2);
    for (const c of candidates) if (pointScore(grid, c, player) >= G.SCORE_FIVE) return c;
    for (const c of candidates) if (pointScore(grid, c, foe) >= G.SCORE_FIVE) return c;
    if (difficulty === "EASY") return pickEasy(grid, candidates, player, foe);
    return pickSearch(grid, candidates, player, foe, difficulty === "MEDIUM" ? MEDIUM_SEARCH : HARD_SEARCH);
  }

  /* ---------------- state (GomokuViewModel.kt) ---------------- */

  const initialMode = BZX.store.get("gomokuMode", "PVE");
  const initialDifficulty = BZX.store.get("gomokuDifficulty", "MEDIUM");
  // 全模式统一 25 路大棋盘
  G.SIZE = 25;
  cellCount = G.SIZE * G.SIZE;
  const state = {
    board: new Array(cellCount).fill(G.EMPTY),
    mode: initialMode,
    difficulty: initialDifficulty,
    boardSkin: BZX.store.get("gomokuBoardSkin", "CLASSIC"),
    humanColor: BZX.store.get("gomokuHumanColor", "black") === "white" ? G.WHITE : G.BLACK,
    currentPlayer: G.BLACK,
    winner: null,
    isDraw: false,
    winningLine: [],
    lastMove: null,
    moveCount: 0,
    canUndo: false,
    aiThinking: false,
    moveId: 0,
  };
  const history = [];
  let aiTimer = null;
  let aiWorker = null;
  // Count a finished game once; if its final move is undone and replayed,
  // replace its result rather than counting the same game a second time.
  let recordedResult = null;
  const savedStats = BZX.store.get("gomokuExtremeStats", null);
  function readSideStats(side) {
    const value = savedStats && savedStats[side];
    const games = value && Number.isSafeInteger(value.games) && value.games >= 0 ? value.games : 0;
    const wins = value && Number.isSafeInteger(value.wins) && value.wins >= 0 ? Math.min(value.wins, games) : 0;
    return { games, wins };
  }
  const extremeStats = { black: readSideStats("black"), white: readSideStats("white") };

  function recordExtremeResult() {
    if (state.mode !== "PVE" || state.difficulty !== "EXTREME") return;
    const side = state.humanColor === G.BLACK ? "black" : "white";
    const won = state.winner === state.humanColor;
    if (recordedResult) {
      if (recordedResult.won) extremeStats[recordedResult.side].wins--;
    } else extremeStats[side].games++;
    if (won) extremeStats[side].wins++;
    recordedResult = { side, won };
    BZX.store.set("gomokuExtremeStats", extremeStats);
  }

  function resetWith(mode, difficulty, humanColor) {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    if (aiWorker) { aiWorker.terminate(); aiWorker = null; }
    G.SIZE = 25; // 全模式统一 25 路大棋盘
    cellCount = G.SIZE * G.SIZE;
    history.length = 0;
    recordedResult = null;
    Object.assign(state, {
      mode, difficulty, humanColor,
      board: new Array(cellCount).fill(G.EMPTY),
      currentPlayer: G.BLACK, winner: null, isDraw: false, winningLine: [],
      lastMove: null, moveCount: 0, canUndo: false, aiThinking: false,
      moveId: state.moveId + 1,
    });
    maybeAiTurn();
    // 对应 Kotlin StateFlow：状态重置后必须通知界面重绘（人机执黑时 maybeAiTurn 不会触发渲染）
    renderListeners.forEach((fn) => fn());
  }

  function applyMove(index, player) {
    history.push(index);
    const board = state.board.slice();
    board[index] = player;
    const line = winningLine(board, index);
    const draw = line === null && board.every((v) => v !== G.EMPTY);
    state.board = board;
    state.currentPlayer = line !== null || draw ? state.currentPlayer : opponent(player);
    state.winner = line ? player : null;
    state.isDraw = draw;
    state.winningLine = line || [];
    state.lastMove = index;
    state.moveCount++;
    state.canUndo = true;
    state.aiThinking = false;
    state.moveId++;
    if (state.winner !== null || state.isDraw) {
      recordExtremeResult();
      notifyResult();
    }
  }

  function maybeAiTurn() {
    if (state.mode !== "PVE" || state.winner !== null || state.isDraw) return;
    const ai = opponent(state.humanColor);
    if (state.currentPlayer !== ai || state.aiThinking) return;
    const position = state.moveId;
    state.aiThinking = true;
    renderListeners.forEach((fn) => fn());
    if (aiTimer) clearTimeout(aiTimer);
    aiTimer = setTimeout(() => {
      const board = state.board;
      const difficulty = state.difficulty;
      function finish(move) {
        const now = state;
        if (now.aiThinking && now.winner === null && !now.isDraw &&
          now.currentPlayer === ai && now.moveId === position && now.board === board &&
          Number.isInteger(move) && move >= 0 && move < board.length && board[move] === G.EMPTY) {
          applyMove(move, ai);
          renderListeners.forEach((fn) => fn());
        } else if (now.moveId === position && now.aiThinking) {
          now.aiThinking = false;
          renderListeners.forEach((fn) => fn());
        }
      }
      // Some browsers prohibit file:// workers. The same engine remains available
      // synchronously as a fallback, so the offline entry point still works.
      if (difficulty === "EXTREME" && typeof Worker !== "undefined") {
        try {
          const worker = new Worker("js/gomoku-extreme-worker.js?v=3");
          aiWorker = worker;
          worker.onmessage = (event) => {
            if (aiWorker !== worker) return;
            worker.terminate(); aiWorker = null;
            if (event.data.error) finish(bestMove(board, ai, difficulty));
            else finish(event.data.move);
          };
          worker.onerror = (event) => {
            event.preventDefault();
            if (aiWorker !== worker) return;
            worker.terminate(); aiWorker = null;
            finish(bestMove(board, ai, difficulty));
          };
          worker.postMessage({ id: position, board, player: ai });
          return;
        } catch (_) { if (aiWorker) { aiWorker.terminate(); aiWorker = null; } }
      }
      finish(bestMove(board, ai, difficulty));
    }, 220);
  }

  function play(index) {
    if (state.winner !== null || state.isDraw || state.aiThinking) return;
    if (index < 0 || index >= cellCount || state.board[index] !== G.EMPTY) return;
    if (state.mode === "PVE" && state.currentPlayer !== state.humanColor) return;
    applyMove(index, state.currentPlayer);
    maybeAiTurn();
    renderListeners.forEach((fn) => fn());
  }

  function undo() {
    if (state.aiThinking || !history.length) return;
    let steps;
    if (state.mode === "PVP") steps = 1;
    else {
      const wantOdd = state.humanColor === G.WHITE;
      if (history.length % 2 === 0) steps = wantOdd ? 1 : 2;
      else steps = wantOdd ? 2 : 1;
    }
    steps = Math.min(steps, history.length);
    history.splice(history.length - steps, steps);
    const board = new Array(cellCount).fill(G.EMPTY);
    history.forEach((cell, index) => { board[cell] = index % 2 === 0 ? G.BLACK : G.WHITE; });
    const nextPlayer = history.length === 0
      ? G.BLACK
      : opponent((history.length - 1) % 2 === 0 ? G.BLACK : G.WHITE);
    Object.assign(state, {
      board, currentPlayer: nextPlayer, winner: null, isDraw: false, winningLine: [],
      lastMove: history.length ? history[history.length - 1] : null,
      moveCount: history.length, canUndo: history.length > 0, moveId: state.moveId + 1,
    });
    maybeAiTurn();
    renderListeners.forEach((fn) => fn());
  }

  const renderListeners = new Set();
  const resultListeners = new Set();
  function notifyResult() { resultListeners.forEach((fn) => fn()); }

  /* ---------------- screen ---------------- */

  BZX.GomokuScreen = function (root) {
    root.classList.add("game-screen", "gomoku");
    root.style.setProperty("--bg", "linear-gradient(to bottom," + P.Paper + "," + P.PaperDeep + "," + P.Paper3 + ")");

    const backdrop = el("canvas", "backdrop-canvas");
    root.appendChild(backdrop);
    const stopInk = BZX.inkWash(backdrop);

    const col = el("div", "portrait-col scroll-col gomoku-col");
    col.style.padding = "22px 22px 0";
    root.appendChild(col);

    // 信息列（窄屏时与棋盘上下堆叠，宽屏时左右分栏）
    const infoCol = el("div", "gomoku-info");
    const boardCol = el("div", "gomoku-boardcol");
    col.appendChild(infoCol);
    col.appendChild(boardCol);

    const backBtn = el("button", "back-btn", "‹  返回游戏大厅");
    BZX.sfxButton(backBtn, () => BZX.router.backToLibrary());
    infoCol.appendChild(backBtn);

    /* header */
    const header = el("div");
    const hRow = el("div");
    hRow.style.cssText = "display:flex;align-items:center;";
    const titleBox = el("div");
    const h1 = el("div", "gomoku-title", "五子棋");
    titleBox.appendChild(h1);
    titleBox.appendChild(el("div", null, "手谈一局 · 落子无悔")).style.cssText =
      "color:" + P.InkMuted + ";font-size:9px;letter-spacing:2.3px;margin-top:3px;";
    hRow.appendChild(titleBox);
    hRow.appendChild(el("div", "gomoku-seal", "弈"));
    const spring = el("div"); spring.style.flex = "1"; hRow.appendChild(spring);
    const undoBtn = el("button", "round-action ra-themed", "↶");
    undoBtn.title = "撤销";
    BZX.sfxButton(undoBtn, () => undo());
    hRow.appendChild(undoBtn);
    const gap = el("div"); gap.style.width = "9px"; hRow.appendChild(gap);
    hRow.appendChild((function () {
      const b = el("button", "round-action ra-themed", "↻");
      b.title = "重新开始";
      BZX.sfxButton(b, () => resetWith(state.mode, state.difficulty, state.humanColor));
      return b;
    })());
    header.appendChild(hRow);
    header.appendChild(spacer(20));
    infoCol.appendChild(header);

    const cards = el("div");
    cards.style.cssText = "display:flex;gap:11px;";
    const turnCard = el("div", "gomoku-card turn");
    turnCard.style.setProperty("--turn-accent", P.InkMuted);
    const moveCard = el("div", "gomoku-card moves");
    cards.appendChild(turnCard);
    cards.appendChild(moveCard);
    header.appendChild(cards);

    infoCol.appendChild(spacer(18));

    /* pickers */
    const modeRow = el("div", "segment-row");
    infoCol.appendChild(modeRow);
    const pveBlock = el("div");
    pveBlock.style.cssText = "overflow:hidden;max-height:0;opacity:0;transition:max-height 260ms ease,opacity 260ms ease;";
    const pveInner = el("div");
    pveInner.appendChild(spacer(10));
    const diffRow = el("div", "segment-row gomoku-difficulty");
    pveInner.appendChild(diffRow);
    pveInner.appendChild(spacer(10));
    const sideRow = el("div", "segment-row");
    pveInner.appendChild(sideRow);
    pveBlock.appendChild(pveInner);
    infoCol.appendChild(pveBlock);
    const statsCard = el("div", "gomoku-stats");
    infoCol.appendChild(statsCard);

    function segmentOption(row, label, caption, selected, onClick) {
      // 只负责追加一个选项；清空由调用方在重建整行时做一次
      const option = el("button", "segment-option" + (selected ? " selected" : ""));
      const r = el("div", "so-row");
      r.appendChild(el("div", "so-dot"));
      r.appendChild(el("div", "so-label", label));
      option.appendChild(r);
      option.appendChild(el("div", "so-caption", caption));
      BZX.sfxButton(option, onClick);
      row.appendChild(option);
    }

    function renderPickers() {
      BZX.clear(modeRow);
      segmentOption(modeRow, "双人对战", "同屏轮流执子", state.mode === "PVP", () => {
        BZX.store.set("gomokuMode", "PVP");
        if (state.mode !== "PVP") resetWith("PVP", state.difficulty, state.humanColor); else renderAll();
      });
      segmentOption(modeRow, "人机对战", "挑战四档 AI", state.mode === "PVE", () => {
        BZX.store.set("gomokuMode", "PVE");
        if (state.mode !== "PVE") resetWith("PVE", state.difficulty, state.humanColor); else renderAll();
      });
      pveBlock.style.maxHeight = state.mode === "PVE"
        ? Math.max(260, pveInner.scrollHeight) + "px"
        : "0";
      pveBlock.style.opacity = state.mode === "PVE" ? "1" : "0";
      if (state.mode === "PVE") {
        BZX.clear(diffRow);
        segmentOption(diffRow, "简单", "偶尔失误", state.difficulty === "EASY", () => {
          BZX.store.set("gomokuDifficulty", "EASY");
          resetWith(state.mode, "EASY", state.humanColor);
        });
        segmentOption(diffRow, "中等", "攻守均衡", state.difficulty === "MEDIUM", () => {
          BZX.store.set("gomokuDifficulty", "MEDIUM");
          resetWith(state.mode, "MEDIUM", state.humanColor);
        });
        segmentOption(diffRow, "困难", "算无遗策", state.difficulty === "HARD", () => {
          BZX.store.set("gomokuDifficulty", "HARD");
          resetWith(state.mode, "HARD", state.humanColor);
        });
        segmentOption(diffRow, "超困难", "极限挑战", state.difficulty === "EXTREME", () => {
          BZX.store.set("gomokuDifficulty", "EXTREME");
          resetWith(state.mode, "EXTREME", state.humanColor);
        });
        BZX.clear(sideRow);
        segmentOption(sideRow, "执黑", "先行落子", state.humanColor === G.BLACK, () => selectHumanColor(G.BLACK));
        segmentOption(sideRow, "执白", "后行应对", state.humanColor === G.WHITE, () => selectHumanColor(G.WHITE));
      }
    }

    function selectHumanColor(color) {
      BZX.store.set("gomokuHumanColor", color === G.WHITE ? "white" : "black");
      if (state.humanColor === color) return;
      if (state.mode !== "PVE") { state.humanColor = color; renderAll(); return; }
      if (state.moveCount === 0 && state.winner === null && !state.isDraw && !state.aiThinking) {
        state.humanColor = color;
        maybeAiTurn();
      } else {
        resetWith(state.mode, state.difficulty, color);
      }
      renderAll();
    }

    infoCol.appendChild(spacer(20));
    const caption = el("div");
    caption.style.cssText = "color:" + P.InkMuted + ";font-size:10px;letter-spacing:2px;text-align:center;";
    infoCol.appendChild(caption);
    infoCol.appendChild(spacer(12));

    /* board shop entry */
    const shopEntry = el("button", "shop-entry");
    BZX.sfxButton(shopEntry, openShop);
    infoCol.appendChild(shopEntry);
    infoCol.appendChild(spacer(16));

    /* board */
    const boardScroller = el("div", "gomoku-board-scroll");
    const boardWrap = el("div", "gomoku-board-wrap");
    const boardCanvas = el("canvas");
    boardWrap.appendChild(boardCanvas);
    boardScroller.appendChild(boardWrap);
    boardCol.appendChild(boardScroller);
    boardCol.appendChild(spacer(18));

    const hintPill = el("div", "hint-pill");
    hintPill.style.cssText =
      "background:rgba(51,41,28,.06);border:1px solid rgba(51,41,28,.18);color:" + P.InkMuted + ";align-self:center;";
    hintPill.style.setProperty("--x", "0");
    hintPill.innerHTML = '<i style="width:6px;height:6px;border-radius:50%;background:' + P.Seal + ';margin-right:8px;display:inline-block;"></i><span></span>';
    boardCol.appendChild(hintPill);
    boardCol.appendChild(spacer(24));
    const footNote = el("div", null, "轻点交点落子 · 连成五子者胜");
    footNote.style.cssText = "color:" + P.InkMuted + ";font-size:9px;letter-spacing:1.4px;text-align:center;padding-bottom:18px;";
    boardCol.appendChild(footNote);

    /* shop dialog */
    function openShop() {
      const body = el("div");
      body.style.cssText = "display:flex;flex-direction:column;gap:10px;";
      const options = {};
      [
        { key: "CLASSIC", title: "经典木盘", caption: "榧木棋盘 · 墨线云子" },
        { key: "EXERCISE", title: "作业本", caption: "方格纸面 · 蓝圈红勾" },
        { key: "MARBLE", title: "翠玉琥珀", caption: "云纹石盘 · 翡翠黑子 · 琥珀白子" },
      ].forEach((skin) => {
        const option = el("button", "skin-option" + (state.boardSkin === skin.key ? " selected" : ""));
        option.appendChild(skinPreview(skin.key, 64));
        const texts = el("div");
        texts.appendChild(el("div", "sk-name", skin.title));
        texts.appendChild(el("div", "sk-caption", skin.caption));
        option.appendChild(texts);
        if (state.boardSkin === skin.key) option.appendChild(el("div", "sk-using", "使用中"));
        BZX.sfxButton(option, () => {
          BZX.store.set("gomokuBoardSkin", skin.key);
          state.boardSkin = skin.key; // 皮肤纯装饰：不重置对局
          dialog.close();
          renderAll();
        });
        options[skin.key] = option;
        body.appendChild(option);
      });
      const dialog = BZX.dialog(root, {
        wide: true,
        surface: P.Paper,
        titleColor: P.InkText,
        title: "棋盘商店",
        body,
        bodyColor: P.InkMuted,
        confirm: { label: "完成", onClick: () => {} },
        confirmBg: P.Seal,
      });
      // 换个更贴切的副标题：把 dialog 默认标题换成带副标题的结构
      const h3 = dialog.close && body.parentNode.querySelector("h3");
      if (h3) {
        h3.innerHTML = "";
        h3.style.cssText += "display:flex;align-items:center;gap:8px;";
        h3.appendChild(shopBagGlyph(17, P.Seal));
        const t = el("div");
        t.appendChild(el("div", null, "棋盘商店")).style.cssText = "color:" + P.InkText + ";font-size:18px;";
        t.appendChild(el("div", null, "挑选一款棋盘皮肤，随时可换")).style.cssText = "color:" + P.InkMuted + ";font-size:11px;";
        h3.appendChild(t);
      }
    }

    /* ---------------- board canvas ---------------- */

    const fit = BZX.fitCanvas(boardCanvas);
    let appear = { v: 1, vel: 0 };
    let appearTarget = 1;
    let hoverCell = null;
    let pulseT = 0;
    let lastSeenMove = null;

    // last-move stone spring (Animatable spring dampingRatio=.5 stiffness=520)
    function springStep(dt) {
      const k = 520, c = 2 * 0.5 * Math.sqrt(k);
      const a = -k * (appear.v - 1) - c * appear.vel;
      appear.vel += a * dt;
      appear.v += appear.vel * dt;
    }

    function geometry() {
      const side = Math.min(fit.state.w, fit.state.h);
      const exercise = state.boardSkin === "EXERCISE";
      // 棋盘四周留出半个棋子的空间，边缘落子也能完整显示。
      const inset = exercise ? 0 : side / 50;
      const cell = exercise ? side / G.SIZE : (side - 2 * inset) / (G.SIZE - 1);
      const center = (index) => exercise
        ? { x: ((index % G.SIZE) + 0.5) * cell, y: (Math.floor(index / G.SIZE) + 0.5) * cell }
        : { x: inset + (index % G.SIZE) * cell, y: inset + Math.floor(index / G.SIZE) * cell };
      return { side, cell, center, exercise, inset };
    }

    function draw() {
      fit.resize();
      const { ctx, state: s } = fit;
      const { w, h } = s;
      ctx.clearRect(0, 0, w, h);
      const { side, cell, center, exercise, inset } = geometry();
      const marble = state.boardSkin === "MARBLE";
      const ox = (w - side) / 2, oy = (h - side) / 2;
      ctx.save();
      ctx.translate(ox, oy);

      if (exercise) drawExerciseSheet(ctx, side, cell);
      else {
        if (marble) drawMarble(ctx, side);
        else {
        // 木纹
        for (let index = 0; index < 9; index++) {
          const grainY = side * (0.07 + index * 0.105);
          const amp = side * 0.012;
          ctx.strokeStyle = hexA(P.Grain, 0.1 + (index % 3) * 0.035);
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(0, grainY);
          ctx.bezierCurveTo(side * 0.3, grainY - amp, side * 0.62, grainY + amp, side, grainY - amp * 0.6);
          ctx.stroke();
        }
        ctx.strokeStyle = hexA(P.Grain, 0.2);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, side * 0.34);
        ctx.bezierCurveTo(side * 0.25, side * 0.31, side * 0.7, side * 0.38, side, side * 0.33);
        ctx.stroke();
        const gloss = ctx.createLinearGradient(0, 0, side, side);
        gloss.addColorStop(0, "rgba(255,255,255,.12)");
        gloss.addColorStop(0.5, "rgba(255,255,255,0)");
        gloss.addColorStop(1, "rgba(255,255,255,.06)");
        ctx.fillStyle = gloss;
        ctx.fillRect(0, 0, side, side);
        }
        // 墨线网格
        ctx.strokeStyle = marble ? "rgba(48,76,67,.65)" : hexA(P.GridInk, 0.85);
        ctx.lineWidth = 1;
        for (let i = 0; i < G.SIZE; i++) {
          const p = inset + i * cell;
          ctx.beginPath(); ctx.moveTo(inset, p); ctx.lineTo(side - inset, p); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(p, inset); ctx.lineTo(p, side - inset); ctx.stroke();
        }
        ctx.strokeStyle = marble ? "#405f54" : P.GridInk;
        ctx.lineWidth = 1.7;
        ctx.strokeRect(inset, inset, side - 2 * inset, side - 2 * inset);
        const star = [4, 20, 12];
        [[star[0], star[0]], [star[0], star[1]], [star[1], star[0]], [star[1], star[1]], [star[2], star[2]]].forEach(([sx, sy]) => {
          ctx.fillStyle = marble ? "#405f54" : P.GridInk;
          ctx.beginPath(); ctx.arc(inset + sx * cell, inset + sy * cell, 2.4, 0, Math.PI * 2); ctx.fill();
        });
      }

      // 胜利连线（脉动）
      const winAccent = exercise ? P.PenRedDeep : P.Seal;
      const pulse = 0.5 + 0.5 * Math.sin(pulseT * Math.PI / 1.3);
      if (state.winningLine.length) {
        const from = center(state.winningLine[0]);
        const to = center(state.winningLine[state.winningLine.length - 1]);
        if (exercise) {
          ctx.strokeStyle = hexA(P.PenRedDeep, 0.45 + 0.3 * pulse);
          ctx.lineWidth = 3.6; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
          ctx.strokeStyle = hexA("#EE6A5C", 0.45 + 0.3 * pulse);
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(from.x, from.y + 1.6); ctx.lineTo(to.x, to.y + 1.6); ctx.stroke();
        } else {
          ctx.strokeStyle = hexA(P.Seal, 0.3 + 0.45 * pulse);
          ctx.lineWidth = 4; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
        }
      }

      // 棋子
      const radius = exercise ? cell * 0.34 : cell * 0.44;
      state.board.forEach((stone, index) => {
        if (stone === G.EMPTY) return;
        const scale = index === state.lastMove ? Math.max(0.001, appear.v) : 1;
        drawStone(ctx, center(index), radius * scale, stone, exercise);
      });

      // 最后一手标记
      if (state.lastMove !== null && state.board[state.lastMove] !== G.EMPTY) {
        const c = center(state.lastMove);
        if (exercise) {
          ctx.strokeStyle = state.board[state.lastMove] === G.BLACK ? P.PenRed : P.PenBlue;
          ctx.lineWidth = Math.max(1, radius * 0.16 * appear.v);
          ctx.beginPath(); ctx.arc(c.x, c.y, radius * 0.16 * appear.v, 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.fillStyle = P.Seal;
          ctx.beginPath(); ctx.arc(c.x, c.y, radius * 0.16 * appear.v, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = hexA(P.Paper, 0.8);
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(c.x, c.y, radius * 0.16 * appear.v, 0, Math.PI * 2); ctx.stroke();
        }
      }

      // 连珠五子高亮圈
      if (state.winningLine.length) {
        state.winningLine.forEach((index) => {
          const c = center(index);
          ctx.strokeStyle = hexA(winAccent, 0.45 + 0.4 * pulse);
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(c.x, c.y, radius * 1.18, 0, Math.PI * 2); ctx.stroke();
        });
      }

      // 悬停幽灵子（桌面适配）
      if (hoverCell !== null && state.board[hoverCell] === G.EMPTY && canPlay()) {
        const c = center(hoverCell);
        ctx.globalAlpha = 0.4;
        drawStone(ctx, c, radius, state.currentPlayer, exercise);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    function drawStone(ctx, c, radius, stone, exercise) {
      if (radius <= 0) return;
      if (state.boardSkin === "MARBLE") { drawGemStone(ctx, c.x, c.y, radius, stone); return; }
      if (exercise) {
        if (stone === G.BLACK) {
          const d = radius * 1.36;
          const tl = { x: c.x - d / 2, y: c.y - d / 2 };
          ctx.strokeStyle = P.PenBlue;
          ctx.lineWidth = radius * 0.22;
          ctx.beginPath(); ctx.arc(tl.x + d / 2, tl.y + d / 2, d / 2, (-78 * Math.PI) / 180, ((-78 + 322) * Math.PI) / 180); ctx.stroke();
          ctx.strokeStyle = P.PenBlueLight;
          ctx.lineWidth = radius * 0.09;
          ctx.beginPath(); ctx.arc(tl.x + d / 2, tl.y + d / 2, d / 2, (40 * Math.PI) / 180, ((40 + 58) * Math.PI) / 180); ctx.stroke();
        } else {
          const check = new Path2D();
          check.moveTo(c.x - radius * 0.5, c.y + 0.02 * radius);
          check.quadraticCurveTo(c.x - radius * 0.25, c.y + radius * 0.3, c.x - radius * 0.05, c.y + radius * 0.5);
          check.quadraticCurveTo(c.x + radius * 0.25, c.y - radius * 0.02, c.x + radius * 0.62, c.y - radius * 0.46);
          ctx.lineCap = "round";
          ctx.strokeStyle = P.PenRedDeep;
          ctx.lineWidth = radius * 0.3;
          ctx.stroke(check);
          ctx.strokeStyle = P.PenRed;
          ctx.lineWidth = radius * 0.15;
          ctx.stroke(check);
        }
        return;
      }
      // shadow ellipse (bottom-right of the stone, like drawOval in GomokuScreen)
      ctx.fillStyle = "rgba(0,0,0,.2)";
      ctx.beginPath();
      ctx.ellipse(c.x + radius * 0.14, c.y + radius * 0.22, radius * 0.92, radius * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
      // stone
      const g = ctx.createRadialGradient(c.x - radius * 0.35, c.y - radius * 0.35, 0, c.x, c.y, radius * 1.9);
      if (stone === G.BLACK) {
        g.addColorStop(0, P.Slate[0]); g.addColorStop(0.5, P.Slate[1]); g.addColorStop(1, P.Slate[2]);
      } else {
        g.addColorStop(0, P.Clam[0]); g.addColorStop(0.55, P.Clam[1]); g.addColorStop(1, P.Clam[2]);
      }
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(c.x, c.y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = stone === G.BLACK ? "rgba(139,150,168,.3)" : hexA(P.ClamRim, 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(c.x, c.y, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255," + (stone === G.BLACK ? 0.32 : 0.5) + ")";
      ctx.beginPath(); ctx.arc(c.x - radius * 0.37, c.y - radius * 0.37, radius * (stone === G.BLACK ? 0.16 : 0.14), 0, Math.PI * 2); ctx.fill();
    }

    function drawExerciseSheet(ctx, side, cell) {
      // 纸张纤维
      for (let index = 0; index < 22; index++) {
        const y = side * (((index * 37 + 11) % 100) / 100);
        ctx.strokeStyle = "rgba(138,133,112,.025)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(side, y + side * 0.004); ctx.stroke();
      }
      for (let index = 0; index < 46; index++) {
        const x = side * (((index * 53 + 7) % 97) / 97);
        const y = side * (((index * 71 + 29) % 101) / 101);
        ctx.fillStyle = "rgba(138,133,112,.028)";
        ctx.beginPath(); ctx.arc(x, y, 0.7, 0, Math.PI * 2); ctx.fill();
      }
      // 绿色方格（每个可落子格对应一格）
      for (let i = 0; i <= G.SIZE; i++) {
        const p = i * cell;
        ctx.strokeStyle = hexA(P.GridGreen, 0.4 + ((i * 37) % 13) / 42);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(side, p); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, side); ctx.stroke();
      }
      // 红色页边线与页眉线
      ctx.strokeStyle = hexA(P.RedRule, 0.75); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cell * 0.52, 0); ctx.lineTo(cell * 0.52, side); ctx.stroke();
      ctx.strokeStyle = hexA(P.RedRule, 0.65); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, cell * 0.52); ctx.lineTo(side, cell * 0.52); ctx.stroke();
      ctx.strokeStyle = hexA(P.RedRule, 0.5); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, cell * 0.66); ctx.lineTo(side, cell * 0.66); ctx.stroke();
      // 手写页眉
      ctx.fillStyle = hexA(P.PenRed, 0.75);
      ctx.font = "italic " + Math.max(9, cell * 0.62) + "px 'Segoe UI', sans-serif";
      ctx.fillText("姓名：BZX", cell * 0.7, cell * 0.42);
      ctx.fillText("五子棋作业", side * 0.64, cell * 0.42);
      // 两枚订书钉
      [side * 0.3, side * 0.7].forEach((stapleX) => {
        ctx.fillStyle = "#C9CED6";
        roundRectPath(ctx, stapleX - 4, cell * 0.08, 8, 2.6, 1);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.85)";
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(stapleX - 3, cell * 0.08 + 0.9); ctx.lineTo(stapleX + 3, cell * 0.08 + 0.9); ctx.stroke();
      });
      // 左侧装订孔
      [side * 0.22, side * 0.78].forEach((holeY) => {
        ctx.fillStyle = "#DAD4C0";
        ctx.beginPath(); ctx.arc(1.2, holeY, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(189,182,160,.8)";
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.arc(1.2, holeY, 2.6, 0, Math.PI * 2); ctx.stroke();
      });
      // 右下折角
      const fold = cell * 0.85;
      ctx.fillStyle = "#E9E3D0";
      ctx.beginPath();
      ctx.moveTo(side - fold, side);
      ctx.lineTo(side, side - fold);
      ctx.lineTo(side, side);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#CFC7AE";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(side - fold, side); ctx.lineTo(side, side - fold); ctx.stroke();
    }

    /* interactions */
    function canPlay() {
      return state.winner === null && !state.isDraw && !state.aiThinking &&
        (state.mode === "PVP" || state.currentPlayer === state.humanColor);
    }

    function cellFromEvent(e) {
      const rect = boardCanvas.getBoundingClientRect();
      const { side, cell, exercise, inset } = geometry();
      const ox = (rect.width - side) / 2, oy = (rect.height - side) / 2;
      const x = e.clientX - rect.left - ox;
      const y = e.clientY - rect.top - oy;
      if (x < 0 || y < 0 || x > side || y > side) return null;
      if (exercise) {
        const column = Math.floor(x / cell);
        const row = Math.floor(y / cell);
        if (column < 0 || column >= G.SIZE || row < 0 || row >= G.SIZE) return null;
        return row * G.SIZE + column;
      }
      const column = Math.round((x - inset) / cell);
      const row = Math.round((y - inset) / cell);
      if (column < 0 || column >= G.SIZE || row < 0 || row >= G.SIZE) return null;
      if (Math.abs(x - inset - column * cell) > cell * 0.48 || Math.abs(y - inset - row * cell) > cell * 0.48) return null;
      return row * G.SIZE + column;
    }

    boardCanvas.addEventListener("click", (e) => {
      const index = cellFromEvent(e);
      if (index !== null && canPlay()) play(index);
    });
    boardCanvas.addEventListener("mousemove", (e) => {
      hoverCell = cellFromEvent(e);
    });
    boardCanvas.addEventListener("mouseleave", () => { hoverCell = null; });

    /* text panels */
    function renderAll() {
      renderPickers();
      renderHeaderCards();
      renderExtremeStats();
      renderShopEntry();
      renderCaptionAndHint();
      boardWrap.classList.toggle("exercise", state.boardSkin === "EXERCISE");
      boardWrap.classList.toggle("marble", state.boardSkin === "MARBLE");
      boardScroller.classList.add("large-board");
      footNote.textContent = "轻点交点落子 · 连成五子者胜 · 窄屏可左右滑动棋盘";
      boardCanvas.classList.toggle("no-interact", !canPlay());
      undoBtn.disabled = !state.canUndo || state.aiThinking;
      draw();
    }

    function renderExtremeStats() {
      const visible = state.mode === "PVE" && state.difficulty === "EXTREME";
      statsCard.hidden = !visible;
      if (!visible) return;
      const format = (side) => side.games ? Math.round(side.wins / side.games * 100) + "%" : "—";
      const black = extremeStats.black, white = extremeStats.white;
      statsCard.innerHTML = '<div class="gomoku-stats-title">超困难战绩 <span>已完成 ' +
        (black.games + white.games) + ' 局</span></div>' +
        '<div class="gomoku-stats-sides"><div>执黑胜率 <strong>' + format(black) + '</strong><small>' +
        black.wins + ' 胜 / ' + black.games + ' 局</small></div><div>执白胜率 <strong>' + format(white) +
        '</strong><small>' + white.wins + ' 胜 / ' + white.games + ' 局</small></div></div>' +
        '<div class="gomoku-stats-note">平局计入总局数 · 战绩保存在当前浏览器</div>';
    }

    function renderHeaderCards() {
      let black;
      if (state.isDraw) black = null;
      else if (state.winner !== null) black = state.winner === G.BLACK;
      else black = state.currentPlayer === G.BLACK;
      let label;
      if (state.isDraw) label = "平局 · 势均力敌";
      else if (state.winner !== null) {
        if (state.mode === "PVE") {
          const mine = state.winner === state.humanColor;
          const side = black ? "黑" : "白";
          label = mine ? "你赢了 · 执" + side : "AI 获胜 · 执" + side;
        } else label = black ? "黑棋获胜" : "白棋获胜";
      } else if (state.aiThinking) label = "AI 思考中…";
      else if (state.mode === "PVE") {
        const side = black ? "黑" : "白";
        label = state.currentPlayer === state.humanColor ? "你的回合 · 执" + side : "AI 回合 · 执" + side;
      } else label = black ? "黑棋落子" : "白棋落子";
      const accent = black === null ? P.InkMuted : black ? P.InkText : P.WhiteSide;
      turnCard.style.setProperty("--turn-accent", accent);
      turnCard.innerHTML =
        '<div style="display:flex;align-items:center;gap:10px;">' +
        stoneBadge(black) +
        '<div style="min-width:0;"><div class="gc-label">对局状态</div><div class="gc-value">' + label + "</div></div>" +
        (state.aiThinking ? '<div class="thinking-dot" style="margin-left:auto;"></div>' : "") +
        "</div>";
      moveCard.innerHTML =
        '<div class="gc-label">手数</div><div class="gc-value">' + String(state.moveCount).padStart(3, "0") + "</div>";
    }

    function stoneBadge(black) {
      if (state.boardSkin === "EXERCISE") {
        if (black === null) return '<svg width="24" height="24" viewBox="0 0 24 24"><line x1="4.3" y1="12" x2="19.7" y2="12" stroke="#8C7B5E" stroke-width="2" stroke-linecap="round"/></svg>';
        if (black) return '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.6" fill="none" stroke="' + P.PenBlue + '" stroke-width="2.4"/></svg>';
        return '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M3.8 12 L10.4 19.2 L21.6 4.3" fill="none" stroke="' + P.PenRed + '" stroke-width="2.4" stroke-linecap="round"/></svg>';
      }
      if (state.boardSkin === "MARBLE" && black !== null) {
        const color = black ? "#18765a" : "#bb7620";
        const light = black ? "#81d6ae" : "#ffe1a0";
        return '<div style="width:24px;height:24px;border-radius:50%;flex:0 0 24px;background:radial-gradient(circle at 32% 28%,' + light + ',' + color + ' 65%,#294036);box-shadow:0 3px 7px rgba(30,44,36,.3);"></div>';
      }
      const base = black === null ? "#B7A98A" : black ? "#1A1E28" : "#F7F1DE";
      const rim = black === null ? "#8C7B5E" : black ? "#5E6878" : P.ClamRim;
      return '<div style="width:24px;height:24px;border-radius:50%;flex:0 0 24px;background:' + base + ";border:1px solid " + rim + ';box-shadow:0 4px 8px rgba(51,41,28,.28);"></div>';
    }

    function renderShopEntry() {
      const skinTitle = { EXERCISE: "作业本", MARBLE: "翠玉琥珀", CLASSIC: "经典木盘" }[state.boardSkin] || "经典木盘";
      shopEntry.innerHTML = "";
      shopEntry.appendChild(shopBagGlyph(15, P.Seal));
      shopEntry.appendChild(document.createTextNode("棋盘商店 · " + skinTitle));
    }

    function renderCaptionAndHint() {
      caption.textContent = state.boardSkin === "EXERCISE" ? "方格之间 · 圈勾手谈" : state.boardSkin === "MARBLE" ? "翠作黑子 · 珀为白棋" : "手谈方圆 · 水墨木韵";
      let message;
      if (state.winner !== null || state.isDraw) message = "一局终了 · 点「↻」再来一局";
      else if (state.aiThinking) message = "AI 正在思考落子…";
      else if (state.mode === "PVE") {
        const mine = state.humanColor === G.BLACK ? "执黑先行" : "执白后行";
        const theirs = state.humanColor === G.BLACK ? "执白应战" : "执黑开局";
        const dTitle = { EASY: "简单", MEDIUM: "中等", HARD: "困难", EXTREME: "超困难" }[state.difficulty];
        message = "你" + mine + " · " + dTitle + "难度 AI " + theirs + " · 25 路棋盘";
      } else message = "黑先白后 · 任意方向连成五子即胜";
      hintPill.querySelector("span").textContent = "  " + message;
    }

    /* result dialog（复盘按钮：只关弹窗看棋盘） */
    let resultSeen = 0;
    resultListeners.add(() => {
      if (resultSeen === state.moveId) return;
      resultSeen = state.moveId;
      setTimeout(() => {
        if (state.winner === null && !state.isDraw) return;
        showResultDialog();
      }, 350);
    });

    function showResultDialog() {
      const blackWins = state.winner === G.BLACK;
      const humanWon = state.mode === "PVE" && state.winner === state.humanColor;
      let title, message;
      if (state.isDraw && state.mode === "PVE") {
        title = "战平 AI";
        message = cellCount + " 个位置全部落满，" + diffTitle() + "难度的 AI 也没能赢你——能与计算机战至满盘，相当了不起！";
      } else if (state.isDraw) {
        title = "棋逢对手";
        message = cellCount + " 个位置全部落满，未分胜负——这一局值得回味。";
      } else if (humanWon) {
        title = "漂亮，你赢了";
        message = "你执" + (blackWins ? "黑" : "白") + "连成五子，战胜了" + diffTitle() + "难度的 AI。要不要换一边再战？";
      } else if (state.mode === "PVE") {
        title = "AI 棋高一着";
        message = diffTitle() + "难度的 AI 先你一步连成五子。复盘看看破绽在哪里，再战一局吧。";
      } else if (blackWins) {
        title = "黑棋连珠";
        message = "执黑方五子连珠获胜，全局共 " + state.moveCount + " 手。交换执子再来一局？";
      } else {
        title = "白棋连珠";
        message = "执白方五子连珠获胜，全局共 " + state.moveCount + " 手。交换执子再来一局？";
      }
      BZX.dialog(root, {
        surface: P.Paper,
        title, titleColor: state.isDraw ? P.InkMuted : humanWon ? P.Seal : P.InkText,
        body: message, bodyColor: P.InkMuted,
        confirm: {
          label: "再来一局",
          onClick: () => { resultSeen = 0; resetWith(state.mode, state.difficulty, state.humanColor); renderAll(); },
        },
        confirmBg: P.Seal,
        dismiss: {
          label: "复盘棋局",
          onClick: () => { resultSeen = 0; },
        },
        dismissible: false,
      });
    }

    function diffTitle() {
      return { EASY: "简单", MEDIUM: "中等", HARD: "困难", EXTREME: "超困难" }[state.difficulty];
    }

    /* animation loop: spring + win pulse */
    const stopLoop = BZX.animLoop(
      (_now, dt) => {
        pulseT = (pulseT + dt) % 2.6;
        if (lastSeenMove !== state.lastMove) {
          lastSeenMove = state.lastMove;
          if (state.lastMove !== null) { appear.v = 0; appear.vel = 0; }
          else appear.v = 1;
        }
        springStep(Math.min(dt, 0.032));
        if (Math.abs(appear.v - 1) < 0.001 && Math.abs(appear.vel) < 0.01) appear.v = 1;
        draw();
      },
      () => boardCanvas.isConnected
    );

    // 引擎状态变化（落子/AI 应答/悔棋）→ 刷新头部、选择器与提示
    renderListeners.add(renderAll);

    renderAll();
    maybeAiTurn();
    renderAll();

    return () => {
      stopLoop();
      stopInk();
      renderListeners.clear();
      resultListeners.clear();
      if (aiTimer) clearTimeout(aiTimer);
      if (aiWorker) { aiWorker.terminate(); aiWorker = null; }
      if (state.aiThinking) { state.aiThinking = false; state.moveId++; }
    };
  };

  /* ---------------- helpers ---------------- */

  function drawMarble(ctx, side) {
    const base = ctx.createLinearGradient(0, 0, side, side);
    base.addColorStop(0, "#f5f6ef"); base.addColorStop(0.52, "#e1e9e2"); base.addColorStop(1, "#f5f2e8");
    ctx.fillStyle = base; ctx.fillRect(0, 0, side, side);
    // Layered stone veins use fixed geometry so the texture stays still.
    for (let i = 0; i < 8; i++) {
      const y = side * (-0.16 + i * 0.18);
      ctx.strokeStyle = i % 3 === 0 ? "rgba(143,156,143,.16)" : "rgba(147,167,155,.12)";
      ctx.lineWidth = side * (i % 3 === 0 ? 0.006 : 0.003);
      ctx.beginPath(); ctx.moveTo(-side * 0.1, y);
      ctx.bezierCurveTo(side * 0.28, y + side * 0.19, side * 0.42, y - side * 0.08, side * 1.1, y + side * 0.23);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.38)"; ctx.lineWidth = Math.max(.5, side * .0013);
      ctx.beginPath(); ctx.moveTo(-side * 0.1, y + side * .008);
      ctx.bezierCurveTo(side * 0.28, y + side * 0.198, side * 0.42, y - side * 0.072, side * 1.1, y + side * 0.238);
      ctx.stroke();
    }
  }

  // Black is represented by jade, white by amber; both keep distinct silhouettes.
  function drawGemStone(ctx, x, y, r, stone) {
    const jade = stone === G.BLACK;
    ctx.save();
    // A soft offset shadow leaves the grid faintly visible through the stone.
    ctx.fillStyle = jade ? "rgba(17,67,50,.12)" : "rgba(100,58,12,.13)";
    ctx.beginPath(); ctx.ellipse(x + r * .13, y + r * .21, r * .93, r * .79, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.save(); ctx.clip();
    const body = ctx.createRadialGradient(x - r * .33, y - r * .4, r * .04, x, y, r * 1.16);
    const colors = jade
      ? ["rgba(220,255,235,.65)", "rgba(83,200,148,.68)", "rgba(11,120,83,.82)", "rgba(5,72,53,.92)"]
      : ["rgba(255,250,207,.66)", "rgba(255,196,86,.68)", "rgba(195,111,23,.82)", "rgba(122,62,11,.92)"];
    body.addColorStop(0, colors[0]); body.addColorStop(.36, colors[1]);
    body.addColorStop(.76, colors[2]); body.addColorStop(1, colors[3]);
    ctx.fillStyle = body; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    // Internal wisps and a warm translucent lower rim suggest depth.
    ctx.strokeStyle = jade ? "rgba(218,255,226,.25)" : "rgba(255,244,195,.3)";
    ctx.lineWidth = Math.max(.45, r * .09);
    ctx.beginPath(); ctx.moveTo(x - r * .8, y + r * .08);
    ctx.bezierCurveTo(x - r * .18, y - r * .18, x + r * .08, y + r * .48, x + r * .8, y + r * .04); ctx.stroke();
    const glow = ctx.createRadialGradient(x + r * .25, y + r * .45, 0, x + r * .25, y + r * .45, r * .75);
    glow.addColorStop(0, jade ? "rgba(172,255,209,.35)" : "rgba(255,229,138,.46)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.restore();
    ctx.strokeStyle = jade ? "rgba(9,94,67,.75)" : "rgba(142,78,15,.76)";
    ctx.lineWidth = Math.max(.6, r * .07);
    ctx.beginPath(); ctx.arc(x, y, r * .96, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.72)"; ctx.lineWidth = Math.max(.5, r * .09);
    ctx.beginPath(); ctx.arc(x - r * .08, y - r * .08, r * .69, Math.PI * 1.12, Math.PI * 1.58); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.82)";
    ctx.beginPath(); ctx.ellipse(x - r * .32, y - r * .39, r * .18, r * .10, -.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function skinPreview(skin, size) {
    const canvas = el("canvas");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = size + "px"; canvas.style.height = size + "px";
    canvas.style.borderRadius = "10px";
    canvas.style.flex = "0 0 " + size + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const s = size;
    const exercise = skin === "EXERCISE";
    const marble = skin === "MARBLE";
    ctx.fillStyle = exercise ? "#DFD9C6" : marble ? "#395b50" : "#7C5527";
    roundRectPath(ctx, 0, 0, s, s, 10); ctx.fill();
    ctx.fillStyle = exercise ? "#FBF9EE" : marble ? "#e7ede5" : "#DCB26A";
    roundRectPath(ctx, 3, 3, s - 6, s - 6, 8); ctx.fill();
    if (marble) {
      ctx.save(); roundRectPath(ctx, 3, 3, s - 6, s - 6, 8); ctx.clip(); drawMarble(ctx, s); ctx.restore();
    }
    const inset = s * 0.26;
    const span = s - inset * 2;
    ctx.strokeStyle = exercise ? hexA(P.GridGreen, 0.6) : marble ? "rgba(48,76,67,.65)" : hexA(P.GridInk, 0.85);
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const p = inset + (span * i) / 2;
      ctx.beginPath(); ctx.moveTo(inset, p); ctx.lineTo(s - inset, p); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p, inset); ctx.lineTo(p, s - inset); ctx.stroke();
    }
    const step = span / 2;
    if (exercise) {
      ctx.strokeStyle = hexA(P.RedRule, 0.7);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(inset * 0.4, 3); ctx.lineTo(inset * 0.4, s - 3); ctx.stroke();
      drawPreviewMark(ctx, inset + step * 0.5, inset + step * 0.5, step * 0.26, G.BLACK);
      drawPreviewMark(ctx, inset + step * 1.5, inset + step * 1.5, step * 0.26, G.WHITE);
    } else if (marble) {
      drawGemStone(ctx, inset, inset, step * .3, G.BLACK);
      drawGemStone(ctx, inset + step, inset + step, step * .3, G.WHITE);
    } else {
      drawPreviewStone(ctx, inset, inset, step * 0.3, G.BLACK);
      drawPreviewStone(ctx, inset + step, inset + step, step * 0.3, G.WHITE);
    }
    return canvas;
  }

  function drawPreviewStone(ctx, x, y, r, stone) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r * 1.9);
    if (stone === G.BLACK) { g.addColorStop(0, P.Slate[0]); g.addColorStop(0.5, P.Slate[1]); g.addColorStop(1, P.Slate[2]); }
    else { g.addColorStop(0, P.Clam[0]); g.addColorStop(0.55, P.Clam[1]); g.addColorStop(1, P.Clam[2]); }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  function drawPreviewMark(ctx, x, y, r, stone) {
    if (stone === G.BLACK) {
      ctx.strokeStyle = P.PenBlue;
      ctx.lineWidth = r * 0.44;
      ctx.beginPath(); ctx.arc(x, y, r * 1.36 / 2, (-78 * Math.PI) / 180, ((-78 + 322) * Math.PI) / 180); ctx.stroke();
    } else {
      ctx.lineCap = "round";
      ctx.strokeStyle = P.PenRedDeep;
      ctx.lineWidth = r * 0.6;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5, y + 0.02 * r);
      ctx.quadraticCurveTo(x - r * 0.25, y + r * 0.3, x - r * 0.05, y + r * 0.5);
      ctx.quadraticCurveTo(x + r * 0.25, y - r * 0.02, x + r * 0.62, y - r * 0.46);
      ctx.stroke();
    }
  }

  function shopBagGlyph(size, tint) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", size); svg.setAttribute("height", size);
    svg.setAttribute("viewBox", "0 0 15 15");
    const w = 15, h = 15;
    svg.innerHTML =
      '<rect x="' + w * 0.16 + '" y="' + h * 0.42 + '" width="' + w * 0.68 + '" height="' + h * 0.5 + '" rx="' + w * 0.1 + '" fill="' + tint + '"/>' +
      '<path d="M' + w * 0.32 + " " + h * 0.72 + " A " + w * 0.18 + " " + h * 0.3 + " 0 0 1 " + w * 0.68 + " " + h * 0.72 +
      '" fill="none" stroke="' + tint + '" stroke-width="1.6" stroke-linecap="round"/>';
    return svg;
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

  // 测试钩子：Node/e2e 直接驱动引擎（读取状态、同步计算 AI 落子）
  BZX.__gomokuEngine = {
    state,
    bestMove,
    play,
    undo,
    resetWith,
    size: () => G.SIZE,
  };
})();
