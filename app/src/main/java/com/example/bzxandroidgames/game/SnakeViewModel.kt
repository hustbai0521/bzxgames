package com.example.bzxandroidgames.game

import android.app.Application
import androidx.core.content.edit
import androidx.lifecycle.AndroidViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class SnakeViewModel(application: Application) : AndroidViewModel(application) {
    private val preferences = application.getSharedPreferences("game", 0)

    private val _state = MutableStateFlow(Snake.newGame(preferences.getInt(PREF_BEST, 0)))
    val state: StateFlow<SnakeUiState> = _state.asStateFlow()

    private fun update(transform: (SnakeUiState) -> SnakeUiState) {
        val next = transform(_state.value)
        _state.value = next
        if (next.status == SnakeStatus.OVER || next.status == SnakeStatus.WON) {
            preferences.edit { putInt(PREF_BEST, next.best) }
        }
    }

    fun turn(dir: SnakeDir) = update { Snake.turn(it, dir) }
    fun tick() = update { Snake.tick(it) }
    fun start() = update(Snake::started)
    fun pause() = update(Snake::paused)
    fun resume() = update(Snake::resumed)

    /** Called when the activity loses the foreground mid-game. */
    fun autoPause() {
        if (_state.value.status == SnakeStatus.PLAYING) pause()
    }

    fun restart() {
        _state.value = Snake.newGame(preferences.getInt(PREF_BEST, 0))
    }

    private companion object {
        const val PREF_BEST = "snakeBest"
    }
}
