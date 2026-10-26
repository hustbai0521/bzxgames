package com.example.bzxandroidgames.game

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LinkLinkTest {

    private fun tile(type: Int) = LinkTile(type, type)

    private fun gridOf(cols: Int, rows: Int, cells: Map<Int, Int>): List<LinkTile?> =
        List(cols * rows) { index -> cells[index]?.let { tile(it) } }

    @Test fun `new game lays out forty-eight well-scrambled pairs`() {
        val game = LinkLink.newGame()
        assertEquals(LinkLink.COLS * LinkLink.ROWS, game.grid.size)
        assertEquals(48, game.totalPairs)
        val byType = game.grid.filterNotNull().groupBy { it.type }
        assertEquals(LinkLink.TYPES, byType.size)
        byType.forEach { (_, tiles) ->
            // every type gets four or five pairs — always an even tile count
            assertTrue(tiles.size % 2 == 0)
            assertTrue(tiles.size in 8..10)
        }
        // the deal is scrambled hard: no two identical icons sit side by side
        for (y in 0 until game.rows) {
            for (x in 0 until game.cols) {
                val tile = game.grid[y * game.cols + x] ?: continue
                if (x + 1 < game.cols) {
                    val right = game.grid[y * game.cols + x + 1]
                    assertTrue(right == null || right.type != tile.type)
                }
                if (y + 1 < game.rows) {
                    val below = game.grid[(y + 1) * game.cols + x]
                    assertTrue(below == null || below.type != tile.type)
                }
            }
        }
        // and a fresh board is never dead
        assertTrue(LinkLink.hasMoves(game.grid, game.cols, game.rows))
    }

    @Test fun `identical tiles in a clear straight line connect`() {
        val grid = gridOf(4, 1, mapOf(0 to 0, 3 to 0))
        val path = LinkLink.connectPath(grid, 4, 1, 0, 3)
        assertNotNull(path)
        assertEquals(listOf(0 to 0, 3 to 0), path)
    }

    @Test fun `one bend around a corner connects`() {
        val grid = gridOf(2, 2, mapOf(0 to 0, 3 to 0))
        val path = LinkLink.connectPath(grid, 2, 2, 0, 3)
        assertNotNull(path)
        assertEquals(3, path!!.size)
    }

    @Test fun `two bends route through the open border`() {
        // A in opposite corners, B tiles sitting on the inner diagonal
        val grid = gridOf(
            3, 3,
            mapOf(0 to 0, 2 to 1, 4 to 1, 6 to 1, 8 to 0)
        )
        assertNull(LinkLink.connectPath(grid, 3, 3, 0, 8))
        // clearing the centre opens the classic two-bend route
        val open = gridOf(3, 3, mapOf(0 to 0, 2 to 1, 6 to 1, 8 to 0))
        val path = LinkLink.connectPath(open, 3, 3, 0, 8)
        assertNotNull(path)
        assertEquals(4, path!!.size)
    }

    @Test fun `different types and blocked pairs never connect`() {
        val grid = gridOf(3, 3, mapOf(0 to 0, 2 to 1, 4 to 1, 6 to 1, 8 to 1))
        assertNull(LinkLink.connectPath(grid, 3, 3, 0, 8)) // types differ
        val same = gridOf(3, 3, mapOf(0 to 0, 2 to 1, 4 to 1, 6 to 1, 8 to 0))
        assertNull(LinkLink.connectPath(same, 3, 3, 0, 8)) // walled in by the B diagonal
        assertNull(LinkLink.connectPath(same, 3, 3, 0, 0)) // same cell
        assertNull(LinkLink.connectPath(listOf(null, null), 2, 1, 0, 1)) // empty endpoints
    }

    @Test fun `selecting a matching pair removes it and records the route`() {
        val base = LinkUiState(
            grid = gridOf(2, 2, mapOf(0 to 0, 1 to 0, 2 to 1, 3 to 1)),
            cols = 2,
            rows = 2,
            totalPairs = 2
        )
        val picked = LinkLink.select(base, 0)
        assertEquals(0, picked.selected)
        val matched = LinkLink.select(picked, 1)
        assertEquals(1, matched.matched)
        assertNull(matched.grid[0])
        assertNull(matched.grid[1])
        assertEquals(listOf(0 to 0, 1 to 0), matched.matchedPath)
        assertEquals(LinkStatus.PLAYING, matched.status)
    }

    @Test fun `clearing the last pair wins the board`() {
        val base = LinkUiState(
            grid = gridOf(2, 2, mapOf(0 to 0, 1 to 0, 2 to 1, 3 to 1)),
            cols = 2,
            rows = 2,
            totalPairs = 2
        )
        val first = LinkLink.select(LinkLink.select(base, 0), 1)
        val second = LinkLink.select(LinkLink.select(first, 2), 3)
        assertEquals(2, second.matched)
        assertEquals(LinkStatus.OVER, second.status)
    }

    @Test fun `mismatched selection just moves the highlight`() {
        val base = LinkUiState(
            grid = gridOf(2, 2, mapOf(0 to 0, 1 to 1, 2 to 0, 3 to 1)),
            cols = 2,
            rows = 2
        )
        val picked = LinkLink.select(base, 0)
        val moved = LinkLink.select(picked, 1)
        assertEquals(1, moved.selected)
        assertEquals(0, moved.matched)
        assertEquals(base.grid, moved.grid)
    }

    @Test fun `hint finds a live pair and shuffling preserves the tile set`() {
        val base = LinkUiState(
            grid = gridOf(2, 2, mapOf(0 to 0, 1 to 1, 2 to 0, 3 to 1)),
            cols = 2,
            rows = 2
        )
        val hint = LinkLink.hint(base)
        assertNotNull(hint.hint)
        val (a, b) = hint.hint!!
        assertEquals(base.grid[a]!!.type, base.grid[b]!!.type)

        val dead = LinkUiState(
            grid = gridOf(2, 2, mapOf(0 to 0, 1 to 1, 2 to 1, 3 to 0)),
            cols = 2,
            rows = 2
        )
        assertTrue(!LinkLink.hasMoves(dead.grid, 2, 2))
        val revived = LinkLink.ensureMoves(dead)
        assertEquals(1, revived.shuffles)
        assertTrue(LinkLink.hasMoves(revived.grid, revived.cols, revived.rows))
        assertEquals(
            dead.grid.filterNotNull().map { it.type }.sorted(),
            revived.grid.filterNotNull().map { it.type }.sorted()
        )
    }

    @Test fun `the clock only runs while playing`() {
        val base = LinkUiState(grid = gridOf(2, 2, mapOf(0 to 0, 1 to 0, 2 to 1, 3 to 1)), cols = 2, rows = 2)
        assertEquals(1, LinkLink.tick(base).elapsedSeconds)
        val won = base.copy(status = LinkStatus.OVER, elapsedSeconds = 5)
        assertEquals(5, LinkLink.tick(won).elapsedSeconds)
    }
}
