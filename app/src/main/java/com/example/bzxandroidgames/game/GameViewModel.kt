package com.example.bzxandroidgames.game

import android.app.Application
import androidx.core.content.edit
import androidx.lifecycle.AndroidViewModel
import com.example.bzxandroidgames.ui.theme.GameTheme
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class GameUiState(
    val board: List<Int> = Game2048.emptyBoard(),
    val score: Int = 0,
    val best: Int = 0,
    val canUndo: Boolean = false,
    val gameOver: Boolean = false,
    val won: Boolean = false,
    val keepPlaying: Boolean = false,
    val moveId: Int = 0,
    val mergedCells: List<Int> = emptyList()
)

class GameViewModel(application: Application) : AndroidViewModel(application) {
    private val preferences = application.getSharedPreferences("game", 0)
    private val _theme = MutableStateFlow(GameTheme.fromStorage(preferences.getString("theme", null)))
    val theme: StateFlow<GameTheme> = _theme.asStateFlow()
    private val _state = MutableStateFlow(
        GameUiState(board = Game2048.newGame(), best = preferences.getInt("best", 0))
    )
    val state: StateFlow<GameUiState> = _state.asStateFlow()
    private var previous: Pair<List<Int>, Int>? = null

    fun setTheme(theme: GameTheme) {
        _theme.value = theme
        preferences.edit { putString("theme", theme.storageKey) }
    }

    fun move(direction: Direction) {
        val current = _state.value
        if (current.gameOver || (current.won && !current.keepPlaying)) return
        val result = Game2048.move(current.board, direction)
        if (!result.moved) return
        previous = current.board to current.score
        val board = Game2048.addRandomTile(result.board)
        val score = current.score + result.gainedScore
        val best = maxOf(score, current.best)
        if (best != current.best) preferences.edit { putInt("best", best) }
        _state.value = current.copy(
            board = board,
            score = score,
            best = best,
            canUndo = true,
            gameOver = Game2048.isGameOver(board),
            won = current.won || Game2048.hasWon(board),
            moveId = current.moveId + 1,
            mergedCells = result.mergedIndices
        )
    }

    fun undo() {
        val snapshot = previous ?: return
        _state.update {
            it.copy(
                board = snapshot.first,
                score = snapshot.second,
                canUndo = false,
                gameOver = false,
                won = Game2048.hasWon(snapshot.first),
                keepPlaying = false,
                moveId = it.moveId + 1,
                mergedCells = emptyList()
            )
        }
        previous = null
    }

    fun restart() {
        previous = null
        _state.update {
            GameUiState(board = Game2048.newGame(), best = it.best, moveId = it.moveId + 1)
        }
    }

    fun keepPlaying() = _state.update { it.copy(keepPlaying = true) }
}
