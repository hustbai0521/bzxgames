package com.example.bzxandroidgames.game

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class Game2048Test {
    @Test fun `motion preserves every source and reconstructs result in all directions`() {
        val board = listOf(2, 0, 2, 2, 4, 4, 8, 0, 0, 4, 8, 8, 2, 2, 4, 4)
        Direction.entries.forEach { direction ->
            val result = Game2048.move(board, direction)
            assertEquals(board.indices.filter { board[it] != 0 }.sorted(), result.motions.map { it.from }.sorted())
            val reconstructed = MutableList(16) { 0 }
            result.motions.forEach { motion ->
                assertEquals(board[motion.from], motion.value)
                if (direction == Direction.LEFT || direction == Direction.RIGHT) {
                    assertEquals(motion.from / 4, motion.to / 4)
                } else assertEquals(motion.from % 4, motion.to % 4)
                reconstructed[motion.to] += motion.value
            }
            assertEquals(result.board, reconstructed)
        }
    }

    @Test fun `left move merges each tile once`() {
        val board = listOf(
            2, 2, 2, 2,
            4, 0, 4, 4,
            0, 0, 0, 0,
            2, 4, 8, 16
        )
        val result = Game2048.move(board, Direction.LEFT)
        assertEquals(listOf(4, 4, 0, 0, 8, 4, 0, 0, 0, 0, 0, 0, 2, 4, 8, 16), result.board)
        assertEquals(16, result.gainedScore)
        assertEquals(listOf(0, 1, 4), result.mergedIndices)
        assertTrue(result.moved)
    }

    @Test fun `full checkerboard is game over`() {
        val board = List(16) { if ((it + it / 4) % 2 == 0) 2 else 4 }
        assertTrue(Game2048.isGameOver(board))
    }

    @Test fun `adjacent equal tiles mean game continues`() {
        val board = MutableList(16) { if ((it + it / 4) % 2 == 0) 2 else 4 }
        board[1] = 2
        assertFalse(Game2048.isGameOver(board))
    }
}
