package com.example.bzxandroidgames.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bzxandroidgames.sound.clickSfx
import com.example.bzxandroidgames.ui.theme.ShinkaiCountrysideBackdrop

/** A fixed summer lobby, independent of the themes used inside the individual games. */
@Composable
fun GameLibrary(
    on2048: () -> Unit,
    onGomoku: () -> Unit,
    onMinesweeper: () -> Unit = {},
    onSpider: () -> Unit = {},
    onSettings: () -> Unit = {},
    onSkyVisibleChange: (Boolean) -> Unit = {}
) {
    var upcoming by rememberSaveable { mutableStateOf<String?>(null) }
    val scroll = rememberScrollState()
    var entered by remember { mutableStateOf(false) }
    val reveal = animateFloatAsState(if (entered) 1f else 0f, tween(900), label = "lobby-arrival")
    LaunchedEffect(Unit) { entered = true }

    BoxWithConstraints(Modifier.fillMaxSize().background(Color(0xFFF2F8F5))) {
        val compactHeader = maxWidth < 360.dp
        val heroHeight = (maxHeight * .38f).coerceIn(290.dp, 380.dp)
        val skyThreshold = with(LocalDensity.current) { maxHeight.toPx() * .3f }
        val skyVisible by remember(skyThreshold) { derivedStateOf { scroll.value < skyThreshold } }
        LaunchedEffect(skyVisible, onSkyVisibleChange) { onSkyVisibleChange(skyVisible) }
        ShinkaiCountrysideBackdrop(scrollOffset = { scroll.value })
        Column(
            Modifier.align(Alignment.TopCenter).widthIn(max = 600.dp).fillMaxSize()
                .systemBarsPadding().verticalScroll(scroll).padding(horizontal = 24.dp)
        ) {
            Column(Modifier.fillMaxWidth().heightIn(min = heroHeight).padding(top = 14.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                        BreezeMark(Modifier.size(22.dp), Color.White)
                        Spacer(Modifier.width(9.dp))
                        Text("BZX / 小游戏合集", color = Color.White,
                            fontSize = if (compactHeader) 11.sp else 13.sp,
                            fontWeight = FontWeight.Medium,
                            letterSpacing = if (compactHeader) .5.sp else 1.sp,
                            maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    Row(
                        Modifier.clip(CircleShape).background(Color.White.copy(alpha = .16f))
                            .border(.7.dp, Color.White.copy(alpha = .42f), CircleShape)
                            .padding(horizontal = 11.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        SunMark(Modifier.size(13.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("晴日心情", color = Color.White, fontSize = 10.sp)
                    }
                    Spacer(Modifier.width(8.dp))
                    GearIconButton("设置", onSettings)
                }
                Column(Modifier.padding(top = 34.dp).graphicsLayer {
                    alpha = reveal.value
                    translationY = (1f - reveal.value) * 14.dp.toPx()
                }) {
                    Text("风很轻，快乐很近。", color = Color.White.copy(alpha = .88f), fontSize = 12.sp, letterSpacing = 3.sp)
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "把时光，\n留给喜欢的事。",
                        style = TextStyle(color = Color.White, fontSize = 32.sp, lineHeight = 44.sp,
                            fontWeight = FontWeight.Light, letterSpacing = 2.sp,
                            shadow = androidx.compose.ui.graphics.Shadow(Color(0xFF1C5272).copy(alpha = .22f), Offset(0f, 2f), 12f))
                    )
                    Spacer(Modifier.height(15.dp))
                    Text("A LITTLE MOMENT OF JOY", color = Color.White.copy(alpha = .78f), fontSize = 9.sp, letterSpacing = 2.sp)
                }
                Spacer(Modifier.height(38.dp))
            }

            Column(Modifier.graphicsLayer {
                alpha = reveal.value
                translationY = (1f - reveal.value) * 24.dp.toPx()
            }) {
                Row(Modifier.fillMaxWidth().padding(bottom = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("此刻，来一局", color = DeepInk, fontSize = 22.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.sp)
                        Spacer(Modifier.height(5.dp))
                        Text("没有倒计时，只有好时光", color = SoftInk, fontSize = 11.sp)
                    }
                    Text("随时开玩", color = DeepInk, fontSize = 10.sp,
                        modifier = Modifier.clip(CircleShape).background(Color.White.copy(alpha = .75f))
                            .padding(horizontal = 11.dp, vertical = 7.dp))
                }
                Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    PlayableCard("2048", "轻轻一滑，快乐加倍", "数字益智", SeaGlass, false, on2048, Modifier.weight(1f))
                    PlayableCard("五子棋", "落子之间，慢慢来", "人机 / 双人", WarmRose, true, onGomoku, Modifier.weight(1f))
                }
                Row(Modifier.fillMaxWidth().padding(top = 28.dp, bottom = 13.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("下一站，小惊喜", color = DeepInk, fontSize = 17.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                    Text("3 款筹备中", color = SoftInk, fontSize = 10.sp)
                }
                val games = listOf(
                    UpcomingGame("贪吃蛇", "一路生长", 0),
                    UpcomingGame("俄罗斯方块", "拼出新可能", 1),
                    UpcomingGame("连连看", "遇见成双的美好", 2),
                    UpcomingGame("蜘蛛纸牌", "理好每一手牌", 3, ready = true, route = "spider"),
                    UpcomingGame("扫雷", "每一步都是灵感", 4, ready = true, route = "mines")
                )
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    games.chunked(2).forEach { pair ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            pair.forEach { game ->
                                UpcomingCard(game, Modifier.weight(1f)) {
                                    when (game.route) {
                                        "mines" -> onMinesweeper()
                                        "spider" -> onSpider()
                                        else -> upcoming = game.name
                                    }
                                }
                            }
                            if (pair.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                }
                Text("愿每一天，都有小小的好天气。", color = SoftInk, fontSize = 10.sp, letterSpacing = 1.sp,
                    textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(top = 27.dp, bottom = 24.dp))
            }
        }
    }
    upcoming?.let { name ->
        AlertDialog(
            onDismissRequest = { upcoming = null },
            shape = RoundedCornerShape(28.dp),
            containerColor = Color(0xFFF5FAF7),
            title = { Text("美好正在路上", color = DeepInk, fontWeight = FontWeight.SemiBold) },
            text = { Text("$name 正在筹备中，先享受眼前这一局吧。", color = SoftInk) },
            confirmButton = { TextButton(onClick = clickSfx { upcoming = null }) { Text("好，慢慢来", color = SeaGlass) } }
        )
    }
}

@Composable
private fun PlayableCard(
    title: String, subtitle: String, category: String, accent: Color,
    gomoku: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier
) {
    val shape = RoundedCornerShape(24.dp)
    Column(
        modifier.fillMaxHeight().shadow(12.dp, shape, clip = false, ambientColor = accent.copy(alpha = .13f), spotColor = accent.copy(alpha = .15f))
            .clip(shape).background(Brush.verticalGradient(listOf(Color.White.copy(alpha = .94f), Color(0xFFF9FCF8).copy(alpha = .93f))))
            .border(1.dp, Color.White.copy(alpha = .9f), shape)
            .clickSfx(role = Role.Button, onClickLabel = "进入$title", onClick = onClick).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(7.dp)
    ) {
        Text(category, color = accent, fontSize = 10.sp, letterSpacing = 1.sp)
        Box(Modifier.fillMaxWidth().height(84.dp), contentAlignment = Alignment.Center) {
            if (gomoku) GomokuIllustration(Modifier.size(73.dp).graphicsLayer { rotationZ = 7f })
            else NumberIllustration(Modifier.size(70.dp).graphicsLayer { rotationZ = -7f })
        }
        Text(title, color = DeepInk, fontSize = 27.sp, lineHeight = 38.sp, fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp, modifier = Modifier.heightIn(min = 42.dp))
        Text(subtitle, color = SoftInk, fontSize = 10.sp)
        Row(Modifier.fillMaxWidth().padding(top = 7.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("开始游戏", color = accent, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
            Box(Modifier.size(26.dp).background(accent.copy(alpha = .1f), CircleShape), contentAlignment = Alignment.Center) {
                Text("→", color = accent, fontSize = 16.sp)
            }
        }
    }
}

@Composable
private fun NumberIllustration(modifier: Modifier) {
    val colors = listOf(Color(0xFFEAF2E7), Color(0xFFD7EAE3), Color(0xFFF9E4BF), Color(0xFFE9B69D))
    Column(modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        repeat(2) { row ->
            Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                repeat(2) { col ->
                    val i = row * 2 + col
                    Box(Modifier.weight(1f).fillMaxHeight().shadow(2.dp, RoundedCornerShape(8.dp))
                        .background(colors[i], RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
                        Text(listOf("2", "4", "8", "16")[i], color = if (i == 3) Color.White else DeepInk,
                            fontSize = 17.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun GomokuIllustration(modifier: Modifier) {
    Canvas(modifier) {
        drawRoundRect(Color(0xFFE6D8B9), cornerRadius = CornerRadius(10.dp.toPx()))
        val pad = size.width * .15f
        val step = (size.width - pad * 2) / 4
        repeat(5) { i ->
            val xy = pad + i * step
            drawLine(Color(0xFFB2A185), Offset(pad, xy), Offset(size.width - pad, xy), .65.dp.toPx())
            drawLine(Color(0xFFB2A185), Offset(xy, pad), Offset(xy, size.height - pad), .65.dp.toPx())
        }
        listOf(1 to 1, 2 to 2, 3 to 3, 2 to 1, 1 to 3).forEachIndexed { i, (col, row) ->
            val center = Offset(pad + col * step, pad + row * step)
            drawCircle(Color(0xFF6B665B).copy(alpha = .18f), step * .4f, center + Offset(0f, 1.5.dp.toPx()))
            drawCircle(Brush.radialGradient(
                if (i < 3) listOf(Color(0xFF647076), Color(0xFF2E3C43)) else listOf(Color.White, Color(0xFFECEDE5)),
                center - Offset(2.dp.toPx(), 2.dp.toPx()), step * .65f
            ), step * .39f, center)
        }
    }
}

private data class UpcomingGame(
    val name: String,
    val subtitle: String,
    val icon: Int,
    val ready: Boolean = false,
    val route: String? = null
)

@Composable
private fun UpcomingCard(game: UpcomingGame, modifier: Modifier, onClick: () -> Unit) {
    Row(
        modifier
            .clip(RoundedCornerShape(17.dp))
            .background(if (game.ready) Color.White.copy(alpha = .92f) else Color.White.copy(alpha = .66f))
            .border(
                1.dp,
                if (game.ready) SeaGlass.copy(alpha = .45f) else Color.White.copy(alpha = .85f),
                RoundedCornerShape(17.dp)
            )
            .clickSfx(
                role = Role.Button,
                onClickLabel = if (game.ready) "进入${game.name}" else "${game.name}，敬请期待",
                onClick = onClick
            )
            .heightIn(min = 85.dp).padding(horizontal = 12.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        UpcomingIcon(game.icon, Modifier.size(26.dp))
        Spacer(Modifier.width(10.dp))
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(game.name, color = DeepInk, fontSize = 13.sp, fontWeight = FontWeight.Medium)
            Text(game.subtitle, color = SoftInk, fontSize = 9.sp)
            if (game.ready) {
                Text("开始游戏 →", color = SeaGlass, fontSize = 8.sp, fontWeight = FontWeight.SemiBold)
            } else {
                Text("筹备中", color = SeaGlass.copy(alpha = .8f), fontSize = 8.sp)
            }
        }
    }
}

/** Small native illustrations keep the lobby crisp without relying on emoji fonts. */
@Composable
private fun UpcomingIcon(kind: Int, modifier: Modifier) {
    Canvas(modifier) {
        val ink = SeaGlass.copy(alpha = .8f)
        val w = size.width
        val h = size.height
        val stroke = 1.6.dp.toPx()
        when (kind) {
            0 -> {
                val snake = Path().apply {
                    moveTo(w * .15f, h * .8f); lineTo(w * .65f, h * .8f)
                    quadraticTo(w * .9f, h * .8f, w * .9f, h * .56f)
                    quadraticTo(w * .9f, h * .37f, w * .65f, h * .37f)
                    lineTo(w * .36f, h * .37f)
                    quadraticTo(w * .13f, h * .37f, w * .13f, h * .16f)
                    lineTo(w * .48f, h * .16f)
                }
                drawPath(snake, ink, style = Stroke(4.dp.toPx(), cap = StrokeCap.Round))
                drawCircle(Color.White, 1.dp.toPx(), Offset(w * .43f, h * .13f))
            }
            1 -> listOf(0 to 1, 1 to 1, 1 to 0, 2 to 0).forEach { (x, y) ->
                drawRoundRect(ink.copy(alpha = if (y == 0) .85f else .5f),
                    Offset(x * w / 3 + 1.dp.toPx(), y * h / 3 + h * .17f), Size(w * .27f, h * .27f), CornerRadius(2.dp.toPx()))
            }
            2 -> repeat(2) { i ->
                val cx = w * (.33f + i * .35f)
                val cy = h * (.36f + i * .28f)
                val diamond = Path().apply {
                    moveTo(cx, cy - h * .25f); lineTo(cx + w * .22f, cy)
                    lineTo(cx, cy + h * .25f); lineTo(cx - w * .22f, cy); close()
                }
                drawPath(diamond, ink.copy(alpha = if (i == 0) .45f else .9f), style = Stroke(stroke))
            }
            3 -> {
                drawRoundRect(ink.copy(alpha = .25f), Offset(w * .1f, h * .08f), Size(w * .58f, h * .77f), CornerRadius(3.dp.toPx()))
                drawRoundRect(Color(0xFFFAFCF7), Offset(w * .32f, h * .2f), Size(w * .58f, h * .77f), CornerRadius(3.dp.toPx()))
                drawRoundRect(ink, Offset(w * .32f, h * .2f), Size(w * .58f, h * .77f), CornerRadius(3.dp.toPx()), style = Stroke(stroke))
                drawCircle(ink, w * .1f, Offset(w * .61f, h * .56f))
            }
            else -> {
                drawCircle(ink, w * .24f, center, style = Stroke(stroke))
                repeat(8) { i ->
                    val angle = i * Math.PI / 4
                    val direction = Offset(kotlin.math.cos(angle).toFloat(), kotlin.math.sin(angle).toFloat())
                    drawLine(ink, center + direction * w * .31f, center + direction * w * .44f, stroke, StrokeCap.Round)
                }
                drawCircle(ink.copy(alpha = .35f), w * .07f, center)
            }
        }
    }
}

@Composable
private fun BreezeMark(modifier: Modifier, color: Color) {
    Canvas(modifier) {
        repeat(3) { i ->
            val y = size.height * (.25f + i * .25f)
            val path = Path().apply {
                moveTo(0f, y)
                lineTo(size.width * (.6f - i * .12f), y)
                quadraticTo(size.width * (.95f - i * .1f), y, size.width * (.8f - i * .12f), y - size.height * .15f)
            }
            drawPath(path, color.copy(alpha = 1f - i * .18f), style = Stroke(1.4.dp.toPx(), cap = StrokeCap.Round))
        }
    }
}

@Composable
private fun SunMark(modifier: Modifier) {
    Canvas(modifier) {
        drawCircle(Color(0xFFFFE7AD), size.width * .23f, center)
        repeat(8) { i ->
            val angle = i * Math.PI / 4
            val direction = Offset(kotlin.math.cos(angle).toFloat(), kotlin.math.sin(angle).toFloat())
            drawLine(Color(0xFFFFE7AD), center + direction * size.width * .34f,
                center + direction * size.width * .46f, 1.dp.toPx(), StrokeCap.Round)
        }
    }
}
