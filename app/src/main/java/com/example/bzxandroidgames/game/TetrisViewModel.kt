package com.example.bzxandroidgames.game

import android.app.Application
import androidx.core.content.edit
import androidx.lifecycle.AndroidViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class TetrisViewModel(application: Application) : AndroidViewModel(application) {
    private val preferences = application.getSharedPreferences("game", 0)

    private val _state = MutableStateFlow(Tetris.newGame(preferences.getInt(PREF_BEST, 0)))
    val state: StateFlow<TetrisUiState> = _state.asStateFlow()

    private fun update(transform: (TetrisUiState) -> TetrisUiState) {
        val next = transform(_state.value)
        _state.value = next
        if (next.score > next.best || next.status == TetrisStatus.OVER) {
            preferences.edit { putInt(PREF_BEST, next.best) }
        }
    }

    fun moveLeft() = update(Tetris::moveLeft)
    fun moveRight() = update(Tetris::moveRight)
    fun rotate() = update(Tetris::rotate)
    fun softDrop() = update(Tetris::softDrop)
    fun hardDrop() = update(Tetris::hardDrop)
    fun tick() = update(Tetris::tick)
    fun start() = update(Tetris::started)

    fun pause() = update(Tetris::paused)
    fun resume() = update(Tetris::resumed)

    /** Called when the activity loses the foreground mid-game. */
    fun autoPause() {
        if (_state.value.status == TetrisStatus.PLAYING) pause()
    }

    fun restart() {
        _state.value = Tetris.newGame(preferences.getInt(PREF_BEST, 0))
    }

    private companion object {
        const val PREF_BEST = "tetrisBest"
    }
}
