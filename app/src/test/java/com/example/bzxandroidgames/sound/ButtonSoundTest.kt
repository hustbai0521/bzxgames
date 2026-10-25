package com.example.bzxandroidgames.sound

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ButtonSoundTest {

    @Test fun `null or unknown storage keys fall back to rain`() {
        assertEquals(ButtonSound.RAIN, ButtonSound.fromStorage(null))
        assertEquals(ButtonSound.RAIN, ButtonSound.fromStorage(""))
        assertEquals(ButtonSound.RAIN, ButtonSound.fromStorage("piano"))
    }

    @Test fun `every storage key round-trips`() {
        ButtonSound.entries.forEach { type ->
            assertEquals(type, ButtonSound.fromStorage(type.storageKey))
        }
    }

    @Test fun `storage keys are unique and labels are present`() {
        assertEquals(ButtonSound.entries.size, ButtonSound.entries.map { it.storageKey }.toSet().size)
        ButtonSound.entries.forEach { type -> assertTrue(type.label.isNotBlank()) }
    }
}
