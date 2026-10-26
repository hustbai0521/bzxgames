package com.example.bzxandroidgames.game

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlin.random.Random

class LinkViewModel(application: Application) : AndroidViewModel(application) {
    private val random = Random.Default

    private val _state = MutableStateFlow(LinkLink.newGame(random))
    val state: StateFlow<LinkUiState> = _state.asStateFlow()

    fun select(index: Int) {
        _state.value = LinkLink.select(_state.value, index, random)
    }

    fun requestHint() {
        _state.value = LinkLink.hint(_state.value)
    }

    fun clearHint() {
        _state.value = _state.value.copy(hint = null)
    }

    /** Manual reshuffle: a hard scramble that always keeps the board solvable. */
    fun shuffle() {
        _state.value = LinkLink.reshuffle(_state.value, random)
    }

    fun tick() {
        _state.value = LinkLink.tick(_state.value)
    }

    fun restart() {
        _state.value = LinkLink.newGame(random)
    }
}
