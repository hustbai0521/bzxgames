package com.example.bzxandroidgames.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import kotlin.math.cos
import kotlin.math.sin

// Palette shared by the summer lobby and the settings page so both stay consistent.
internal val DeepInk = Color(0xFF244B54)
internal val SoftInk = Color(0xFF5D777B)
internal val SeaGlass = Color(0xFF368A91)
internal val WarmRose = Color(0xFFB27C78)

/** Classic gear button drawn as vector strokes, styled like the lobby's weather pill. */
@Composable
fun GearIconButton(label: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    IconButton(
        onClick = onClick,
        modifier = modifier
            .size(27.dp)
            .semantics { contentDescription = label }
            .clip(CircleShape)
            .background(Color.White.copy(alpha = .16f))
            .border(.6.dp, Color.White.copy(alpha = .42f), CircleShape)
    ) {
        Canvas(Modifier.size(14.dp)) {
            val ink = Color.White
            val stroke = 1.7.dp.toPx()
            val ring = size.minDimension / 2f - stroke * 1.8f
            drawCircle(ink, ring, center, style = Stroke(stroke))
            repeat(8) { index ->
                val angle = index * Math.PI / 4.0
                val direction = Offset(cos(angle).toFloat(), sin(angle).toFloat())
                drawLine(
                    ink,
                    center + direction * (ring * .84f),
                    center + direction * (ring + stroke * .8f),
                    stroke,
                    StrokeCap.Round
                )
            }
            drawCircle(ink, ring * .34f, center, style = Stroke(stroke * .7f))
        }
    }
}
