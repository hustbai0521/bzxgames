package com.example.bzxandroidgames.game

import kotlin.random.Random

data class SnakePoint(val x: Int, val y: Int)

enum class SnakeDir { UP, DOWN, LEFT, RIGHT }

enum class SnakeStatus { READY, PLAYING, PAUSED, OVER, WON }

data class SnakeUiState(
    val snake: List<SnakePoint> = emptyList(),  // head first
    val food: SnakePoint = SnakePoint(0, 0),
    val dir: SnakeDir = SnakeDir.RIGHT,
    val pendingDir: SnakeDir = SnakeDir.RIGHT,  // applied on the next tick, one turn per tick
    val score: Int = 0,
    val best: Int = 0,
    val eaten: Int = 0,
    val status: SnakeStatus = SnakeStatus.PLAYING,
    val moveId: Int = 0,
    val tickInterval: Long = 180L
)

/** Classic snake on a square plot: eat, grow, and never touch walls or yourself. */
object Snake {
    const val SIZE = 15
    private const val BASE_INTERVAL = 180L
    private const val FASTEST_INTERVAL = 90L

    fun newGame(best: Int, random: Random = Random.Default): SnakeUiState {
        val snake = listOf(SnakePoint(7, 7), SnakePoint(6, 7), SnakePoint(5, 7))
        return SnakeUiState(
            snake = snake,
            food = randomFreeCell(snake, random),
            best = best,
            status = SnakeStatus.READY
        )
    }

    /** The plot is laid out on arrival; the run begins when the player taps start. */
    fun started(state: SnakeUiState): SnakeUiState =
        if (state.status == SnakeStatus.READY) state.copy(status = SnakeStatus.PLAYING) else state

    fun turn(state: SnakeUiState, dir: SnakeDir): SnakeUiState {
        if (state.status != SnakeStatus.PLAYING || dir == opposite(state.dir)) return state
        return state.copy(pendingDir = dir)
    }

    fun tick(state: SnakeUiState, random: Random = Random.Default): SnakeUiState {
        if (state.status != SnakeStatus.PLAYING) return state
        val dir = state.pendingDir
        val next = state.snake.first().let { SnakePoint(it.x + dx(dir), it.y + dy(dir)) }
        if (next.x !in 0 until SIZE || next.y !in 0 until SIZE) return died(state)
        val eating = next == state.food
        // when not growing the tail vacates this tick, so it is safe to follow
        val body = if (eating) state.snake else state.snake.dropLast(1)
        if (body.any { it == next }) return died(state)
        val grown = listOf(next) + state.snake
        if (!eating) {
            return state.copy(snake = grown.dropLast(1), dir = dir, moveId = state.moveId + 1)
        }
        val score = state.score + 10
        val eaten = state.eaten + 1
        val free = freeCells(grown)
        if (free.isEmpty()) {
            return state.copy(
                snake = grown, dir = dir, score = score, eaten = eaten,
                best = maxOf(state.best, score), status = SnakeStatus.WON, moveId = state.moveId + 1
            )
        }
        return state.copy(
            snake = grown, dir = dir, food = free.random(random),
            score = score, eaten = eaten, best = maxOf(state.best, score),
            moveId = state.moveId + 1,
            tickInterval = (BASE_INTERVAL - eaten * 4L).coerceAtLeast(FASTEST_INTERVAL)
        )
    }

    fun paused(state: SnakeUiState): SnakeUiState =
        if (state.status == SnakeStatus.PLAYING) state.copy(status = SnakeStatus.PAUSED) else state

    fun resumed(state: SnakeUiState): SnakeUiState =
        if (state.status == SnakeStatus.PAUSED) state.copy(status = SnakeStatus.PLAYING) else state

    private fun died(state: SnakeUiState): SnakeUiState =
        state.copy(status = SnakeStatus.OVER, best = maxOf(state.best, state.score))

    private fun freeCells(snake: List<SnakePoint>): List<SnakePoint> =
        (0 until SIZE * SIZE)
            .map { SnakePoint(it % SIZE, it / SIZE) }
            .filterNot { cell -> snake.any { it == cell } }

    private fun randomFreeCell(snake: List<SnakePoint>, random: Random): SnakePoint =
        freeCells(snake).random(random)

    fun dx(dir: SnakeDir): Int = when (dir) {
        SnakeDir.LEFT -> -1; SnakeDir.RIGHT -> 1; else -> 0
    }

    fun dy(dir: SnakeDir): Int = when (dir) {
        SnakeDir.UP -> -1; SnakeDir.DOWN -> 1; else -> 0
    }

    private fun opposite(dir: SnakeDir): SnakeDir = when (dir) {
        SnakeDir.UP -> SnakeDir.DOWN
        SnakeDir.DOWN -> SnakeDir.UP
        SnakeDir.LEFT -> SnakeDir.RIGHT
        SnakeDir.RIGHT -> SnakeDir.LEFT
    }
}
