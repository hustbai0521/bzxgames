package com.example.bzxandroidgames.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.example.bzxandroidgames.game.Snake
import com.example.bzxandroidgames.game.SnakeDir
import com.example.bzxandroidgames.game.SnakeStatus
import com.example.bzxandroidgames.game.SnakeUiState
import com.example.bzxandroidgames.sound.clickSfx
import com.example.bzxandroidgames.ui.theme.LocalGamePalette
import com.example.bzxandroidgames.ui.theme.NatureBackdrop
import kotlinx.coroutines.delay
import kotlin.math.abs

@Composable
fun SnakeScreen(
    state: SnakeUiState,
    onBack: () -> Unit,
    onTurn: (SnakeDir) -> Unit,
    onStart: () -> Unit,
    onTick: () -> Unit,
    onPause: () -> Unit,
    onResume: () -> Unit,
    onRestart: () -> Unit
) {
    val palette = LocalGamePalette.current
    val playing = state.status == SnakeStatus.PLAYING

    val interval by rememberUpdatedState(state.tickInterval)
    if (playing) {
        LaunchedEffect(Unit) {
            while (true) {
                delay(interval)
                onTick()
            }
        }
    }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_PAUSE) onPause()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(palette.background))
    ) {
        if (palette.isNature) NatureBackdrop() else SnakeTechGrid()
        Canvas(Modifier.fillMaxSize()) {
            drawCircle(palette.primary.copy(alpha = .07f), 240.dp.toPx(), Offset(size.width * .1f, size.height * .25f))
            drawCircle(palette.tertiary.copy(alpha = .06f), 300.dp.toPx(), Offset(size.width, size.height * .78f))
        }
        Column(
            Modifier.align(Alignment.TopCenter).widthIn(max = 480.dp).fillMaxSize()
                .systemBarsPadding().padding(horizontal = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(16.dp))
            TextButton(onClick = clickSfx(onBack), modifier = Modifier.align(Alignment.Start)) {
                Text("‹  返回游戏大厅", color = palette.primary)
            }
            SnakeHeader(state, onPause, onResume, onRestart)
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(11.dp)) {
                SnakeScoreCard("SCORE", state.score, palette.primary, Modifier.weight(1f))
                SnakeScoreCard("BEST", state.best, palette.tertiary, Modifier.weight(1f))
                SnakeScoreCard("长度", state.snake.size, palette.secondary, Modifier.weight(1f))
            }
            Spacer(Modifier.height(14.dp))
            SnakeBoard(state, onTurn, Modifier.weight(1f))
            Spacer(Modifier.height(12.dp))
            SnakeControls(playing, onTurn)
            Spacer(Modifier.height(10.dp))
            SnakeHintPill()
            Spacer(Modifier.height(12.dp))
        }

        if (state.status == SnakeStatus.READY) {
            SnakeStartOverlay(onStart, onBack)
        }
        if (state.status == SnakeStatus.PAUSED) {
            SnakePauseOverlay(onResume, onBack)
        }
    }
    if (state.status == SnakeStatus.OVER || state.status == SnakeStatus.WON) {
        SnakeResultDialog(state, onRestart)
    }
}

@Composable
private fun SnakeTechGrid() {
    val palette = LocalGamePalette.current
    Canvas(Modifier.fillMaxSize()) {
        val step = 44.dp.toPx()
        var x = 0f
        while (x < size.width) {
            drawLine(palette.primary.copy(alpha = .05f), Offset(x, 0f), Offset(x, size.height), 1f)
            x += step
        }
        var y = 0f
        while (y < size.height) {
            drawLine(palette.secondary.copy(alpha = .04f), Offset(0f, y), Offset(size.width, y), 1f)
            y += step
        }
    }
}

@Composable
private fun SnakeHeader(state: SnakeUiState, onPause: () -> Unit, onResume: () -> Unit, onRestart: () -> Unit) {
    val palette = LocalGamePalette.current
    Column(Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text(
                    "贪吃蛇",
                    style = TextStyle(
                        brush = Brush.linearGradient(palette.titleColors),
                        fontSize = 36.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = (-1).sp
                    )
                )
                Text(
                    if (palette.isNature) "GARDEN RUNNER" else "NEON SERPENT",
                    color = palette.secondary.copy(alpha = .78f), fontSize = 9.sp, letterSpacing = 2.3.sp
                )
            }
            Spacer(Modifier.weight(1f))
            SnakeRoundAction(
                if (state.status == SnakeStatus.PAUSED) "▶" else "⏸",
                "暂停或继续",
                state.status == SnakeStatus.PLAYING || state.status == SnakeStatus.PAUSED
            ) { if (state.status == SnakeStatus.PAUSED) onResume() else onPause() }
            Spacer(Modifier.size(9.dp))
            SnakeRoundAction("↻", "重新开始", true, onRestart)
        }
    }
}

@Composable
private fun SnakeScoreCard(label: String, value: Int, accent: Color, modifier: Modifier = Modifier) {
    val palette = LocalGamePalette.current
    Box(
        modifier
            .shadow(18.dp, RoundedCornerShape(18.dp), ambientColor = accent.copy(alpha = .28f), spotColor = accent.copy(alpha = .45f))
            .clip(RoundedCornerShape(18.dp))
            .background(Brush.linearGradient(listOf(accent.copy(alpha = .18f), palette.cardEnd)))
            .border(1.dp, accent.copy(alpha = .55f), RoundedCornerShape(18.dp))
            .padding(horizontal = 14.dp, vertical = 13.dp)
    ) {
        Column {
            Text(label, fontSize = 9.sp, letterSpacing = 1.7.sp, color = accent.copy(alpha = .86f))
            AnimatedContent(value, label = "score") { score ->
                Text(score.toString(), color = palette.text, fontSize = 21.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun SnakeRoundAction(symbol: String, label: String, enabled: Boolean, action: () -> Unit) {
    val palette = LocalGamePalette.current
    Box(
        Modifier
            .size(48.dp)
            .shadow(12.dp, CircleShape, ambientColor = palette.primary.copy(alpha = .25f), spotColor = palette.primary.copy(alpha = .4f))
            .clip(CircleShape)
            .background(Brush.linearGradient(palette.actionBackground))
            .border(1.dp, palette.primary.copy(alpha = if (enabled) .55f else .14f), CircleShape)
            .clickSfx(enabled = enabled, role = Role.Button, onClickLabel = label, onClick = action),
        contentAlignment = Alignment.Center
    ) {
        Text(symbol, fontSize = 23.sp, fontWeight = FontWeight.Medium, color = palette.text.copy(alpha = if (enabled) .9f else .25f))
    }
}

/** The plot: swipe or use the arrow keys; the snake never reverses into itself. */
@Composable
private fun SnakeBoard(state: SnakeUiState, onTurn: (SnakeDir) -> Unit, modifier: Modifier = Modifier) {
    val palette = LocalGamePalette.current
    val density = LocalDensity.current
    val threshold = with(density) { 26.dp.toPx() }
    var dragX by remember { mutableStateOf(0f) }
    var dragY by remember { mutableStateOf(0f) }
    val pulse = rememberInfinitePulse()

    BoxWithConstraints(modifier) {
        val cell = minOf(maxWidth / Snake.SIZE, maxHeight / Snake.SIZE)
        Box(
            Modifier
                .size(cell * Snake.SIZE + 14.dp, cell * Snake.SIZE + 14.dp)
                .shadow(30.dp, RoundedCornerShape(26.dp), ambientColor = palette.primary.copy(alpha = .26f), spotColor = palette.secondary.copy(alpha = .38f))
                .clip(RoundedCornerShape(26.dp))
                .background(
                    Brush.linearGradient(
                        listOf(palette.primary.copy(alpha = .72f), palette.secondary.copy(alpha = .7f), palette.tertiary.copy(alpha = .68f))
                    )
                )
                .padding(1.dp)
        ) {
            Box(
                Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(25.dp))
                    .background(palette.boardSurface)
                    .padding(6.dp)
                    .pointerInput(state.status) {
                        detectDragGestures(
                            onDragStart = {
                                dragX = 0f
                                dragY = 0f
                            },
                            onDrag = { change, amount ->
                                change.consume()
                                dragX += amount.x
                                dragY += amount.y
                                // fire as soon as a dominant direction clears the threshold,
                                // then reset so one long swipe can steer several turns
                                if (abs(dragX) > threshold || abs(dragY) > threshold) {
                                    val dir = if (abs(dragX) > abs(dragY)) {
                                        if (dragX > 0) SnakeDir.RIGHT else SnakeDir.LEFT
                                    } else {
                                        if (dragY > 0) SnakeDir.DOWN else SnakeDir.UP
                                    }
                                    onTurn(dir)
                                    dragX = 0f
                                    dragY = 0f
                                }
                            }
                        )
                    },
                contentAlignment = Alignment.Center
            ) {
                Canvas(Modifier.size(cell * Snake.SIZE, cell * Snake.SIZE)) {
                    val cellPx = cell.toPx()
                    // faint plot marks
                    for (i in 1 until Snake.SIZE) {
                        drawLine(
                            palette.primary.copy(alpha = .06f),
                            Offset(i * cellPx, 0f), Offset(i * cellPx, size.height), 1f
                        )
                        drawLine(
                            palette.primary.copy(alpha = .06f),
                            Offset(0f, i * cellPx), Offset(size.width, i * cellPx), 1f
                        )
                    }
                    // food pulses gently
                    state.food.let { food ->
                        val radius = cellPx * .3f * (1f + .1f * pulse)
                        drawCircle(palette.tertiary.copy(alpha = .25f), radius * 1.5f, cellCenter(food, cellPx))
                        drawCircle(palette.tertiary, radius, cellCenter(food, cellPx))
                        drawCircle(Color.White.copy(alpha = .5f), radius * .3f, cellCenter(food, cellPx) - Offset(radius * .3f, radius * .3f))
                    }
                    // the snake, fading toward the tail
                    val total = state.snake.size.coerceAtLeast(1)
                    state.snake.forEachIndexed { index, part ->
                        val t = index.toFloat() / total
                        val color = if (index == 0) palette.secondary else lerp(palette.primary, palette.boardSurface, .1f + .5f * t)
                        drawRoundRect(
                            color,
                            topLeft = Offset(part.x * cellPx + 1.dp.toPx(), part.y * cellPx + 1.dp.toPx()),
                            size = Size(cellPx - 2.dp.toPx(), cellPx - 2.dp.toPx()),
                            cornerRadius = CornerRadius(cellPx * .3f)
                        )
                    }
                    // eyes on the head, oriented by travel direction
                    state.snake.firstOrNull()?.let { head ->
                        val c = cellCenter(head, cellPx)
                        val eye = cellPx * .11f
                        val forward = Offset(Snake.dx(state.dir).toFloat(), Snake.dy(state.dir).toFloat())
                        val side = Offset(-forward.y, forward.x)
                        listOf(1f, -1f).forEach { s ->
                            drawCircle(
                                palette.boardSurface,
                                eye,
                                c + forward * cellPx * .16f + side * (eye * 1.6f * s)
                            )
                        }
                    }
                    if (state.status == SnakeStatus.OVER) {
                        state.snake.firstOrNull()?.let { head ->
                            drawCircle(
                                palette.tertiary.copy(alpha = .5f),
                                cellPx * .45f,
                                cellCenter(head, cellPx),
                                style = Stroke(2.dp.toPx())
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun cellCenter(point: com.example.bzxandroidgames.game.SnakePoint, cellPx: Float): Offset =
    Offset((point.x + .5f) * cellPx, (point.y + .5f) * cellPx)

@Composable
private fun rememberInfinitePulse(): Float {
    val transition = rememberInfiniteTransition(label = "food-pulse")
    val value by transition.animateFloat(
        0f, 1f,
        infiniteRepeatable(tween(700, easing = LinearEasing), RepeatMode.Reverse),
        label = "food-scale"
    )
    return value
}

/** Direction pad in the classic cross layout: up on top, left/down/right below. */
@Composable
private fun SnakeControls(enabled: Boolean, onTurn: (SnakeDir) -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        SnakeKey("▲", "向上", enabled) { onTurn(SnakeDir.UP) }
        Row(horizontalArrangement = Arrangement.spacedBy(18.dp)) {
            SnakeKey("◀", "向左", enabled) { onTurn(SnakeDir.LEFT) }
            SnakeKey("▼", "向下", enabled) { onTurn(SnakeDir.DOWN) }
            SnakeKey("▶", "向右", enabled) { onTurn(SnakeDir.RIGHT) }
        }
    }
}

@Composable
private fun SnakeKey(symbol: String, label: String, enabled: Boolean, action: () -> Unit) {
    val palette = LocalGamePalette.current
    Box(
        Modifier
            .size(56.dp)
            .alpha(if (enabled) 1f else .35f)
            .shadow(12.dp, CircleShape, ambientColor = palette.primary.copy(alpha = .25f), spotColor = palette.primary.copy(alpha = .4f))
            .clip(CircleShape)
            .background(Brush.linearGradient(palette.actionBackground))
            .border(1.dp, palette.primary.copy(alpha = if (enabled) .55f else .14f), CircleShape)
            .clickSfx(enabled = enabled, role = Role.Button, onClickLabel = label, onClick = action),
        contentAlignment = Alignment.Center
    ) {
        Text(symbol, fontSize = 22.sp, fontWeight = FontWeight.Medium, color = palette.text.copy(alpha = if (enabled) .9f else .25f))
    }
}

@Composable
private fun SnakeHintPill() {
    val palette = LocalGamePalette.current
    Row(
        Modifier
            .clip(CircleShape)
            .background(palette.primary.copy(alpha = .07f))
            .border(1.dp, palette.primary.copy(alpha = .16f), CircleShape)
            .padding(horizontal = 15.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(6.dp).clip(CircleShape).background(palette.primary))
        Text(
            "  在棋盘上滑动或用方向键转向 · 吃到果实就会变长",
            fontSize = 12.sp,
            color = palette.mutedText
        )
    }
}

/** The arrival panel: the board is laid out, waiting for the player to begin. */
@Composable
private fun SnakeStartOverlay(onStart: () -> Unit, onBack: () -> Unit) {
    val palette = LocalGamePalette.current
    Box(
        Modifier.fillMaxSize().background(palette.primary.copy(alpha = .26f)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            Modifier
                .shadow(20.dp, RoundedCornerShape(24.dp))
                .clip(RoundedCornerShape(24.dp))
                .background(palette.surface)
                .border(1.dp, palette.primary.copy(alpha = .4f), RoundedCornerShape(24.dp))
                .padding(horizontal = 28.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("准备好了吗？", color = palette.text, fontSize = 22.sp, fontWeight = FontWeight.Black)
            Spacer(Modifier.height(6.dp))
            Text("滑动棋盘或用方向键转向，别咬到自己", color = palette.mutedText, fontSize = 12.sp)
            Spacer(Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OverlayPill("开始游戏", filled = true) { onStart() }
                OverlayPill("返回大厅", filled = false) { onBack() }
            }
        }
    }
}

@Composable
private fun SnakePauseOverlay(onResume: () -> Unit, onBack: () -> Unit) {
    val palette = LocalGamePalette.current
    Box(
        Modifier
            .fillMaxSize()
            .background(palette.primary.copy(alpha = .32f))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClickLabel = "继续游戏"
            ) { onResume() },
        contentAlignment = Alignment.Center
    ) {
        Column(
            Modifier
                .shadow(20.dp, RoundedCornerShape(24.dp))
                .clip(RoundedCornerShape(24.dp))
                .background(palette.surface)
                .border(1.dp, palette.primary.copy(alpha = .4f), RoundedCornerShape(24.dp))
                .padding(horizontal = 28.dp, vertical = 22.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("已暂停", color = palette.text, fontSize = 22.sp, fontWeight = FontWeight.Black)
            Spacer(Modifier.height(6.dp))
            Text("轻点遮罩继续，或从下面选择", color = palette.mutedText, fontSize = 12.sp)
            Spacer(Modifier.height(14.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OverlayPill("继续游戏", filled = true) { onResume() }
                OverlayPill("返回大厅", filled = false) { onBack() }
            }
        }
    }
}

@Composable
private fun OverlayPill(label: String, filled: Boolean, onClick: () -> Unit) {
    val palette = LocalGamePalette.current
    Text(
        label,
        color = if (filled) Color.White else palette.primary,
        fontSize = 13.sp,
        fontWeight = if (filled) FontWeight.Bold else FontWeight.Medium,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (filled) palette.secondary else Color.Transparent)
            .border(1.dp, palette.primary.copy(alpha = if (filled) 0f else .45f), RoundedCornerShape(50))
            .clickSfx(role = Role.Button, onClickLabel = label, onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 9.dp)
    )
}

@Composable
private fun SnakeResultDialog(state: SnakeUiState, onRestart: () -> Unit) {
    val palette = LocalGamePalette.current
    val won = state.status == SnakeStatus.WON
    AlertDialog(
        onDismissRequest = {},
        containerColor = palette.surface,
        tonalElevation = 16.dp,
        title = {
            Text(
                when {
                    won && palette.isNature -> "整个花园都是你"
                    won -> "PLOT CONQUERED"
                    palette.isNature -> "撞到了"
                    else -> "GAME OVER"
                },
                color = if (won) palette.primary else palette.tertiary,
                fontWeight = FontWeight.Black
            )
        },
        text = {
            Text(
                if (won) "15×15 的棋盘全部占满，得分 ${state.score}，无解的完美贪吃蛇。"
                else "本轮得分 ${state.score}，长度 ${state.snake.size}。缓缓再来，别咬到自己。",
                color = palette.mutedText
            )
        },
        confirmButton = {
            Button(
                onClick = clickSfx(onRestart),
                colors = ButtonDefaults.buttonColors(containerColor = palette.secondary, contentColor = Color.White)
            ) { Text("再来一局") }
        }
    )
}
