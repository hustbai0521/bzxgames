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
    val boardSkin: GomokuBoardSkin = GomokuBoardSkin.CLASSIC,
    /** The human's stone color in PVE; the AI always takes the opposite side. */
    val humanColor: Int = Gomoku.BLACK,
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
                ?: GomokuDifficulty.MEDIUM,
            boardSkin = GomokuBoardSkin.fromStorage(preferences.getString("gomokuBoardSkin", null)),
            humanColor = if (preferences.getString("gomokuHumanColor", null) == "white") Gomoku.WHITE else Gomoku.BLACK
        )
    )
    val state: StateFlow<GomokuUiState> = _state.asStateFlow()

    /** Stone cells in play order; colors alternate black-first, so the color is the parity. */
    private val history = mutableListOf<Int>()

    fun selectMode(mode: GomokuMode) {
        preferences.edit { putString("gomokuMode", mode.name) }
        if (_state.value.mode != mode) resetWith(mode, _state.value.difficulty, _state.value.humanColor)
    }

    fun selectDifficulty(difficulty: GomokuDifficulty) {
        preferences.edit { putString("gomokuDifficulty", difficulty.name) }
        if (_state.value.difficulty != difficulty) resetWith(_state.value.mode, difficulty, _state.value.humanColor)
    }

    /** Skins are cosmetic: switching one keeps the current game untouched. */
    fun selectBoardSkin(skin: GomokuBoardSkin) {
        preferences.edit { putString("gomokuBoardSkin", skin.name) }
        _state.update { if (it.boardSkin != skin) it.copy(boardSkin = skin) else it }
    }

    /**
     * Switching sides is free before the first stone; once the game has started it
     * restarts the board, and if the AI now holds black it opens immediately.
     */
    fun selectHumanColor(color: Int) {
        preferences.edit { putString("gomokuHumanColor", if (color == Gomoku.WHITE) "white" else "black") }
        val current = _state.value
        if (current.humanColor == color) return
        if (current.mode != GomokuMode.PVE) {
            _state.update { it.copy(humanColor = color) }
            return
        }
        if (current.moveCount == 0 && current.winner == null && !current.isDraw && !current.aiThinking) {
            _state.update { it.copy(humanColor = color) }
        } else {
            resetWith(current.mode, current.difficulty, color)
        }
        maybeAiTurn()
    }

    fun restart() = resetWith(_state.value.mode, _state.value.difficulty, _state.value.humanColor)

    fun play(index: Int) {
        val current = _state.value
        if (current.winner != null || current.isDraw || current.aiThinking) return
        if (index !in 0 until Gomoku.CELL_COUNT || current.board[index] != Gomoku.EMPTY) return
        if (current.mode == GomokuMode.PVE && current.currentPlayer != current.humanColor) return
        applyMove(index, current.currentPlayer)
        maybeAiTurn()
    }

    /** In PVE one undo rewinds to the human's turn, whatever color each side holds. */
    fun undo() {
        val current = _state.value
        if (current.aiThinking || history.isEmpty()) return
        val steps = if (current.mode == GomokuMode.PVP) 1 else {
            // after popping, history parity must leave the turn with the human:
            // black moves on even counts (0-indexed parity), white on odd counts
            val wantOdd = current.humanColor == Gomoku.WHITE
            if (history.size % 2 == 0) { if (wantOdd) 1 else 2 } else { if (wantOdd) 2 else 1 }
        }.coerceAtMost(history.size)
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
        // when the human plays white, undoing the AI's opening stone means the AI opens again
        maybeAiTurn()
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
        val ai = Gomoku.opponent(current.humanColor)
        if (current.currentPlayer != ai || current.aiThinking) return
        val position = current.moveId
        _state.update { it.copy(aiThinking = true) }
        viewModelScope.launch {
            delay(220)
            val board = _state.value.board
            val difficulty = _state.value.difficulty
            val move = withContext(Dispatchers.Default) {
                Gomoku.bestMove(board, ai, difficulty, random)
            }
            // Drop the reply if the position changed (restart, undo or side switch) meanwhile.
            val now = _state.value
            if (now.aiThinking && now.winner == null && !now.isDraw &&
                now.currentPlayer == ai && now.moveId == position && now.board == board
            ) {
                applyMove(move, ai)
            } else if (now.moveId == position && now.aiThinking) {
                _state.update { it.copy(aiThinking = false) }
            }
        }
    }

    private fun resetWith(mode: GomokuMode, difficulty: GomokuDifficulty, humanColor: Int) {
        history.clear()
        _state.update {
            GomokuUiState(
                mode = mode,
                difficulty = difficulty,
                boardSkin = it.boardSkin,
                humanColor = humanColor,
                moveId = it.moveId + 1
            )
        }
        maybeAiTurn()
    }
}
