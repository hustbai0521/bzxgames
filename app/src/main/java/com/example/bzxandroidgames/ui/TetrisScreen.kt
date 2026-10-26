package com.example.bzxandroidgames.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberUpdatedState
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
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
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
import com.example.bzxandroidgames.game.Tetris
import com.example.bzxandroidgames.game.TetrisStatus
import com.example.bzxandroidgames.game.TetrisUiState
import com.example.bzxandroidgames.game.Tetromino
import com.example.bzxandroidgames.sound.clickSfx
import com.example.bzxandroidgames.ui.theme.GamePalette
import com.example.bzxandroidgames.ui.theme.LocalGamePalette
import com.example.bzxandroidgames.ui.theme.NatureBackdrop
import kotlinx.coroutines.delay

// One color per tetromino, tuned per theme so pieces stay distinct on the board.
private fun pieceColor(id: Int, nature: Boolean): Color = if (nature) when (id) {
    1 -> Color(0xFF6FA8C9)
    2 -> Color(0xFFE3C36B)
    3 -> Color(0xFFB58BD0)
    4 -> Color(0xFF7FB575)
    5 -> Color(0xFFD98B7E)
    6 -> Color(0xFF5E8AA8)
    else -> Color(0xFFD9A05B)
} else when (id) {
    1 -> Color(0xFF22D3EE)
    2 -> Color(0xFFFACC15)
    3 -> Color(0xFFA855F7)
    4 -> Color(0xFF4ADE80)
    5 -> Color(0xFFF43F5E)
    6 -> Color(0xFF3B82F6)
    else -> Color(0xFFFB923C)
}

@Composable
fun TetrisScreen(
    state: TetrisUiState,
    onBack: () -> Unit,
    onMoveLeft: () -> Unit,
    onMoveRight: () -> Unit,
    onRotate: () -> Unit,
    onSoftDrop: () -> Unit,
    onHardDrop: () -> Unit,
    onStart: () -> Unit,
    onTick: () -> Unit,
    onPause: () -> Unit,
    onResume: () -> Unit,
    onRestart: () -> Unit
) {
    val palette = LocalGamePalette.current
    val playing = state.status == TetrisStatus.PLAYING

    // Gravity runs only while the screen is composed AND the game is live; leaving the
    // screen or pausing stops the loop, and returning resumes from where it froze.
    val interval by rememberUpdatedState(state.dropInterval)
    if (playing) {
        LaunchedEffect(Unit) {
            while (true) {
                delay(interval)
                onTick()
            }
        }
    }

    // Leaving the foreground mid-game pauses, so pieces never fall unseen.
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
        if (palette.isNature) NatureBackdrop() else TechGrid(alpha = .05f)
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
            TetrisHeader(state, onPause, onResume, onRestart)
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(11.dp)) {
                ScoreCard("SCORE", state.score, palette.primary, Modifier.weight(1f))
                ScoreCard("BEST", state.best, palette.tertiary, Modifier.weight(1f))
            }
            Spacer(Modifier.height(14.dp))
            Row(
                Modifier.fillMaxWidth().weight(1f),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TetrisBoard(state, palette, Modifier.weight(1f))
                SidePanel(state, Modifier.width(96.dp))
            }
            Spacer(Modifier.height(12.dp))
            Controls(playing, onMoveLeft, onMoveRight, onRotate, onSoftDrop, onHardDrop)
            Spacer(Modifier.height(10.dp))
            HintPill()
            Spacer(Modifier.height(12.dp))
        }

        if (state.status == TetrisStatus.READY) {
            TetrisStartOverlay(onStart, onBack)
        }
        if (state.status == TetrisStatus.PAUSED) {
            PauseOverlay(onResume, onBack)
        }
    }
    if (state.status == TetrisStatus.OVER) {
        ResultDialog(state, onRestart)
    }
}

@Composable
private fun TechGrid(alpha: Float = .16f) {
    val palette = LocalGamePalette.current
    Canvas(Modifier.fillMaxSize()) {
        val step = 44.dp.toPx()
        var x = 0f
        while (x < size.width) {
            drawLine(palette.primary.copy(alpha = alpha), Offset(x, 0f), Offset(x, size.height), 1f)
            x += step
        }
        var y = 0f
        while (y < size.height) {
            drawLine(palette.secondary.copy(alpha = alpha * .75f), Offset(0f, y), Offset(size.width, y), 1f)
            y += step
        }
    }
}

@Composable
private fun TetrisHeader(
    state: TetrisUiState,
    onPause: () -> Unit,
    onResume: () -> Unit,
    onRestart: () -> Unit
) {
    val palette = LocalGamePalette.current
    Column(Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text(
                    "俄罗斯方块",
                    style = TextStyle(
                        brush = Brush.linearGradient(palette.titleColors),
                        fontSize = 36.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = (-1).sp
                    )
                )
                Text(
                    if (palette.isNature) "GARDEN STACKS" else "NEON STACKS",
                    color = palette.secondary.copy(alpha = .78f), fontSize = 9.sp, letterSpacing = 2.3.sp
                )
            }
            Spacer(Modifier.weight(1f))
            RoundAction(
                if (state.status == TetrisStatus.PAUSED) "▶" else "⏸",
                "暂停或继续",
                state.status == TetrisStatus.PLAYING || state.status == TetrisStatus.PAUSED
            ) { if (state.status == TetrisStatus.PAUSED) onResume() else onPause() }
            Spacer(Modifier.size(9.dp))
            RoundAction("↻", "重新开始", true, onRestart)
        }
    }
}

@Composable
private fun ScoreCard(label: String, value: Int, accent: Color, modifier: Modifier = Modifier) {
    val palette = LocalGamePalette.current
    Box(
        modifier
            .shadow(18.dp, RoundedCornerShape(18.dp), ambientColor = accent.copy(alpha = .28f), spotColor = accent.copy(alpha = .45f))
            .clip(RoundedCornerShape(18.dp))
            .background(Brush.linearGradient(listOf(accent.copy(alpha = .18f), palette.cardEnd)))
            .border(1.dp, accent.copy(alpha = .55f), RoundedCornerShape(18.dp))
            .padding(horizontal = 18.dp, vertical = 13.dp)
    ) {
        Column {
            Text(label, fontSize = 9.sp, letterSpacing = 1.7.sp, color = accent.copy(alpha = .86f))
            AnimatedContent(value, label = "score") { score ->
                Text(score.toString(), color = palette.text, fontSize = 23.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun RoundAction(symbol: String, label: String, enabled: Boolean, action: () -> Unit) {
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

/** The well: a glowing rounded frame like the 2048 board, cells drawn on a Canvas. */
@Composable
private fun TetrisBoard(
    state: TetrisUiState,
    palette: GamePalette,
    modifier: Modifier = Modifier
) {
    BoxWithConstraints(modifier) {
        val cell = minOf((maxWidth - 16.dp) / Tetris.WIDTH, (maxHeight - 16.dp) / Tetris.HEIGHT)
        val flash = remember { Animatable(1f) }
        LaunchedEffect(state.clearId) {
            if (state.clearId > 0) {
                flash.snapTo(0f)
                flash.animateTo(1f, tween(340, easing = FastOutSlowInEasing))
            }
        }
        Box(
            Modifier
                .size(cell * Tetris.WIDTH + 14.dp, cell * Tetris.HEIGHT + 14.dp)
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
                Modifier.fillMaxSize().clip(RoundedCornerShape(25.dp))
                    .background(palette.boardSurface).padding(6.dp),
                contentAlignment = Alignment.Center
            ) {
                Canvas(Modifier.size(cell * Tetris.WIDTH, cell * Tetris.HEIGHT)) {
                    val cellPx = cell.toPx()
                    state.board.forEachIndexed { index, value ->
                        if (value != 0) drawCell(index % Tetris.WIDTH, index / Tetris.WIDTH, pieceColor(value, palette.isNature), cellPx, palette.isNature)
                    }
                    if (state.status != TetrisStatus.OVER) {
                        state.falling?.let { piece ->
                            val distance = Tetris.dropPosition(state.board, piece)
                            if (distance > 0) {
                                piece.cells.forEachIndexed { row, line ->
                                    line.forEachIndexed { column, filled ->
                                        if (filled) {
                                            val x = piece.x + column
                                            val y = piece.y + row + distance
                                            if (y in 0 until Tetris.HEIGHT) {
                                                drawRoundRect(
                                                    palette.primary.copy(alpha = .4f),
                                                    topLeft = Offset(x * cellPx + 2.dp.toPx(), y * cellPx + 2.dp.toPx()),
                                                    size = Size(cellPx - 4.dp.toPx(), cellPx - 4.dp.toPx()),
                                                    cornerRadius = CornerRadius(2.dp.toPx()),
                                                    style = Stroke(1.2.dp.toPx())
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                            piece.cells.forEachIndexed { row, line ->
                                line.forEachIndexed { column, filled ->
                                    if (filled) {
                                        val x = piece.x + column
                                        val y = piece.y + row
                                        if (y >= 0 && x in 0 until Tetris.WIDTH && y < Tetris.HEIGHT) {
                                            drawCell(x, y, pieceColor(piece.type.id, palette.isNature), cellPx, palette.isNature)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (flash.value < 1f && state.clearedRows.isNotEmpty()) {
                        state.clearedRows.forEach { row ->
                            drawRect(
                                Color.White.copy(alpha = (1f - flash.value) * .85f),
                                topLeft = Offset(0f, row * cellPx),
                                size = Size(size.width, cellPx)
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun DrawScope.drawCell(x: Int, y: Int, color: Color, cellPx: Float, nature: Boolean) {
    val inset = 1.dp.toPx()
    val topLeft = Offset(x * cellPx + inset, y * cellPx + inset)
    val side = cellPx - inset * 2
    val radius = CornerRadius(2.5.dp.toPx())
    drawRoundRect(color, topLeft, Size(side, side), radius)
    drawRoundRect(
        if (nature) Color.Black.copy(alpha = .18f) else Color.White.copy(alpha = .3f),
        topLeft, Size(side, side), radius, style = Stroke(1.dp.toPx())
    )
}

@Composable
private fun SidePanel(state: TetrisUiState, modifier: Modifier = Modifier) {
    val palette = LocalGamePalette.current
    Column(modifier, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Box(
            Modifier.fillMaxWidth()
                .shadow(14.dp, RoundedCornerShape(16.dp), ambientColor = palette.tertiary.copy(alpha = .28f), spotColor = palette.tertiary.copy(alpha = .45f))
                .clip(RoundedCornerShape(16.dp))
                .background(Brush.linearGradient(listOf(palette.tertiary.copy(alpha = .18f), palette.cardEnd)))
                .border(1.dp, palette.tertiary.copy(alpha = .55f), RoundedCornerShape(16.dp))
                .padding(vertical = 12.dp),
            contentAlignment = Alignment.TopCenter
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("NEXT", fontSize = 9.sp, letterSpacing = 1.7.sp, color = palette.tertiary.copy(alpha = .86f))
                Spacer(Modifier.height(8.dp))
                NextPreview(state.next, palette)
            }
        }
        MiniStat("消行", state.lines, palette.primary)
        MiniStat("等级", state.level, palette.secondary)
    }
}

@Composable
private fun NextPreview(next: Tetromino, palette: GamePalette) {
    Canvas(Modifier.size(56.dp, 26.dp)) {
        val mini = 11.dp.toPx()
        val columns = next.cells.first().size
        val rows = next.cells.size
        val offsetX = (size.width - columns * mini) / 2
        val offsetY = (size.height - rows * mini) / 2
        next.cells.forEachIndexed { row, line ->
            line.forEachIndexed { column, filled ->
                if (filled) {
                    drawRoundRect(
                        pieceColor(next.id, palette.isNature),
                        topLeft = Offset(offsetX + column * mini + 1f, offsetY + row * mini + 1f),
                        size = Size(mini - 2f, mini - 2f),
                        cornerRadius = CornerRadius(2.dp.toPx())
                    )
                }
            }
        }
    }
}

@Composable
private fun MiniStat(label: String, value: Int, accent: Color) {
    val palette = LocalGamePalette.current
    Box(
        Modifier.fillMaxWidth()
            .shadow(10.dp, RoundedCornerShape(14.dp), ambientColor = accent.copy(alpha = .2f), spotColor = accent.copy(alpha = .32f))
            .clip(RoundedCornerShape(14.dp))
            .background(Brush.linearGradient(listOf(accent.copy(alpha = .14f), palette.cardEnd)))
            .border(1.dp, accent.copy(alpha = .45f), RoundedCornerShape(14.dp))
            .padding(vertical = 9.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(label, fontSize = 10.sp, color = palette.mutedText)
            Spacer(Modifier.width(6.dp))
            Text(value.toString(), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = palette.text)
        }
    }
}

/** Direction buttons repeat while held; rotate and hard drop fire once per tap. */
@Composable
private fun Controls(
    enabled: Boolean,
    onMoveLeft: () -> Unit,
    onMoveRight: () -> Unit,
    onRotate: () -> Unit,
    onSoftDrop: () -> Unit,
    onHardDrop: () -> Unit
) {
    val palette = LocalGamePalette.current
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally)
    ) {
        HoldButton("◀", "左移", enabled, repeatOnHold = true, onMoveLeft)
        HoldButton("▼", "软降", enabled, repeatOnHold = true, onSoftDrop)
        HoldButton("▶", "右移", enabled, repeatOnHold = true, onMoveRight)
        HoldButton("⟳", "旋转", enabled, repeatOnHold = false, onRotate)
        HoldButton("⇓", "硬降", enabled, repeatOnHold = false, onHardDrop, accent = palette.secondary)
    }
}

@Composable
private fun HoldButton(
    symbol: String,
    label: String,
    enabled: Boolean,
    repeatOnHold: Boolean,
    action: () -> Unit,
    accent: Color? = null
) {
    val palette = LocalGamePalette.current
    val tone = accent ?: palette.primary
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    LaunchedEffect(pressed, repeatOnHold) {
        if (pressed && repeatOnHold) {
            action()
            delay(300)
            while (true) {
                action()
                delay(115)
            }
        }
    }
    Box(
        Modifier
            .size(52.dp)
            .alpha(if (enabled) 1f else .35f)
            .shadow(12.dp, CircleShape, ambientColor = tone.copy(alpha = .25f), spotColor = tone.copy(alpha = .4f))
            .clip(CircleShape)
            .background(Brush.linearGradient(palette.actionBackground))
            .border(1.dp, tone.copy(alpha = if (enabled) .55f else .14f), CircleShape)
            .clickable(
                interactionSource = interaction,
                indication = null,
                enabled = enabled,
                onClickLabel = label,
                role = Role.Button
            ) { if (!repeatOnHold) action() }
            .semantics { contentDescription = label },
        contentAlignment = Alignment.Center
    ) {
        Text(symbol, fontSize = 22.sp, fontWeight = FontWeight.Medium, color = palette.text.copy(alpha = if (enabled) .9f else .25f))
    }
}

@Composable
private fun HintPill() {
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
            "  长按 ◀ ▶ ▼ 连续移动 · 每消 10 行升一级",
            fontSize = 12.sp,
            color = palette.mutedText
        )
    }
}

/** The arrival panel: the well is dealt, blocks start falling once the player begins. */
@Composable
private fun TetrisStartOverlay(onStart: () -> Unit, onBack: () -> Unit) {
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
            Text("◀ ▼ ▶ 可长按连移，⟳ 旋转，⇓ 直落井底", color = palette.mutedText, fontSize = 12.sp)
            Spacer(Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OverlayPill("开始游戏", filled = true) { onStart() }
                OverlayPill("返回大厅", filled = false) { onBack() }
            }
        }
    }
}

@Composable
private fun PauseOverlay(onResume: () -> Unit, onBack: () -> Unit) {
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
private fun ResultDialog(state: TetrisUiState, onRestart: () -> Unit) {
    val palette = LocalGamePalette.current
    AlertDialog(
        onDismissRequest = {},
        containerColor = palette.surface,
        tonalElevation = 16.dp,
        title = {
            Text(
                if (palette.isNature) "叠到顶了" else "STACK OVERFLOW",
                color = palette.tertiary,
                fontWeight = FontWeight.Black
            )
        },
        text = {
            Text(
                "本轮 ${state.score} 分，消行 ${state.lines}。" +
                    if (state.score >= state.best && state.score > 0) "这是你的新纪录！" else "再来一局，把空隙填得更聪明。",
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
