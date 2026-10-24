package com.example.bzxandroidgames.game

import kotlin.random.Random

enum class GomokuMode { PVP, PVE }

enum class GomokuDifficulty(val title: String) {
    EASY("简单"),
    MEDIUM("中等"),
    HARD("困难")
}

/**
 * Freestyle gomoku on a 15x15 board: cells hold [EMPTY], [BLACK] or [WHITE], and the first
 * side to line up five or more stones in any direction wins.
 */
object Gomoku {
    const val SIZE = 15
    const val CELL_COUNT = SIZE * SIZE
    const val EMPTY = 0
    const val BLACK = 1
    const val WHITE = 2

    // Pattern tiers derived from classic open-source gomoku heuristics.
    private const val SCORE_FIVE = 10_000_000
    private const val SCORE_LIVE_FOUR = 1_000_000
    private const val SCORE_FOUR = 100_000
    private const val SCORE_LIVE_THREE = 50_000
    private const val SCORE_THREE = 5_000
    private const val SCORE_LIVE_TWO = 800
    private const val SCORE_TWO = 120
    private const val SCORE_ONE = 20

    private const val SEARCH_DEPTH = 4
    private const val ROOT_WIDTH = 12
    private const val NODE_WIDTH = 8
    private val WIN_SCORE = SCORE_FIVE * 100L

    private val DIRECTIONS = arrayOf(
        intArrayOf(1, 0), intArrayOf(0, 1), intArrayOf(1, 1), intArrayOf(1, -1)
    )

    fun emptyBoard(): List<Int> = List(CELL_COUNT) { EMPTY }

    fun opponent(player: Int): Int = if (player == BLACK) WHITE else BLACK

    fun isFull(board: List<Int>): Boolean = board.none { it == EMPTY }

    /**
     * All cells of the unbroken run through the stone at [index], in board order, when that
     * run reaches five stones; null otherwise.
     */
    fun winningLine(board: List<Int>, index: Int): List<Int>? {
        val player = board[index]
        require(player != EMPTY) { "no stone at $index" }
        val x = index % SIZE
        val y = index / SIZE
        DIRECTIONS.forEach { direction ->
            val backward = mutableListOf<Int>()
            val forward = mutableListOf<Int>()
            for (sign in intArrayOf(1, -1)) {
                var step = 1
                while (true) {
                    val cx = x + direction[0] * step * sign
                    val cy = y + direction[1] * step * sign
                    if (cx < 0 || cx >= SIZE || cy < 0 || cy >= SIZE) break
                    val cell = cy * SIZE + cx
                    if (board[cell] != player) break
                    (if (sign == 1) forward else backward) += cell
                    step++
                }
            }
            if (backward.size + forward.size + 1 >= 5) return backward.reversed() + listOf(index) + forward
        }
        return null
    }

    /**
     * Heuristic value of playing [player] on the empty [index]. For each of the four axes it
     * inspects every five-cell window through the cell; window counts map to pattern tiers
     * (five > double-four/live-four > four > live-three > ...), so jump shapes such as
     * 1-0-1-1-1 are recognised as fours, and two four-windows mean an unblockable live four.
     */
    fun evaluatePoint(board: List<Int>, index: Int, player: Int): Int {
        require(board[index] == EMPTY) { "cell $index is occupied" }
        val grid = IntArray(CELL_COUNT) { board[it] }
        return pointScore(grid, index, player)
    }

    /**
     * Picks the AI reply. Every level takes a finishing five and blocks the opponent's
     * immediate five; beyond that EASY is greedy with heavy noise and half-weighted defense,
     * MEDIUM plays the greedy attack+defense cell, and HARD searches four plies of
     * alpha-beta over candidates ordered by the same heuristic.
     */
    fun bestMove(
        board: List<Int>,
        player: Int,
        difficulty: GomokuDifficulty,
        random: Random = Random.Default
    ): Int {
        require(board.size == CELL_COUNT)
        val foe = opponent(player)
        val grid = IntArray(CELL_COUNT) { board[it] }
        val candidates = candidateCells(grid)
        if (candidates.isEmpty()) return CELL_COUNT / 2

        candidates.firstOrNull { pointScore(grid, it, player) >= SCORE_FIVE }?.let { return it }
        candidates.firstOrNull { pointScore(grid, it, foe) >= SCORE_FIVE }?.let { return it }

        return when (difficulty) {
            GomokuDifficulty.EASY -> pickEasy(grid, candidates, player, foe, random)
            GomokuDifficulty.MEDIUM -> pickGreedy(grid, candidates, player, foe)
            GomokuDifficulty.HARD -> pickSearch(grid, candidates, player, foe)
        }
    }

    private fun pointScore(grid: IntArray, index: Int, player: Int): Int {
        val x = index % SIZE
        val y = index / SIZE
        val foe = opponent(player)
        var total = 0
        for (direction in DIRECTIONS) {
            val dx = direction[0]
            val dy = direction[1]
            var five = false
            var fours = 0
            var threes = 0
            var twos = 0
            for (start in -4..0) {
                var count = 1
                var valid = true
                for (offset in start until start + 5) {
                    if (offset == 0) continue
                    val cx = x + dx * offset
                    val cy = y + dy * offset
                    if (cx < 0 || cx >= SIZE || cy < 0 || cy >= SIZE) {
                        valid = false
                        break
                    }
                    val value = grid[cy * SIZE + cx]
                    if (value == foe) {
                        valid = false
                        break
                    }
                    if (value == player) count++
                }
                if (!valid) continue
                when (count) {
                    5 -> five = true
                    4 -> fours++
                    3 -> threes++
                    2 -> twos++
                }
            }
            total += when {
                five -> SCORE_FIVE
                fours >= 2 -> SCORE_LIVE_FOUR
                fours == 1 -> SCORE_FOUR
                threes >= 2 -> SCORE_LIVE_THREE
                threes == 1 -> SCORE_THREE
                twos >= 2 -> SCORE_LIVE_TWO
                twos == 1 -> SCORE_TWO
                else -> SCORE_ONE
            }
        }
        return total
    }

    /** Empty cells within two intersections of any stone — the only sensible moves. */
    private fun candidateCells(grid: IntArray): List<Int> {
        val result = mutableListOf<Int>()
        var hasStone = false
        for (y in 0 until SIZE) {
            for (x in 0 until SIZE) {
                if (grid[y * SIZE + x] != EMPTY) {
                    hasStone = true
                    continue
                }
                var near = false
                search@ for (dy in -2..2) {
                    for (dx in -2..2) {
                        val cx = x + dx
                        val cy = y + dy
                        if (cx in 0 until SIZE && cy in 0 until SIZE && grid[cy * SIZE + cx] != EMPTY) {
                            near = true
                            break@search
                        }
                    }
                }
                if (near) result += y * SIZE + x
            }
        }
        if (!hasStone) return emptyList()
        return result
    }

    private fun pickEasy(
        grid: IntArray,
        candidates: List<Int>,
        player: Int,
        foe: Int,
        random: Random
    ): Int {
        val scored = candidates.map { cell ->
            val base = pointScore(grid, cell, player) + pointScore(grid, cell, foe) * 0.55
            cell to base * (0.55 + random.nextDouble() * 0.9)
        }.sortedByDescending { it.second }
        val pool = scored.take(minOf(4, scored.size))
        return pool[random.nextInt(pool.size)].first
    }

    private fun pickGreedy(grid: IntArray, candidates: List<Int>, player: Int, foe: Int): Int {
        var bestCell = candidates.first()
        var bestScore = Int.MIN_VALUE
        for (cell in candidates) {
            val score = pointScore(grid, cell, player) + pointScore(grid, cell, foe)
            if (score > bestScore) {
                bestScore = score
                bestCell = cell
            }
        }
        return bestCell
    }

    private fun pickSearch(grid: IntArray, candidates: List<Int>, player: Int, foe: Int): Int {
        val ordered = orderMoves(grid, candidates, player, foe).take(ROOT_WIDTH)
        var bestCell = ordered.first().first
        var alpha = Long.MIN_VALUE / 4
        val beta = Long.MAX_VALUE / 4
        for ((cell, _) in ordered) {
            val gain = pointScore(grid, cell, player)
            grid[cell] = player
            val score = if (gain >= SCORE_FIVE) WIN_SCORE
                else -negamax(grid, SEARCH_DEPTH - 1, foe, -beta, -alpha, 0L, gain.toLong())
            grid[cell] = EMPTY
            if (score > alpha) {
                alpha = score
                bestCell = cell
            }
        }
        return bestCell
    }

    /**
     * Negamax with alpha-beta. [mySum]/[foeSum] accumulate each side's placement gains so
     * leaves evaluate without rescanning the board.
     */
    private fun negamax(
        grid: IntArray,
        depth: Int,
        toMove: Int,
        alphaIn: Long,
        betaIn: Long,
        mySum: Long,
        foeSum: Long
    ): Long {
        if (depth == 0) return mySum - foeSum
        val foe = opponent(toMove)
        val moves = orderMoves(grid, candidateCells(grid), toMove, foe).take(NODE_WIDTH)
        if (moves.isEmpty()) return 0L
        var best = Long.MIN_VALUE / 4
        var alpha = alphaIn
        for ((cell, _) in moves) {
            val gain = pointScore(grid, cell, toMove)
            if (gain >= SCORE_FIVE) return WIN_SCORE - (SEARCH_DEPTH - depth)
            grid[cell] = toMove
            val score = -negamax(grid, depth - 1, foe, -betaIn, -alpha, foeSum, mySum + gain)
            grid[cell] = EMPTY
            if (score > best) {
                best = score
                if (score > alpha) alpha = score
                if (alpha >= betaIn) break
            }
        }
        return best
    }

    private fun orderMoves(
        grid: IntArray,
        cells: List<Int>,
        player: Int,
        foe: Int
    ): List<Pair<Int, Int>> =
        cells.map { cell -> cell to pointScore(grid, cell, player) + pointScore(grid, cell, foe) }
            .sortedByDescending { it.second }
}
