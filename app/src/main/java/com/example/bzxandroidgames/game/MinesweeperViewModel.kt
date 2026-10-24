package com.example.bzxandroidgames.game

import android.app.Application
import androidx.core.content.edit
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlin.random.Random

data class MinesweeperUiState(
    val level: MinesweeperDifficulty = MinesweeperDifficulty.HARD,
    val board: List<MinesweeperCell> = Minesweeper.emptyBoard(MinesweeperDifficulty.HARD),
    val status: MinesweeperStatus = MinesweeperStatus.PLAYING,
    val flagsUsed: Int = 0,
    val timeSeconds: Int = 0,
    val flagMode: Boolean = false,
    val opened: List<Int> = emptyList(),
    val moveId: Int = 0
)

class MinesweeperViewModel(application: Application) : AndroidViewModel(application) {
    private val preferences = application.getSharedPreferences("game", 0)
    private val random = Random.Default
    private val _state = MutableStateFlow(
        (preferences.getString("minesDifficulty", null)
            ?.let { saved -> MinesweeperDifficulty.entries.firstOrNull { it.name == saved } })
            ?.let { level -> MinesweeperUiState(level = level, board = Minesweeper.emptyBoard(level)) }
            ?: MinesweeperUiState()
    )
    val state: StateFlow<MinesweeperUiState> = _state.asStateFlow()

    private var timerJob: Job? = null

    fun selectDifficulty(level: MinesweeperDifficulty) {
        preferences.edit { putString("minesDifficulty", level.name) }
        if (_state.value.level == level) return
        timerJob?.cancel()
        _state.update {
            MinesweeperUiState(level = level, flagMode = it.flagMode, moveId = it.moveId + 1)
        }
    }

    fun reveal(index: Int) {
        val current = _state.value
        if (current.status != MinesweeperStatus.PLAYING) return
        if (current.flagMode) return // flag mode is flag-only; never opens ground
        val cell = current.board[index]
        if (cell.flagged) return
        if (cell.revealed && cell.adjacent == 0) return
        applyMove(Minesweeper.reveal(current.board, index, current.level, random))
    }

    fun toggleFlag(index: Int) {
        val current = _state.value
        if (current.status != MinesweeperStatus.PLAYING) return
        val cell = current.board[index]
        if (cell.revealed && cell.adjacent == 0) return
        val board = Minesweeper.toggleFlag(current.board, index)
        if (board === current.board) return
        _state.update {
            it.copy(board = board, flagsUsed = Minesweeper.flagsUsed(board), moveId = it.moveId + 1)
        }
    }

    fun toggleFlagMode() = _state.update { it.copy(flagMode = !it.flagMode) }

    fun restart() {
        timerJob?.cancel()
        timerJob = null
        _state.update {
            MinesweeperUiState(
                level = it.level,
                board = Minesweeper.emptyBoard(it.level),
                flagMode = it.flagMode,
                moveId = it.moveId + 1
            )
        }
    }

    private fun applyMove(move: MinesweeperMove) {
        if (move.status == MinesweeperStatus.PLAYING && move.opened.isEmpty()) return
        val started = _state.value.board.none { it.mine } && move.board.any { it.mine }
        _state.update {
            it.copy(
                board = move.board,
                status = move.status,
                flagsUsed = Minesweeper.flagsUsed(move.board),
                opened = move.opened,
                moveId = it.moveId + 1
            )
        }
        if (started) startTimer()
        if (move.status != MinesweeperStatus.PLAYING) {
            timerJob?.cancel()
            timerJob = null
        }
    }

    private fun startTimer() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (true) {
                delay(1000)
                _state.update { s ->
                    if (s.status == MinesweeperStatus.PLAYING && s.timeSeconds < 999)
                        s.copy(timeSeconds = s.timeSeconds + 1)
                    else s
                }
            }
        }
    }
}
