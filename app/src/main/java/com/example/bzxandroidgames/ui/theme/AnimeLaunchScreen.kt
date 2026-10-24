package com.example.bzxandroidgames.ui.theme

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bzxandroidgames.R
import kotlin.math.sin

/** A short, locally rendered opening: establishing shot, light trails, title reveal. */
@Composable
fun AnimeLaunchScreen(onFinished: () -> Unit) {
    val palette = LocalGamePalette.current
    val timeline = remember { Animatable(0f) }
    val finish by rememberUpdatedState(onFinished)
    var finished by remember { mutableStateOf(false) }
    val complete = { if (!finished) { finished = true; finish() } }
    LaunchedEffect(Unit) {
        timeline.animateTo(1f, tween(4200, easing = LinearEasing))
        complete()
    }
    val accent = if (palette.isNature) Color(0xFFD5F6A3) else Color(0xFF9EEFFF)
    Box(Modifier.fillMaxSize().background(Color(0xFF071323))) {
        Image(
            painterResource(R.drawable.intro_world), contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize().graphicsLayer {
                val t = timeline.value
                scaleX = 1.16f - t * .12f
                scaleY = scaleX
                translationY = (t - .5f) * 24.dp.toPx()
                alpha = (t / .13f).coerceIn(0f, 1f)
            }
        )
        Canvas(Modifier.fillMaxSize()) {
            val t = timeline.value
            val tint = if (palette.isNature) Color(0xFF89C55B) else Color(0xFF553BAE)
            drawRect(tint.copy(alpha = .09f))
            drawRect(Brush.verticalGradient(listOf(Color.Black.copy(alpha = .25f), Color.Transparent, Color(0xEE061321))))
            // Foreground motes move independently of the camera for depth.
            repeat(36) { i ->
                val x = ((i * 73 % 101) / 100f + sin(t * 5f + i) * .025f) * size.width
                val y = (((i * 47 % 103) / 103f - t * (.12f + i % 4 * .04f) + 1f) % 1f) * size.height
                val opacity = (sin(t * 8f + i) * .25f + .45f) * (t * 5).coerceAtMost(1f)
                drawCircle(accent.copy(alpha = opacity), (1 + i % 3).dp.toPx(), Offset(x, y))
            }
            val streak = ((t - .18f) / .38f).coerceIn(0f, 1f)
            if (streak > 0f && streak < 1f) {
                val head = Offset(size.width * (1.2f - streak * 1.5f), size.height * (.12f + streak * .35f))
                drawLine(Brush.linearGradient(listOf(Color.Transparent, accent), head + Offset(140.dp.toPx(), -55.dp.toPx()), head), head + Offset(140.dp.toPx(), -55.dp.toPx()), head, 2.dp.toPx())
            }
        }
        Column(
            Modifier.align(Alignment.BottomCenter).systemBarsPadding().padding(horizontal = 28.dp, vertical = 64.dp)
                .graphicsLayer {
                    val reveal = ((timeline.value - .36f) / .22f).coerceIn(0f, 1f)
                    alpha = reveal
                    translationY = (1f - reveal) * 28.dp.toPx()
                },
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(if (palette.isNature) "风起之处 · 万物生长" else "星光相遇 · 世界新生", color = accent, fontSize = 13.sp, letterSpacing = 3.sp)
            Spacer(Modifier.height(8.dp))
            Text("欢迎来到\nbzx的小游戏世界！", color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.Bold, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            Text(if (palette.isNature) "在绿意中，遇见下一种可能" else "每一次相遇，都让光芒更近", color = Color.White.copy(alpha = .85f), fontSize = 14.sp)
            Spacer(Modifier.height(26.dp))
            Canvas(Modifier.width(120.dp).height(2.dp)) {
                drawRect(Color.White.copy(alpha = .18f))
                drawRect(accent, size = size.copy(width = size.width * timeline.value))
            }
            Spacer(Modifier.height(12.dp))
            Text("轻滑指尖 · 即刻启程", color = Color.White.copy(alpha = .6f), fontSize = 10.sp, letterSpacing = 2.sp)
        }
        TextButton(
            onClick = complete,
            modifier = Modifier.align(Alignment.TopEnd).systemBarsPadding().padding(16.dp)
                .background(Color.Black.copy(alpha = .32f), RoundedCornerShape(24.dp))
        ) { Text("跳过 ›", color = Color.White) }
    }
}
