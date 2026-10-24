package com.example.k602048.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

@Immutable
data class GamePalette(
    val theme: GameTheme,
    val background: List<Color>,
    val primary: Color,
    val secondary: Color,
    val tertiary: Color,
    val text: Color,
    val mutedText: Color,
    val surface: Color,
    val cardEnd: Color,
    val actionBackground: List<Color>,
    val boardSurface: Color,
    val emptyTile: List<Color>,
    val tileBase: Color,
    val launchBackground: List<Color>,
    val launchOrb: List<Color>,
    val titleColors: List<Color>
) {
    val isNature: Boolean get() = theme == GameTheme.NATURE

    fun tileAccent(value: Int): Color = if (isNature) {
        when (value) {
            0 -> Color(0xFF8DAF86)
            2 -> Color(0xFFDDECC8)
            4 -> Color(0xFFC9E3AA)
            8 -> Color(0xFFACD68E)
            16 -> Color(0xFF83C5A6)
            32 -> Color(0xFF377B51)
            64 -> Color(0xFF28674C)
            128 -> Color(0xFF207166)
            256 -> Color(0xFF986D24)
            512 -> Color(0xFF8A6020)
            1024 -> Color(0xFF6D5824)
            2048 -> Color(0xFF3C642C)
            else -> Color(0xFF254D3B)
        }
    } else {
        when (value) {
            0 -> Color(0xFF64748B)
            2 -> Color(0xFF38BDF8)
            4 -> Color(0xFF22D3EE)
            8 -> Color(0xFF2DD4BF)
            16 -> Color(0xFF84CC16)
            32 -> Color(0xFFFACC15)
            64 -> Color(0xFFFB923C)
            128 -> Color(0xFFFB7185)
            256 -> Color(0xFFF43F8E)
            512 -> Color(0xFFD946EF)
            1024 -> Color(0xFFA855F7)
            2048 -> Color(0xFF8B5CF6)
            else -> Color.White
        }
    }

    fun tileText(value: Int): Color =
        if (isNature && value <= 16) Color(0xFF173D2C) else Color.White
}

val NeonPalette = GamePalette(
    theme = GameTheme.NEON,
    background = listOf(Color(0xFF050713), Color(0xFF0A1024), Color(0xFF120A24)),
    primary = Color(0xFF22D3EE),
    secondary = Color(0xFFA855F7),
    tertiary = Color(0xFFF43F8E),
    text = Color.White,
    mutedText = Color(0xFFB4B8CA),
    surface = Color(0xFF10162A),
    cardEnd = Color(0xFF11162A),
    actionBackground = listOf(Color(0xFF14213D), Color(0xFF25133E)),
    boardSurface = Color(0xEC090E20),
    emptyTile = listOf(Color(0xFF11182C), Color(0xFF0D1324)),
    tileBase = Color(0xFF15112B),
    launchBackground = listOf(Color(0xFF172554), Color(0xFF050713)),
    launchOrb = listOf(Color(0xFF101B3E), Color(0xFF31104D)),
    titleColors = listOf(Color(0xFF22D3EE), Color.White, Color(0xFFF43F8E))
)

val NaturePalette = GamePalette(
    theme = GameTheme.NATURE,
    background = listOf(Color(0xFFF7FAEE), Color(0xFFE5F2D9), Color(0xFFEDF5E8)),
    primary = Color(0xFF32734F),
    secondary = Color(0xFF28776C),
    tertiary = Color(0xFF8F6B25),
    text = Color(0xFF234733),
    mutedText = Color(0xFF50674C),
    surface = Color(0xFFF7FAEF),
    cardEnd = Color(0xFFF3F8E8),
    actionBackground = listOf(Color(0xFFF5FAEB), Color(0xFFDDECCF)),
    boardSurface = Color(0xF2E9F1DE),
    emptyTile = listOf(Color(0xFFDCE7D0), Color(0xFFD2E1C6)),
    tileBase = Color(0xFF214C38),
    launchBackground = listOf(Color(0xFFD8EDBF), Color(0xFFF7FAEE)),
    launchOrb = listOf(Color(0xFFF9FBEF), Color(0xFFC7E3B3)),
    titleColors = listOf(Color(0xFF276642), Color(0xFF458943), Color(0xFF8F6B25))
)

val LocalGamePalette = staticCompositionLocalOf { NeonPalette }

private val DarkColors = darkColorScheme(
    primary = NeonPalette.primary,
    onPrimary = Color(0xFF03131A),
    secondary = NeonPalette.secondary,
    onSecondary = Color(0xFF170628),
    tertiary = NeonPalette.tertiary,
    onTertiary = Color(0xFF260516),
    background = NeonPalette.background.first(),
    onBackground = NeonPalette.text,
    surface = NeonPalette.surface,
    onSurface = NeonPalette.text,
    surfaceVariant = NeonPalette.cardEnd,
    onSurfaceVariant = NeonPalette.mutedText,
    outline = Color(0xFF7B849F)
)

private val LightColors = lightColorScheme(
    primary = NaturePalette.primary,
    onPrimary = Color.White,
    secondary = NaturePalette.secondary,
    onSecondary = Color.White,
    tertiary = NaturePalette.tertiary,
    onTertiary = Color.White,
    background = NaturePalette.background.first(),
    onBackground = NaturePalette.text,
    surface = NaturePalette.surface,
    onSurface = NaturePalette.text,
    surfaceVariant = Color(0xFFE2EDD7),
    onSurfaceVariant = NaturePalette.mutedText,
    outline = Color(0xFF788E6E)
)

@Composable
fun K602048Theme(theme: GameTheme = GameTheme.NEON, content: @Composable () -> Unit) {
    val palette = if (theme == GameTheme.NATURE) NaturePalette else NeonPalette
    CompositionLocalProvider(LocalGamePalette provides palette) {
        MaterialTheme(
            colorScheme = if (palette.isNature) LightColors else DarkColors,
            content = content
        )
    }
}
