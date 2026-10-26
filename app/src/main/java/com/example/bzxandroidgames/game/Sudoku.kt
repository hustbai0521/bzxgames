package com.example.bzxandroidgames.game

import kotlin.random.Random

enum class SudokuDifficulty(val title: String, val caption: String, val clues: Int) {
    EASY("简单", "提示数较多", 40),
    MEDIUM("中等", "稳扎稳打", 31),
    HARD("困难", "深呼吸再来", 25);

    companion object {
        fun fromStorage(key: String?): SudokuDifficulty = entries.firstOrNull { it.name == key } ?: EASY
    }
}

enum class SudokuStatus { READY, GENERATING, PLAYING, DONE }

data class SudokuEdit(val index: Int, val value: Int, val notes: Int)

data class SudokuGame(
    val difficulty: SudokuDifficulty = SudokuDifficulty.EASY,
    val puzzle: List<Int> = List(81) { 0 },
    val cells: List<Int> = puzzle,
    val notes: List<Int> = List(81) { 0 },
    val selected: Int? = null,
    val noteMode: Boolean = false,
    val elapsedSeconds: Int = 0,
    val status: SudokuStatus = SudokuStatus.READY,
    val history: List<SudokuEdit> = emptyList()
)

/** Random full grid, followed by clue removal with an MRV uniqueness check. */
object Sudoku {
    fun generate(difficulty: SudokuDifficulty, random: Random = Random.Default): List<Int> {
        val grid = IntArray(81)
        val rows = IntArray(9)
        val columns = IntArray(9)
        val boxes = IntArray(9)
        fun fill(index: Int): Boolean {
            if (index == 81) return true
            val row = index / 9
            val column = index % 9
            val box = boxAt(index)
            val used = rows[row] or columns[column] or boxes[box]
            for (digit in (1..9).shuffled(random)) {
                val bit = 1 shl (digit - 1)
                if (used and bit != 0) continue
                grid[index] = digit
                rows[row] = rows[row] or bit
                columns[column] = columns[column] or bit
                boxes[box] = boxes[box] or bit
                if (fill(index + 1)) return true
                grid[index] = 0
                rows[row] = rows[row] xor bit
                columns[column] = columns[column] xor bit
                boxes[box] = boxes[box] xor bit
            }
            return false
        }
        check(fill(0))
        var clues = 81
        val deadline = System.nanoTime() + 1_600_000_000L
        for (index in grid.indices.shuffled(random)) {
            if (clues <= difficulty.clues || System.nanoTime() > deadline) break
            val previous = grid[index]
            grid[index] = 0
            if (countSolutions(grid.toList()) == 1) clues-- else grid[index] = previous
        }
        return grid.toList()
    }

    /** Stops at [limit] solutions and never mutates the caller's board. */
    fun countSolutions(cells: List<Int>, limit: Int = 2): Int {
        if (cells.size != 81 || limit <= 0 || cells.any { it !in 0..9 }) return 0
        val grid = cells.toIntArray()
        val rows = IntArray(9)
        val columns = IntArray(9)
        val boxes = IntArray(9)
        for (index in grid.indices) {
            if (grid[index] == 0) continue
            val row = index / 9
            val column = index % 9
            val box = boxAt(index)
            val bit = 1 shl (grid[index] - 1)
            if ((rows[row] or columns[column] or boxes[box]) and bit != 0) return 0
            rows[row] = rows[row] or bit
            columns[column] = columns[column] or bit
            boxes[box] = boxes[box] or bit
        }
        var count = 0
        fun search() {
            if (count >= limit) return
            var best = -1
            var bestMask = 0
            var fewest = 10
            for (index in grid.indices) {
                if (grid[index] != 0) continue
                val mask = (rows[index / 9] or columns[index % 9] or boxes[boxAt(index)]).inv() and 511
                val available = Integer.bitCount(mask)
                if (available == 0) return
                if (available < fewest) {
                    best = index
                    bestMask = mask
                    fewest = available
                    if (available == 1) break
                }
            }
            if (best == -1) { count++; return }
            val row = best / 9
            val column = best % 9
            val box = boxAt(best)
            var remaining = bestMask
            while (remaining != 0 && count < limit) {
                val bit = remaining and -remaining
                remaining = remaining xor bit
                grid[best] = Integer.numberOfTrailingZeros(bit) + 1
                rows[row] = rows[row] or bit
                columns[column] = columns[column] or bit
                boxes[box] = boxes[box] or bit
                search()
                grid[best] = 0
                rows[row] = rows[row] xor bit
                columns[column] = columns[column] xor bit
                boxes[box] = boxes[box] xor bit
            }
        }
        search()
        return count
    }

    fun peers(first: Int, second: Int): Boolean =
        first / 9 == second / 9 || first % 9 == second % 9 || boxAt(first) == boxAt(second)

    fun conflicts(cells: List<Int>): Set<Int> = cells.indices.filterTo(mutableSetOf()) { index ->
        cells[index] != 0 && cells.indices.any { other ->
            index != other && cells[index] == cells[other] && peers(index, other)
        }
    }

    fun select(game: SudokuGame, index: Int): SudokuGame =
        if (game.status == SudokuStatus.PLAYING && index in 0..80) game.copy(selected = index) else game

    fun input(game: SudokuGame, digit: Int): SudokuGame {
        val index = editableIndex(game) ?: return game
        if (digit !in 1..9) return game
        if (game.noteMode) {
            if (game.cells[index] != 0) return game
            return rememberEdit(game, index).copy(notes = game.notes.toMutableList().also {
                it[index] = it[index] xor (1 shl (digit - 1))
            })
        }
        val cells = game.cells.toMutableList().also { it[index] = if (it[index] == digit) 0 else digit }
        val done = cells.none { it == 0 } && conflicts(cells).isEmpty()
        return rememberEdit(game, index).copy(
            cells = cells,
            notes = game.notes.toMutableList().also { it[index] = 0 },
            status = if (done) SudokuStatus.DONE else SudokuStatus.PLAYING
        )
    }

    fun erase(game: SudokuGame): SudokuGame {
        val index = editableIndex(game) ?: return game
        if (game.cells[index] == 0 && game.notes[index] == 0) return game
        return rememberEdit(game, index).copy(
            cells = game.cells.toMutableList().also { it[index] = 0 },
            notes = game.notes.toMutableList().also { it[index] = 0 }
        )
    }

    fun undo(game: SudokuGame): SudokuGame {
        if (game.status != SudokuStatus.PLAYING) return game
        val edit = game.history.lastOrNull() ?: return game
        return game.copy(
            cells = game.cells.toMutableList().also { it[edit.index] = edit.value },
            notes = game.notes.toMutableList().also { it[edit.index] = edit.notes },
            history = game.history.dropLast(1)
        )
    }

    fun tick(game: SudokuGame): SudokuGame =
        if (game.status == SudokuStatus.PLAYING) game.copy(elapsedSeconds = game.elapsedSeconds + 1) else game

    private fun editableIndex(game: SudokuGame): Int? = game.selected?.takeIf {
        game.status == SudokuStatus.PLAYING && it in 0..80 && game.puzzle[it] == 0
    }

    private fun rememberEdit(game: SudokuGame, index: Int) = game.copy(
        history = (game.history + SudokuEdit(index, game.cells[index], game.notes[index])).takeLast(200)
    )

    private fun boxAt(index: Int) = index / 27 * 3 + index % 9 / 3
}
