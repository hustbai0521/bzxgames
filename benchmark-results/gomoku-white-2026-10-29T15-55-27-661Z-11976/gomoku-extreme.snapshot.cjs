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
  const FOUR = 120000, THREAT = 180000;
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
    // White replies for common off-centre black first moves (one entry per
    // dihedral class, generated with 25-second searches), plus a few common
    // black second moves against the centre reply 287.
    { black: [313], white: [], move: 288 },
    { black: [338], white: [], move: 313 },
    { black: [314], white: [], move: 313 },
    { black: [339], white: [], move: 364 },
    { black: [364], white: [], move: 363 },
    { black: [315], white: [], move: 314 },
    { black: [340], white: [], move: 339 },
    { black: [316], white: [], move: 315 },
    { black: [312, 362], white: [287], move: 286 },
    { black: [312, 314], white: [287], move: 311 },
    { black: [312, 310], white: [287], move: 288 },
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
    if (context.candList) updateCandidates(board, context, cell);
  }

  // Keep the frontier as an unordered pool alongside the near[] counts. Only
  // cells whose neighbourhood count crossed 0↔1 change candidacy, and the
  // mover's own square flips with its occupancy. The public candidates() scan
  // remains the reference for contexts without this pool (the tests).
  function updateCandidates(board, context, cell) {
    const list = context.candList, pos = context.candPos;
    const x = cell % SIZE, y = (cell / SIZE) | 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || xx >= SIZE || yy < 0 || yy >= SIZE) continue;
      const n = yy * SIZE + xx;
      const wanted = !board[n] && context.near[n] > 0;
      const at = pos[n];
      if (wanted && at < 0) { pos[n] = context.candCount; list[context.candCount++] = n; }
      else if (!wanted && at >= 0) {
        const last = list[--context.candCount];
        list[at] = last; pos[last] = at; pos[n] = -1;
      }
    }
  }

  // Compact, allocation-free move data for the search hot path. Every slot is
  // fully re-initialised by collectMoves, and the search is strictly
  // synchronous, so module-level slots can be reused across calls. Ordered
  // lists keep only the bounded prefixes their consumers read: the previous
  // implementation sorted every candidate and sliced; these lists preserve the
  // exact same total order (rank descending, cell ascending) for those prefixes.
  const MAIN_CAP = 16, FORCE_CAP = 20, FOUR_CAP = 8, THREAT_CAP = 3;
  function makeSlot() {
    return {
      nCand: 0, cand: new Int32Array(CELLS),
      mainK: new Float64Array(MAIN_CAP), mainC: new Int32Array(MAIN_CAP), mainSize: 0,
      forceK: new Float64Array(FORCE_CAP), forceC: new Int32Array(FORCE_CAP), forceSize: 0,
      fourK: new Float64Array(FOUR_CAP), fourC: new Int32Array(FOUR_CAP), fourSize: 0,
      threatK: new Float64Array(THREAT_CAP), threatC: new Int32Array(THREAT_CAP), threatSize: 0,
      nForcing: 0, nMyWins: 0, myWins: new Int32Array(64),
      nTheirWins: 0, theirWins: new Int32Array(64),
      hasForced: false, hasDefenseForced: false,
      myBest: 0, mySecond: 0, theirBest: 0, theirSecond: 0, evaluation: 0,
    };
  }
  const searchSlots = [], forcingSlots = [], scratchSlots = [];
  function searchSlot(ply) {
    while (searchSlots.length <= ply) searchSlots.push(makeSlot());
    return searchSlots[ply];
  }
  function forcingSlot(level) {
    while (forcingSlots.length <= level) forcingSlots.push(makeSlot());
    return forcingSlots[level];
  }
  function scratchSlot(level) {
    while (scratchSlots.length <= level) scratchSlots.push(makeSlot());
    return scratchSlots[level];
  }
  function insertMove(keys, cells, size, cap, rank, cell) {
    let pos = 0;
    while (pos < size && (keys[pos] > rank || (keys[pos] === rank && cells[pos] < cell))) pos++;
    if (pos >= cap) return size;
    for (let i = size < cap ? size : cap - 1; i > pos; i--) { keys[i] = keys[i - 1]; cells[i] = cells[i - 1]; }
    keys[pos] = rank; cells[pos] = cell;
    return size < cap ? size + 1 : size;
  }
  function collectMoves(board, player, context, out) {
    const foe = other(player);
    const myScores = context.scores[player], theirScores = context.scores[foe];
    let n = 0;
    if (context.candList) {
      const pool = context.candList;
      for (let i = 0, size = context.candCount; i < size; i++) out.cand[n++] = pool[i];
      if (!n) out.cand[n++] = 312;
    } else if (!context.stones) out.cand[n++] = 312;
    else for (let i = 0; i < CELLS; i++) if (!board[i] && context.near[i]) out.cand[n++] = i;
    out.nCand = n;
    out.mainSize = out.forceSize = out.fourSize = out.threatSize = 0;
    out.nForcing = out.nMyWins = out.nTheirWins = 0;
    out.hasForced = out.hasDefenseForced = false;
    let myBest = 0, mySecond = 0, theirBest = 0, theirSecond = 0;
    for (let j = 0; j < n; j++) {
      const cell = out.cand[j];
      const attack = myScores[cell], defense = theirScores[cell];
      if (attack >= WIN) out.myWins[out.nMyWins++] = cell;
      if (defense >= WIN) out.theirWins[out.nTheirWins++] = cell;
      if (attack > myBest) { mySecond = myBest; myBest = attack; }
      else if (attack > mySecond) mySecond = attack;
      if (defense > theirBest) { theirSecond = theirBest; theirBest = defense; }
      else if (defense > theirSecond) theirSecond = defense;
      const x = cell % SIZE, y = (cell / SIZE) | 0;
      const rank = attack + defense * 1.05 + (24 - Math.abs(x - 12) - Math.abs(y - 12));
      out.mainSize = insertMove(out.mainK, out.mainC, out.mainSize, MAIN_CAP, rank, cell);
      if (attack >= FOUR || defense >= FOUR) {
        out.nForcing++;
        out.forceSize = insertMove(out.forceK, out.forceC, out.forceSize, FORCE_CAP, rank, cell);
        if (attack >= FOUR) {
          out.fourSize = insertMove(out.fourK, out.fourC, out.fourSize, FOUR_CAP, rank, cell);
          if (attack >= FORCED_WIN) out.hasForced = true;
          else if (attack >= THREAT)
            out.threatSize = insertMove(out.threatK, out.threatC, out.threatSize, THREAT_CAP, rank, cell);
        }
      }
      if (defense >= FORCED_WIN) out.hasDefenseForced = true;
    }
    out.myBest = myBest; out.mySecond = mySecond;
    out.theirBest = theirBest; out.theirSecond = theirSecond;
    out.evaluation = myBest + mySecond * 0.12 - theirBest * 1.08 - theirSecond * 0.13;
    // Winning squares stay ascending by cell whatever order the pool had.
    for (const [arr, count] of [[out.myWins, out.nMyWins], [out.theirWins, out.nTheirWins]]) {
      for (let i = 1; i < count; i++) {
        const v = arr[i];
        let k = i - 1;
        while (k >= 0 && arr[k] > v) { arr[k + 1] = arr[k]; k--; }
        arr[k + 1] = v;
      }
    }
    return out;
  }
  // Accept the public object-shaped move list as compact data. Used when the
  // tests (or a caller holding a full list) enter the threat searches directly.
  function normalizeMoves(data, out) {
    out.mainSize = out.forceSize = out.fourSize = out.threatSize = 0;
    out.nForcing = 0;
    out.nMyWins = 0; for (const cell of data.myWins) out.myWins[out.nMyWins++] = cell;
    out.nTheirWins = 0; for (const cell of data.theirWins) out.theirWins[out.nTheirWins++] = cell;
    out.hasForced = out.hasDefenseForced = false;
    out.nDefOpen = 0;
    let myBest = 0, mySecond = 0, theirBest = 0, theirSecond = 0;
    for (const move of data.list) {
      const cell = move.cell, attack = move.attack, defense = move.defense, rank = move.rank;
      if (attack > myBest) { mySecond = myBest; myBest = attack; }
      else if (attack > mySecond) mySecond = attack;
      if (defense > theirBest) { theirSecond = theirBest; theirBest = defense; }
      else if (defense > theirSecond) theirSecond = defense;
      out.mainSize = insertMove(out.mainK, out.mainC, out.mainSize, MAIN_CAP, rank, cell);
      if (attack >= FOUR || defense >= FOUR) {
        out.nForcing++;
        out.forceSize = insertMove(out.forceK, out.forceC, out.forceSize, FORCE_CAP, rank, cell);
        if (attack >= FOUR) {
          out.fourSize = insertMove(out.fourK, out.fourC, out.fourSize, FOUR_CAP, rank, cell);
          if (attack >= FORCED_WIN) out.hasForced = true;
          else if (attack >= THREAT)
            out.threatSize = insertMove(out.threatK, out.threatC, out.threatSize, THREAT_CAP, rank, cell);
        }
      }
      if (defense >= FORCED_WIN) out.hasDefenseForced = true;
    }
    out.myBest = myBest; out.mySecond = mySecond;
    out.theirBest = theirBest; out.theirSecond = theirSecond;
    out.evaluation = data.evaluation;
    out.nCand = -1;
    return out;
  }
  function copyCompact(src, dst) {
    dst.nCand = src.nCand;
    dst.mainSize = src.mainSize;
    for (let i = 0; i < src.mainSize; i++) { dst.mainK[i] = src.mainK[i]; dst.mainC[i] = src.mainC[i]; }
    dst.forceSize = src.forceSize;
    for (let i = 0; i < src.forceSize; i++) { dst.forceK[i] = src.forceK[i]; dst.forceC[i] = src.forceC[i]; }
    dst.fourSize = src.fourSize;
    for (let i = 0; i < src.fourSize; i++) { dst.fourK[i] = src.fourK[i]; dst.fourC[i] = src.fourC[i]; }
    dst.threatSize = src.threatSize;
    for (let i = 0; i < src.threatSize; i++) { dst.threatK[i] = src.threatK[i]; dst.threatC[i] = src.threatC[i]; }
    dst.nForcing = src.nForcing;
    dst.nMyWins = src.nMyWins;
    for (let i = 0; i < src.nMyWins; i++) dst.myWins[i] = src.myWins[i];
    dst.nTheirWins = src.nTheirWins;
    for (let i = 0; i < src.nTheirWins; i++) dst.theirWins[i] = src.theirWins[i];
    dst.hasForced = src.hasForced; dst.hasDefenseForced = src.hasDefenseForced;
    dst.myBest = src.myBest; dst.mySecond = src.mySecond;
    dst.theirBest = src.theirBest; dst.theirSecond = src.theirSecond;
    dst.evaluation = src.evaluation;
    return dst;
  }

  // The public move list still materialises one object per candidate. Only the
  // root and the tests consume it; the search hot path uses collectMoves.
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

  // Fixed-size transposition table keyed by the two Zobrist hashes. One hash
  // picks the bucket, the other verifies it; player, depth and extensions are
  // stored alongside so entries for different search shapes never mix. The
  // stored best move re-orders later searches of the same position.
  const TT_BITS = 20, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
  const ttLock = new Int32Array(TT_SIZE), ttMeta = new Int32Array(TT_SIZE), ttScore = new Int32Array(TT_SIZE);
  const ttMove = new Int32Array(TT_SIZE);

  // Two killer moves per ply. Cut-off moves from earlier sibling branches are
  // searched before the static order; they are only ordering hints, so stale
  // entries are simply re-validated against the current board.
  const KILLER_PLIES = 24;
  const killers = new Int32Array(KILLER_PLIES * 2);

  // Follow a chain of forcing fours. The defender must either win immediately
  // or occupy the unique winning square, which makes these lines much cheaper
  // to search than arbitrary moves. A positive result is a proof, not a guess.
  function forcingWin(board, player, data, remaining, context) {
    if (!remaining) return false;
    if (++context.nodes % 32 === 0 && Date.now() >= context.deadline) throw context.timeout;
    // Copy the caller's data into a per-level slot: the recursive calls below
    // reuse the shared scratch slots, so the outer lists must stay intact.
    const slot = data.nCand === undefined
      ? normalizeMoves(data, forcingSlot(8 - remaining))
      : copyCompact(data, forcingSlot(8 - remaining));
    if (slot.nMyWins) return true;
    if (slot.nTheirWins > 1) return false;
    if (!slot.nTheirWins && slot.hasForced) return true;
    const fours = Math.min(slot.fourSize, FOUR_CAP);
    for (let i = 0; i < fours; i++) {
      const cell = slot.fourC[i];
      if (slot.nTheirWins && cell !== slot.theirWins[0]) continue;
      setStone(board, cell, player, context);
      try {
        const response = collectMoves(board, other(player), context, scratchSlot(9));
        if (response.nMyWins) continue;
        if (response.nTheirWins > 1) return true;
        if (response.nTheirWins !== 1) continue;
        const block = response.theirWins[0];
        setStone(board, block, other(player), context);
        try {
          const next = collectMoves(board, player, context, scratchSlot(9));
          if (forcingWin(board, player, next, remaining - 1, context)) return true;
        } finally { setStone(board, block, 0, context); }
      } finally { setStone(board, cell, 0, context); }
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
      const slot = scratchSlot(10);
      for (let reply = 0; reply < CELLS; reply++) {
        if (board[reply]) continue;
        hasReply = true;
        if (++context.nodes % 16 === 0 && Date.now() >= context.deadline) throw context.timeout;
        if (context.scores[foe][reply] >= WIN) return false;
        setStone(board, reply, foe, context);
        try {
          const data = collectMoves(board, player, context, slot);
          if (data.nMyWins) continue;
          if (data.nTheirWins > 1) return false;
          if (data.nTheirWins === 1) {
            if (context.scores[player][data.theirWins[0]] < FORCED_WIN) return false;
          } else if (!data.hasForced) return false;
        } finally { setStone(board, reply, 0, context); }
      }
      // Filling the last square without a five is a draw, not a proof of win.
      return hasReply;
    } finally { setStone(board, move, 0, context); }
  }

  function search(board, player, depth, alpha, beta, ply, context, extensions) {
    if (++context.nodes % 32 === 0 && Date.now() >= context.deadline) throw context.timeout;
    const index = (context.hash1 ^ Math.imul(context.hash2, 0x9e3779b1)) & TT_MASK;
    const depthExt = (depth << 3) | (extensions << 8);
    const oldMeta = ttMeta[index];
    if (oldMeta && ttLock[index] === context.hash2 && (oldMeta & ~7) === depthExt) {
      const score = ttScore[index], kind = oldMeta & 7;
      if (kind === 3) return score;
      if (kind === 2) { if (score > alpha) alpha = score; }
      else if (score < beta) beta = score;
      if (alpha >= beta) return score;
    }
    const initialAlpha = alpha, initialBeta = beta;
    const data = searchSlot(ply);
    collectMoves(board, player, context, data);
    if (data.nMyWins) return WIN - ply;
    if (data.nTheirWins > 1) return -WIN + ply + 1;
    if (!data.nTheirWins && data.hasForced) return WIN - ply - 2;
    if (!data.nCand) return 0;
    if (depth <= 0 && !data.nTheirWins) {
      if (data.fourSize && forcingWin(board, player, data, 8, context)) return WIN - ply - 12;
      // At shallow horizons, verify up to three plausible double-threat
      // attacks against every defender reply rather than guessing from shape.
      if (ply <= 3) {
        let checked = 0;
        for (let i = 0; i < data.threatSize && checked < 3; i++) {
          if (shortThreatWin(board, player, data.threatC[i], context)) return WIN - ply - 6;
          checked++;
        }
      }
      // Do not stop immediately before the opponent can create an open four
      // or double four: examine defensive replies first to reduce horizon bias.
      if (extensions > 0 && data.hasDefenseForced) extensions--;
      else return data.evaluation;
    }
    let listCells, listN;
    if (data.nTheirWins === 1) {
      listCells = data.theirWins; listN = 1;
    } else {
      // Narrow deeper nodes while preserving every forcing four.
      const width = ply <= 1 ? 10 : ply <= 3 ? 7 : 5;
      if (data.nForcing > width) { listCells = data.forceC; listN = Math.min(data.forceSize, FORCE_CAP); }
      else { listCells = data.mainC; listN = Math.min(data.mainSize, width); }
    }
    let best = -INF, cut = false, searched = 0, bestCell = 0;
    const foeScores = context.scores[other(player)];
    const canKill = ply < KILLER_PLIES && data.nTheirWins === 0;
    // Try the transposition move, then killers, then the static list. Each
    // source is probed with a null window once alpha has an incumbent value;
    // only improvements get a full-window re-search. Late quiet moves are
    // reduced by one ply first and re-searched in full when the reduction
    // might have hidden something better.
    if (canKill) {
      const tc = ttMove[index];
      if (tc > 0 && !board[tc] && context.near[tc]) {
        setStone(board, tc, player, context);
        let value;
        try {
          value = -search(board, other(player), depth - 1, searched ? -alpha - 1 : -beta, -alpha, ply + 1, context, extensions);
          if (value > alpha && value < beta)
            value = -search(board, other(player), depth - 1, -beta, -alpha, ply + 1, context, extensions);
        } finally { setStone(board, tc, 0, context); }
        searched++;
        if (value > best) { best = value; bestCell = tc; }
        if (value > alpha) alpha = value;
        if (alpha >= beta) {
          cut = true;
          bestCell = tc;
        }
      }
    }
    if (canKill) for (let k = 0; k < 2 && !cut; k++) {
      const kc = killers[ply * 2 + k];
      if (!kc || board[kc] || !context.near[kc] || kc === ttMove[index] ||
          context.scores[other(player)][kc] >= WIN) continue;
      setStone(board, kc, player, context);
      let value;
      try {
        value = -search(board, other(player), depth - 1, alpha > -INF ? -alpha - 1 : -beta, -alpha, ply + 1, context, extensions);
        if (value > alpha && value < beta)
          value = -search(board, other(player), depth - 1, -beta, -alpha, ply + 1, context, extensions);
      } finally { setStone(board, kc, 0, context); }
      searched++;
      if (value > best) { best = value; bestCell = kc; }
      if (value > alpha) alpha = value;
      if (alpha >= beta) {
        cut = true;
        bestCell = kc;
        if (kc !== killers[ply * 2]) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = kc; }
      }
    }
    for (let i = 0; i < listN && !cut; i++) {
      const cell = listCells[i];
      if (canKill && (cell === ttMove[index] || cell === killers[ply * 2] || cell === killers[ply * 2 + 1])) continue;
      setStone(board, cell, player, context);
      let value;
      try {
        const quiet = context.scores[player][cell] < FOUR && foeScores[cell] < FOUR;
        const reduced = searched >= 4 && depth >= 3 && quiet ? 1 : 0;
        value = -search(board, other(player), depth - 1 - reduced, searched ? -alpha - 1 : -beta, -alpha, ply + 1, context, extensions);
        if (reduced && value > alpha)
          value = -search(board, other(player), depth - 1, searched ? -alpha - 1 : -beta, -alpha, ply + 1, context, extensions);
        if (value > alpha && value < beta)
          value = -search(board, other(player), depth - 1, -beta, -alpha, ply + 1, context, extensions);
      } finally { setStone(board, cell, 0, context); }
      searched++;
      if (value > best) { best = value; bestCell = cell; }
      if (value > alpha) alpha = value;
      if (alpha >= beta) { cut = true; bestCell = cell; }
    }
    if (!oldMeta || (oldMeta & ~7) === depthExt || depth >= ((oldMeta >> 3) & 31)) {
      ttLock[index] = context.hash2;
      ttMeta[index] = (best <= initialAlpha ? 1 : best >= initialBeta ? 2 : 3) | depthExt;
      ttScore[index] = best;
      ttMove[index] = bestCell;
    }
    return best;
  }

  function chooseMove(input, player, options) {
    if (!input || input.length !== CELLS || (player !== 1 && player !== 2)) throw new Error("Expected a 25x25 board and player 1 or 2");
    const board = Int8Array.from(input), opts = options || {};
    const maxMs = Math.max(20, Number.isFinite(opts.maxMs) ? opts.maxMs : 3000);
    const maxDepth = Math.max(1, Math.min(12, Number.isFinite(opts.maxDepth) ? opts.maxDepth : 12));
    const startedAt = Date.now();
    if (maxMs >= 3000 && maxDepth >= 9) {
      const bookMove = openingMove(board, player);
      if (bookMove !== null) return bookMove;
    }
    const context = { deadline: startedAt + maxMs, nodes: 0, timeout: {},
      scores: [null, new Int32Array(CELLS), new Int32Array(CELLS)],
      codes: [null, new Int16Array(CELLS * 4), new Int16Array(CELLS * 4)],
      hash1: 0, hash2: 0, near: new Uint16Array(CELLS), stones: 0,
      candList: new Int32Array(CELLS), candPos: new Int32Array(CELLS).fill(-1), candCount: 0 };
    for (let i = 0; i < CELLS; i++) {
      if (board[i]) updateNear(context, i, 1);
      toggleHash(context, i, board[i]);
      context.scores[1][i] = initCodes(board, i, 1, context.codes[1]);
      context.scores[2][i] = initCodes(board, i, 2, context.codes[2]);
    }
    for (let i = 0; i < CELLS; i++) {
      if (!board[i] && context.near[i]) {
        context.candPos[i] = context.candCount;
        context.candList[context.candCount++] = i;
      }
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
    const rootMoves = data.list.slice(0, 32);
    let depthReached = 0;
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
      depthReached = depth;
      if (iterationScore >= WIN - 100) break;
    }
    if (opts.stats) {
      opts.stats.nodes = context.nodes;
      opts.stats.ms = Date.now() - startedAt;
      opts.stats.depth = depthReached;
    }
    return best;
  }

  return { chooseMove };
});
