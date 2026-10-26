package com.example.bzxandroidgames.game

import android.app.Application
import androidx.core.content.edit
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class SudokuUiState(val game: SudokuGame, val bestSeconds: Int? = null, val newRecord: Boolean = false)

class SudokuViewModel(application: Application) : AndroidViewModel(application) {
    private val preferences = application.getSharedPreferences("game", 0)
    private var generation: Job? = null
    private val _state = MutableStateFlow(readyState(
        SudokuDifficulty.fromStorage(preferences.getString("sudokuDifficulty", null))
    ))
    val state = _state.asStateFlow()

    private fun readyState(difficulty: SudokuDifficulty) = SudokuUiState(
        game = SudokuGame(difficulty = difficulty, noteMode = preferences.getBoolean("sudokuNoteMode", false)),
        bestSeconds = preferences.getInt("sudokuBest_${difficulty.name}", -1).takeIf { it >= 0 }
    )

    fun start() {
        val current = _state.value
        if (current.game.status != SudokuStatus.READY) return
        _state.value = current.copy(game = current.game.copy(status = SudokuStatus.GENERATING))
        generation = viewModelScope.launch {
            val puzzle = withContext(Dispatchers.Default) { Sudoku.generate(current.game.difficulty) }
            _state.value = current.copy(game = current.game.copy(
                puzzle = puzzle, cells = puzzle, status = SudokuStatus.PLAYING
            ))
        }
    }

    fun restart() {
        generation?.cancel()
        _state.value = readyState(_state.value.game.difficulty)
    }

    fun selectDifficulty(difficulty: SudokuDifficulty) {
        if (difficulty == _state.value.game.difficulty) return
        generation?.cancel()
        preferences.edit { putString("sudokuDifficulty", difficulty.name) }
        _state.value = readyState(difficulty)
    }

    fun select(index: Int) { _state.value = _state.value.let { it.copy(game = Sudoku.select(it.game, index)) } }
    fun erase() { _state.value = _state.value.let { it.copy(game = Sudoku.erase(it.game)) } }
    fun undo() { _state.value = _state.value.let { it.copy(game = Sudoku.undo(it.game)) } }
    fun tick() { _state.value = _state.value.let { it.copy(game = Sudoku.tick(it.game)) } }

    fun toggleNotes() {
        val current = _state.value
        if (current.game.status != SudokuStatus.PLAYING) return
        val enabled = !current.game.noteMode
        preferences.edit { putBoolean("sudokuNoteMode", enabled) }
        _state.value = current.copy(game = current.game.copy(noteMode = enabled))
    }

    fun input(digit: Int) {
        val current = _state.value
        val game = Sudoku.input(current.game, digit)
        if (game.status == SudokuStatus.DONE && current.game.status == SudokuStatus.PLAYING) {
            val record = current.bestSeconds == null || game.elapsedSeconds < current.bestSeconds
            if (record) preferences.edit { putInt("sudokuBest_${game.difficulty.name}", game.elapsedSeconds) }
            _state.value = current.copy(game = game,
                bestSeconds = if (record) game.elapsedSeconds else current.bestSeconds, newRecord = record)
        } else _state.value = current.copy(game = game)
    }
}
