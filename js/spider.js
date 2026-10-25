/* ============================================================
   spider.js — 蜘蛛纸牌（经典 Windows 规则，横屏桌面布局）
   逻辑对应 game/SpiderSolitaire.kt + SpiderViewModel.kt。
   桌面适配：鼠标/触屏统一 Pointer Events——按住可拖动同花顺，
   松手落到目标列；点选-再点也照常可用（与安卓一致）。
   ============================================================ */
(function () {
  "use strict";
  const BZX = window.BZX;
  const el = BZX.el;

  const COLUMN_COUNT = 10, COMPLETIONS_TO_WIN = 8, RUN_SIZE = 13;
  const SUITS = {
    ONE: { count: 1, title: "单花色", caption: "入门 · 8 组黑桃" },
    TWO: { count: 2, title: "双花色", caption: "进阶 · 黑红各半" },
    FOUR: { count: 4, title: "四花色", caption: "大师 · 原汁原味" },
  };
  const COLORS = {
    feltTop: "#138726", feltBottom: "#0A5416", cardWhite: "#fff", cardBlack: "#141414",
    cardRed: "#D11C1C", cardRim: "#9AA0A6", selectGold: "#FFC94D", hintGreen: "#B6FFC9",
    backBlue: "#24559E", backLattice: "#7FA8E0", panelCream: "#F7F1DC", feltInk: "#0A5414",
  };

  /* ---------------- engine (SpiderSolitaire.kt) ---------------- */

  function buildDeck(suits) {
    const deck = [];
    for (let pile = 0; pile < COMPLETIONS_TO_WIN; pile++) {
      const suit = suits === "ONE" ? 0 : suits === "TWO" ? (pile < 4 ? 0 : 1) : pile % 4;
      for (let rank = 1; rank <= RUN_SIZE; rank++) deck.push([suit, rank]);
    }
    return deck;
  }

  function newGame(suits) {
    const deck = buildDeck(suits);
    shuffle(deck);
    let cursor = 0;
    const columns = [];
    for (let column = 0; column < COLUMN_COUNT; column++) {
      const size = column < 4 ? 6 : 5;
      const cards = [];
      for (let row = 0; row < size; row++) {
        const [suit, rank] = deck[cursor++];
        cards.push({ suit, rank, faceUp: row === size - 1 });
      }
      columns.push(cards);
    }
    const stock = deck.slice(cursor).map(([suit, rank]) => ({ suit, rank, faceUp: false }));
    return { suits, columns, stock, completed: [], score: 500, moves: 0, status: "PLAYING", serial: 0, lastDealSerial: -1 };
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function movableRun(column, index) {
    if (index < 0 || index >= column.length) return false;
    for (let i = index; i < column.length; i++) {
      const card = column[i];
      if (!card.faceUp) return false;
      if (i > index) {
        const above = column[i - 1];
        if (card.suit !== above.suit || card.rank !== above.rank - 1) return false;
      }
    }
    return true;
  }

  function canDrop(run, target) {
    return target.length === 0 || target[target.length - 1].rank === run[0].rank + 1;
  }

  function flipTop(column) {
    if (column.length && !column[column.length - 1].faceUp) {
      return column.slice(0, -1).concat([Object.assign({}, column[column.length - 1], { faceUp: true })]);
    }
    return column;
  }

  function hasCompleteRun(column) {
    if (column.length < RUN_SIZE) return false;
    const run = column.slice(column.length - RUN_SIZE);
    if (run.some((c) => !c.faceUp)) return false;
    const suit = run[0].suit;
    return run[0].rank === RUN_SIZE &&
      run.every((c, i) => c.suit === suit && c.rank === RUN_SIZE - i);
  }

  function settle(game, moves, fromDeal) {
    const columns = game.columns.slice();
    let completed = game.completed.slice();
    for (let column = 0; column < columns.length; column++) {
      let cards = columns[column];
      let changed = false;
      while (hasCompleteRun(cards)) {
        const suit = cards[cards.length - 1].suit;
        cards = flipTop(cards.slice(0, cards.length - RUN_SIZE));
        completed = completed.concat([suit]);
        changed = true;
      }
      if (changed) columns[column] = cards;
    }
    const serial = game.serial + 1;
    return Object.assign({}, game, {
      columns, completed, moves,
      score: 500 - moves + 100 * completed.length,
      status: completed.length >= COMPLETIONS_TO_WIN ? "WON" : "PLAYING",
      serial,
      lastDealSerial: fromDeal ? serial : game.lastDealSerial,
    });
  }

  function move(game, from, index, to) {
    if (from < 0 || from >= COLUMN_COUNT || to < 0 || to >= COLUMN_COUNT || from === to) return null;
    if (!movableRun(game.columns[from], index)) return null;
    const source = game.columns[from];
    const run = source.slice(index);
    if (!canDrop(run, game.columns[to])) return null;
    const columns = game.columns.slice();
    columns[from] = flipTop(source.slice(0, index));
    columns[to] = flipTop(game.columns[to].concat(run));
    return settle(Object.assign({}, game, { columns }), game.moves + 1, false);
  }

  function deal(game) {
    if (game.stock.length < COLUMN_COUNT) return null;
    if (game.columns.some((c) => c.length === 0)) return null;
    const dealt = game.stock.slice(0, COLUMN_COUNT).map((c) => Object.assign({}, c, { faceUp: true }));
    const columns = game.columns.map((cards, column) => cards.concat([dealt[column]]));
    return settle(
      Object.assign({}, game, { columns, stock: game.stock.slice(COLUMN_COUNT) }),
      game.moves, true
    );
  }

  function hint(game) {
    let best = null;
    function consider(candidate) {
      if (best === null || candidate.rank > best.rank) best = candidate;
    }
    for (let from = 0; from < COLUMN_COUNT; from++) {
      const column = game.columns[from];
      let index = column.findIndex((c) => c.faceUp);
      if (index === -1) continue;
      while (index < column.length) {
        if (movableRun(column, index)) {
          const run = column.slice(index);
          for (let to = 0; to < COLUMN_COUNT; to++) {
            if (to === from) continue;
            const target = game.columns[to];
            if (!canDrop(run, target)) continue;
            let rank = run.length;
            if (target.length && target[target.length - 1].suit === run[0].suit) rank += 4;
            if (index > 0 && !column[index - 1].faceUp) rank += 2;
            if (target.length) rank += 1;
            if (target.length === 0 && index === 0) rank -= 5;
            consider({ from, index, to, rank });
          }
        }
        index++;
      }
    }
    if (best === null) return { from: 0, index: 0, to: 0, suggestDeal: true };
    return { from: best.from, index: best.index, to: best.to, suggestDeal: false };
  }

  /* ---------------- state (SpiderViewModel.kt) ---------------- */

  const state = {
    game: newGame(BZX.store.get("spiderSuits", "ONE")),
    selectedFrom: null,
    selectedIndex: null,
    canUndo: false,
    hint: null,
    hintSerial: 0,
  };
  const history = [];

  function pushHistory() { history.push(state.game); }

  function tapCard(column, index) {
    const game = state.game;
    if (game.status === "WON") return;
    const heldFrom = state.selectedFrom;
    if (heldFrom !== null && heldFrom !== column) {
      const moved = move(game, heldFrom, state.selectedIndex, column);
      if (moved) {
        pushHistory();
        Object.assign(state, { game: moved, selectedFrom: null, selectedIndex: null, canUndo: true, hint: null });
        return true;
      }
    }
    if (movableRun(game.columns[column], index) && heldFrom !== column) {
      state.selectedFrom = column;
      state.selectedIndex = index;
    } else if (heldFrom !== null && heldFrom === column && state.selectedIndex === index) {
      state.selectedFrom = null;
      state.selectedIndex = null;
    } else if (heldFrom === column) {
      state.selectedFrom = column;
      state.selectedIndex = index;
    } else {
      state.selectedFrom = null;
      state.selectedIndex = null;
    }
    return false;
  }

  function tapColumn(column) {
    const heldFrom = state.selectedFrom;
    if (heldFrom === null || heldFrom === column) return false;
    return dropRun(heldFrom, state.selectedIndex, column);
  }

  function selectRun(column, index) {
    if (state.game.status === "WON") return;
    if (movableRun(state.game.columns[column], index)) {
      state.selectedFrom = column;
      state.selectedIndex = index;
    } else {
      state.selectedFrom = null;
      state.selectedIndex = null;
    }
  }

  function clearSelection() {
    state.selectedFrom = null;
    state.selectedIndex = null;
  }

  function dropRun(from, index, to) {
    if (from === to) { clearSelection(); return false; }
    const moved = move(state.game, from, index, to);
    if (moved) {
      pushHistory();
      Object.assign(state, { game: moved, selectedFrom: null, selectedIndex: null, canUndo: true, hint: null });
      return true;
    }
    clearSelection();
    return false;
  }

  function doDeal() {
    const dealt = deal(state.game);
    if (!dealt) return false;
    pushHistory();
    Object.assign(state, { game: dealt, selectedFrom: null, selectedIndex: null, canUndo: true, hint: null });
    return true;
  }

  function undo() {
    const previous = history.pop();
    if (!previous) return;
    const game = Object.assign({}, previous, {
      moves: previous.moves + 1,
      score: 500 - (previous.moves + 1) + 100 * previous.completed.length,
      serial: state.game.serial + 1,
    });
    Object.assign(state, { game, selectedFrom: null, selectedIndex: null, canUndo: history.length > 0, hint: null });
  }

  function restart() { startNewGame(state.game.suits); }
  function startNewGame(suits) {
    history.length = 0;
    Object.assign(state, { game: newGame(suits), selectedFrom: null, selectedIndex: null, canUndo: false, hint: null });
  }

  /* ---------------- screen ---------------- */

  BZX.SpiderScreen = function (root) {
    root.classList.add("game-screen", "spider");

    const vignette = el("canvas", "backdrop-canvas");
    root.appendChild(vignette);
    const stopVignette = BZX.feltVignette(vignette);

    const col = el("div", "spider-col");
    root.appendChild(col);

    /* top bar */
    const topbar = el("div", "spider-topbar");
    const backBtn = el("button", "back-btn", "‹  返回游戏大厅");
    BZX.sfxButton(backBtn, () => BZX.router.backToLibrary());
    topbar.appendChild(backBtn);
    topbar.appendChild(el("div", "st-title", "蜘蛛纸牌"));
    const spring1 = el("div", "st-spring");
    topbar.appendChild(spring1);
    const suitPills = {};
    Object.keys(SUITS).forEach((key) => {
      const pill = el("button", "felt-pill" + (state.game.suits === key ? " selected" : ""), SUITS[key].title);
      BZX.sfxButton(pill, () => {
        BZX.store.set("spiderSuits", key);
        startNewGame(key);
        renderAll();
      });
      suitPills[key] = pill;
      topbar.appendChild(pill);
    });
    const spring2 = el("div", "st-spring2");
    topbar.appendChild(spring2);
    const restartPill = el("button", "felt-pill", "新游戏 ↻");
    const undoPill = el("button", "felt-pill", "撤销 ↶");
    const hintPill = el("button", "felt-pill", "提示");
    BZX.sfxButton(restartPill, () => { restart(); renderAll(); });
    BZX.sfxButton(undoPill, () => { undo(); renderAll(); });
    BZX.sfxButton(hintPill, () => {
      state.hint = hint(state.game);
      state.hintSerial++;
      renderBoard();
      setTimeout(() => {
        if (state.hint) { state.hint = null; renderBoard(); }
      }, 2000);
    });
    topbar.appendChild(restartPill);
    topbar.appendChild(undoPill);
    topbar.appendChild(hintPill);
    col.appendChild(topbar);

    /* board */
    const board = el("div", "spider-board");
    col.appendChild(board);

    /* bottom strip */
    const bottom = el("div", "spider-bottom");
    const foundations = el("div");
    foundations.style.cssText = "display:flex;gap:3px;align-items:center;";
    bottom.appendChild(foundations);
    const scoreText = el("div", "sb-score");
    const movesText = el("div", "sb-moves");
    const springB = el("div", "sb-spring");
    bottom.appendChild(scoreText);
    bottom.appendChild(movesText);
    bottom.appendChild(springB);
    const stockZone = el("div", "stock-zone");
    const stockPile = el("div", "stock-pile");
    const stockLabel = el("div", "stock-label");
    stockZone.appendChild(stockPile);
    stockZone.appendChild(stockLabel);
    bottom.appendChild(stockZone);
    col.appendChild(bottom);

    BZX.sfxButton(stockZone, () => {
      const blocked = state.game.stock.length >= COLUMN_COUNT && state.game.columns.some((c) => c.length === 0);
      if (blocked) {
        BZX.toast(root, "有空列时不能发牌，先把牌填回去");
      } else if (doDeal()) {
        renderAll();
      }
    });

    /* dimensions */
    let cardWidth = 80;
    function layout() {
      const w = board.clientWidth;
      cardWidth = (w - 12 - 3 * 9) / 10;
    }

    function columnX(column) {
      return 6 + (cardWidth + 3) * column;
    }

    function targetColumnAt(centerX) {
      for (let column = 0; column < COLUMN_COUNT; column++) {
        const start = columnX(column);
        if (centerX >= start - 2 && centerX < start + cardWidth + 2) return column;
      }
      return null;
    }

    /* render */
    let colEls = [];

    function cardFaceHTML(card) {
      const ink = card.suit === 1 || card.suit === 3 ? COLORS.cardRed : COLORS.cardBlack;
      const idxSize = Math.max(9, Math.round(cardWidth * 0.24));
      const suitSize = Math.round(cardWidth * 0.19);
      const centerSize = Math.round(cardWidth * 0.46);
      const rank = rankLabel(card.rank);
      const idx = '<div style="display:flex;flex-direction:column;align-items:center;line-height:.95;">' +
        '<div style="color:' + ink + ";font-size:" + idxSize + 'px;font-weight:700;">' + rank + "</div>" +
        suitSvg(card.suit, suitSize, ink) + "</div>";
      return '<div style="position:absolute;inset:0;">' +
        '<div style="position:absolute;top:1.5px;left:2.5px;">' + idx + "</div>" +
        '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">' + suitSvg(card.suit, centerSize, ink) + "</div>" +
        '<div style="position:absolute;bottom:1.5px;right:2.5px;transform:rotate(180deg);">' + idx + "</div>" +
        "</div>";
    }

    function buildCardNode(card, column, row, opts) {
      const node = el("div", "spider-card");
      node.style.width = cardWidth + "px";
      node.style.height = cardWidth * 1.4 + "px";
      if (opts.fresh) node.classList.add("deal-pop");
      if (opts.selected) node.classList.add("selected-run");
      if (opts.hinted) node.classList.add("hinted");
      if (opts.lifted) node.classList.add("drag-lifted");
      node.innerHTML = cardFaceHTML(card);
      if (opts.interactive) {
        node.classList.add("clickable");
        node.addEventListener("click", () => {
          if (performance.now() - lastDragEndTime < 150) return; // 拖拽松手后的 click 不再触发点选
          sfxTap();
          tapCard(column, row);
          renderBoard();
        });
        attachDrag(node, column, row);
      }
      return node;
    }

    let lastDragEndTime = 0;

    function sfxTap() { BZX.sfx.click(); }

    function renderBoard() {
      layout();
      BZX.clear(board);
      colEls = [];
      const game = state.game;
      const cardHeight = cardWidth * 1.4;
      const boardH = board.clientHeight;
      const downGap = cardHeight * 0.13;
      const upGap = cardHeight * 0.27;
      const freshDeal = game.serial === game.lastDealSerial;
      const hint = state.hint && !state.hint.suggestDeal ? state.hint : null;

      for (let column = 0; column < COLUMN_COUNT; column++) {
        const cards = game.columns[column];
        let needed = cardHeight;
        for (let i = 1; i < cards.length; i++) needed += cards[i - 1].faceUp ? upGap : downGap;
        const squeeze = needed > boardH
          ? Math.min(1, Math.max(0.22, (boardH - cardHeight) / (needed - cardHeight)))
          : 1;
        const dGap = downGap * squeeze;
        const uGap = upGap * squeeze;

        const colEl = el("div", "spider-col-area");
        colEl.style.left = columnX(column) + "px";
        colEl.style.width = cardWidth + "px";
        // 空列占位框（也可作为点选落点）
        const empty = el("div", "spider-empty-col");
        empty.style.width = cardWidth + "px";
        empty.style.height = cardHeight + "px";
        colEl.appendChild(empty);
        colEl.addEventListener("click", () => {
          if (performance.now() - lastDragEndTime < 150) return;
          if (tapColumn(column)) { sfxTap(); renderBoard(); }
        });

        let y = 0;
        const lifted = dragSession && dragSession.from === column ? dragSession.index : -1;
        cards.forEach((card, row) => {
          const isLifted = dragSession && dragSession.from === column && row >= dragSession.index;
          const movable = movableRun(cards, row);
          const selected = state.selectedFrom === column && row >= (state.selectedIndex || 0);
          const hintedSource = hint && hint.from === column && row >= hint.index;
          const hintedTarget = hint && hint.to === column && row === cards.length - 1;
          const showTargetGlow = (hoverTarget === column && dragSession && canDrop(dragSession.cards, cards)) ||
            (hint && hint.to === column && !hint.suggestDeal);
          const node = buildCardNode(card, column, row, {
            fresh: freshDeal && row === cards.length - 1 && !isLifted,
            selected,
            hinted: (hintedSource || hintedTarget) && !isLifted,
            lifted: !!isLifted,
            interactive: !isLifted,
          });
          if (isLifted) node.style.pointerEvents = "none";
          if (showTargetGlow && row === cards.length - 1) node.classList.add("target-glow");
          node.style.top = y + "px";
          node.style.left = "0";
          colEl.appendChild(node);
          y += card.faceUp ? uGap : dGap;
          void movable; void selected; void lifted;
        });
        // 空列提示光晕
        if (cards.length === 0) {
          const glow = (hoverTarget === column && dragSession && dragSession.cards.length) ||
            (hint && hint.to === column && !hint.suggestDeal);
          empty.classList.toggle("target-glow", !!glow);
        }
        board.appendChild(colEl);
        colEls.push(colEl);
      }
      renderBottom();
      renderTopbar();
    }

    function renderTopbar() {
      Object.keys(suitPills).forEach((key) => suitPills[key].classList.toggle("selected", state.game.suits === key));
      undoPill.disabled = !state.canUndo;
    }

    function renderBottom() {
      const game = state.game;
      BZX.clear(foundations);
      const miniW = cardWidth * 0.56;
      const miniH = miniW * 1.4;
      for (let slot = 0; slot < 8; slot++) {
        const suit = game.completed[slot];
        if (suit === undefined) {
          const box = el("div");
          box.style.cssText = "width:" + miniW + "px;height:" + miniH + "px;border:1px solid rgba(255,255,255,.3);border-radius:3px;";
          foundations.appendChild(box);
        } else {
          const box = el("div");
          box.style.cssText =
            "width:" + miniW + "px;height:" + miniH + "px;border-radius:3px;background:#fff;" +
            "border:1px solid " + COLORS.cardRim + ";box-shadow:0 2px 4px rgba(0,0,0,.3);" +
            "display:flex;align-items:center;justify-content:center;";
          box.innerHTML = suitSvg(suit, Math.round(miniW * 0.52), suit === 1 || suit === 3 ? COLORS.cardRed : COLORS.cardBlack);
          foundations.appendChild(box);
        }
      }
      scoreText.textContent = "得分 " + game.score;
      movesText.textContent = "步数 " + game.moves;
      // stock
      BZX.clear(stockPile);
      stockPile.style.width = miniW + "px";
      stockPile.style.height = miniH + "px";
      const piles = Math.floor(game.stock.length / COLUMN_COUNT);
      if (piles === 0) {
        const box = el("div");
        box.style.cssText = "width:" + miniW + "px;height:" + miniH + "px;border:1px solid rgba(255,255,255,.3);border-radius:3px;";
        stockPile.appendChild(box);
      } else {
        for (let pile = 0; pile < piles; pile++) {
          const back = cardBack(miniW);
          back.style.position = pile === 0 ? "relative" : "absolute";
          back.style.left = pile * 9 + "px";
          back.style.top = "0";
          stockPile.appendChild(back);
        }
      }
      stockLabel.textContent = "发牌 ×" + piles;
      stockZone.classList.toggle("blocked", game.stock.length === 0);
    }

    /* ---------------- drag session ---------------- */

    let dragSession = null; // { from,index,cards,originX,originY,ghost[],moved }
    let hoverTarget = null;

    function attachDrag(node, column, row) {
      node.addEventListener("pointerdown", (e) => {
        if (state.game.status === "WON") return;
        if (e.button !== 0 && e.pointerType === "mouse") return;
        if (!movableRun(state.game.columns[column], row)) return;
        const cards = state.game.columns[column].slice(row);
        dragSession = {
          from: column, index: row, cards,
          startX: e.clientX, startY: e.clientY,
          dx: 0, dy: 0, moved: false, ghosts: [],
        };
        e.preventDefault();
      });
    }

    // 全局 move/up：真正执行拖动
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);

    function onPointerMove(e) {
      if (!dragSession) return;
      const dx2 = e.clientX - dragSession.startX;
      const dy2 = e.clientY - dragSession.startY;
      if (!dragSession.moved) {
        if (Math.abs(dx2) < 6 && Math.abs(dy2) < 6) return;
        dragSession.moved = true;
        selectRun(dragSession.from, dragSession.index);
        liftGhosts(e);
      }
      dragSession.dx = dx2;
      dragSession.dy = dy2;
      dragSession.ghosts.forEach((g) => {
        g.node.style.left = g.originLeft + dx2 + "px";
        g.node.style.top = g.originTop + dy2 + "px";
      });
      // hover target by run centre X
      const boardRect = board.getBoundingClientRect();
      const centerX = dragSession.originCenterX + dx2 - boardRect.left;
      const target = targetColumnAt(centerX);
      const valid = target !== null && target !== dragSession.from &&
        canDrop(dragSession.cards, state.game.columns[target]);
      const newHover = valid ? target : null;
      dragSession.dx = dx2;
      dragSession.dy = dy2;
      if (newHover !== hoverTarget) {
        hoverTarget = newHover;
        renderBoard();
      }
    }

    function liftGhosts(e) {
      // 从各列节点里取被抬起卡片的位置，创建浮动副本
      const boardRect = board.getBoundingClientRect();
      const colEl = colEls[dragSession.from];
      const cardNodes = Array.from(colEl.querySelectorAll(".spider-card"));
      const runNodes = cardNodes.slice(dragSession.index);
      const upGap = cardWidth * 1.4 * 0.27;
      dragSession.originCenterX = 0;
      runNodes.forEach((src, i) => {
        const rect = src.getBoundingClientRect();
        if (i === 0) dragSession.originCenterX = rect.left - boardRect.left + cardWidth / 2;
        const ghost = el("div", "spider-card drag-ghost");
        ghost.style.width = cardWidth + "px";
        ghost.style.height = cardWidth * 1.4 + "px";
        ghost.innerHTML = cardFaceHTML(dragSession.cards[i]);
        ghost.style.position = "fixed";
        ghost.style.left = rect.left + "px";
        ghost.style.top = rect.top + i * upGap + "px";
        ghost.style.zIndex = 80 + i;
        document.body.appendChild(ghost);
        dragSession.ghosts.push({ node: ghost, originLeft: rect.left, originTop: rect.top + i * upGap });
        src.style.visibility = "hidden";
      });
    }

    function onPointerUp() {
      if (!dragSession) return;
      const session = dragSession;
      dragSession = null;
      session.ghosts.forEach((g) => g.node.remove());
      if (!session.moved) return; // 纯点击：click 事件自行处理
      lastDragEndTime = performance.now();
      hoverTarget = null;
      const centerX = session.originCenterX + session.dx;
      const target = targetColumnAt(centerX);
      if (target !== null && target !== session.from) {
        dropRun(session.from, session.index, target);
      } else {
        clearSelection();
      }
      renderBoard();
    }

    /* ---------------- win overlay ---------------- */

    function maybeWin() {
      if (state.game.status !== "WON") return;
      const overlay = el("div", "win-overlay");
      const cv = el("canvas");
      overlay.appendChild(cv);
      root.appendChild(overlay);
      let panelVisible = false;
      const showPanel = () => {
        if (panelVisible) return;
        panelVisible = true;
        const panel = el("div", "win-panel");
        panel.innerHTML =
          '<div class="wp-title">你赢了！</div>' +
          '<div class="wp-line">得分 ' + state.game.score + " · 步数 " + state.game.moves + "</div>" +
          '<div class="wp-line">八组同花连珠，全部归位。</div>';
        const row = el("div", "wp-row");
        const go = el("button", "wp-btn-go", "再来一局");
        BZX.sfxButton(go, () => { restart(); overlay.remove(); renderAll(); });
        const back = el("button", "wp-btn-back", "返回大厅");
        BZX.sfxButton(back, () => BZX.router.backToLibrary());
        row.appendChild(go);
        row.appendChild(back);
        panel.appendChild(row);
        overlay.appendChild(panel);
      };
      overlay.addEventListener("click", showPanel);
      setTimeout(showPanel, 1600);
      bounceCards(cv, overlay, showPanel);
    }

    function bounceCards(canvas, overlay, showPanel) {
      const dpr = window.devicePixelRatio || 1;
      function resize() {
        canvas.width = overlay.clientWidth * dpr;
        canvas.height = overlay.clientHeight * dpr;
      }
      resize();
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      const cards = [];
      let spawned = 0;
      let lastSpawn = 0;
      let prev = null;
      const TOTAL = 104, TRAIL = 12, GRAVITY = 2100, SIDE_GAP = 120;

      function spawnCard(w, floor) {
        const suit = spawned % 4;
        const card = {
          suit,
          color: suit === 1 || suit === 3 ? COLORS.cardRed : COLORS.cardBlack,
          x: w * 0.05,
          y: floor,
          vx: (150 + Math.random() * 380) * (Math.random() < 0.5 ? 1 : -1),
          vy: -(320 + Math.random() * 460),
          trail: [],
          gone: false,
        };
        cards.push(card);
        spawned++;
      }

      const stop = BZX.animLoop(
        (now, dt) => {
          resize();
          const w = overlay.clientWidth;
          const h = overlay.clientHeight;
          const floor = h - 4;
          if (prev === null) { prev = now; lastSpawn = now; }
          if (spawned < TOTAL && now - lastSpawn >= 320) {
            spawnCard(w, floor);
            lastSpawn = now;
          }
          cards.forEach((card) => {
            card.vy += GRAVITY * dt;
            card.x += card.vx * dt;
            card.y += card.vy * dt;
            if (card.y > floor) {
              card.y = floor;
              card.vy = -card.vy * 0.76;
            }
            card.trail.push({ x: card.x, y: card.y });
            if (card.trail.length > TRAIL) card.trail.shift();
            if (card.x < -SIDE_GAP || card.x > w + SIDE_GAP) card.gone = true;
          });
          for (let i = cards.length - 1; i >= 0; i--) if (cards[i].gone) cards.splice(i, 1);

          ctx.clearRect(0, 0, w, h);
          const side = 21;
          cards.forEach((card) => {
            card.trail.forEach((pos, index) => {
              const alpha = ((index + 1) / card.trail.length) * 0.16;
              ctx.fillStyle = "rgba(255,255,255," + alpha + ")";
              roundRectPath(ctx, pos.x - side / 2, pos.y - side / 2, side, side * 1.4, 2);
              ctx.fill();
            });
            ctx.fillStyle = "#fff";
            roundRectPath(ctx, card.x - side / 2, card.y - side / 2, side, side * 1.4, 2);
            ctx.fill();
            drawSuitOn(ctx, card.suit, card.x - side / 2 + side * 0.25, card.y - side / 2 + side * 0.45, side * 0.5, card.color);
          });
          if (spawned >= TOTAL && cards.length === 0) {
            showPanel();
            stopFn();
          }
        },
        () => overlay.isConnected
      );
      const stopFn = stop;
    }

    /* ---------------- helpers ---------------- */

    function rankLabel(rank) {
      return { 1: "A", 11: "J", 12: "Q", 13: "K" }[rank] || String(rank);
    }

    function suitSvg(suit, size, color) {
      // Vector pips matching drawSuit in SpiderScreen.kt
      let inner = "";
      if (suit === 1) { // ♥
        inner = '<path d="M50 88 C5 58 10 12 50 34 C90 12 95 58 50 88 Z" fill="' + color + '"/>';
      } else if (suit === 3) { // ♦
        inner = '<path d="M50 4 L90 50 L50 96 L10 50 Z" fill="' + color + '"/>';
      } else if (suit === 0) { // ♠
        inner = '<path d="M50 6 C92 42 88 80 50 66 C12 80 8 42 50 6 Z" fill="' + color + '"/>' +
          '<path d="M50 52 L68 94 L32 94 Z" fill="' + color + '"/>';
      } else { // ♣
        inner = '<circle cx="50" cy="27" r="20" fill="' + color + '"/>' +
          '<circle cx="30" cy="56" r="20" fill="' + color + '"/>' +
          '<circle cx="70" cy="56" r="20" fill="' + color + '"/>' +
          '<path d="M50 48 L66 94 L34 94 Z" fill="' + color + '"/>';
      }
      return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 100 100">' + inner + "</svg>";
    }

    function drawSuitOn(ctx, suit, x, y, side, color) {
      ctx.fillStyle = color;
      const cx = x + side / 2, cy = y + side / 2;
      const s = side / 100;
      if (suit === 1) {
        ctx.beginPath();
        ctx.moveTo(cx, cy + 38 * s);
        ctx.bezierCurveTo(cx - 45 * s, cy + 8 * s, cx - 40 * s, cy - 38 * s, cx, cy - 16 * s);
        ctx.bezierCurveTo(cx + 40 * s, cy - 38 * s, cx + 45 * s, cy + 8 * s, cx, cy + 38 * s);
        ctx.fill();
      } else if (suit === 3) {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 46 * s);
        ctx.lineTo(cx + 40 * s, cy);
        ctx.lineTo(cx, cy + 46 * s);
        ctx.lineTo(cx - 40 * s, cy);
        ctx.closePath();
        ctx.fill();
      } else if (suit === 0) {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 44 * s);
        ctx.bezierCurveTo(cx + 42 * s, cy - 8 * s, cx + 38 * s, cy + 30 * s, cx, cy + 16 * s);
        ctx.bezierCurveTo(cx - 38 * s, cy + 30 * s, cx - 42 * s, cy - 8 * s, cx, cy - 44 * s);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx, cy + 2 * s);
        ctx.lineTo(cx + 18 * s, cy + 44 * s);
        ctx.lineTo(cx - 18 * s, cy + 44 * s);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(cx, cy - 23 * s, 20 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - 20 * s, cy + 6 * s, 20 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 20 * s, cy + 6 * s, 20 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx, cy - 2 * s);
        ctx.lineTo(cx + 16 * s, cy + 44 * s);
        ctx.lineTo(cx - 16 * s, cy + 44 * s);
        ctx.closePath();
        ctx.fill();
      }
    }

    function cardBack(width) {
      const node = el("div");
      node.style.cssText =
        "width:" + width + "px;height:" + (width * 1.4) + "px;border-radius:3px;background:" + COLORS.backBlue +
        ";box-shadow:0 1px 3px rgba(0,0,0,.3);position:relative;overflow:hidden;";
      const frame = el("div");
      frame.style.cssText =
        "position:absolute;inset:2px;border:1.1px solid #fff;border-radius:2px;overflow:hidden;";
      // 斜向格纹
      const lattice = el("div");
      lattice.style.cssText =
        "position:absolute;inset:0;background:repeating-linear-gradient(45deg," +
        hexA(COLORS.backLattice, 0.55) + " 0 1px, transparent 1px 5.5px)," +
        "repeating-linear-gradient(-45deg," + hexA(COLORS.backLattice, 0.55) + " 0 1px, transparent 1px 5.5px);";
      frame.appendChild(lattice);
      node.appendChild(frame);
      return node;
    }

    function renderAll() {
      renderBoard();
      maybeWin();
    }

    const ro = new ResizeObserver(() => renderBoard());
    ro.observe(board);

    renderAll();

    return () => {
      stopVignette();
      ro.disconnect();
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
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

  function hexA(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }
})();
