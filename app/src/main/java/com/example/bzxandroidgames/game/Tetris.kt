package com.example.bzxandroidgames.game

import kotlin.random.Random

/** The seven tetrominoes; id doubles as the color slot on the board. */
enum class Tetromino(val id: Int, val shape: List<String>) {
    I(1, listOf("XXXX")),
    O(2, listOf("XX", "XX")),
    T(3, listOf(".X.", "XXX")),
    S(4, listOf(".XX", "XX.")),
    Z(5, listOf("XX.", ".XX")),
    J(6, listOf("X..", "XXX")),
    L(7, listOf("..X", "XXX"));

    val cells: List<List<Boolean>> = shape.map { row -> row.map { it == 'X' } }
}

/** A piece in flight: its shape (already rotated), board position, and type. */
data class FallingPiece(val type: Tetromino, val x: Int, val y: Int, val cells: List<List<Boolean>>)

enum class TetrisStatus { PLAYING, PAUSED, OVER }

data class TetrisUiState(
    val board: List<Int> = List(Tetris.WIDTH * Tetris.HEIGHT) { 0 },
    val falling: FallingPiece? = null,
    val next: Tetromino = Tetromino.I,
    val queue: List<Tetromino> = emptyList(),
    val score: Int = 0,
    val best: Int = 0,
    val lines: Int = 0,
    val level: Int = 1,
    val status: TetrisStatus = TetrisStatus.PLAYING,
    val moveId: Int = 0,
    val clearedRows: List<Int> = emptyList(),
    val clearId: Int = 0,
    val dropInterval: Long = 800L
)

object Tetris {
    const val WIDTH = 10
    const val HEIGHT = 20

    private val lineScores = intArrayOf(0, 100, 300, 500, 800)

    fun newGame(best: Int, random: Random = Random.Default): TetrisUiState {
        val bag = shuffledBag(random)
        // falling = bag[0]; `next` previews bag[1]; the queue holds the rest of the bag.
        return TetrisUiState(
            falling = spawn(bag[0]),
            next = bag[1],
            queue = bag.drop(2),
            best = best
        )
    }

    fun moveLeft(state: TetrisUiState) = shifted(state, -1, 0)
    fun moveRight(state: TetrisUiState) = shifted(state, 1, 0)

    /** Gravity step: fall one row, or lock when the way down is blocked. */
    fun tick(state: TetrisUiState): TetrisUiState {
        val piece = state.falling ?: return state
        val down = piece.copy(y = piece.y + 1)
        return if (!collides(state.board, down)) lockTimer(state.copy(falling = down))
        else lock(state)
    }

    /** Soft drop: one row for a point, locking if grounded. */
    fun softDrop(state: TetrisUiState): TetrisUiState {
        val piece = state.falling ?: return state
        val down = piece.copy(y = piece.y + 1)
        return if (!collides(state.board, down))
            state.copy(falling = down, score = state.score + 1, moveId = state.moveId + 1)
        else lock(state)
    }

    fun hardDrop(state: TetrisUiState): TetrisUiState {
        val piece = state.falling ?: return state
        var distance = 0
        var dropped = piece
        while (true) {
            val next = dropped.copy(y = dropped.y + 1)
            if (collides(state.board, next)) break
            dropped = next
            distance++
        }
        return if (distance == 0) lock(state)
        else lock(state.copy(falling = dropped, score = state.score + distance * 2))
    }

    /** Rotate clockwise with simple wall kicks (nudge left/right up to two cells). */
    fun rotate(state: TetrisUiState): TetrisUiState {
        val piece = state.falling ?: return state
        val rotated = rotateCells(piece.cells)
        for (dx in intArrayOf(0, -1, 1, -2, 2)) {
            val candidate = FallingPiece(piece.type, piece.x + dx, piece.y, rotated)
            if (!collides(state.board, candidate)) {
                return state.copy(falling = candidate, moveId = state.moveId + 1)
            }
        }
        return state
    }

    fun paused(state: TetrisUiState): TetrisUiState =
        if (state.status == TetrisStatus.PLAYING) state.copy(status = TetrisStatus.PAUSED) else state

    fun resumed(state: TetrisUiState): TetrisUiState =
        if (state.status == TetrisStatus.PAUSED) state.copy(status = TetrisStatus.PLAYING) else state

    fun dropPosition(board: List<Int>, piece: FallingPiece): Int {
        var distance = 0
        var probe = piece
        while (true) {
            val next = probe.copy(y = probe.y + 1)
            if (collides(board, next)) return distance
            probe = next
            distance++
        }
    }

    private fun shifted(state: TetrisUiState, dx: Int, dy: Int): TetrisUiState {
        val piece = state.falling ?: return state
        val moved = piece.copy(x = piece.x + dx, y = piece.y + dy)
        if (collides(state.board, moved)) return state
        return state.copy(falling = moved, moveId = state.moveId + 1)
    }

    /** Bumps the "resting" timer bookkeeping; ticks only, not manual moves. */
    private fun lockTimer(state: TetrisUiState): TetrisUiState = state.copy(moveId = state.moveId + 1)

    private fun lock(state: TetrisUiState): TetrisUiState {
        val piece = state.falling ?: return state
        var board = state.board
        piece.cells.forEachIndexed { row, line ->
            line.forEachIndexed { column, filled ->
                if (filled) {
                    val x = piece.x + column
                    val y = piece.y + row
                    if (y in 0 until HEIGHT && x in 0 until WIDTH) board = board.toMutableList().also { it[y * WIDTH + x] = piece.type.id }
                }
            }
        }
        val fullRows = (0 until HEIGHT).filter { row -> (0 until WIDTH).all { column -> board[row * WIDTH + column] != 0 } }
        if (fullRows.isNotEmpty()) {
            // rows above fall down; the cleared rows are replaced by empty rows at the top
            val cleared = fullRows.toSet()
            board = List(fullRows.size * WIDTH) { 0 } +
                board.filterIndexed { index, _ -> (index / WIDTH) !in cleared }
        }
        val lines = state.lines + fullRows.size
        val level = 1 + lines / 10
        val score = state.score + lineScores[fullRows.size.coerceAtMost(4)] * state.level
        // The displayed `next` becomes the falling piece; keep the queue two-deep.
        var rest = state.queue.toMutableList()
        if (rest.size <= 1) rest.addAll(shuffledBag())
        val next = state.next
        val spawned = spawn(next)
        val over = collides(board, spawned)
        return state.copy(
            board = board,
            falling = spawned,
            next = rest.removeAt(0),
            queue = rest,
            score = score,
            best = maxOf(state.best, score),
            lines = lines,
            level = level,
            status = if (over) TetrisStatus.OVER else TetrisStatus.PLAYING,
            moveId = state.moveId + 1,
            clearedRows = fullRows,
            clearId = state.clearId + if (fullRows.isEmpty()) 0 else 1,
            dropInterval = (800L - (level - 1) * 70L).coerceAtLeast(120L)
        )
    }

    private fun spawn(type: Tetromino): FallingPiece =
        FallingPiece(type, (WIDTH - type.cells.first().size) / 2, 0, type.cells)

    private fun collides(board: List<Int>, piece: FallingPiece): Boolean {
        piece.cells.forEachIndexed { row, line ->
            line.forEachIndexed { column, filled ->
                if (filled) {
                    val x = piece.x + column
                    val y = piece.y + row
                    if (x < 0 || x >= WIDTH || y >= HEIGHT) return true
                    if (y >= 0 && board[y * WIDTH + x] != 0) return true
                }
            }
        }
        return false
    }

    fun rotateCells(cells: List<List<Boolean>>): List<List<Boolean>> {
        val rows = cells.size
        val columns = cells.first().size
        return List(columns) { newY ->
            List(rows) { newX -> cells[rows - 1 - newX][newY] }
        }
    }

    private fun shuffledBag(random: Random = Random.Default): List<Tetromino> =
        Tetromino.entries.shuffled(random)
}
