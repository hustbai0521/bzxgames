// Frozen original hard engine, widened from 15 to 25 for comparison.
  const G = {
    SIZE: 25, EMPTY: 0, BLACK: 1, WHITE: 2,
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
    if (difficulty === "EXTREME") return BZX.GomokuExtreme.chooseMove(board, player);
    const foe = opponent(player);
    const grid = Int32Array.from(board);
    const candidates = candidateCells(grid);
    if (!candidates.length) return Math.floor(cellCount / 2);
    for (const c of candidates) if (pointScore(grid, c, player) >= G.SCORE_FIVE) return c;
    for (const c of candidates) if (pointScore(grid, c, foe) >= G.SCORE_FIVE) return c;
    if (difficulty === "EASY") return pickEasy(grid, candidates, player, foe);
    return pickSearch(grid, candidates, player, foe, difficulty === "MEDIUM" ? MEDIUM_SEARCH : HARD_SEARCH);
  }


module.exports = { bestMove };

