package com.example.k602048.ui.theme

enum class GameTheme(val storageKey: String, val title: String) {
    NEON("neon", "炫彩科技"),
    NATURE("nature", "清新自然");

    companion object {
        fun fromStorage(value: String?): GameTheme =
            entries.firstOrNull { it.storageKey == value } ?: NEON
    }
}
