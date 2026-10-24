package com.example.bzxandroidgames.game

import android.app.Application
import androidx.core.content.edit
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.random.Random

data class GomokuUiState(
    val board: List<Int> = Gomoku.emptyBoard(),
    val mode: GomokuMode = GomokuMode.PVE,
    val difficulty: GomokuDifficulty = GomokuDifficulty.MEDIUM,
    val currentPlayer: Int = Gomoku.BLACK,
    val winner: Int? = null,
    val isDraw: Boolean = false,
    val winningLine: List<Int> = emptyList(),
    val lastMove: Int? = null,
    val moveCount: Int = 0,
    val canUndo: Boolean = false,
    val aiThinking: Boolean = false,
    val moveId: Int = 0
)

class GomokuViewModel(application: Application) : AndroidViewModel(application) {
    private val preferences = application.getSharedPreferences("game", 0)
    private val random = Random.Default
    private val _state = MutableStateFlow(
        GomokuUiState(
            mode = GomokuMode.entries.firstOrNull { it.name == preferences.getString("gomokuMode", null) }
                ?: GomokuMode.PVE,
            difficulty = GomokuDifficulty.entries.firstOrNull { it.name == preferences.getString("gomokuDifficulty", null) }
                ?: GomokuDifficulty.MEDIUM
        )
    )
    val state: StateFlow<GomokuUiState> = _state.asStateFlow()

    /** Stone cells in play order; colors alternate black-first, so the color is the parity. */
    private val history = mutableListOf<Int>()

    fun selectMode(mode: GomokuMode) {
        preferences.edit { putString("gomokuMode", mode.name) }
        if (_state.value.mode != mode) resetWith(mode, _state.value.difficulty)
    }

    fun selectDifficulty(difficulty: GomokuDifficulty) {
        preferences.edit { putString("gomokuDifficulty", difficulty.name) }
        if (_state.value.difficulty != difficulty) resetWith(_state.value.mode, difficulty)
    }

    fun restart() = resetWith(_state.value.mode, _state.value.difficulty)

    fun play(index: Int) {
        val current = _state.value
        if (current.winner != null || current.isDraw || current.aiThinking) return
        if (index !in 0 until Gomoku.CELL_COUNT || current.board[index] != Gomoku.EMPTY) return
        if (current.mode == GomokuMode.PVE && current.currentPlayer != Gomoku.BLACK) return
        applyMove(index, current.currentPlayer)
        maybeAiTurn()
    }

    /** In PVE one undo rewinds to the human's turn: drop the AI reply plus the human move,
     *  or just the human's game-ending stone when it ended the game. */
    fun undo() {
        val current = _state.value
        if (current.aiThinking || history.isEmpty()) return
        val steps = when {
            current.mode == GomokuMode.PVP -> 1
            history.size % 2 == 0 -> 2
            else -> 1
        }
        repeat(steps) { history.removeAt(history.size - 1) }
        val board = Gomoku.emptyBoard().toMutableList()
        history.forEachIndexed { index, cell ->
            board[cell] = if (index % 2 == 0) Gomoku.BLACK else Gomoku.WHITE
        }
        _state.update { s ->
            val nextPlayer = if (history.isEmpty()) Gomoku.BLACK
                else Gomoku.opponent(if ((history.size - 1) % 2 == 0) Gomoku.BLACK else Gomoku.WHITE)
            s.copy(
                board = board,
                currentPlayer = nextPlayer,
                winner = null,
                isDraw = false,
                winningLine = emptyList(),
                lastMove = history.lastOrNull(),
                moveCount = history.size,
                canUndo = history.isNotEmpty(),
                moveId = s.moveId + 1
            )
        }
    }

    private fun applyMove(index: Int, player: Int) {
        history += index
        _state.update { s ->
            val board = s.board.toMutableList()
            board[index] = player
            val line = Gomoku.winningLine(board, index)
            val draw = line == null && Gomoku.isFull(board)
            s.copy(
                board = board,
                currentPlayer = if (line != null || draw) s.currentPlayer else Gomoku.opponent(player),
                winner = line?.let { player },
                isDraw = draw,
                winningLine = line ?: emptyList(),
                lastMove = index,
                moveCount = s.moveCount + 1,
                canUndo = true,
                aiThinking = false,
                moveId = s.moveId + 1
            )
        }
    }

    private fun maybeAiTurn() {
        val current = _state.value
        if (current.mode != GomokuMode.PVE || current.winner != null || current.isDraw) return
        val position = current.moveId
        _state.update { it.copy(aiThinking = true) }
        viewModelScope.launch {
            delay(220)
            val board = _state.value.board
            val difficulty = _state.value.difficulty
            val move = withContext(Dispatchers.Default) {
                Gomoku.bestMove(board, Gomoku.WHITE, difficulty, random)
            }
            // Drop the reply if the position changed (restart, undo or mode switch) meanwhile.
            val now = _state.value
            if (now.aiThinking && now.winner == null && !now.isDraw &&
                now.currentPlayer == Gomoku.WHITE && now.moveId == position && now.board == board
            ) {
                applyMove(move, Gomoku.WHITE)
            } else if (now.moveId == position && now.aiThinking) {
                _state.update { it.copy(aiThinking = false) }
            }
        }
    }

    private fun resetWith(mode: GomokuMode, difficulty: GomokuDifficulty) {
        history.clear()
        _state.update {
            GomokuUiState(mode = mode, difficulty = difficulty, moveId = it.moveId + 1)
        }
    }
}
