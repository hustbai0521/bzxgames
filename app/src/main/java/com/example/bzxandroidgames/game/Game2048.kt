package com.example.bzxandroidgames.game

import kotlin.random.Random

enum class Direction { UP, DOWN, LEFT, RIGHT }

data class TileMotion(val from: Int, val to: Int, val value: Int)

data class MoveResult(
    val board: List<Int>,
    val gainedScore: Int,
    val moved: Boolean,
    val mergedIndices: List<Int>,
    val motions: List<TileMotion> = emptyList()
)

private data class LineResult(
    val values: List<Int>,
    val gainedScore: Int,
    val mergedOffsets: List<Int>
)

object Game2048 {
    const val SIZE = 4

    fun emptyBoard(): List<Int> = List(SIZE * SIZE) { 0 }

    fun newGame(random: Random = Random.Default): List<Int> =
        addRandomTile(addRandomTile(emptyBoard(), random), random)

    fun addRandomTile(board: List<Int>, random: Random = Random.Default): List<Int> {
        val empty = board.indices.filter { board[it] == 0 }
        if (empty.isEmpty()) return board
        val result = board.toMutableList()
        result[empty.random(random)] = if (random.nextFloat() < 0.9f) 2 else 4
        return result
    }

    fun move(board: List<Int>, direction: Direction): MoveResult {
        require(board.size == SIZE * SIZE)
        var score = 0
        val result = MutableList(board.size) { 0 }
        val mergedIndices = mutableListOf<Int>()
        val motions = mutableListOf<TileMotion>()

        for (line in 0 until SIZE) {
            val values = (0 until SIZE).map { offset -> board[index(line, offset, direction)] }
            val sources = (0 until SIZE).filter { values[it] != 0 }
            var source = 0
            var destination = 0
            while (source < sources.size) {
                val first = sources[source]
                val target = index(line, destination, direction)
                motions += TileMotion(index(line, first, direction), target, values[first])
                if (source + 1 < sources.size && values[first] == values[sources[source + 1]]) {
                    val second = sources[source + 1]
                    motions += TileMotion(index(line, second, direction), target, values[second])
                    source += 2
                } else source++
                destination++
            }
            val merged = mergeLine(values)
            score += merged.gainedScore
            merged.values.forEachIndexed { offset, value ->
                result[index(line, offset, direction)] = value
            }
            mergedIndices += merged.mergedOffsets.map { offset -> index(line, offset, direction) }
        }
        return MoveResult(result, score, result != board, mergedIndices, motions)
    }

    private fun index(line: Int, offset: Int, direction: Direction): Int = when (direction) {
        Direction.LEFT -> line * SIZE + offset
        Direction.RIGHT -> line * SIZE + (SIZE - 1 - offset)
        Direction.UP -> offset * SIZE + line
        Direction.DOWN -> (SIZE - 1 - offset) * SIZE + line
    }

    private fun mergeLine(line: List<Int>): LineResult {
        val compact = line.filter { it != 0 }
        val merged = mutableListOf<Int>()
        val mergedOffsets = mutableListOf<Int>()
        var gained = 0
        var i = 0
        while (i < compact.size) {
            if (i + 1 < compact.size && compact[i] == compact[i + 1]) {
                val value = compact[i] * 2
                mergedOffsets += merged.size
                merged += value
                gained += value
                i += 2
            } else {
                merged += compact[i]
                i++
            }
        }
        while (merged.size < SIZE) merged += 0
        return LineResult(merged, gained, mergedOffsets)
    }

    fun hasWon(board: List<Int>): Boolean = board.any { it >= 2048 }

    fun isGameOver(board: List<Int>): Boolean {
        if (board.any { it == 0 }) return false
        for (row in 0 until SIZE) for (column in 0 until SIZE) {
            val value = board[row * SIZE + column]
            if (column < SIZE - 1 && value == board[row * SIZE + column + 1]) return false
            if (row < SIZE - 1 && value == board[(row + 1) * SIZE + column]) return false
        }
        return true
    }
}
