package com.example.bzxandroidgames.game

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

class GomokuTest {

    private fun idx(x: Int, y: Int) = y * Gomoku.SIZE + x

    private fun board(vararg stones: Pair<Int, Int>): List<Int> {
        val board = Gomoku.emptyBoard().toMutableList()
        stones.forEach { (cell, player) -> board[cell] = player }
        return board
    }

    @Test fun `five stones in any direction win`() {
        listOf(1 to 0, 0 to 1, 1 to 1, 1 to -1).forEach { (dx, dy) ->
            val stones = (0 until 5).map { idx(7 + dx * it, 7 + dy * it) to Gomoku.BLACK }.toTypedArray()
            val line = Gomoku.winningLine(board(*stones), idx(7, 7))
            assertNotNull("direction ($dx,$dy) should win", line)
            assertEquals(5, line!!.size)
        }
    }

    @Test fun `four stones do not win`() {
        val b = board(
            idx(5, 7) to Gomoku.BLACK, idx(6, 7) to Gomoku.BLACK,
            idx(7, 7) to Gomoku.BLACK, idx(8, 7) to Gomoku.BLACK
        )
        assertNull(Gomoku.winningLine(b, idx(6, 7)))
    }

    @Test fun `six in a row is still a win`() {
        val stones = (0 until 6).map { idx(4 + it, 7) to Gomoku.BLACK }.toTypedArray()
        assertEquals(6, Gomoku.winningLine(board(*stones), idx(6, 7))!!.size)
    }

    @Test fun `ai completes a five at every difficulty`() {
        GomokuDifficulty.entries.forEach { level ->
            val b = board(
                idx(5, 7) to Gomoku.WHITE, idx(6, 7) to Gomoku.WHITE,
                idx(7, 7) to Gomoku.WHITE, idx(8, 7) to Gomoku.WHITE,
                idx(0, 0) to Gomoku.BLACK, idx(14, 14) to Gomoku.BLACK
            )
            val move = Gomoku.bestMove(b, Gomoku.WHITE, level, Random(42))
            assertTrue("$level should finish the five, got $move", move == idx(4, 7) || move == idx(9, 7))
        }
    }

    @Test fun `ai blocks an opponent five at every difficulty`() {
        GomokuDifficulty.entries.forEach { level ->
            val b = board(
                idx(3, 4) to Gomoku.BLACK, idx(4, 4) to Gomoku.BLACK,
                idx(5, 4) to Gomoku.BLACK, idx(6, 4) to Gomoku.BLACK,
                idx(0, 0) to Gomoku.WHITE
            )
            val move = Gomoku.bestMove(b, Gomoku.WHITE, level, Random(7))
            assertTrue("$level should block the five, got $move", move == idx(2, 4) || move == idx(7, 4))
        }
    }

    @Test fun `ai playing black blocks a white five and opens the center`() {
        val b = board(
            idx(3, 4) to Gomoku.WHITE, idx(4, 4) to Gomoku.WHITE,
            idx(5, 4) to Gomoku.WHITE, idx(6, 4) to Gomoku.WHITE,
            idx(0, 0) to Gomoku.BLACK
        )
        val move = Gomoku.bestMove(b, Gomoku.BLACK, GomokuDifficulty.HARD, Random(5))
        assertTrue(move == idx(2, 4) || move == idx(7, 4))
        assertEquals(idx(7, 7), Gomoku.bestMove(Gomoku.emptyBoard(), Gomoku.BLACK, GomokuDifficulty.MEDIUM))
    }

    @Test fun `winning outranks blocking for the ai`() {
        val b = board(
            idx(5, 7) to Gomoku.WHITE, idx(6, 7) to Gomoku.WHITE,
            idx(7, 7) to Gomoku.WHITE, idx(8, 7) to Gomoku.WHITE,
            idx(5, 9) to Gomoku.BLACK, idx(6, 9) to Gomoku.BLACK,
            idx(7, 9) to Gomoku.BLACK, idx(8, 9) to Gomoku.BLACK,
            idx(4, 9) to Gomoku.WHITE
        )
        val move = Gomoku.bestMove(b, Gomoku.WHITE, GomokuDifficulty.HARD, Random(3))
        assertTrue(move == idx(4, 7) || move == idx(9, 7))
    }

    @Test fun `medium blocks a lone open three`() {
        val b = board(
            idx(5, 7) to Gomoku.BLACK, idx(6, 7) to Gomoku.BLACK, idx(7, 7) to Gomoku.BLACK,
            idx(0, 14) to Gomoku.WHITE
        )
        val move = Gomoku.bestMove(b, Gomoku.WHITE, GomokuDifficulty.MEDIUM)
        assertTrue("medium should contain the three, got $move", move == idx(4, 7) || move == idx(8, 7))
    }

    @Test fun `hard search blocks a lone open three`() {
        val b = board(
            idx(5, 7) to Gomoku.BLACK, idx(6, 7) to Gomoku.BLACK, idx(7, 7) to Gomoku.BLACK,
            idx(0, 14) to Gomoku.WHITE
        )
        val move = Gomoku.bestMove(b, Gomoku.WHITE, GomokuDifficulty.HARD, Random(11))
        assertTrue("hard should contain the three, got $move", move in setOf(idx(3, 7), idx(4, 7), idx(8, 7)))
    }

    @Test fun `pattern tiers rank five above live four above four above live three`() {
        val five = board(
            idx(5, 9) to Gomoku.BLACK, idx(6, 9) to Gomoku.BLACK,
            idx(7, 9) to Gomoku.BLACK, idx(8, 9) to Gomoku.BLACK
        )
        val liveFour = board(idx(5, 5) to Gomoku.BLACK, idx(6, 5) to Gomoku.BLACK, idx(7, 5) to Gomoku.BLACK)
        val rushFour = board(
            idx(0, 5) to Gomoku.WHITE, idx(2, 5) to Gomoku.BLACK,
            idx(3, 5) to Gomoku.BLACK, idx(4, 5) to Gomoku.BLACK
        )
        val liveThree = board(idx(5, 7) to Gomoku.BLACK, idx(6, 7) to Gomoku.BLACK)

        val scoreFive = Gomoku.evaluatePoint(five, idx(4, 9), Gomoku.BLACK)
        val scoreLiveFour = Gomoku.evaluatePoint(liveFour, idx(4, 5), Gomoku.BLACK)
        val scoreRushFour = Gomoku.evaluatePoint(rushFour, idx(1, 5), Gomoku.BLACK)
        val scoreLiveThree = Gomoku.evaluatePoint(liveThree, idx(4, 7), Gomoku.BLACK)
        assertTrue(scoreFive > scoreLiveFour)
        assertTrue(scoreLiveFour > scoreRushFour)
        assertTrue(scoreRushFour > scoreLiveThree)
    }

    @Test fun `hard search answers quickly on busy mid-game boards`() {
        // A spread-out mid-game position: many live candidates exercise the search's worst case.
        val b = board(
            idx(6, 6) to Gomoku.BLACK, idx(7, 6) to Gomoku.WHITE,
            idx(7, 7) to Gomoku.BLACK, idx(8, 7) to Gomoku.WHITE,
            idx(6, 8) to Gomoku.BLACK, idx(7, 8) to Gomoku.WHITE,
            idx(5, 7) to Gomoku.BLACK, idx(8, 6) to Gomoku.WHITE,
            idx(9, 9) to Gomoku.BLACK, idx(5, 5) to Gomoku.WHITE,
            idx(4, 8) to Gomoku.BLACK, idx(10, 4) to Gomoku.WHITE,
            idx(3, 3) to Gomoku.BLACK, idx(11, 11) to Gomoku.WHITE
        )
        repeat(3) {
            val start = System.nanoTime()
            val move = Gomoku.bestMove(b, Gomoku.WHITE, GomokuDifficulty.HARD)
            val elapsedMs = (System.nanoTime() - start) / 1_000_000
            println("hard search on busy board: $elapsedMs ms -> $move")
            assertTrue(b[move] == Gomoku.EMPTY)
        }
    }

    @Test fun `empty board offers the center point`() {
        assertEquals(idx(7, 7), Gomoku.bestMove(Gomoku.emptyBoard(), Gomoku.BLACK, GomokuDifficulty.HARD))
    }

    @Test fun `medium beats easy in a full self-play game`() {
        val random = Random(2024)
        val board = Gomoku.emptyBoard().toMutableList()
        var toMove = Gomoku.BLACK
        var winner: Int? = null
        while (winner == null && board.any { it == Gomoku.EMPTY }) {
            val level = if (toMove == Gomoku.BLACK) GomokuDifficulty.MEDIUM else GomokuDifficulty.EASY
            val move = Gomoku.bestMove(board, toMove, level, random)
            board[move] = toMove
            if (Gomoku.winningLine(board, move) != null) winner = toMove
            toMove = Gomoku.opponent(toMove)
        }
        assertEquals(Gomoku.BLACK, winner)
    }

    @Test fun `hard beats easy in a full self-play game`() {
        val random = Random(4321)
        val board = Gomoku.emptyBoard().toMutableList()
        var toMove = Gomoku.BLACK
        var winner: Int? = null
        val start = System.nanoTime()
        while (winner == null && board.any { it == Gomoku.EMPTY }) {
            val level = if (toMove == Gomoku.BLACK) GomokuDifficulty.HARD else GomokuDifficulty.EASY
            val move = Gomoku.bestMove(board, toMove, level, random)
            board[move] = toMove
            if (Gomoku.winningLine(board, move) != null) winner = toMove
            toMove = Gomoku.opponent(toMove)
        }
        println("hard-vs-easy game took ${(System.nanoTime() - start) / 1_000_000} ms, winner=${if (winner == Gomoku.BLACK) "hard" else "easy"}")
        assertEquals(Gomoku.BLACK, winner)
    }

    @Test fun `full board without a run is a draw`() {
        // Period-4 coloring ((x + 2y) mod 4 < 2): every direction alternates at least every
        // two cells, so no five-in-a-row can exist on a full board.
        val board = Gomoku.emptyBoard().toMutableList()
        for (y in 0 until Gomoku.SIZE) {
            for (x in 0 until Gomoku.SIZE) {
                board[idx(x, y)] = if ((x + 2 * y) % 4 < 2) Gomoku.BLACK else Gomoku.WHITE
            }
        }
        assertTrue(Gomoku.isFull(board))
        (0 until Gomoku.CELL_COUNT).forEach { assertNull(Gomoku.winningLine(board, it)) }
    }
}
