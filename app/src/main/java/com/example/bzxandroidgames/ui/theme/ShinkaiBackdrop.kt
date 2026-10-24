package com.example.bzxandroidgames.ui.theme

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.example.bzxandroidgames.R
import kotlin.math.PI
import kotlin.math.sin

/** Local illustration + independent, quiet animation layers. No network or video playback. */
@Composable
fun ShinkaiCountrysideBackdrop(
    modifier: Modifier = Modifier,
    scrollOffset: () -> Int = { 0 }
) {
    val motion = rememberInfiniteTransition(label = "summer-breeze")
    val camera = motion.animateFloat(
        0f, 1f,
        infiniteRepeatable(tween(18000, easing = LinearEasing), RepeatMode.Reverse),
        label = "scenic-camera"
    )
    val breeze = motion.animateFloat(
        0f, 1f,
        infiniteRepeatable(tween(32000, easing = LinearEasing)),
        label = "petals-and-birds"
    )
    val clouds = motion.animateFloat(
        0f, 1f,
        infiniteRepeatable(tween(90000, easing = LinearEasing)),
        label = "high-clouds"
    )
    Box(modifier.fillMaxSize()) {
        Image(
            painter = painterResource(R.drawable.lobby_summer),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize().graphicsLayer {
                scaleX = 1.065f + camera.value * .018f
                scaleY = scaleX
                translationX = (camera.value - .5f) * 10.dp.toPx()
                translationY = -scrollOffset().coerceAtMost(size.height.toInt()) * .025f
            }
        )
        Canvas(Modifier.fillMaxSize()) {
            // Keep the scenery vivid above, then gently lift contrast behind the game cards.
            drawRect(Brush.verticalGradient(
                0f to Color(0xFF07385F).copy(alpha = .22f),
                .28f to Color.Transparent,
                .4f to Color(0xFFF2F8F5).copy(alpha = .58f),
                .58f to Color(0xFFF2F8F5).copy(alpha = .88f),
                .82f to Color(0xFFF2F8F5).copy(alpha = .97f),
                1f to Color(0xFFF2F8F5),
                startY = -scrollOffset().toFloat(),
                endY = size.height - scrollOffset()
            ))
            // Translucent high cloud veils travel separately from the painted cloud banks.
            repeat(3) { i ->
                val phase = (clouds.value + i / 3f) % 1f
                val center = Offset((phase * 1.8f - .4f) * size.width, size.height * (.17f + i * .075f))
                val radius = size.width * .32f
                drawOval(
                    Brush.radialGradient(listOf(Color.White.copy(alpha = .11f), Color.Transparent), center, radius),
                    topLeft = center - Offset(radius, radius * .13f),
                    size = Size(radius * 2f, radius * .26f)
                )
            }
            // A small flock crosses the open sky, with a separate wingbeat for each bird.
            repeat(3) { i ->
                val phase = (breeze.value + i * .055f) % 1f
                val x = (1.15f - phase * 1.45f) * size.width
                val y = size.height * (.235f + i * .019f) + sin(phase * 2f * PI).toFloat() * 5.dp.toPx()
                val wing = sin(phase * 120f + i).toFloat() * 2.dp.toPx()
                val span = (3.5f - i * .6f).dp.toPx()
                val bird = Path().apply {
                    moveTo(x - span, y - wing)
                    quadraticTo(x - span * .4f, y - span * .35f, x, y)
                    quadraticTo(x + span * .4f, y - span * .35f, x + span, y - wing)
                }
                drawPath(bird, Color(0xFF294D67).copy(alpha = .58f), style = Stroke(.9.dp.toPx(), cap = StrokeCap.Round))
            }
            // Foreground petals wrap outside the viewport at different speeds.
            repeat(12) { i ->
                val phase = (breeze.value * (1 + i % 2) + i / 12f) % 1f
                val sway = sin(phase * 2f * PI + i).toFloat()
                val x = (((i * 37 % 101) / 100f) + sway * .08f) * size.width
                val y = (phase * 1.2f - .1f) * size.height
                val center = Offset(x, y)
                val r = (2.6f + i % 3 * .7f).dp.toPx()
                val petal = Path().apply {
                    moveTo(x - r, y)
                    cubicTo(x - r, y - r, x + r * .7f, y - r, x + r, y)
                    cubicTo(x + r * .4f, y + r * .85f, x - r * .25f, y + r * .7f, x - r, y)
                }
                rotate(phase * 360f + i * 29f, center) {
                    drawPath(petal, Color(if (i % 3 == 0) 0xFFFFD9E5 else 0xFFFFFEF0).copy(alpha = .68f))
                }
            }
        }
    }
}
