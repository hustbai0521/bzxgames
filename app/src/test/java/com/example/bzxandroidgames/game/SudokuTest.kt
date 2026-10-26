package com.example.bzxandroidgames.game

import org.junit.Assert.*
import org.junit.Test
import kotlin.random.Random

class SudokuTest {
    private val solved = List(81) { index -> (index / 9 * 3 + index / 27 + index % 9) % 9 + 1 }
    private fun playing(puzzle: List<Int> = List(81) { 0 }) =
        SudokuGame(puzzle = puzzle, status = SudokuStatus.PLAYING)

    @Test(timeout = 15000) fun `all difficulties generate an incomplete unique valid puzzle`() {
        SudokuDifficulty.entries.forEachIndexed { seed, difficulty ->
            val puzzle = Sudoku.generate(difficulty, Random(seed))
            assertEquals(81, puzzle.size)
            assertTrue(puzzle.count { it != 0 } in difficulty.clues..40)
            assertTrue(Sudoku.conflicts(puzzle).isEmpty())
            assertEquals(1, Sudoku.countSolutions(puzzle))
        }
    }

    @Test fun `solution counter handles solved invalid and ambiguous boards without mutation`() {
        assertEquals(1, Sudoku.countSolutions(solved))
        val ambiguous = List(81) { 0 }
        assertEquals(2, Sudoku.countSolutions(ambiguous))
        assertEquals(List(81) { 0 }, ambiguous)
        assertEquals(0, Sudoku.countSolutions(solved.toMutableList().also { it[0] = it[1] }))
        assertEquals(0, Sudoku.countSolutions(List(81) { 10 }))
        assertEquals(0, Sudoku.countSolutions(emptyList()))
    }

    @Test fun `conflicts include both duplicates in row column and every box`() {
        // These pairs share only a box, covering all nine boxes (including bottom right).
        for (boxRow in 0..2) for (boxColumn in 0..2) {
            val first = boxRow * 27 + boxColumn * 3
            val second = first + 10
            val cells = MutableList(81) { 0 }.also { it[first] = 7; it[second] = 7 }
            assertEquals(setOf(first, second), Sudoku.conflicts(cells))
        }
        assertEquals(setOf(0, 8, 72), Sudoku.conflicts(MutableList(81) { 0 }.also {
            it[0] = 3; it[8] = 3; it[72] = 3
        }))
        assertTrue(Sudoku.conflicts(solved).isEmpty())
    }

    @Test fun `given cells are protected and input toggles user digits`() {
        val initial = playing(MutableList(81) { 0 }.also { it[0] = 5 })
        assertEquals(initial.copy(selected = 0), Sudoku.input(initial.copy(selected = 0), 8))
        val selected = Sudoku.select(initial, 1)
        val entered = Sudoku.input(selected, 4)
        assertEquals(4, entered.cells[1])
        assertEquals(0, Sudoku.input(entered, 4).cells[1])
        assertEquals(0, initial.cells[1])
        assertEquals(initial, Sudoku.select(initial, 99))
    }

    @Test fun `notes toggle and undo restores notes after replacing or erasing`() {
        var game = playing().copy(selected = 10, noteMode = true)
        game = Sudoku.input(Sudoku.input(game, 2), 8)
        val notes = (1 shl 1) or (1 shl 7)
        assertEquals(notes, game.notes[10])
        assertEquals(0, game.cells[10])
        assertEquals(1 shl 7, Sudoku.input(game, 2).notes[10])
        val filled = Sudoku.input(game.copy(noteMode = false), 6)
        assertEquals(0, filled.notes[10])
        assertEquals(notes, Sudoku.undo(filled).notes[10])
        assertEquals(0, Sudoku.undo(filled).cells[10])
        val erased = Sudoku.erase(game)
        assertEquals(0, erased.notes[10])
        assertEquals(notes, Sudoku.undo(erased).notes[10])
        assertEquals(filled.copy(noteMode = true), Sudoku.input(filled.copy(noteMode = true), 3))
    }

    @Test fun `winning requires a full valid board and finished or ready games cannot change`() {
        val puzzle = solved.toMutableList().also { it[80] = 0 }
        val game = playing(puzzle).copy(selected = 80)
        assertEquals(SudokuStatus.PLAYING, Sudoku.input(game, solved[0]).status)
        val won = Sudoku.input(game, solved[80])
        assertEquals(SudokuStatus.DONE, won.status)
        assertEquals(won, Sudoku.tick(won))
        assertEquals(won, Sudoku.erase(won))
        assertEquals(won, Sudoku.undo(won))
        val ready = SudokuGame(selected = 0)
        assertEquals(ready, Sudoku.input(ready, 1))
        assertEquals(ready, Sudoku.tick(ready))
        assertEquals(1, Sudoku.tick(game).elapsedSeconds)
    }
}
