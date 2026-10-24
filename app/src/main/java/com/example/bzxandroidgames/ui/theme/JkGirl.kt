package com.example.bzxandroidgames.ui.theme

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

/**
 * The library's protagonist: a gentle schoolgirl in a JK sailor uniform, waving hello.
 * Everything is drawn as vector paths in a 100x170 unit space, so the figure scales
 * cleanly at any size.
 */
@Composable
fun JkGirlMascot(modifier: Modifier = Modifier) {
    val motion = rememberInfiniteTransition(label = "jk-girl")
    val breathe by motion.animateFloat(
        0f, 1f,
        infiniteRepeatable(tween(3200, easing = LinearEasing), repeatMode = RepeatMode.Reverse),
        label = "breathe"
    )
    val wave by motion.animateFloat(
        0f, 1f,
        infiniteRepeatable(tween(1300, easing = LinearEasing), repeatMode = RepeatMode.Reverse),
        label = "wave"
    )

    Canvas(modifier) {
        val scale = min(size.width / 100f, size.height / 170f)
        val bob = (breathe - .5f) * 2.4f
        withTransform({ scale(scale, scale, pivot = Offset.Zero); translate(0f, bob) }) {
            drawGirl(wave)
        }
    }
}

private fun DrawScope.drawGirl(wave: Float) {
    val skin = Color(0xFFFFE4CF)
    val hair = Color(0xFF46342A)
    val hairDeep = Color(0xFF362820)
    val hairSheen = Color(0xFF705745)
    val shirt = Color(0xFFFDFDFB)
    val navy = Color(0xFF2E3D66)
    val navyDeep = Color(0xFF26345A)
    val red = Color(0xFFC75B5B)
    val redDeep = Color(0xFFA94A4A)
    val skirt = Color(0xFF33456E)
    val skirtDeep = Color(0xFF273657)
    val socks = Color(0xFFF7F5EF)
    val shoes = Color(0xFF7A4A2E)

    // ground shadow
    drawOval(Color.Black.copy(alpha = .1f), topLeft = Offset(24f, 162f), size = Size(52f, 6f))

    // long hair behind the body
    drawPath(
        Path().apply {
            moveTo(50f, 12f)
            cubicTo(30f, 12f, 24f, 30f, 27f, 52f)
            cubicTo(25f, 78f, 28f, 102f, 32f, 120f)
            lineTo(68f, 120f)
            cubicTo(72f, 102f, 75f, 78f, 73f, 52f)
            cubicTo(76f, 30f, 70f, 12f, 50f, 12f)
            close()
        },
        hairDeep
    )
    drawPath(
        Path().apply { moveTo(34f, 46f); cubicTo(32f, 70f, 34f, 94f, 37f, 112f) },
        hairSheen.copy(alpha = .45f), style = Stroke(2.4f, cap = StrokeCap.Round)
    )
    drawPath(
        Path().apply { moveTo(66f, 46f); cubicTo(68f, 70f, 66f, 94f, 63f, 112f) },
        hairSheen.copy(alpha = .45f), style = Stroke(2.4f, cap = StrokeCap.Round)
    )

    // legs, knee socks and loafers
    drawLine(skin, Offset(44f, 118f), Offset(44f, 130f), 6.4f, StrokeCap.Round)
    drawLine(skin, Offset(56f, 118f), Offset(56f, 130f), 6.4f, StrokeCap.Round)
    drawLine(socks, Offset(44f, 130f), Offset(44f, 154f), 7.2f, StrokeCap.Round)
    drawLine(socks, Offset(56f, 130f), Offset(56f, 154f), 7.2f, StrokeCap.Round)
    drawPath(
        Path().apply {
            moveTo(40.2f, 152f)
            cubicTo(39.4f, 158f, 40.4f, 161.4f, 44f, 162.4f)
            cubicTo(47f, 163f, 48.6f, 161.4f, 48.6f, 157.6f)
            lineTo(48.6f, 152.6f)
            close()
        },
        shoes
    )
    drawPath(
        Path().apply {
            moveTo(59.8f, 152f)
            cubicTo(60.6f, 158f, 59.6f, 161.4f, 56f, 162.4f)
            cubicTo(53f, 163f, 51.4f, 161.4f, 51.4f, 157.6f)
            lineTo(51.4f, 152.6f)
            close()
        },
        shoes
    )

    // pleated skirt
    drawPath(
        Path().apply {
            moveTo(37.5f, 92f)
            lineTo(62.5f, 92f)
            cubicTo(66f, 104f, 69f, 114f, 71f, 121f)
            cubicTo(64f, 124.5f, 57f, 125.5f, 50f, 125.5f)
            cubicTo(43f, 125.5f, 36f, 124.5f, 29f, 121f)
            cubicTo(31f, 114f, 34f, 104f, 37.5f, 92f)
            close()
        },
        skirt
    )
    listOf(
        40f to 34f, 45f to 42f, 50f to 50f, 55f to 58f, 60f to 66f
    ).forEach { (wx, hx) ->
        drawLine(skirtDeep, Offset(wx, 93.5f), Offset(hx, 122.8f), 1.2f)
    }
    drawRoundRect(skirtDeep, topLeft = Offset(37f, 89.5f), size = Size(26f, 5f), cornerRadius = CornerRadius(2f, 2f))

    // white sailor blouse
    drawPath(
        Path().apply {
            moveTo(40f, 68f)
            cubicTo(36f, 74f, 37f, 86f, 39f, 96f)
            lineTo(61f, 96f)
            cubicTo(63f, 86f, 64f, 74f, 60f, 68f)
            cubicTo(54f, 65f, 46f, 65f, 40f, 68f)
            close()
        },
        shirt
    )

    // left arm resting at her side
    drawPath(
        Path().apply { moveTo(38f, 74f); cubicTo(34f, 84f, 32f, 94f, 32f, 104f) },
        skin, style = Stroke(5.6f, cap = StrokeCap.Round)
    )
    drawCircle(skin, 3.6f, Offset(32f, 108f))
    drawPath(
        Path().apply { moveTo(39f, 71f); cubicTo(35.4f, 75.4f, 34.2f, 79.6f, 34.6f, 83.4f) },
        shirt, style = Stroke(8.4f, cap = StrokeCap.Round)
    )

    // right arm waving; the angle swings around the shoulder
    val angle = -0.32f + sin(wave * 3.1415927f) * 0.24f
    fun rotate(v: Offset) = Offset(v.x * cos(angle) - v.y * sin(angle), v.x * sin(angle) + v.y * cos(angle))
    val shoulder = Offset(62f, 73f)
    val elbow = shoulder + rotate(Offset(9f, -6f))
    val hand = shoulder + rotate(Offset(15.5f, -27f))
    drawPath(
        Path().apply { moveTo(shoulder.x, shoulder.y); quadraticBezierTo(elbow.x, elbow.y, hand.x, hand.y) },
        skin, style = Stroke(5.6f, cap = StrokeCap.Round)
    )
    drawPath(
        Path().apply {
            moveTo(61f, 71f)
            val sleeveEnd = shoulder + rotate(Offset(6.5f, -3.5f))
            quadraticBezierTo((shoulder.x + sleeveEnd.x) / 2f - 1.5f, (shoulder.y + sleeveEnd.y) / 2f, sleeveEnd.x, sleeveEnd.y)
        },
        shirt, style = Stroke(8.4f, cap = StrokeCap.Round)
    )
    drawCircle(skin, 3.8f, hand)
    drawCircle(skin, 1.8f, hand + rotate(Offset(3f, -1f)))
    drawCircle(skin, 1.7f, hand + rotate(Offset(1f, -3.4f)))
    drawCircle(skin, 1.2f, hand + rotate(Offset(-2.6f, 1.4f)))

    // neck
    drawRoundRect(skin, topLeft = Offset(46.8f, 55f), size = Size(6.4f, 12f), cornerRadius = CornerRadius(2f, 2f))

    // sailor collar flaps with their white stripes
    drawPath(
        Path().apply {
            moveTo(50f, 66f)
            cubicTo(45f, 67f, 39f, 69f, 36f, 74f)
            cubicTo(40f, 80f, 44f, 83f, 47f, 84f)
            cubicTo(48.5f, 78f, 49.5f, 72f, 50f, 66f)
            close()
        },
        navy
    )
    drawPath(
        Path().apply {
            moveTo(50f, 66f)
            cubicTo(55f, 67f, 61f, 69f, 64f, 74f)
            cubicTo(60f, 80f, 56f, 83f, 53f, 84f)
            cubicTo(51.5f, 78f, 50.5f, 72f, 50f, 66f)
            close()
        },
        navy
    )
    drawPath(
        Path().apply { moveTo(46.6f, 68.8f); cubicTo(41.8f, 70.6f, 38.8f, 72.6f, 37f, 75.4f) },
        shirt, style = Stroke(1.1f)
    )
    drawPath(
        Path().apply { moveTo(53.4f, 68.8f); cubicTo(58.2f, 70.6f, 61.2f, 72.6f, 63f, 75.4f) },
        shirt, style = Stroke(1.1f)
    )
    drawPath(
        Path().apply { moveTo(46.5f, 64.6f); cubicTo(48.2f, 66.8f, 51.8f, 66.8f, 53.5f, 64.6f) },
        navyDeep, style = Stroke(2.6f, cap = StrokeCap.Round)
    )

    // red neckerchief bow
    drawPath(Path().apply { moveTo(49f, 79f); lineTo(42.5f, 75.5f); cubicTo(41f, 79f, 41.5f, 81.5f, 43f, 83f); close() }, red)
    drawPath(Path().apply { moveTo(51f, 79f); lineTo(57.5f, 75.5f); cubicTo(59f, 79f, 58.5f, 81.5f, 57f, 83f); close() }, red)
    drawPath(Path().apply { moveTo(49.2f, 80f); lineTo(46.5f, 86.5f); lineTo(49f, 86f); close() }, redDeep)
    drawPath(Path().apply { moveTo(50.8f, 80f); lineTo(53.5f, 86.5f); lineTo(51f, 86f); close() }, redDeep)
    drawRoundRect(red, topLeft = Offset(48.2f, 77.2f), size = Size(3.6f, 3.6f), cornerRadius = CornerRadius(1.2f, 1.2f))

    // face
    drawOval(skin, topLeft = Offset(33.5f, 21.5f), size = Size(33f, 37f))

    // bangs with a soft M-shaped edge, plus one stray ahoge
    drawPath(
        Path().apply {
            moveTo(33.5f, 46f)
            cubicTo(31.5f, 30f, 38f, 15f, 50f, 15f)
            cubicTo(62f, 15f, 68.5f, 30f, 66.5f, 46f)
            cubicTo(64f, 40f, 61f, 36.5f, 58.5f, 35.8f)
            cubicTo(56.5f, 39.5f, 55.5f, 40.5f, 54f, 40.2f)
            cubicTo(52f, 36f, 51f, 34.5f, 50f, 34.8f)
            cubicTo(48.5f, 38.5f, 47.5f, 40.5f, 45.5f, 40.2f)
            cubicTo(44f, 36.8f, 42f, 36.2f, 40.5f, 37.2f)
            cubicTo(38.5f, 39.5f, 36f, 42f, 33.5f, 46f)
            close()
        },
        hair
    )
    drawPath(
        Path().apply { moveTo(51f, 15.5f); cubicTo(53f, 10f, 57f, 7.5f, 61f, 8.5f) },
        hair, style = Stroke(1.6f, cap = StrokeCap.Round)
    )
    drawPath(
        Path().apply { moveTo(38f, 24f); cubicTo(43f, 18f, 57f, 18f, 62f, 24f) },
        hairSheen.copy(alpha = .8f), style = Stroke(2f, cap = StrokeCap.Round)
    )

    // side locks framing the face
    drawPath(
        Path().apply {
            moveTo(33f, 40f)
            cubicTo(30.5f, 58f, 31.5f, 78f, 34.5f, 97f)
            cubicTo(36.5f, 99f, 38.5f, 98f, 39.5f, 96f)
            cubicTo(37.5f, 76f, 37f, 56f, 37.5f, 44f)
            close()
        },
        hair
    )
    drawPath(
        Path().apply {
            moveTo(67f, 40f)
            cubicTo(69.5f, 58f, 68.5f, 78f, 65.5f, 97f)
            cubicTo(63.5f, 99f, 61.5f, 98f, 60.5f, 96f)
            cubicTo(62.5f, 76f, 63f, 56f, 62.5f, 44f)
            close()
        },
        hair
    )

    // small ribbon on the left lock
    drawPath(Path().apply { moveTo(35f, 60f); lineTo(30.8f, 57.6f); lineTo(31f, 62.4f); close() }, red)
    drawPath(Path().apply { moveTo(35f, 62.5f); lineTo(31f, 65.4f); lineTo(34.8f, 66f); close() }, redDeep)
    drawCircle(red, 1.6f, Offset(35.4f, 62.2f))

    // gentle face
    listOf(42.5f, 57.5f).forEach { ex ->
        drawOval(Color(0xFFFCFAF6), topLeft = Offset(ex - 3.1f, 39.4f), size = Size(6.2f, 8.2f))
        drawOval(Color(0xFF5B4634), topLeft = Offset(ex - 2.35f, 41.1f), size = Size(4.7f, 6.2f))
        drawOval(Color(0xFF33261B), topLeft = Offset(ex - 1.3f, 42.9f), size = Size(2.6f, 3.4f))
        drawCircle(Color.White, 1.05f, Offset(ex - 1.1f, 42.7f))
        drawCircle(Color.White.copy(alpha = .75f), .55f, Offset(ex + 1.2f, 45.4f))
        drawPath(
            Path().apply {
                moveTo(ex - 3.4f, 43.4f)
                cubicTo(ex - 2f, 39.6f, ex + 2f, 39.6f, ex + 3.4f, 43.2f)
            },
            Color(0xFF2E2118), style = Stroke(1.7f, cap = StrokeCap.Round)
        )
        drawPath(
            Path().apply {
                moveTo(ex - 2.6f, 46.6f); cubicTo(ex - 1f, 47.8f, ex + 1f, 47.8f, ex + 2.6f, 46.6f)
            },
            Color(0xFF8A6A55).copy(alpha = .6f), style = Stroke(.8f)
        )
    }
    drawPath(
        Path().apply { moveTo(39.5f, 36.8f); cubicTo(41.5f, 35.6f, 44f, 35.6f, 45.8f, 36.6f) },
        Color(0xFF5A4536), style = Stroke(1f, cap = StrokeCap.Round)
    )
    drawPath(
        Path().apply { moveTo(54.2f, 36.6f); cubicTo(56f, 35.6f, 58.5f, 35.6f, 60.5f, 36.8f) },
        Color(0xFF5A4536), style = Stroke(1f, cap = StrokeCap.Round)
    )
    drawPath(
        Path().apply { moveTo(47.8f, 51.5f); cubicTo(49f, 52.8f, 51f, 52.8f, 52.2f, 51.5f) },
        Color(0xFFC46A6A), style = Stroke(1.2f, cap = StrokeCap.Round)
    )
    drawLine(Color(0xFFE8B598), Offset(50f, 46.9f), Offset(50f, 47.9f), .7f)
    drawOval(Color(0xFFF5A8B0).copy(alpha = .5f), topLeft = Offset(35.5f, 45.8f), size = Size(6.2f, 3.4f))
    drawOval(Color(0xFFF5A8B0).copy(alpha = .5f), topLeft = Offset(58.3f, 45.8f), size = Size(6.2f, 3.4f))
}
