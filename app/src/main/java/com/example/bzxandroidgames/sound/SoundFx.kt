package com.example.bzxandroidgames.sound

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import androidx.compose.foundation.clickable
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.core.content.edit
import com.example.bzxandroidgames.R

/** The sound a tap makes; storageKey persists in the "game" preferences. */
enum class ButtonSound(val storageKey: String, val label: String) {
    RAIN("rain", "雨滴"),
    DRIP("drip", "水滴"),
    BUBBLE("bubble", "泡泡"),
    WOOD("wood", "木鱼");

    companion object {
        fun fromStorage(key: String?): ButtonSound =
            entries.firstOrNull { it.storageKey == key } ?: RAIN
    }
}

/**
 * Sound settings (persisted in the same "game" preferences as the themes and skins)
 * plus a SoundPool that plays the tap sounds. Provided once from MainActivity and
 * reachable everywhere through [LocalSoundController].
 */
class SoundController(context: Context) {
    private val preferences = context.getSharedPreferences("game", 0)

    var buttonSoundEnabled: Boolean by mutableStateOf(preferences.getBoolean(PREF_BUTTON_SOUND, false))
        private set
    var buttonSoundType: ButtonSound by mutableStateOf(ButtonSound.fromStorage(preferences.getString(PREF_BUTTON_SOUND_TYPE, null)))
        private set
    var bgMusicEnabled: Boolean by mutableStateOf(preferences.getBoolean(PREF_BG_MUSIC, false))
        private set

    // Media stream: the tap sounds follow the media volume key, not the system/ringer one.
    private val pool = SoundPool.Builder()
        .setMaxStreams(3)
        .setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
        )
        .build()
    private val samples: Map<ButtonSound, Int> = mapOf(
        ButtonSound.RAIN to pool.load(context, R.raw.snd_rain, 1),
        ButtonSound.DRIP to pool.load(context, R.raw.snd_drip, 1),
        ButtonSound.BUBBLE to pool.load(context, R.raw.snd_bubble, 1),
        ButtonSound.WOOD to pool.load(context, R.raw.snd_wood, 1)
    )

    fun enableButtonSound(enabled: Boolean) {
        buttonSoundEnabled = enabled
        preferences.edit { putBoolean(PREF_BUTTON_SOUND, enabled) }
        if (enabled) click()
    }

    fun selectButtonSound(type: ButtonSound) {
        buttonSoundType = type
        preferences.edit { putString(PREF_BUTTON_SOUND_TYPE, type.storageKey) }
    }

    fun enableBgMusic(enabled: Boolean) {
        bgMusicEnabled = enabled
        preferences.edit { putBoolean(PREF_BG_MUSIC, enabled) }
    }

    /** Plays the currently selected tap sound, unless the effect is switched off. */
    fun click() {
        if (buttonSoundEnabled) play(buttonSoundType)
    }

    /** Plays the given sound directly, e.g. to preview a type in settings. */
    fun play(type: ButtonSound) {
        samples[type]?.let { pool.play(it, VOLUME, VOLUME, 1, 0, 1f) }
    }

    private companion object {
        const val PREF_BUTTON_SOUND = "buttonSound"
        const val PREF_BUTTON_SOUND_TYPE = "buttonSoundType"
        const val PREF_BG_MUSIC = "bgMusic"
        const val VOLUME = .9f
    }
}

val LocalSoundController = staticCompositionLocalOf<SoundController?> { null }

/** Wraps an onClick so the configured tap sound plays before the action. */
@Composable
fun clickSfx(onClick: () -> Unit): () -> Unit {
    val sound = LocalSoundController.current
    return {
        sound?.click()
        onClick()
    }
}

/** [clickable] that plays the configured tap sound first. */
@Composable
fun Modifier.clickSfx(
    enabled: Boolean = true,
    onClickLabel: String? = null,
    role: Role? = null,
    onClick: () -> Unit
): Modifier {
    val sound = LocalSoundController.current
    return this.clickable(enabled = enabled, onClickLabel = onClickLabel, role = role) {
        sound?.click()
        onClick()
    }
}
