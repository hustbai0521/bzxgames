package com.example.bzxandroidgames.game

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SnakeTest {

    private fun state(
        snake: List<SnakePoint>,
        dir: SnakeDir,
        food: SnakePoint = SnakePoint(0, 0)
    ): SnakeUiState = SnakeUiState(snake = snake, dir = dir, pendingDir = dir, food = food)

    @Test fun `new game waits ready with food off the snake`() {
        val game = Snake.newGame(0)
        assertEquals(3, game.snake.size)
        assertEquals(SnakePoint(7, 7), game.snake.first())
        assertTrue(game.food !in game.snake)
        assertEquals(SnakeStatus.READY, game.status)
        assertEquals(180L, game.tickInterval)
        // tapping start flips ready into play; anything else is left alone
        assertEquals(SnakeStatus.PLAYING, Snake.started(game).status)
        assertEquals(SnakeStatus.PAUSED, Snake.started(game.copy(status = SnakeStatus.PAUSED)).status)
    }

    @Test fun `reversing into the neck is refused, other turns queue up`() {
        val game = state(listOf(SnakePoint(5, 5), SnakePoint(4, 5)), SnakeDir.RIGHT)
        assertEquals(SnakeDir.RIGHT, Snake.turn(game, SnakeDir.LEFT).pendingDir)
        assertEquals(SnakeDir.UP, Snake.turn(game, SnakeDir.UP).pendingDir)
        // a ready game ignores turns until it starts
        assertEquals(SnakeDir.RIGHT, Snake.turn(game.copy(status = SnakeStatus.READY), SnakeDir.UP).pendingDir)
    }

    @Test fun `the snake glides one cell per tick`() {
        val game = Snake.newGame(0).copy(status = SnakeStatus.PLAYING)
        val moved = Snake.tick(game)
        assertEquals(SnakePoint(8, 7), moved.snake.first())
        assertEquals(3, moved.snake.size)
        assertEquals(SnakeDir.RIGHT, moved.dir)
    }

    @Test fun `walls kill`() {
        val game = state(listOf(SnakePoint(14, 7), SnakePoint(13, 7)), SnakeDir.RIGHT)
        assertEquals(SnakeStatus.OVER, Snake.tick(game).status)
        val left = state(listOf(SnakePoint(0, 7), SnakePoint(1, 7)), SnakeDir.LEFT)
        assertEquals(SnakeStatus.OVER, Snake.tick(left).status)
    }

    @Test fun `running into your own body kills`() {
        // the head sits right beside its neck; stepping onto it is fatal
        val game = state(
            listOf(SnakePoint(1, 1), SnakePoint(2, 1), SnakePoint(3, 1)),
            SnakeDir.RIGHT
        )
        assertEquals(SnakeStatus.OVER, Snake.tick(game).status)
    }

    @Test fun `following the tail is safe because it vacates`() {
        // the head moves into the cell the tail is leaving this very tick
        val game = state(
            listOf(SnakePoint(1, 1), SnakePoint(2, 1), SnakePoint(2, 2), SnakePoint(1, 2)),
            SnakeDir.DOWN
        )
        val moved = Snake.tick(game)
        assertEquals(SnakeStatus.PLAYING, moved.status)
        assertEquals(SnakePoint(1, 2), moved.snake.first())
        assertEquals(4, moved.snake.size)
    }

    @Test fun `eating grows the snake, scores and speeds up`() {
        val game = state(
            listOf(SnakePoint(1, 1), SnakePoint(0, 1)),
            SnakeDir.RIGHT,
            food = SnakePoint(2, 1)
        )
        val fed = Snake.tick(game)
        assertEquals(listOf(SnakePoint(2, 1), SnakePoint(1, 1), SnakePoint(0, 1)), fed.snake)
        assertEquals(10, fed.score)
        assertEquals(10, fed.best)
        assertEquals(1, fed.eaten)
        assertEquals(176L, fed.tickInterval)
        assertNotEquals(SnakePoint(2, 1), fed.food)
        assertTrue(fed.food !in fed.snake)
    }

    @Test fun `filling the whole plot wins`() {
        // a serpentine path covers every cell but the food; eating it fills the plot
        val cells = mutableListOf<SnakePoint>()
        for (row in 0 until Snake.SIZE) {
            for (k in 0 until Snake.SIZE) {
                val column = if (row % 2 == 0) k else Snake.SIZE - 1 - k
                cells.add(SnakePoint(column, row))
            }
        }
        val food = SnakePoint(Snake.SIZE - 1, Snake.SIZE - 1)
        val snake = cells.filterNot { it == food }.reversed()  // head = (13,14), next to the food
        val state = SnakeUiState(snake = snake, dir = SnakeDir.RIGHT, pendingDir = SnakeDir.RIGHT, food = food)
        val won = Snake.tick(state)
        assertEquals(SnakeStatus.WON, won.status)
        assertEquals(Snake.SIZE * Snake.SIZE, won.snake.size)
        assertEquals(10, won.score)
    }

    @Test fun `pause and resume only toggle each other`() {
        val game = Snake.newGame(0).copy(status = SnakeStatus.PLAYING)
        assertEquals(SnakeStatus.PAUSED, Snake.paused(game).status)
        assertEquals(SnakeStatus.PLAYING, Snake.resumed(Snake.paused(game)).status)
        assertEquals(SnakeStatus.PAUSED, Snake.paused(Snake.paused(game)).status)
        // a ready game is untouched by pause
        assertEquals(SnakeStatus.READY, Snake.paused(Snake.newGame(0)).status)
    }
}
