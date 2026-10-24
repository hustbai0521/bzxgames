package com.example.bzxandroidgames.game

import kotlin.random.Random

enum class MinesweeperStatus { PLAYING, WON, LOST }

/**
 * Board size and mine count per difficulty; the mine densities climb like the classic
 * single-player ladder (12.5% -> 15.6% -> 16.7%) while every board still fits a phone screen.
 */
enum class MinesweeperDifficulty(val title: String, val rows: Int, val cols: Int, val mines: Int) {
    EASY("简单", rows = 10, cols = 8, mines = 10),
    MEDIUM("中等", rows = 16, cols = 12, mines = 30),
    HARD("困难", rows = 20, cols = 15, mines = 50);

    val cells: Int get() = rows * cols
}

/**
 * One square of the field: [mine] is fixed once placed, the rest evolve as the player acts.
 * [exploded] marks the mine the losing click hit, [wrongFlag] a flag that hid no mine.
 */
data class MinesweeperCell(
    val mine: Boolean = false,
    val revealed: Boolean = false,
    val flagged: Boolean = false,
    val adjacent: Int = 0,
    val exploded: Boolean = false,
    val wrongFlag: Boolean = false
)

/** Result of one reveal; [opened] lists cells that became revealed this move, for animations. */
data class MinesweeperMove(
    val board: List<MinesweeperCell>,
    val status: MinesweeperStatus,
    val opened: List<Int> = emptyList()
)

/**
 * Classic minesweeper. Mines are laid after the first reveal, keeping a clear 3x3 around it
 * so every game opens with a breath of empty ground.
 */
object Minesweeper {
    fun emptyBoard(level: MinesweeperDifficulty): List<MinesweeperCell> =
        List(level.cells) { MinesweeperCell() }

    fun neighbors(index: Int, level: MinesweeperDifficulty): List<Int> {
        val x = index % level.cols
        val y = index / level.cols
        val result = mutableListOf<Int>()
        for (dy in -1..1) for (dx in -1..1) {
            if (dx == 0 && dy == 0) continue
            val nx = x + dx
            val ny = y + dy
            if (nx in 0 until level.cols && ny in 0 until level.rows) result += ny * level.cols + nx
        }
        return result
    }

    /** Lays exactly [MinesweeperDifficulty.mines] mines, none inside the safe zone around [safeIndex]. */
    fun placeMines(
        board: List<MinesweeperCell>,
        safeIndex: Int,
        level: MinesweeperDifficulty,
        random: Random
    ): List<MinesweeperCell> {
        val banned = neighbors(safeIndex, level) + safeIndex
        val candidates = (0 until level.cells).filter { it !in banned }
        val mines = candidates.shuffled(random).take(level.mines).toSet()
        return board.mapIndexed { index, cell ->
            if (index in mines) cell.copy(mine = true)
            else cell.copy(adjacent = neighbors(index, level).count { it in mines })
        }
    }

    /** Flags or unflags one unrevealed cell; flags never block revealing through other calls. */
    fun toggleFlag(board: List<MinesweeperCell>, index: Int): List<MinesweeperCell> {
        val cell = board[index]
        if (cell.revealed) return board
        val next = board.toMutableList()
        next[index] = cell.copy(flagged = !cell.flagged)
        return next
    }

    fun flagsUsed(board: List<MinesweeperCell>): Int = board.count { it.flagged }

    /**
     * Reveals [index]: laying mines on the first real move, flooding from empty ground, and when
     * a satisfied number is hit, chording its remaining neighbors open.
     */
    fun reveal(
        board: List<MinesweeperCell>,
        index: Int,
        level: MinesweeperDifficulty,
        random: Random
    ): MinesweeperMove {
        require(index in 0 until level.cells)
        val cell = board[index]
        if (cell.flagged || cell.revealed) {
            // Chord: a fully-flagged number opens its other neighbors in one tap.
            return if (cell.revealed && cell.adjacent > 0 &&
                neighbors(index, level).count { board[it].flagged } == cell.adjacent
            ) {
                chord(board, index, level, random)
            } else MinesweeperMove(board, statusOf(board))
        }
        var field = board
        if (field.none { it.mine }) field = placeMines(field, index, level, random)
        if (cell.mine) return MinesweeperMove(loseAt(field, index), MinesweeperStatus.LOST)
        val opened = mutableListOf<Int>()
        val next = field.toMutableList()
        val queue = ArrayDeque(listOf(index))
        while (queue.isNotEmpty()) {
            val current = queue.removeFirst()
            val target = next[current]
            if (target.revealed || target.flagged || target.mine) continue
            next[current] = target.copy(revealed = true)
            opened += current
            if (target.adjacent == 0) neighbors(current, level).forEach { queue += it }
        }
        val won = isWon(next)
        val status = if (won) MinesweeperStatus.WON else MinesweeperStatus.PLAYING
        return MinesweeperMove(if (won) winAt(next) else next, status, opened)
    }

    /** A satisfied number may hide mis-flagged neighbors; opening them can still lose the game. */
    private fun chord(
        board: List<MinesweeperCell>,
        index: Int,
        level: MinesweeperDifficulty,
        random: Random
    ): MinesweeperMove {
        val targets = neighbors(index, level).filter { !board[it].flagged && !board[it].revealed }
        if (targets.isEmpty()) return MinesweeperMove(board, statusOf(board))
        if (targets.any { board[it].mine }) {
            val hit = targets.first { board[it].mine }
            return MinesweeperMove(loseAt(board, hit), MinesweeperStatus.LOST)
        }
        var next = board
        var opened = mutableListOf<Int>()
        targets.forEach { target ->
            val move = reveal(next, target, level, random)
            next = move.board
            opened += move.opened
        }
        val won = isWon(next)
        val status = if (won) MinesweeperStatus.WON else MinesweeperStatus.PLAYING
        return MinesweeperMove(if (won) winAt(next) else next, status, opened)
    }

    /** Losing shows every mine and stripes the flags that lied. */
    private fun loseAt(board: List<MinesweeperCell>, hit: Int): List<MinesweeperCell> =
        board.mapIndexed { index, cell ->
            when {
                index == hit -> cell.copy(revealed = true, exploded = true)
                cell.mine && !cell.flagged -> cell.copy(revealed = true)
                !cell.mine && cell.flagged -> cell.copy(wrongFlag = true)
                else -> cell
            }
        }

    /** Winning flags the remaining mines, the classic closing flourish. */
    private fun winAt(board: List<MinesweeperCell>): List<MinesweeperCell> =
        board.map { if (it.mine && !it.flagged) it.copy(flagged = true) else it }

    fun isWon(board: List<MinesweeperCell>): Boolean =
        board.all { it.mine || it.revealed }

    private fun statusOf(board: List<MinesweeperCell>): MinesweeperStatus =
        if (isWon(board)) MinesweeperStatus.WON else MinesweeperStatus.PLAYING
}
