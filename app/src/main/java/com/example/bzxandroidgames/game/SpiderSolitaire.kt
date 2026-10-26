package com.example.bzxandroidgames.game

import kotlin.random.Random

/** Suit difficulty: 1/2/4 suits across the eight K..A runs of the two decks. */
enum class SpiderSuits(val count: Int, val title: String, val caption: String) {
    ONE(1, "单花色", "入门 · 8 组黑桃"),
    TWO(2, "双花色", "进阶 · 黑红各半"),
    FOUR(4, "四花色", "大师 · 原汁原味");

    companion object {
        fun fromStorage(key: String?): SpiderSuits =
            entries.firstOrNull { it.name == key } ?: ONE
    }
}

/** suit: 0♠ 1♥ 2♣ 3♦; rank 1..13 (A..K). */
data class SpiderCard(val suit: Int, val rank: Int, val faceUp: Boolean)

enum class SpiderStatus { PLAYING, WON }

data class SpiderGame(
    val suits: SpiderSuits,
    val columns: List<List<SpiderCard>>,
    val stock: List<SpiderCard>,
    val completed: List<Int>,
    val score: Int,
    val moves: Int,
    val status: SpiderStatus = SpiderStatus.PLAYING,
    val serial: Int = 0,
    val lastDealSerial: Int = -1
)

data class SpiderHint(val from: Int, val index: Int, val to: Int, val suggestDeal: Boolean = false)

/** Classic Windows spider rules on two decks: same-suit runs move as one, a full
 *  K..A run retires to a foundation, the stock deals ten cards only onto a full board. */
object SpiderSolitaire {
    const val COLUMN_COUNT = 10
    const val COMPLETIONS_TO_WIN = 8
    const val RUN_SIZE = 13

    fun newGame(suits: SpiderSuits, random: Random = Random.Default): SpiderGame {
        val deck = buildDeck(suits).shuffled(random)
        var cursor = 0
        val columns = List(COLUMN_COUNT) { column ->
            val size = if (column < 4) 6 else 5
            List(size) { row ->
                val (suit, rank) = deck[cursor++]
                SpiderCard(suit, rank, faceUp = row == size - 1)
            }
        }
        val stock = deck.drop(cursor).map { (suit, rank) -> SpiderCard(suit, rank, faceUp = false) }
        return SpiderGame(suits, columns, stock, completed = emptyList(), score = 500, moves = 0)
    }

    fun buildDeck(suits: SpiderSuits): List<Pair<Int, Int>> = buildList {
        repeat(COMPLETIONS_TO_WIN) { pile ->
            val suit = when (suits) {
                SpiderSuits.ONE -> 0
                SpiderSuits.TWO -> if (pile < 4) 0 else 1
                SpiderSuits.FOUR -> pile % 4
            }
            repeat(RUN_SIZE) { rank -> add(suit to (rank + 1)) }
        }
    }

    /** The cards from index to the top form a same-suit descending face-up run. */
    fun movableRun(column: List<SpiderCard>, index: Int): Boolean {
        if (index !in column.indices) return false
        for (i in index until column.size) {
            val card = column[i]
            if (!card.faceUp) return false
            if (i > index) {
                val above = column[i - 1]
                if (card.suit != above.suit || card.rank != above.rank - 1) return false
            }
        }
        return true
    }

    fun canDrop(run: List<SpiderCard>, target: List<SpiderCard>): Boolean =
        run.isNotEmpty() && (target.isEmpty() || (target.last().faceUp && target.last().rank == run.first().rank + 1))

    fun move(game: SpiderGame, from: Int, index: Int, to: Int): SpiderGame? {
        if (game.status != SpiderStatus.PLAYING) return null
        if (from !in game.columns.indices || to !in game.columns.indices || from == to) return null
        if (!movableRun(game.columns[from], index)) return null
        val source = game.columns[from]
        val run = source.subList(index, source.size)
        if (!canDrop(run, game.columns[to])) return null
        val columns = game.columns.toMutableList()
        columns[from] = flipTop(source.subList(0, index).toList())
        columns[to] = flipTop(game.columns[to] + run.toList())
        return settle(game.copy(columns = columns), moves = game.moves + 1)
    }

    /** Deals one card face-up onto each column; refused while any column is empty. */
    fun deal(game: SpiderGame, random: Random = Random.Default): SpiderGame? {
        if (game.status != SpiderStatus.PLAYING) return null
        if (game.stock.size < COLUMN_COUNT) return null
        if (game.columns.any { it.isEmpty() }) return null
        val dealt = game.stock.take(COLUMN_COUNT).map { it.copy(faceUp = true) }
        val columns = game.columns.mapIndexed { column, cards -> cards + dealt[column] }
        return settle(
            game.copy(columns = columns, stock = game.stock.drop(COLUMN_COUNT)),
            moves = game.moves,
            fromDeal = true
        )
    }

    fun hint(game: SpiderGame): SpiderHint {
        data class Candidate(val from: Int, val index: Int, val to: Int, val rank: Int)
        var best: Candidate? = null
        fun consider(candidate: Candidate) {
            if (best == null || candidate.rank > best!!.rank) best = candidate
        }
        for (from in game.columns.indices) {
            val column = game.columns[from]
            var index = column.indexOfFirst { it.faceUp }
            if (index == -1) continue
            while (index < column.size) {
                if (movableRun(column, index)) {
                    val run = column.subList(index, column.size)
                    for (to in game.columns.indices) {
                        if (to == from) continue
                        val target = game.columns[to]
                        if (!canDrop(run, target)) continue
                        var rank = run.size
                        if (target.isNotEmpty() && target.last().suit == run.first().suit) rank += 4
                        if (index > 0 && !column[index - 1].faceUp) rank += 2
                        if (target.isNotEmpty()) rank += 1
                        // shuttling the whole face-up stack to an empty column is rarely useful
                        if (target.isEmpty() && index == 0) rank -= 5
                        consider(Candidate(from, index, to, rank))
                    }
                }
                index++
            }
        }
        val winner = best ?: return SpiderHint(0, 0, 0, suggestDeal = true)
        return SpiderHint(winner.from, winner.index, winner.to)
    }

    fun hasCompleteRun(column: List<SpiderCard>): Boolean {
        if (column.size < RUN_SIZE) return false
        val run = column.takeLast(RUN_SIZE)
        if (run.any { !it.faceUp }) return false
        val suit = run.first().suit
        return run.first().rank == RUN_SIZE &&
            run.indices.all { i -> run[i].suit == suit && run[i].rank == RUN_SIZE - i }
    }

    /** Retires any finished K..A runs, then recomputes score/status/serial. */
    private fun settle(game: SpiderGame, moves: Int, fromDeal: Boolean = false): SpiderGame {
        var columns = game.columns
        var completed = game.completed
        for (column in columns.indices) {
            var cards = columns[column]
            while (hasCompleteRun(cards)) {
                val suit = cards.last().suit
                cards = flipTop(cards.dropLast(RUN_SIZE))
                completed = completed + suit
            }
            if (cards !== columns[column]) columns = columns.toMutableList().also { it[column] = cards }
        }
        val serial = game.serial + 1
        return game.copy(
            columns = columns,
            completed = completed,
            moves = moves,
            score = 500 - moves + 100 * completed.size,
            status = if (completed.size >= COMPLETIONS_TO_WIN) SpiderStatus.WON else SpiderStatus.PLAYING,
            serial = serial,
            lastDealSerial = if (fromDeal) serial else game.lastDealSerial
        )
    }

    private fun flipTop(column: List<SpiderCard>): List<SpiderCard> =
        if (column.isNotEmpty() && !column.last().faceUp)
            column.dropLast(1) + listOf(column.last().copy(faceUp = true))
        else column
}

/** Position snapshots restore cards, while the cumulative move cost never rewinds. */
class SpiderHistory {
    private val positions = ArrayDeque<SpiderGame>()
    val canUndo: Boolean get() = positions.isNotEmpty()

    fun record(game: SpiderGame) { positions.addLast(game) }
    fun clear() { positions.clear() }
    fun undo(current: SpiderGame): SpiderGame? {
        val previous = positions.removeLastOrNull() ?: return null
        val moves = current.moves + 1
        return previous.copy(moves = moves, score = 500 - moves + 100 * previous.completed.size,
            serial = current.serial + 1, lastDealSerial = -1)
    }
}
