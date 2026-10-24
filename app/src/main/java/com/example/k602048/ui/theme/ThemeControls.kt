package com.example.k602048.ui.theme

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.sin

/** Both the label and preview belong to a single accessible radio-button target. */
@Composable
fun ThemePicker(
    selected: GameTheme,
    onSelect: (GameTheme) -> Unit,
    modifier: Modifier = Modifier
) {
    val palette = LocalGamePalette.current
    Row(
        modifier = modifier.fillMaxWidth().selectableGroup(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        GameTheme.entries.forEach { theme ->
            val isSelected = selected == theme
            val outline = if (isSelected) palette.primary else palette.mutedText.copy(alpha = .3f)
            val preview = when (theme) {
                GameTheme.NEON -> listOf(Color(0xFF22D3EE), Color(0xFFA855F7), Color(0xFFF43F8E))
                GameTheme.NATURE -> listOf(Color(0xFFD5ECA9), Color(0xFF7FB575), Color(0xFF2B7554))
            }
            Row(
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 48.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(if (isSelected) palette.primary.copy(alpha = .12f) else palette.surface.copy(alpha = .72f))
                    .border(if (isSelected) 1.5.dp else 1.dp, outline, RoundedCornerShape(16.dp))
                    .selectable(
                        selected = isSelected,
                        role = Role.RadioButton,
                        onClick = { onSelect(theme) }
                    )
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    Modifier
                        .size(18.dp)
                        .clip(CircleShape)
                        .background(Brush.linearGradient(preview))
                )
                Text(
                    text = theme.title,
                    color = palette.text,
                    fontSize = 12.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                    modifier = Modifier.weight(1f)
                )
                Box(
                    modifier = Modifier
                        .size(14.dp)
                        .border(1.5.dp, outline, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    if (isSelected) {
                        Box(Modifier.size(6.dp).clip(CircleShape).background(palette.primary))
                    }
                }
            }
        }
    }
}

/** Decorative scenery stays at the edges so the board remains easy to read. */
@Composable
fun NatureBackdrop(modifier: Modifier = Modifier) {
    val motion = rememberInfiniteTransition(label = "nature-breeze")
    val drift by motion.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(24000, easing = LinearEasing)),
        label = "floating-leaves"
    )
    Canvas(modifier.fillMaxSize()) {
        val width = size.width
        val height = size.height
        drawRect(
            brush = Brush.verticalGradient(
                listOf(Color(0xFFF5F9EB), Color(0xFFEAF3DF), Color(0xFFD6E9C9))
            )
        )
        drawCircle(
            brush = Brush.radialGradient(
                listOf(Color(0xFFFFF8D9).copy(alpha = .9f), Color(0xFFFFF8D9).copy(alpha = 0f)),
                center = Offset(width * .86f, height * .1f),
                radius = width * .55f
            ),
            radius = width * .55f,
            center = Offset(width * .86f, height * .1f)
        )

        val distantHill = Path().apply {
            moveTo(0f, height * .88f)
            cubicTo(width * .25f, height * .79f, width * .52f, height * .97f, width, height * .82f)
            lineTo(width, height)
            lineTo(0f, height)
            close()
        }
        drawPath(distantHill, Color(0xFFAFD09A).copy(alpha = .48f))
        val nearHill = Path().apply {
            moveTo(0f, height * .93f)
            cubicTo(width * .3f, height * .84f, width * .66f, height * .99f, width, height * .91f)
            lineTo(width, height)
            lineTo(0f, height)
            close()
        }
        drawPath(nearHill, Color(0xFF7CA76E).copy(alpha = .25f))

        // Leaf sprigs frame the sky without crossing the central play area.
        val stemColor = Color(0xFF5C8951).copy(alpha = .2f)
        drawLine(stemColor, Offset(-4.dp.toPx(), height * .025f), Offset(width * .2f, height * .14f), 1.dp.toPx())
        repeat(4) { index ->
            val branch = (index + 1) / 5f
            val x = width * .2f * branch
            val y = height * (.025f + .115f * branch)
            drawNatureLeaf(Offset(x, y - 8.dp.toPx()), (22 + index * 2).dp.toPx(), -45f, Color(0xFF6D9B5E).copy(alpha = .17f))
            drawNatureLeaf(Offset(x - 8.dp.toPx(), y + 3.dp.toPx()), (20 + index * 2).dp.toPx(), 25f, Color(0xFF7FA871).copy(alpha = .15f))
        }
        drawLine(stemColor, Offset(width + 4.dp.toPx(), height * .19f), Offset(width * .91f, height * .32f), 1.dp.toPx())
        repeat(3) { index ->
            val y = height * (.21f + index * .035f)
            val x = width * (.985f - index * .024f)
            drawNatureLeaf(Offset(x - 8.dp.toPx(), y), 26.dp.toPx(), 35f, Color(0xFF6F9863).copy(alpha = .18f))
            drawNatureLeaf(Offset(x + 7.dp.toPx(), y + 12.dp.toPx()), 22.dp.toPx(), -45f, Color(0xFF6F9863).copy(alpha = .13f))
        }

        repeat(8) { index ->
            val progress = (drift + index / 8f) % 1f
            val sway = sin((progress * 6.283185f + index).toDouble()).toFloat()
            val x = width * (if (index % 2 == 0) .035f else .965f) + sway * 7.dp.toPx()
            val y = height * (progress * 1.2f - .1f)
            drawNatureLeaf(
                center = Offset(x, y),
                length = (13 + index % 3 * 4).dp.toPx(),
                rotation = index * 41f + sway * 32f,
                color = Color(0xFF5C8B4C).copy(alpha = .13f + index % 3 * .025f)
            )
        }
    }
}

private fun DrawScope.drawNatureLeaf(center: Offset, length: Float, rotation: Float, color: Color) {
    val half = length / 2f
    rotate(rotation, pivot = center) {
        val leaf = Path().apply {
            moveTo(center.x - half, center.y)
            cubicTo(center.x - half * .35f, center.y - half * .8f, center.x + half * .55f, center.y - half * .65f, center.x + half, center.y)
            cubicTo(center.x + half * .3f, center.y + half * .7f, center.x - half * .5f, center.y + half * .6f, center.x - half, center.y)
            close()
        }
        drawPath(leaf, color)
        drawLine(color.copy(alpha = color.alpha * .6f), Offset(center.x - half * .7f, center.y), Offset(center.x + half * .7f, center.y), .6.dp.toPx())
    }
}
