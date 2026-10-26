package com.example.bzxandroidgames.game

import kotlin.random.Random

/** One tile on the board; type indexes the fruit/vegetable/tool icon set. */
data class LinkTile(val id: Int, val type: Int)

enum class LinkStatus { PLAYING, OVER }  // OVER = every pair matched

data class LinkUiState(
    val grid: List<LinkTile?> = emptyList(),  // rows*cols, null = cleared
    val cols: Int = LinkLink.COLS,
    val rows: Int = LinkLink.ROWS,
    val selected: Int? = null,
    val matchedPath: List<Pair<Int, Int>>? = null,  // waypoints in extended grid coords
    val clearId: Int = 0,
    val matched: Int = 0,
    val totalPairs: Int = LinkLink.TOTAL_PAIRS,
    val shuffles: Int = 0,
    val elapsedSeconds: Int = 0,
    val hint: Pair<Int, Int>? = null,
    val hintSerial: Int = 0,
    val status: LinkStatus = LinkStatus.PLAYING
)

/** Classic 连连看: remove identical tiles connectable by at most two bends; paths may
 *  travel through the open border around the board. Icons are fruit/vegetable/tool. */
object LinkLink {
    const val COLS = 8
    const val ROWS = 12
    const val TYPES = 10
    const val TOTAL_PAIRS = COLS * ROWS / 2

    val typeNames = listOf("苹果", "橙子", "香蕉", "葡萄", "西瓜", "胡萝卜", "蘑菇", "玉米", "扳手", "锤子")

    fun newGame(random: Random = Random.Default): LinkUiState {
        // four-to-five pairs of each of the 10 types, then a hard scramble:
        // same-type tiles are spread apart and the deal is guaranteed to have a move
        val types = List(TOTAL_PAIRS) { pair -> pair % TYPES }
        val tiles = (types + types).shuffled(random)
        var state = LinkUiState(grid = decluster(tiles.mapIndexed { index, type -> LinkTile(id = index, type = type) }, COLS, ROWS, random))
        var tries = 0
        while (!hasMoves(state.grid) && tries < 30) {
            state = state.copy(grid = decluster(shuffleTiles(state, random).grid, COLS, ROWS, random))
            tries++
        }
        return state
    }

    /** The polyline of waypoints through extended coords when a and b connect, else null. */
    fun connectPath(grid: List<LinkTile?>, cols: Int = COLS, rows: Int = ROWS, a: Int, b: Int): List<Pair<Int, Int>>? {
        if (a == b || a !in grid.indices || b !in grid.indices) return null
        val tileA = grid[a]
        val tileB = grid[b]
        if (tileA == null || tileB == null || tileA.type != tileB.type) return null
        val ax = a % cols
        val ay = a / cols
        val bx = b % cols
        val by = b / cols

        fun tile(x: Int, y: Int): LinkTile? =
            if (x in 0 until cols && y in 0 until rows) grid[y * cols + x] else null

        // an open segment: every cell strictly between the endpoints is empty
        fun clear(x1: Int, y1: Int, x2: Int, y2: Int): Boolean = when {
            y1 == y2 -> (minOf(x1, x2) + 1 until maxOf(x1, x2)).all { x -> tile(x, y1) == null }
            x1 == x2 -> (minOf(y1, y2) + 1 until maxOf(y1, y2)).all { y -> tile(x1, y) == null }
            else -> false
        }

        // zero bends
        if ((ax == bx || ay == by) && clear(ax, ay, bx, by)) {
            return listOf(ax to ay, bx to by)
        }
        // one bend
        for (corner in listOf(ax to by, bx to ay)) {
            if (tile(corner.first, corner.second) == null &&
                clear(ax, ay, corner.first, corner.second) &&
                clear(corner.first, corner.second, bx, by)
            ) {
                return listOf(ax to ay, corner, bx to by)
            }
        }
        // two bends: slide a perpendicular bar across the extended board
        for (x in -1..cols) {
            if (tile(x, ay) == null && tile(x, by) == null &&
                clear(ax, ay, x, ay) && clear(x, ay, x, by) && clear(x, by, bx, by)
            ) {
                return listOf(ax to ay, x to ay, x to by, bx to by)
            }
        }
        for (y in -1..rows) {
            if (tile(ax, y) == null && tile(bx, y) == null &&
                clear(ax, ay, ax, y) && clear(ax, y, bx, y) && clear(bx, y, bx, by)
            ) {
                return listOf(ax to ay, ax to y, bx to y, bx to by)
            }
        }
        return null
    }

    fun hasMoves(grid: List<LinkTile?>, cols: Int = COLS, rows: Int = ROWS): Boolean {
        val occupied = grid.indices.filter { grid[it] != null }
        for (i in occupied.indices) {
            for (j in i + 1 until occupied.size) {
                val a = occupied[i]
                val b = occupied[j]
                if (grid[a]!!.type == grid[b]!!.type && connectPath(grid, cols, rows, a, b) != null) return true
            }
        }
        return false
    }

    fun select(state: LinkUiState, index: Int, random: Random = Random.Default): LinkUiState {
        if (state.status != LinkStatus.PLAYING || state.grid.getOrNull(index) == null) return state
        val selected = state.selected
        if (selected == null || selected == index) {
            return state.copy(selected = if (selected == index) null else index)
        }
        val tileA = state.grid[selected]!!
        val tileB = state.grid[index]!!
        if (tileA.type == tileB.type) {
            val path = connectPath(state.grid, state.cols, state.rows, selected, index)
            if (path != null) {
                val grid = state.grid.toMutableList()
                grid[selected] = null
                grid[index] = null
                val matched = state.matched + 1
                val won = matched == state.totalPairs
                val cleared = state.copy(
                    grid = grid,
                    selected = null,
                    matched = matched,
                    matchedPath = path,
                    clearId = state.clearId + 1,
                    hint = null,
                    status = if (won) LinkStatus.OVER else LinkStatus.PLAYING
                )
                return if (won) cleared else ensureMoves(cleared, random)
            }
        }
        return state.copy(selected = index)
    }

    fun hint(state: LinkUiState): LinkUiState {
        val occupied = state.grid.indices.filter { state.grid[it] != null }
        for (i in occupied.indices) {
            for (j in i + 1 until occupied.size) {
                val a = occupied[i]
                val b = occupied[j]
                if (state.grid[a]!!.type == state.grid[b]!!.type && connectPath(state.grid, state.cols, state.rows, a, b) != null) {
                    return state.copy(hint = a to b, hintSerial = state.hintSerial + 1)
                }
            }
        }
        return state
    }

    fun shuffleTiles(state: LinkUiState, random: Random): LinkUiState {
        val occupied = state.grid.indices.filter { state.grid[it] != null }
        val types = occupied.map { state.grid[it]!!.type }.shuffled(random)
        val grid = state.grid.toMutableList()
        occupied.forEachIndexed { position, index -> grid[index] = grid[index]!!.copy(type = types[position]) }
        return state.copy(grid = grid, selected = null, hint = null)
    }

    /** Manual reshuffle: hard scramble of the remaining tiles, always left with a move. */
    /** Manual reshuffle: hard scramble of the remaining tiles, always left with a move.
     *  The declustered tries remove free adjacent matches; if a tiny board somehow still
     *  ends up dead (its only moves may BE adjacent pairs), a plain reshuffle bails it out. */
    fun reshuffle(state: LinkUiState, random: Random = Random.Default): LinkUiState {
        var candidate = state.copy(grid = decluster(shuffleTiles(state, random).grid, state.cols, state.rows, random))
        var tries = 0
        while (!hasMoves(candidate.grid, candidate.cols, candidate.rows) && tries < 30) {
            candidate = candidate.copy(grid = decluster(shuffleTiles(candidate, random).grid, candidate.cols, candidate.rows, random))
            tries++
        }
        var fallback = 0
        while (!hasMoves(candidate.grid, candidate.cols, candidate.rows) && fallback < 60) {
            candidate = candidate.copy(grid = shuffleTiles(candidate, random).grid)
            fallback++
        }
        return candidate.copy(shuffles = state.shuffles + 1)
    }

    /** Reshuffles the remaining tiles only when the board has run dry (bounded retries). */
    fun ensureMoves(state: LinkUiState, random: Random = Random.Default): LinkUiState {
        if (hasMoves(state.grid, state.cols, state.rows)) return state
        return reshuffle(state, random)
    }

    /** Swaps tiles until no two identical icons sit orthogonally side by side — the
     *  deal reads properly scrambled and there are no free adjacent matches. */
    private fun decluster(
        grid: List<LinkTile?>,
        cols: Int,
        rows: Int,
        random: Random,
        passes: Int = 2000
    ): List<LinkTile?> {
        var current = grid
        repeat(passes) {
            val clash = firstOrthogonalPair(current, cols, rows) ?: return current
            val others = current.indices.filter { index ->
                val tile = current[index]
                tile != null && tile.type != current[clash.first]!!.type && index != clash.second
            }
            if (others.isEmpty()) return current
            val swapWith = others.random(random)
            val swapped = current.toMutableList()
            val moved = swapped[clash.first]
            swapped[clash.first] = swapped[swapWith]
            swapped[swapWith] = moved
            current = swapped
        }
        return current
    }

    private fun firstOrthogonalPair(grid: List<LinkTile?>, cols: Int = COLS, rows: Int = ROWS): Pair<Int, Int>? {
        for (y in 0 until rows) {
            for (x in 0 until cols) {
                val index = y * cols + x
                val tile = grid[index] ?: continue
                if (x + 1 < cols) {
                    val right = grid[index + 1]
                    if (right != null && right.type == tile.type) return index to index + 1
                }
                if (y + 1 < rows) {
                    val below = grid[index + cols]
                    if (below != null && below.type == tile.type) return index to index + cols
                }
            }
        }
        return null
    }

    fun tick(state: LinkUiState): LinkUiState =
        if (state.status == LinkStatus.PLAYING) state.copy(elapsedSeconds = state.elapsedSeconds + 1) else state
}
