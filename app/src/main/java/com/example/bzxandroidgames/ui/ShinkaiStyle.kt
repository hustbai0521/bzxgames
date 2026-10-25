package com.example.bzxandroidgames.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.example.bzxandroidgames.sound.clickSfx
import kotlin.math.cos
import kotlin.math.sin

// Palette shared by the summer lobby and the settings page so both stay consistent.
internal val DeepInk = Color(0xFF244B54)
internal val SoftInk = Color(0xFF5D777B)
internal val SeaGlass = Color(0xFF368A91)
internal val WarmRose = Color(0xFFB27C78)

/** Reserve the full touch target; keep the smaller decorative circle inside it. */
@Composable
fun GearIconButton(label: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    IconButton(
        onClick = clickSfx(onClick),
        modifier = modifier
            .size(48.dp)
            .semantics { contentDescription = label }
    ) {
        Box(
            Modifier.size(28.dp).clip(CircleShape)
                .background(Color.White.copy(alpha = .16f))
                .border(.6.dp, Color.White.copy(alpha = .42f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Canvas(Modifier.size(20.dp)) {
                val radius = size.minDimension * .46f
                val gear = Path().apply {
                    fillType = PathFillType.EvenOdd
                    repeat(8) { tooth ->
                        // Flat tooth tips, recessed valleys, and a clear open center.
                        val points = listOf(0f to .74f, .18f to .74f, .24f to 1f, .56f to 1f, .62f to .74f)
                        points.forEachIndexed { index, (phase, scale) ->
                            val angle = (tooth + phase) * Math.PI / 4.0
                            val point = center + Offset(cos(angle).toFloat(), sin(angle).toFloat()) * radius * scale
                            if (tooth == 0 && index == 0) moveTo(point.x, point.y) else lineTo(point.x, point.y)
                        }
                    }
                    close()
                    val hole = radius * .34f
                    addOval(Rect(center - Offset(hole, hole), center + Offset(hole, hole)))
                }
                drawPath(gear, Color.White)
            }
        }
    }
}
