package com.example.bzxandroidgames.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bzxandroidgames.game.Minesweeper
import com.example.bzxandroidgames.sound.clickSfx
import com.example.bzxandroidgames.game.MinesweeperCell
import com.example.bzxandroidgames.game.MinesweeperDifficulty
import com.example.bzxandroidgames.game.MinesweeperStatus
import com.example.bzxandroidgames.game.MinesweeperUiState
import kotlin.math.cos
import kotlin.math.sin

// Fixed Win98 palette: the screen always looks like the classic gray minesweeper window.
private val Face = Color(0xFFC0C0C0)
private val BevelLight = Color.White
private val BevelShadow = Color(0xFF808080)
private val Ink = Color(0xFF1A1A1A)
private val InkMuted = Color(0xFF5A5A5A)
private val LedRed = Color(0xFFFF2A1F)
private val Danger = Color(0xFFE23B2E)

private val NumberColors = listOf(
    Color(0xFF1D1DE8), Color(0xFF0E7E12), Color(0xFFE01B1B), Color(0xFF101A8C),
    Color(0xFF7E1010), Color(0xFF0E7E7E), Color(0xFF000000), Color(0xFF6E6E6E)
)

@Composable
fun MinesweeperScreen(
    state: MinesweeperUiState,
    onReveal: (Int) -> Unit,
    onToggleFlag: (Int) -> Unit,
    onToggleFlagMode: () -> Unit,
    onSelectDifficulty: (MinesweeperDifficulty) -> Unit,
    onRestart: () -> Unit,
    onBack: () -> Unit
) {
    BoxWithConstraints(Modifier.fillMaxSize().background(Face)) {
        // Size each square to show the whole field at once: bound by the width left after the
        // frame, and by the height after header, panel, toggle and hints.
        val cell = with(LocalDensity.current) {
            minOf(
                (maxWidth - 46.dp) / state.level.cols,
                (maxHeight - 380.dp) / state.level.rows
            ).coerceAtLeast(13.dp).toPx().toDp()
        }
        Column(
            modifier = Modifier.align(Alignment.TopCenter).widthIn(max = 480.dp).fillMaxSize()
                .systemBarsPadding().verticalScroll(rememberScrollState()).padding(horizontal = 18.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(14.dp))
            TextButton(onClick = clickSfx(onBack), modifier = Modifier.align(Alignment.Start)) {
                Text("‹  返回游戏大厅", color = Ink)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                MineIcon(Modifier.size(24.dp), Ink)
                Spacer(Modifier.width(9.dp))
                Text("扫雷", color = Ink, fontSize = 30.sp, fontWeight = FontWeight.Black)
                Spacer(Modifier.width(10.dp))
                Text(
                    "${state.level.rows}×${state.level.cols} · ${state.level.mines} 雷",
                    color = InkMuted, fontSize = 11.sp
                )
            }
            Spacer(Modifier.height(10.dp))
            DifficultyPicker(state.level, onSelectDifficulty)
            Spacer(Modifier.height(12.dp))
            StatusPanel(state, onRestart, Modifier.fillMaxWidth())
            Spacer(Modifier.height(12.dp))
            MinesweeperBoard(state, cell, onReveal, onToggleFlag)
            Spacer(Modifier.height(12.dp))
            FlagModeToggle(state.flagMode, onToggleFlagMode)
            Spacer(Modifier.height(10.dp))
            Text(
                if (state.flagMode) "插旗模式：点按插旗或取消，不会翻开" else "点按翻开格子 · 长按插旗标记",
                color = InkMuted, fontSize = 12.sp
            )
            Text(
                "数字是周围的雷数 · 排清所有雷即胜",
                color = InkMuted, fontSize = 9.sp, letterSpacing = 1.2.sp,
                modifier = Modifier.padding(top = 5.dp, bottom = 14.dp)
            )
        }
    }
    if (state.status != MinesweeperStatus.PLAYING) {
        var reviewed by remember(state.moveId) { mutableStateOf(false) }
        if (!reviewed) MinesweeperResultDialog(state, onRestart) { reviewed = true }
    }
}

/** Three Win98 tabs; the selected one sits sunken, like a pressed key. */
@Composable
private fun DifficultyPicker(selected: MinesweeperDifficulty, onSelect: (MinesweeperDifficulty) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        MinesweeperDifficulty.entries.forEach { level ->
            BevelBox(
                raised = level != selected,
                modifier = Modifier.clickSfx(onClickLabel = level.title, onClick = { onSelect(level) })
            ) {
                Text(
                    level.title,
                    color = if (level == selected) Danger else Ink,
                    fontSize = 13.sp,
                    fontWeight = if (level == selected) FontWeight.Black else FontWeight.Medium,
                    modifier = Modifier.padding(horizontal = 17.dp, vertical = 7.dp)
                )
            }
        }
    }
}

/** Sunken strip with the two LED counters and the smiley restart button, like the original. */
@Composable
private fun StatusPanel(state: MinesweeperUiState, onRestart: () -> Unit, modifier: Modifier = Modifier) {
    BevelBox(raised = false, modifier = modifier) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 6.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            LedDisplay(ledText(state.level.mines - state.flagsUsed))
            Spacer(Modifier.weight(1f))
            SmileyButton(state.status, onRestart)
            Spacer(Modifier.weight(1f))
            LedDisplay(ledText(state.timeSeconds))
        }
    }
}

private fun ledText(value: Int): String =
    if (value < 0) value.coerceAtLeast(-99).toString() else value.toString().padStart(3, '0')

@Composable
private fun LedDisplay(value: String, modifier: Modifier = Modifier) {
    BevelBox(raised = false, modifier = modifier.width(68.dp)) {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            Text(
                value,
                fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold,
                fontSize = 25.sp, color = LedRed, textAlign = TextAlign.Right,
                modifier = Modifier.align(Alignment.Center).fillMaxWidth().padding(vertical = 1.dp, horizontal = 2.dp)
            )
        }
    }
}

@Composable
private fun SmileyButton(status: MinesweeperStatus, onRestart: () -> Unit) {
    val face = when (status) {
        MinesweeperStatus.WON -> Smile.COOL
        MinesweeperStatus.LOST -> Smile.DEAD
        else -> Smile.HAPPY
    }
    BevelBox(
        raised = true,
        modifier = Modifier
            .size(44.dp)
            .clickSfx(onClickLabel = "重新开始", onClick = onRestart)
            .semantics { contentDescription = "重新开始" }
    ) {
        Canvas(Modifier.fillMaxSize().padding(4.dp)) { drawFace(face) }
    }
}

private enum class Smile { HAPPY, COOL, DEAD }

private fun DrawScope.drawFace(face: Smile) {
    val w = size.width
    val c = Offset(w / 2f, w / 2f)
    drawCircle(Color(0xFFFFE23D), w * .46f, c, style = Stroke(w * .05f))
    when (face) {
        Smile.HAPPY -> {
            drawCircle(Color.Black, w * .06f, Offset(c.x - w * .17f, c.y - w * .1f))
            drawCircle(Color.Black, w * .06f, Offset(c.x + w * .17f, c.y - w * .1f))
            drawArc(Color.Black, 20f, 140f, useCenter = false,
                topLeft = Offset(c.x - w * .21f, c.y - w * .24f), size = Size(w * .42f, w * .42f),
                style = Stroke(w * .05f, cap = StrokeCap.Round))
        }
        Smile.COOL -> {
            drawRect(Color.Black, Offset(c.x - w * .33f, c.y - w * .22f), Size(w * .66f, w * .18f))
            drawLine(Color.Black, Offset(c.x - w * .33f, c.y - w * .2f), Offset(c.x - w * .41f, c.y - w * .1f), w * .05f)
            drawLine(Color.Black, Offset(c.x + w * .33f, c.y - w * .2f), Offset(c.x + w * .41f, c.y - w * .1f), w * .05f)
            drawArc(Color.Black, 20f, 140f, useCenter = false,
                topLeft = Offset(c.x - w * .21f, c.y - w * .2f), size = Size(w * .42f, w * .42f),
                style = Stroke(w * .05f, cap = StrokeCap.Round))
        }
        Smile.DEAD -> {
            listOf(-1f, 1f).forEach { side ->
                val ex = c.x + side * w * .17f
                val ey = c.y - w * .12f
                val r = w * .07f
                drawLine(Color.Black, Offset(ex - r, ey - r), Offset(ex + r, ey + r), w * .045f, StrokeCap.Round)
                drawLine(Color.Black, Offset(ex - r, ey + r), Offset(ex + r, ey - r), w * .045f, StrokeCap.Round)
            }
            drawArc(Color.Black, 200f, 140f, useCenter = false,
                topLeft = Offset(c.x - w * .21f, c.y + w * .04f), size = Size(w * .42f, w * .42f),
                style = Stroke(w * .05f, cap = StrokeCap.Round))
        }
    }
}

/** The minefield: sunken frame around a rows x cols grid of raised tiles. */
@Composable
private fun MinesweeperBoard(
    state: MinesweeperUiState,
    cell: androidx.compose.ui.unit.Dp,
    onReveal: (Int) -> Unit,
    onToggleFlag: (Int) -> Unit
) {
    val playing = state.status == MinesweeperStatus.PLAYING
    BevelBox(raised = false) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            repeat(state.level.rows) { row ->
                Row {
                    repeat(state.level.cols) { col ->
                        val index = row * state.level.cols + col
                        Cell(
                            cell = state.board[index],
                            cellSize = cell,
                            fresh = playing && index in state.opened,
                            flagMode = state.flagMode,
                            onReveal = { onReveal(index) },
                            onFlag = { onToggleFlag(index) },
                            modifier = Modifier.size(cell)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun Cell(
    cell: MinesweeperCell,
    cellSize: androidx.compose.ui.unit.Dp,
    fresh: Boolean,
    flagMode: Boolean,
    onReveal: () -> Unit,
    onFlag: () -> Unit,
    modifier: Modifier = Modifier
) {
    var appeared by remember(fresh) { mutableFloatStateOf(if (fresh) .7f else 1f) }
    LaunchedEffect(fresh) { if (fresh) appeared = 1f }
    val scale by animateFloatAsState(appeared, spring(dampingRatio = .55f, stiffness = 700f), label = "cell")
    val latestReveal by rememberUpdatedState(onReveal)
    val latestFlag by rememberUpdatedState(onFlag)
    val latestFlagMode by rememberUpdatedState(flagMode)
    Box(
        modifier
            .scale(scale)
            .pointerInput(Unit) {
                detectTapGestures(
                    // Flag mode is flag-only: both gestures mark or clear a flag, never open.
                    onTap = { if (latestFlagMode) latestFlag() else latestReveal() },
                    onLongPress = { latestFlag() }
                )
            }
    ) {
        if (cell.revealed) {
            // Open ground is flat with a hairline grid, never beveled.
            Box(
                Modifier.fillMaxSize().background(Face).border(1.dp, BevelShadow),
                contentAlignment = Alignment.Center
            ) {
                when {
                    cell.mine -> MineIcon(Modifier.fillMaxSize(), Color.Black, cell.exploded)
                    cell.adjacent > 0 -> Text(
                        cell.adjacent.toString(),
                        color = NumberColors[cell.adjacent - 1],
                        fontSize = (cellSize.value * .5f).sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }
        } else {
            BevelBox(raised = true, modifier = Modifier.fillMaxSize()) {
                if (cell.flagged) FlagIcon(Modifier.fillMaxSize().padding(3.dp))
            }
        }
        if (cell.wrongFlag) {
            Canvas(Modifier.fillMaxSize().padding(2.dp)) {
                val stroke = 2.dp.toPx()
                drawLine(Danger, Offset(0f, 0f), Offset(size.width, size.height), stroke, StrokeCap.Round)
                drawLine(Danger, Offset(0f, size.height), Offset(size.width, 0f), stroke, StrokeCap.Round)
            }
        }
    }
}

/**
 * Classic Win98 edge: raised lights the top/left, sunken inverts it. The content drives the
 * box size; the bevel is painted over its outer two density pixels.
 */
@Composable
private fun BevelBox(
    raised: Boolean,
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit
) {
    val light = if (raised) BevelLight else BevelShadow
    val dark = if (raised) BevelShadow else BevelLight
    Box(modifier.background(Face)) {
        Box(Modifier.padding(2.dp), content = content)
        Canvas(Modifier.matchParentSize()) {
            val t = 2.dp.toPx()
            drawRect(light, Offset.Zero, Size(size.width, t))
            drawRect(light, Offset.Zero, Size(t, size.height))
            drawRect(dark, Offset(0f, size.height - t), Size(size.width, t))
            drawRect(dark, Offset(size.width - t, 0f), Size(t, size.height))
        }
    }
}

@Composable
private fun FlagModeToggle(active: Boolean, onToggle: () -> Unit) {
    BevelBox(
        raised = !active,
        modifier = Modifier
            .clickSfx(onClickLabel = "切换插旗模式", onClick = onToggle)
            .semantics { contentDescription = "切换插旗模式" }
    ) {
        Row(
            Modifier.padding(horizontal = 13.dp, vertical = 7.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            FlagIcon(Modifier.size(15.dp))
            Spacer(Modifier.width(7.dp))
            Text("插旗模式", color = Ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.width(7.dp))
            Text(
                if (active) "开" else "关",
                color = if (active) Danger else InkMuted,
                fontSize = 13.sp, fontWeight = FontWeight.Black
            )
        }
    }
}

/** Red pennant on a black pole with a base; fills the given box. */
@Composable
private fun FlagIcon(modifier: Modifier) {
    Canvas(modifier) {
        val w = size.width
        val h = size.height
        drawLine(Color.Black, Offset(w * .45f, h * .08f), Offset(w * .45f, h * .78f), w * .1f)
        drawPath(
            Path().apply {
                moveTo(w * .45f, h * .08f)
                lineTo(w * .05f, h * .27f)
                lineTo(w * .45f, h * .46f)
                close()
            },
            Danger
        )
        drawRect(Color.Black, Offset(w * .12f, h * .78f), Size(w * .66f, h * .14f))
    }
}

/** Black spiked ball; on the losing click it sits on the red blast square. */
@Composable
private fun MineIcon(modifier: Modifier, color: Color, exploded: Boolean = false) {
    Box(modifier) {
        if (exploded) Box(Modifier.matchParentSize().background(Danger))
        Canvas(Modifier.matchParentSize().padding(2.dp)) { drawMine(color) }
    }
}

private fun DrawScope.drawMine(color: Color) {
    val w = size.width
    val c = Offset(w / 2f, w / 2f)
    repeat(8) { i ->
        val angle = i * (Math.PI / 4)
        val d = Offset(cos(angle).toFloat(), sin(angle).toFloat())
        drawLine(color, c + d * w * .14f, c + d * w * .36f, w * .08f, StrokeCap.Round)
    }
    drawCircle(color, w * .24f, c)
    drawCircle(Color.White.copy(alpha = .85f), w * .07f, Offset(c.x - w * .09f, c.y - w * .09f))
}

@Composable
private fun MinesweeperResultDialog(state: MinesweeperUiState, onRestart: () -> Unit, onReview: () -> Unit) {
    val won = state.status == MinesweeperStatus.WON
    AlertDialog(
        onDismissRequest = onReview,
        containerColor = Face,
        title = {
            Text(
                if (won) "排雷成功！" else "踩到雷了",
                color = if (won) Color(0xFF0E7E12) else Danger,
                fontWeight = FontWeight.Black
            )
        },
        text = {
            Text(
                if (won) "所有地雷排清，用时 ${state.timeSeconds} 秒，稳。" else "这一局停在第 ${state.timeSeconds} 秒，看看雷都在哪，再来一局。",
                color = InkMuted
            )
        },
        confirmButton = {
            TextButton(onClick = clickSfx(onRestart)) { Text("再来一局", color = Ink, fontWeight = FontWeight.Bold) }
        },
        dismissButton = {
            TextButton(onClick = clickSfx(onReview)) { Text("看看棋盘", color = InkMuted) }
        }
    )
}
