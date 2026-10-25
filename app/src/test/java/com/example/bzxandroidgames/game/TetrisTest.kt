package com.example.bzxandroidgames.game

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TetrisTest {

    private fun boardWith(fill: (row: Int, column: Int) -> Boolean): List<Int> =
        List(Tetris.WIDTH * Tetris.HEIGHT) { index ->
            if (fill(index / Tetris.WIDTH, index % Tetris.WIDTH)) 1 else 0
        }

    private fun state(
        board: List<Int> = List(200) { 0 },
        falling: FallingPiece?,
        next: Tetromino = Tetromino.T,
        lines: Int = 0,
        level: Int = 1
    ): TetrisUiState = TetrisUiState(
        board = board,
        falling = falling,
        next = next,
        queue = listOf(Tetromino.O, Tetromino.I),
        lines = lines,
        level = level
    )

    @Test fun `new game spawns a piece over an empty well`() {
        val game = Tetris.newGame(0)
        assertEquals(0, game.score)
        assertEquals(1, game.level)
        assertEquals(800L, game.dropInterval)
        assertEquals(TetrisStatus.PLAYING, game.status)
        assertTrue(game.board.all { it == 0 })
        assertNotNull(game.falling)
        assertEquals(0, game.falling!!.y)
        assertEquals(5, game.queue.size)
        assertNotEquals(game.next, game.queue.first())
    }

    @Test fun `pieces slide but stop at the walls`() {
        val game = Tetris.newGame(0)
        val startX = game.falling!!.x
        val left = Tetris.moveLeft(game)
        assertEquals(startX - 1, left.falling!!.x)
        val againstWall = Tetris.moveLeft(left.copy(falling = left.falling!!.copy(x = 0)))
        assertEquals(0, againstWall.falling!!.x)
        val edgeX = Tetris.WIDTH - game.falling!!.cells.first().size
        val atRightEdge = Tetris.moveRight(game.copy(falling = game.falling!!.copy(x = edgeX)))
        assertEquals(edgeX, atRightEdge.falling!!.x)
    }

    @Test fun `rotation turns the piece clockwise and cycles back`() {
        var game = Tetris.newGame(0).copy(falling = FallingPiece(Tetromino.T, 3, 0, Tetromino.T.cells))
        val once = Tetris.rotate(game)
        assertEquals(
            listOf(listOf(true, false), listOf(true, true), listOf(true, false)),
            once.falling!!.cells
        )
        game = once
        repeat(3) { game = Tetris.rotate(game) }
        // three more rotations from the once-rotated state = four in total
        assertEquals(Tetromino.T.cells, game.falling!!.cells)
    }

    @Test fun `rotation near the wall kicks away from it`() {
        // vertical I at column 7 cannot fit horizontally in place; the kick slides it left
        val game = state(falling = FallingPiece(Tetromino.I, 7, 5, Tetris.rotateCells(Tetromino.I.cells)))
        val rotated = Tetris.rotate(game)
        assertEquals(Tetromino.I.cells, rotated.falling!!.cells)
        assertEquals(6, rotated.falling!!.x)
        // an impossible rotation is simply refused: vertical I at column 9 has nowhere to go
        val stuck = state(falling = FallingPiece(Tetromino.I, 9, 0, Tetris.rotateCells(Tetromino.I.cells)))
        assertEquals(stuck.falling, Tetris.rotate(stuck).falling)
    }

    @Test fun `soft drop scores one per row and hard drop two`() {
        val game = Tetris.newGame(0)
        val soft = Tetris.softDrop(game)
        assertEquals(game.falling!!.y + 1, soft.falling!!.y)
        assertEquals(1, soft.score)
        val drop = Tetris.hardDrop(game)
        val distance = Tetris.dropPosition(game.board, game.falling!!)
        assertEquals(distance * 2, drop.score)
    }

    @Test fun `hard drop locks at the bottom`() {
        val game = Tetris.newGame(0)
        val dropped = Tetris.hardDrop(game)
        val piece = dropped.falling!!
        assertNotNull(piece)
        // the spawned piece sits at the top again on a fresh board
        assertEquals(0, piece.y)
        // the 7-bag never repeats a piece back to back
        assertNotEquals(game.falling!!.type, dropped.falling!!.type)
    }

    @Test fun `one completed line clears and scores`() {
        val board = boardWith { row, column -> row == 19 && column !in 3..6 }
        val game = state(board = board, falling = FallingPiece(Tetromino.I, 3, 0, Tetromino.I.cells))
        val after = Tetris.hardDrop(game)
        assertEquals(listOf(19), after.clearedRows)
        assertEquals(1, after.lines)
        assertTrue((0 until 10).all { column -> after.board[19 * 10 + column] == 0 })
        assertTrue((0 until 10).all { column -> after.board[18 * 10 + column] == 0 })
        assertEquals(19 * 2 + 100, after.score)
    }

    @Test fun `a vertical I completes a tetris for 800 points`() {
        val board = boardWith { row, column -> row in 16..19 && column != 5 }
        val game = state(board = board, falling = FallingPiece(Tetromino.I, 5, 0, Tetris.rotateCells(Tetromino.I.cells)))
        val after = Tetris.hardDrop(game)
        assertEquals(listOf(16, 17, 18, 19), after.clearedRows)
        assertEquals(4, after.lines)
        assertEquals(16 * 2 + 800, after.score)
    }

    @Test fun `ten lines raise the level and speed up gravity`() {
        val board = boardWith { row, column -> row == 19 && column !in 3..6 }
        val game = state(board = board, falling = FallingPiece(Tetromino.I, 3, 0, Tetromino.I.cells), lines = 9, level = 1)
        val after = Tetris.hardDrop(game)
        assertEquals(10, after.lines)
        assertEquals(2, after.level)
        assertEquals(730L, after.dropInterval)
    }

    @Test fun `best score follows the running score`() {
        val game = Tetris.newGame(0)
        val after = Tetris.hardDrop(game)
        assertTrue(after.score > 0)
        assertEquals(after.score, after.best)
        // a lower run never pulls the stored record down
        assertEquals(100, Tetris.hardDrop(Tetris.newGame(100)).best)
    }

    @Test fun `spawning into an occupied well ends the game`() {
        val board = boardWith { row, column ->
            (row == 0 && column in 3..6) || (row >= 18 && column != 2 && column != 3 && column != 5)
        }
        val game = state(board = board, falling = FallingPiece(Tetromino.O, 2, 18, Tetromino.O.cells), next = Tetromino.I)
        val after = Tetris.softDrop(game)
        assertEquals(TetrisStatus.OVER, after.status)
    }

    @Test fun `pause and resume only toggle each other`() {
        val game = Tetris.newGame(0)
        assertEquals(TetrisStatus.PAUSED, Tetris.paused(game).status)
        assertEquals(TetrisStatus.PLAYING, Tetris.resumed(Tetris.paused(game)).status)
        // pause while already paused keeps it paused; resume while playing keeps it playing
        assertEquals(TetrisStatus.PAUSED, Tetris.paused(Tetris.paused(game)).status)
        assertEquals(TetrisStatus.PLAYING, Tetris.resumed(game).status)
    }
}
