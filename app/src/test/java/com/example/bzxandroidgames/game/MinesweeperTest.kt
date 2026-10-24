package com.example.bzxandroidgames.game

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Assert.assertFalse
import org.junit.Test
import kotlin.random.Random

class MinesweeperTest {

    private val random = Random(42)

    private val hard = MinesweeperDifficulty.HARD

    /** A field with mines already laid (so reveal skips placement) and adjacency counted. */
    private fun field(mines: Set<Int>): List<MinesweeperCell> =
        List(hard.cells) { index ->
            MinesweeperCell(
                mine = index in mines,
                adjacent = Minesweeper.neighbors(index, hard).count { it in mines }
            )
        }

    @Test fun `first reveal lays exactly its mines clear of the safe zone`() {
        val move = Minesweeper.reveal(Minesweeper.emptyBoard(hard), 112, hard, random)
        val mines = move.board.withIndex().filter { it.value.mine }.map { it.index }
        assertEquals(hard.mines, mines.size)
        val safe = Minesweeper.neighbors(112, hard) + 112
        assertTrue("mines must avoid the first click's 3x3", mines.none { it in safe })
        assertEquals(MinesweeperStatus.PLAYING, move.status)
    }

    @Test fun `flood fill opens the empty region plus a numbered rim`() {
        val move = Minesweeper.reveal(Minesweeper.emptyBoard(hard), 112, hard, random)
        val opened = move.opened.toSet()
        assertTrue("the first click should open a wide area", opened.size >= 5)
        opened.forEach { index ->
            val cell = move.board[index]
            assertFalse(cell.mine)
            if (cell.adjacent == 0) {
                Minesweeper.neighbors(index, hard).forEach { neighbor ->
                    assertTrue("zero cell $index must open neighbor $neighbor", move.board[neighbor].revealed)
                }
            }
        }
        move.board.forEachIndexed { index, cell ->
            assertEquals("revealed cells must match the opened set", index in opened, cell.revealed)
        }
    }

    @Test fun `tapping a flagged cell changes nothing`() {
        val flagged = Minesweeper.toggleFlag(Minesweeper.emptyBoard(hard), 12)
        val move = Minesweeper.reveal(flagged, 12, hard, random)
        assertSame(flagged, move.board)
        assertEquals(MinesweeperStatus.PLAYING, move.status)
        assertTrue(move.opened.isEmpty())
    }

    @Test fun `flags toggle only on covered cells`() {
        val flagged = Minesweeper.toggleFlag(Minesweeper.emptyBoard(hard), 12)
        assertTrue(flagged[12].flagged)
        assertEquals(Minesweeper.emptyBoard(hard), Minesweeper.toggleFlag(flagged, 12))
        val played = Minesweeper.reveal(flagged, 112, hard, random).board
        assertSame(played, Minesweeper.toggleFlag(played, 112))
    }

    @Test fun `hitting a mine loses and uncovers the field`() {
        val start = Minesweeper.reveal(Minesweeper.emptyBoard(hard), 112, hard, random).board
        val mine = start.withIndex().first { it.value.mine }.index
        val wrong = start.withIndex().first { !it.value.mine && !it.value.revealed }.index
        val wrongFlagged = Minesweeper.toggleFlag(start, wrong)
        val move = Minesweeper.reveal(wrongFlagged, mine, hard, random)
        assertEquals(MinesweeperStatus.LOST, move.status)
        move.board.forEachIndexed { index, cell ->
            if (cell.mine) assertTrue("mine $index should show", cell.revealed)
        }
        assertTrue(move.board[mine].exploded)
        // The lying flag stays up, striped with the red cross.
        assertTrue(move.board[wrong].flagged)
        assertTrue(move.board[wrong].wrongFlag)
    }

    @Test fun `chord opens the unflagged neighbors of a satisfied number`() {
        // 112 (row 7, col 7) reads mines 97 and 127, both flagged; those two unflagged mines
        // keep the win out of reach and every other neighbor numbered, so the chord opens
        // exactly the remaining six cells of the ring.
        var board = field(setOf(97, 127))
        board = board.toMutableList().also { it[112] = it[112].copy(revealed = true) }
        board = Minesweeper.toggleFlag(board, 97)
        board = Minesweeper.toggleFlag(board, 127)
        val move = Minesweeper.reveal(board, 112, hard, random)
        assertEquals(MinesweeperStatus.PLAYING, move.status)
        assertEquals(setOf(96, 98, 111, 113, 126, 128), move.opened.toSet())
        listOf(97, 127).forEach { mine ->
            assertTrue("mine $mine must stay covered", !move.board[mine].revealed)
        }
    }

    @Test fun `chord on a mis-flagged number can lose`() {
        // 112 reads mines 97 and 127; the player flags 97 correctly and 96 wrongly,
        // so chording reaches the unflagged mine at 127.
        var board = field(setOf(97, 127))
        board = board.toMutableList().also { it[112] = it[112].copy(revealed = true) }
        board = Minesweeper.toggleFlag(board, 97)
        board = Minesweeper.toggleFlag(board, 96)
        val move = Minesweeper.reveal(board, 112, hard, random)
        assertEquals(MinesweeperStatus.LOST, move.status)
        assertTrue(move.board[127].exploded)
        assertTrue(move.board[96].wrongFlag)
        assertTrue(move.board[97].flagged)
    }

    @Test fun `opening every safe cell wins and flags the rest`() {
        var move = Minesweeper.reveal(Minesweeper.emptyBoard(hard), 112, hard, random)
        var guard = 0
        while (move.status == MinesweeperStatus.PLAYING) {
            val next = move.board.withIndex().firstOrNull { !it.value.mine && !it.value.revealed }
            if (next == null) break
            move = Minesweeper.reveal(move.board, next.index, hard, Random(guard++))
        }
        assertEquals(MinesweeperStatus.WON, move.status)
        move.board.forEach { cell ->
            if (cell.mine) assertTrue("mines auto-flag on win", cell.flagged)
            else assertTrue(cell.revealed)
        }
    }

    @Test fun `neighbors stay inside the field`() {
        assertEquals(3, Minesweeper.neighbors(0, hard).size)
        assertEquals(5, Minesweeper.neighbors(4, hard).size)
        assertEquals(5, Minesweeper.neighbors(30, hard).size)
        assertEquals(8, Minesweeper.neighbors(112, hard).size)
        assertNotEquals(Minesweeper.neighbors(112, hard), Minesweeper.neighbors(113, hard))
    }

    @Test fun `every difficulty fits its mines clear of a corner click`() {
        MinesweeperDifficulty.entries.forEach { level ->
            assertTrue(level.mines < level.cells)
            val move = Minesweeper.reveal(Minesweeper.emptyBoard(level), 0, level, random)
            assertEquals(level.mines, move.board.count { it.mine })
            val safe = Minesweeper.neighbors(0, level) + 0
            move.board.forEachIndexed { index, cell ->
                if (index in safe) assertFalse("safe zone hit on $level", cell.mine)
            }
        }
    }
}
