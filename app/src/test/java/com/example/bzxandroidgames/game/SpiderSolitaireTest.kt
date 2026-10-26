package com.example.bzxandroidgames.game

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SpiderSolitaireTest {

    private fun card(suit: Int, rank: Int, faceUp: Boolean = true) = SpiderCard(suit, rank, faceUp)

    private fun gameWith(columns: List<List<SpiderCard>>, suits: SpiderSuits = SpiderSuits.ONE): SpiderGame =
        SpiderGame(suits, columns, stock = List(50) { card(0, 1, faceUp = false) }, completed = emptyList(), score = 500, moves = 0)

    @Test fun `new game deals 54 cards and keeps 50 in stock`() {
        SpiderSuits.entries.forEach { suits ->
            val game = SpiderSolitaire.newGame(suits)
            assertEquals(10, game.columns.size)
            assertEquals(listOf(6, 6, 6, 6, 5, 5, 5, 5, 5, 5), game.columns.map { it.size })
            assertEquals(50, game.stock.size)
            assertEquals(500, game.score)
            game.columns.forEach { column ->
                assertTrue(column.last().faceUp)
                assertFalse(column.first().faceUp)
            }
        }
    }

    @Test fun `deck holds eight runs per difficulty`() {
        listOf(
            SpiderSuits.ONE to mapOf(0 to 8),
            SpiderSuits.TWO to mapOf(0 to 4, 1 to 4),
            SpiderSuits.FOUR to mapOf(0 to 2, 1 to 2, 2 to 2, 3 to 2)
        ).forEach { (suits, expected) ->
            val bySuit = SpiderSolitaire.buildDeck(suits).groupBy({ it.first }, { it.second })
            assertEquals(expected.size, bySuit.size)
            bySuit.forEach { (suit, ranks) ->
                assertEquals(expected[suit], ranks.size / 13)
                assertEquals((1..13).toList(), ranks.take(13).sorted())
            }
        }
        assertEquals(104, SpiderSolitaire.buildDeck(SpiderSuits.ONE).size)
    }

    @Test fun `only same-suit descending face-up runs are movable`() {
        val column = listOf(
            card(0, 3, faceUp = false), card(0, 4), card(0, 3), card(0, 2)
        )
        assertFalse(SpiderSolitaire.movableRun(column, 0)) // buried under face-down cards
        assertTrue(SpiderSolitaire.movableRun(column, 1))
        assertTrue(SpiderSolitaire.movableRun(column, 2))
        assertTrue(SpiderSolitaire.movableRun(column, 3))
        val mixed = listOf(card(1, 5), card(0, 4))
        assertFalse(SpiderSolitaire.movableRun(mixed, 0)) // 5♥→4♠ breaks the would-be run
        assertTrue(SpiderSolitaire.movableRun(mixed, 1)) // a single top card is always movable
        val broken = listOf(card(0, 5), card(1, 4), card(0, 3))
        assertFalse(SpiderSolitaire.movableRun(broken, 0)) // suit changes inside the would-be run
        assertTrue(SpiderSolitaire.movableRun(broken, 2))
    }

    @Test fun `cards drop onto one rank higher of any suit`() {
        assertTrue(SpiderSolitaire.canDrop(listOf(card(0, 7)), listOf(card(1, 8))))
        assertFalse(SpiderSolitaire.canDrop(listOf(card(0, 8)), listOf(card(1, 8))))
        assertFalse(SpiderSolitaire.canDrop(listOf(card(0, 6)), listOf(card(1, 8))))
        assertTrue(SpiderSolitaire.canDrop(listOf(card(2, 13)), emptyList()))
    }

    @Test fun `moving a run updates both columns and flips the exposed card`() {
        val game = gameWith(
            listOf(
                listOf(card(0, 9, faceUp = false), card(0, 10)),
                listOf(card(1, 11))
            )
        )
        val moved = SpiderSolitaire.move(game, 0, 1, 1)
        assertNotNull(moved)
        moved!!.let {
            assertEquals(1, it.columns[0].size)
            assertTrue(it.columns[0][0].faceUp) // the card exposed by the move flips up
            assertEquals(9, it.columns[0][0].rank)
            assertEquals(listOf(11, 10), it.columns[1].map { card -> card.rank })
            assertEquals(1, it.moves)
            assertEquals(499, it.score)
        }
    }

    @Test fun `illegal moves are refused`() {
        val game = gameWith(
            listOf(
                listOf(card(0, 5)),
                listOf(card(1, 8))
            )
        )
        assertNull(SpiderSolitaire.move(game, 0, 0, 1)) // 5 onto 8 is illegal
        assertNull(SpiderSolitaire.move(game, 0, 0, 0)) // same column
        assertNull(SpiderSolitaire.move(gameWith(emptyList()), -1, 0, 2))
    }

    @Test fun `deal refills ten cards but refuses while a column is empty`() {
        val base = SpiderSolitaire.newGame(SpiderSuits.ONE)
        val dealt = SpiderSolitaire.deal(base)
        assertNotNull(dealt)
        dealt!!.let {
            assertEquals(40, it.stock.size)
            it.columns.forEachIndexed { index, column ->
                assertEquals(base.columns[index].size + 1, column.size)
                assertTrue(column.last().faceUp)
            }
        }
        val withEmpty = base.copy(columns = base.columns.toMutableList().also { it[3] = emptyList() })
        assertNull(SpiderSolitaire.deal(withEmpty))
        assertNull(SpiderSolitaire.deal(base.copy(stock = emptyList())))
    }

    @Test fun `a full same-suit run retires to a foundation and scores`() {
        val game = gameWith(
            listOf(
                (13 downTo 2).map { card(0, it) }, // K..2 of spades
                listOf(card(0, 1)) // the ace, one move away
            )
        )
        val moved = SpiderSolitaire.move(game, 1, 0, 0)
        assertNotNull(moved)
        moved!!.let {
            assertEquals(1, it.completed.size)
            assertEquals(0, it.completed.first())
            assertTrue(it.columns[0].isEmpty())
            assertEquals(500 - 1 + 100, it.score)
        }
    }

    @Test fun `mixed-suit K to A does not retire`() {
        val mixed = (13 downTo 1).map { card(if (it % 2 == 0) 0 else 1, it) }
        assertFalse(SpiderSolitaire.hasCompleteRun(mixed))
        assertTrue(SpiderSolitaire.hasCompleteRun((13 downTo 1).map { card(0, it) }))
        assertFalse(SpiderSolitaire.hasCompleteRun((13 downTo 2).map { card(0, it) })) // missing the ace
    }

    @Test fun `eight completions win the game`() {
        val base = gameWith(listOf(listOf(card(0, 1)), emptyList())).copy(completed = List(7) { it % 4 })
        val columns = base.columns.toMutableList()
        columns[0] = (13 downTo 2).map { card(2, it) } // K..2 of clubs
        columns[1] = listOf(card(2, 1)) // the last ace
        val moved = SpiderSolitaire.move(base.copy(columns = columns), 1, 0, 0)
        assertNotNull(moved)
        assertEquals(8, moved!!.completed.size)
        assertEquals(SpiderStatus.WON, moved.status)
    }

    @Test fun `hint prefers a same-suit landing and falls back to the stock`() {
        val game = gameWith(
            listOf(
                listOf(card(1, 6)),
                listOf(card(0, 7)),
                listOf(card(1, 7))
            )
        )
        val hint = SpiderSolitaire.hint(game)
        assertFalse(hint.suggestDeal)
        assertEquals(0, hint.from)
        assertEquals(2, hint.to)

        val stuck = gameWith(
            listOf(
                listOf(card(0, 1)),
                listOf(card(0, 13))
            )
        )
        assertTrue(SpiderSolitaire.hint(stuck).suggestDeal)
    }

    @Test fun `two fresh games differ`() {
        assertNotEquals(
            SpiderSolitaire.newGame(SpiderSuits.FOUR).columns,
            SpiderSolitaire.newGame(SpiderSuits.FOUR).columns
        )
    }

    @Test fun `undo restores a moved run and charges every undo cumulatively`() {
        val start = gameWith(listOf(listOf(card(0, 6), card(0, 5)), listOf(card(1, 7)), emptyList()))
        val history = SpiderHistory()
        history.record(start)
        val moved = SpiderSolitaire.move(start, 0, 0, 1)!!
        history.record(moved)
        val movedAgain = SpiderSolitaire.move(moved, 1, 1, 2)!!
        val undone = history.undo(movedAgain)!!
        assertEquals(moved.columns, undone.columns)
        assertEquals(3, undone.moves)
        assertEquals(497, undone.score)
        assertTrue(history.canUndo)
        val undoneAgain = history.undo(undone)!!
        assertEquals(start.columns, undoneAgain.columns)
        assertEquals(4, undoneAgain.moves)
        assertEquals(496, undoneAgain.score)
        assertFalse(history.canUndo)
        assertNull(history.undo(undoneAgain))
    }

    @Test fun `undo restores stock collections and exposed card backs`() {
        val start = gameWith(listOf(
            listOf(card(0, 9, faceUp = false)) + (13 downTo 2).map { card(0, it) },
            listOf(card(0, 1))
        ))
        val history = SpiderHistory()
        history.record(start)
        val completed = SpiderSolitaire.move(start, 1, 0, 0)!!
        assertEquals(1, completed.completed.size)
        val restored = history.undo(completed)!!
        assertEquals(start.columns, restored.columns)
        assertEquals(start.stock, restored.stock)
        assertTrue(restored.completed.isEmpty())
        assertEquals(498, restored.score)
        assertFalse(restored.columns[0][0].faceUp)
        val dealStart = SpiderSolitaire.newGame(SpiderSuits.ONE, kotlin.random.Random(1))
        history.record(dealStart)
        val dealt = SpiderSolitaire.deal(dealStart)!!
        val undoneDeal = history.undo(dealt)!!
        assertEquals(dealStart.stock, undoneDeal.stock)
        assertEquals(dealStart.columns, undoneDeal.columns)
        assertEquals(-1, undoneDeal.lastDealSerial)
    }

    @Test fun `finished games cannot deal or move and empty runs cannot drop`() {
        val game = SpiderSolitaire.newGame(SpiderSuits.ONE).copy(status = SpiderStatus.WON)
        assertNull(SpiderSolitaire.deal(game))
        assertNull(SpiderSolitaire.move(game, 0, 5, 1))
        assertFalse(SpiderSolitaire.canDrop(emptyList(), emptyList()))
        assertFalse(SpiderSolitaire.canDrop(listOf(card(0, 5)), listOf(card(0, 6, false))))
    }
}
