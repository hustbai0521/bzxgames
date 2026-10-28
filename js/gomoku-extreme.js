/* Super-hard Gomoku engine. Independent from the legacy 15x15 AI.
   Works in a browser, a Web Worker (importScripts), and Node (require). */
(function (root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) module.exports = engine;
  else root.GomokuExtreme = engine;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";
  const SIZE = 25, CELLS = SIZE * SIZE;
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
  const WIN = 100000000, FORCED_WIN = 5000000;
  const INF = 1000000000;
  const other = p => 3 - p;

  // A small opening book generated with this engine's normal 3-second search.
  // Entries are exact 25x25 positions; rotations/reflections are equivalent.
  // Any unrecognised opening falls through to the normal tactical search.
  const OPENINGS = [
    { black: [312], white: [], move: 287 },
    { black: [312], white: [313], move: 262 },
    { black: [312], white: [338], move: 314 },
    { black: [312], white: [314], move: 264 },
    { black: [312, 313], white: [287], move: 311 },
    { black: [312, 338], white: [287], move: 286 },
    { black: [312, 286], white: [287], move: 311 },
    { black: [312, 262], white: [287], move: 336 },
    { black: [312, 337], white: [287], move: 311 },
  ];
  function transform(cell, symmetry) {
    let x = cell % SIZE - 12, y = ((cell / SIZE) | 0) - 12;
    if (symmetry & 4) x = -x;
    for (let i = 0; i < (symmetry & 3); i++) [x, y] = [-y, x];
    return (y + 12) * SIZE + x + 12;
  }
  function openingMove(board, player) {
    let black = 0, white = 0;
    for (let i = 0; i < CELLS; i++) {
      if (board[i] === 1) black++;
      else if (board[i] === 2) white++;
    }
    if (!black && !white && player === 1) return 312;
    for (const entry of OPENINGS) {
      if (entry.black.length !== black || entry.white.length !== white ||
          player !== (black === white ? 1 : 2)) continue;
      for (let symmetry = 0; symmetry < 8; symmetry++) {
        if (entry.black.every(cell => board[transform(cell, symmetry)] === 1) &&
            entry.white.every(cell => board[transform(cell, symmetry)] === 2)) {
          const move = transform(entry.move, symmetry);
          if (!board[move]) return move;
        }
      }
    }
    return null;
  }

  // Cache the 3^8 directional patterns. Center is always the new stone;
  // a pattern is independent of position, colour, and board orientation.
  const patternScore = new Int32Array(6561);
  patternScore.fill(-1);
  const patternFour = new Uint8Array(6561), patternThree = new Uint8Array(6561);
  function classify(code) {
    const line = new Array(9);
    let rest = code;
    for (let i = 0; i < 9; i++) {
      if (i === 4) line[i] = 1;
      else { line[i] = rest % 3; rest = (rest / 3) | 0; }
    }
    let wins = 0, threeWindows = 0, twoWindows = 0, winMask = 0;
    for (let start = 0; start <= 4; start++) {
      let stones = 0, emptyIndex = -1, blocked = false;
      for (let j = start; j < start + 5; j++) {
        if (line[j] === 2) { blocked = true; break; }
        if (line[j] === 1) stones++; else emptyIndex = j;
      }
      if (blocked) continue;
      if (stones === 5) { patternScore[code] = WIN; return; }
      if (stones === 4) winMask |= 1 << emptyIndex;
      else if (stones === 3) threeWindows++;
      else if (stones === 2) twoWindows++;
    }
    for (let m = winMask; m; m &= m - 1) wins++;
    if (wins) {
      patternFour[code] = 1;
      patternScore[code] = wins >= 2 ? 8000000 : 120000;
      return;
    }
    // Extend each possible three once and check for a straight open four.
    let live = false;
    for (let j = 1; j < 8 && !live; j++) {
      if (line[j] !== 0) continue;
      line[j] = 1;
      for (let k = 0; k <= 3; k++) {
        if (line[k] === 0 && line[k + 1] === 1 && line[k + 2] === 1 &&
            line[k + 3] === 1 && line[k + 4] === 1 && line[k + 5] === 0 &&
            k + 1 <= 4 && k + 4 >= 4 && k + 1 <= j && k + 4 >= j) {
          live = true; break;
        }
      }
      line[j] = 0;
    }
    if (live) { patternThree[code] = 1; patternScore[code] = 18000; }
    else if (threeWindows) patternScore[code] = 1300 + Math.min(threeWindows, 3) * 100;
    else if (twoWindows) patternScore[code] = 100 + Math.min(twoWindows, 3) * 25;
    else patternScore[code] = 0;
  }

  const lines = new Int16Array(CELLS * 32);
  const affected = Array.from({ length: CELLS }, () => []);
  const pow3 = [1,3,9,27,81,243,729,2187];
  for (let cell = 0; cell < CELLS; cell++) {
    const x = cell % SIZE, y = (cell / SIZE) | 0;
    let n = cell * 32;
    for (let dir=0;dir<4;dir++) { const [dx,dy] = DIRS[dir]; for (let t = -4; t <= 4; t++) {
      if (!t) continue;
      const xx = x + dx * t, yy = y + dy * t;
      const v = xx < 0 || xx >= SIZE || yy < 0 || yy >= SIZE ? -1 : yy * SIZE + xx;
      lines[n++] = v;
      if (v >= 0) affected[cell].push([v,dir,pow3[-t < 0 ? -t + 4 : -t + 3]]);
    }}
  }

  function scoreCodes(codes, index) {
    let score = 0, fourDirections = 0, liveThrees = 0;
    for (let d = 0; d < 4; d++) {
      const code = codes[index * 4 + d];
      if (patternScore[code] < 0) classify(code);
      if (patternScore[code] === WIN) return WIN;
      score += patternScore[code];
      fourDirections += patternFour[code];
      liveThrees += patternThree[code];
    }
    if (fourDirections >= 2) score += FORCED_WIN;
    if (fourDirections && liveThrees) score += 700000;
    if (liveThrees >= 2) score += 180000;
    return score;
  }
  function initCodes(board, index, player, codes) {
    let n = index * 32;
    for (let d = 0; d < 4; d++) {
      let code = 0;
      for (let t = 0; t < 8; t++) {
        const cell = lines[n++];
        const value = cell < 0 ? 2 : board[cell] === player ? 1 : board[cell] === 0 ? 0 : 2;
        code += value * pow3[t];
      }
      codes[index * 4 + d] = code;
    }
    return scoreCodes(codes, index);
  }

  // Candidate squares within two steps of a stone. With no stones, play centre.
  function candidates(board, context) {
    const result = [];
    for (let i = 0; i < CELLS; i++) {
      if (!board[i] && context.near[i]) result.push(i);
    }
    if (!context.stones) return [312];
    return result;
  }

  function updateNear(context, cell, change) {
    const x = cell % SIZE, y = (cell / SIZE) | 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < SIZE && yy >= 0 && yy < SIZE) context.near[yy * SIZE + xx] += change;
    }
    context.stones += change;
  }

  // A move can only change scores on its four lines within four cells.
  // Keep both colours' point scores updated instead of rescoring the entire
  // frontier at every search node.
  // Two independent hashes make transposition collisions extremely unlikely.
  const hashKeys = (() => {
    let seed = 0x13579bdf;
    const keys = [new Int32Array(CELLS * 2), new Int32Array(CELLS * 2)];
    for (const key of keys) for (let i = 0; i < key.length; i++) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      key[i] = seed;
    }
    return keys;
  })();
  function toggleHash(context, cell, player) {
    if (!player) return;
    const index = cell * 2 + player - 1;
    context.hash1 ^= hashKeys[0][index];
    context.hash2 ^= hashKeys[1][index];
  }
  function setStone(board, cell, value, context) {
    const old = board[cell];
    if (!old && value) updateNear(context, cell, 1);
    else if (old && !value) updateNear(context, cell, -1);
    toggleHash(context, cell, old);
    toggleHash(context, cell, value);
    board[cell] = value;
    for (const [i, dir, power] of affected[cell]) {
      for (let player = 1; player <= 2; player++) {
        const from = !old ? 0 : old === player ? 1 : 2;
        const to = !value ? 0 : value === player ? 1 : 2;
        context.codes[player][i * 4 + dir] += (to - from) * power;
        context.scores[player][i] = scoreCodes(context.codes[player], i);
      }
    }
  }

  function moves(board, player, context) {
    const foe = other(player), list = [], myWins = [], theirWins = [];
    let myBest = 0, theirBest = 0, mySecond = 0, theirSecond = 0;
    for (const cell of candidates(board, context)) {
      const attack = context.scores[player][cell], defense = context.scores[foe][cell];
      if (attack >= WIN) myWins.push(cell);
      if (defense >= WIN) theirWins.push(cell);
      if (attack > myBest) { mySecond = myBest; myBest = attack; }
      else if (attack > mySecond) mySecond = attack;
      if (defense > theirBest) { theirSecond = theirBest; theirBest = defense; }
      else if (defense > theirSecond) theirSecond = defense;
      const x = cell % SIZE, y = (cell / SIZE) | 0;
      const center = 24 - Math.abs(x - 12) - Math.abs(y - 12);
      list.push({ cell, attack, defense, rank: attack + defense * 1.05 + center });
    }
    list.sort((a, b) => b.rank - a.rank || a.cell - b.cell);
    return { list, myWins, theirWins,
      evaluation: myBest + mySecond * 0.12 - theirBest * 1.08 - theirSecond * 0.13 };
  }

  // Follow a chain of forcing fours. The defender must either win immediately
  // or occupy the unique winning square, which makes these lines much cheaper
  // to search than arbitrary moves. A positive result is a proof, not a guess.
  function forcingWin(board, player, data, remaining, context) {
    if (!remaining) return false;
    if (++context.nodes % 32 === 0 && Date.now() >= context.deadline) throw context.timeout;
    if (data.myWins.length) return true;
    if (data.theirWins.length > 1) return false;
    if (!data.theirWins.length && data.list.some(move => move.attack >= FORCED_WIN)) return true;
    let checked = 0;
    for (const move of data.list) {
      if (move.attack < 120000 || (data.theirWins.length && move.cell !== data.theirWins[0])) continue;
      if (++checked > 8) break;
      setStone(board, move.cell, player, context);
      try {
        const response = moves(board, other(player), context);
        if (response.myWins.length) continue;
        if (response.theirWins.length > 1) return true;
        if (response.theirWins.length !== 1) continue;
        const block = response.theirWins[0];
        setStone(board, block, other(player), context);
        try {
          const next = moves(board, player, context);
          if (forcingWin(board, player, next, remaining - 1, context)) return true;
        } finally { setStone(board, block, 0, context); }
      } finally { setStone(board, move.cell, 0, context); }
    }
    return false;
  }

  // Prove a short three-threat attack without assuming the opponent must
  // defend a particular line. Check every legal reply, including remote wins
  // and counter-threats. A timeout is propagated, never treated as proof.
  function shortThreatWin(board, player, move, context) {
    const foe = other(player);
    if (board[move]) return false;
    if (context.scores[player][move] >= WIN) return true;
    setStone(board, move, player, context);
    try {
      let hasReply = false;
      for (let reply = 0; reply < CELLS; reply++) {
        if (board[reply]) continue;
        hasReply = true;
        if (++context.nodes % 16 === 0 && Date.now() >= context.deadline) throw context.timeout;
        if (context.scores[foe][reply] >= WIN) return false;
        setStone(board, reply, foe, context);
        try {
          const data = moves(board, player, context);
          if (data.myWins.length) continue;
          if (data.theirWins.length > 1) return false;
          if (data.theirWins.length === 1) {
            if (context.scores[player][data.theirWins[0]] < FORCED_WIN) return false;
          } else if (!data.list.some(next => next.attack >= FORCED_WIN)) return false;
        } finally { setStone(board, reply, 0, context); }
      }
      // Filling the last square without a five is a draw, not a proof of win.
      return hasReply;
    } finally { setStone(board, move, 0, context); }
  }

  function search(board, player, depth, alpha, beta, ply, context, extensions) {
    if (++context.nodes % 32 === 0 && Date.now() >= context.deadline) throw context.timeout;
    const key = context.hash1 + ":" + context.hash2 + ":" + player + ":" + depth + ":" + extensions;
    const cached = context.table.get(key);
    if (cached) {
      if (cached.kind === "exact") return cached.score;
      if (cached.kind === "lower") alpha = Math.max(alpha, cached.score);
      else beta = Math.min(beta, cached.score);
      if (alpha >= beta) return cached.score;
    }
    const initialAlpha = alpha, initialBeta = beta;
    const data = moves(board, player, context);
    if (data.myWins.length) return WIN - ply;
    if (data.theirWins.length > 1) return -WIN + ply + 1;
    if (!data.theirWins.length && data.list.some(move => move.attack >= FORCED_WIN)) return WIN - ply - 2;
    if (!data.list.length) return 0;
    if (depth <= 0 && !data.theirWins.length) {
      if (data.list.some(move => move.attack >= 120000) && forcingWin(board, player, data, 8, context)) return WIN - ply - 12;
      // At shallow horizons, verify up to three plausible double-threat
      // attacks against every defender reply rather than guessing from shape.
      if (ply <= 3) {
        let checked = 0;
        for (const move of data.list) {
          if (move.attack < 180000 || move.attack >= FORCED_WIN) continue;
          if (shortThreatWin(board, player, move.cell, context)) return WIN - ply - 6;
          if (++checked >= 3) break;
        }
      }
      // Do not stop immediately before the opponent can create an open four
      // or double four: examine defensive replies first to reduce horizon bias.
      if (extensions > 0 && data.list.some(move => move.defense >= FORCED_WIN)) extensions--;
      else return data.evaluation;
    }
    let list = data.list;
    if (data.theirWins.length === 1) {
      const forced = data.theirWins[0];
      list = list.filter(m => m.cell === forced);
    } else {
      // Narrow deeper nodes while preserving every forcing four.
      const width = ply <= 1 ? 12 : ply <= 3 ? 8 : 6;
      const forcing = list.filter(m => m.attack >= 120000 || m.defense >= 120000);
      list = forcing.length > width ? forcing.slice(0, 20) : list.slice(0, width);
    }
    let best = -INF;
    for (const move of list) {
      setStone(board, move.cell, player, context);
      let value;
      try { value = -search(board, other(player), depth - 1, -beta, -alpha, ply + 1, context, extensions); }
      finally { setStone(board, move.cell, 0, context); }
      if (value > best) best = value;
      if (value > alpha) alpha = value;
      if (alpha >= beta) break;
    }
    if (context.table.size < 100000) context.table.set(key, {
      score: best, kind: best <= initialAlpha ? "upper" : best >= initialBeta ? "lower" : "exact"
    });
    return best;
  }

  function chooseMove(input, player, options) {
    if (!input || input.length !== CELLS || (player !== 1 && player !== 2)) throw new Error("Expected a 25x25 board and player 1 or 2");
    const board = Int8Array.from(input), opts = options || {};
    const maxMs = Math.max(20, Number.isFinite(opts.maxMs) ? opts.maxMs : 3000);
    const maxDepth = Math.max(1, Math.min(10, Number.isFinite(opts.maxDepth) ? opts.maxDepth : 9));
    if (maxMs >= 3000 && maxDepth >= 9) {
      const bookMove = openingMove(board, player);
      if (bookMove !== null) return bookMove;
    }
    const context = { deadline: Date.now() + maxMs, nodes: 0, timeout: {},
      scores: [null, new Int32Array(CELLS), new Int32Array(CELLS)],
      codes: [null, new Int16Array(CELLS * 4), new Int16Array(CELLS * 4)],
      hash1: 0, hash2: 0, table: new Map(), near: new Uint16Array(CELLS), stones: 0 };
    for (let i = 0; i < CELLS; i++) {
      if (board[i]) updateNear(context, i, 1);
      toggleHash(context, i, board[i]);
      context.scores[1][i] = initCodes(board, i, 1, context.codes[1]);
      context.scores[2][i] = initCodes(board, i, 2, context.codes[2]);
    }
    const data = moves(board, player, context);
    if (!data.list.length) return null;
    if (data.list.length === 1) return data.list[0].cell;
    if (data.myWins.length) return data.myWins[0];
    if (data.theirWins.length === 1) return data.theirWins[0];
    // When there are two immediate opponent wins, still choose a legal square.
    if (data.theirWins.length > 1) return data.theirWins[0];
    const forcedWin = data.list.find(move => move.attack >= FORCED_WIN);
    if (forcedWin) return forcedWin.cell;
    let best = data.list[0].cell;
    const rootMoves = data.list.slice(0, 16);
    for (let depth = 1; depth <= maxDepth; depth++) {
      let iterationBest = best, iterationScore = -INF, alpha = -INF;
      rootMoves.sort((a, b) => (a.cell === best ? -1 : b.cell === best ? 1 : b.rank - a.rank));
      try {
        for (const move of rootMoves) {
          if (Date.now() >= context.deadline) throw context.timeout;
          setStone(board, move.cell, player, context);
          let value;
          try { value = -search(board, other(player), depth - 1, -INF, -alpha, 1, context, 2); }
          finally { setStone(board, move.cell, 0, context); }
          if (value > iterationScore) { iterationScore = value; iterationBest = move.cell; }
          if (value > alpha) alpha = value;
        }
      } catch (error) {
        if (error !== context.timeout) throw error;
        break;
      }
      best = iterationBest;
      if (iterationScore >= WIN - 100) break;
    }
    return best;
  }

  return { chooseMove };
});

