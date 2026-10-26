package com.example.bzxandroidgames.game

import android.app.Application
import androidx.core.content.edit
import androidx.lifecycle.AndroidViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class SpiderUiState(
    val game: SpiderGame,
    val selectedFrom: Int? = null,
    val selectedIndex: Int? = null,
    val canUndo: Boolean = false,
    val hint: SpiderHint? = null,
    val hintSerial: Int = 0
)

class SpiderViewModel(application: Application) : AndroidViewModel(application) {
    private val preferences = application.getSharedPreferences("game", 0)
    private val history = SpiderHistory()

    private val _state = MutableStateFlow(initialState())
    val state: StateFlow<SpiderUiState> = _state.asStateFlow()

    private fun initialState(): SpiderUiState =
        SpiderUiState(game = SpiderSolitaire.newGame(currentSuits()))

    private fun currentSuits(): SpiderSuits =
        SpiderSuits.fromStorage(preferences.getString(PREF_SUITS, null))

    /** Picks up a run, or drops the held run onto the tapped column. */
    fun tapCard(column: Int, index: Int) {
        val current = _state.value
        val game = current.game
        if (column !in game.columns.indices || index !in game.columns[column].indices) return
        if (game.status == SpiderStatus.WON) return
        val heldFrom = current.selectedFrom
        if (heldFrom != null && heldFrom != column) {
            val moved = SpiderSolitaire.move(game, heldFrom, current.selectedIndex!!, column)
            if (moved != null) {
                history.record(game)
                _state.value = current.copy(
                    game = moved,
                    selectedFrom = null,
                    selectedIndex = null,
                    canUndo = true,
                    hint = null
                )
                return
            }
        }
        // No move happened: (re)select the tapped run, or drop the selection.
        if (heldFrom == column && current.selectedIndex == index) {
            _state.value = current.copy(selectedFrom = null, selectedIndex = null)
        } else if (SpiderSolitaire.movableRun(game.columns[column], index)) {
            _state.value = current.copy(selectedFrom = column, selectedIndex = index, hint = null)
        } else {
            _state.value = current.copy(selectedFrom = null, selectedIndex = null)
        }
    }

    /** Taps the empty area of a column: only meaningful as a drop target. */
    fun tapColumn(column: Int) {
        val current = _state.value
        val heldFrom = current.selectedFrom ?: return
        if (heldFrom == column) return
        dropRun(heldFrom, current.selectedIndex!!, column)
    }

    /** Drag support: pick the run under the finger (no-op if it can't be lifted). */
    fun selectRun(column: Int, index: Int) {
        val current = _state.value
        if (current.game.status == SpiderStatus.WON) return
        _state.value = if (column in current.game.columns.indices && SpiderSolitaire.movableRun(current.game.columns[column], index))
            current.copy(selectedFrom = column, selectedIndex = index)
        else
            current.copy(selectedFrom = null, selectedIndex = null)
    }

    fun clearSelection() {
        _state.value = _state.value.copy(selectedFrom = null, selectedIndex = null)
    }

    /** Drops a lifted run onto a column; an illegal drop just clears the selection. */
    fun dropRun(from: Int, index: Int, to: Int) {
        val current = _state.value
        if (current.game.status != SpiderStatus.PLAYING) return
        if (from == to) {
            _state.value = current.copy(selectedFrom = null, selectedIndex = null)
            return
        }
        val moved = SpiderSolitaire.move(current.game, from, index, to)
        if (moved != null) history.record(current.game)
        _state.value = if (moved != null)
            current.copy(
                game = moved,
                selectedFrom = null,
                selectedIndex = null,
                canUndo = true,
                hint = null
            )
        else
            current.copy(selectedFrom = null, selectedIndex = null)
    }

    fun deal() {
        val current = _state.value
        val dealt = SpiderSolitaire.deal(current.game) ?: return
        history.record(current.game)
        _state.value = current.copy(
            game = dealt,
            selectedFrom = null,
            selectedIndex = null,
            canUndo = true,
            hint = null
        )
    }

    /** Classic behaviour: an undo restores the position but still costs one move. */
    fun undo() {
        val game = history.undo(_state.value.game) ?: return
        _state.value = _state.value.copy(
            game = game,
            selectedFrom = null,
            selectedIndex = null,
            canUndo = history.canUndo,
            hint = null
        )
    }

    fun restart() = startNewGame(currentSuits())

    fun setSuits(suits: SpiderSuits) {
        preferences.edit { putString(PREF_SUITS, suits.name) }
        startNewGame(suits)
    }

    private fun startNewGame(suits: SpiderSuits) {
        history.clear()
        _state.value = SpiderUiState(game = SpiderSolitaire.newGame(suits))
    }

    fun requestHint() {
        _state.value = _state.value.let {
            it.copy(hint = SpiderSolitaire.hint(it.game), hintSerial = it.hintSerial + 1)
        }
    }

    fun clearHint() {
        _state.value = _state.value.copy(hint = null)
    }

    private companion object {
        const val PREF_SUITS = "spiderSuits"
    }
}
