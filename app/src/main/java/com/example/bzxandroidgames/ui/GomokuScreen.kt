package com.example.bzxandroidgames.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bzxandroidgames.sound.clickSfx
import com.example.bzxandroidgames.game.Gomoku
import com.example.bzxandroidgames.game.GomokuBoardSkin
import com.example.bzxandroidgames.game.GomokuDifficulty
import com.example.bzxandroidgames.game.GomokuMode
import com.example.bzxandroidgames.game.GomokuUiState
import kotlin.math.abs
import kotlin.math.min
import kotlin.math.roundToInt

// Fixed ink-and-wood palette: the gomoku screen always looks like a classic wooden
// goban on rice paper, independent of the 2048 theme.
private val Paper = Color(0xFFFBF6E9)
private val PaperDeep = Color(0xFFF1E9D4)
private val InkText = Color(0xFF33291C)
private val InkMuted = Color(0xFF8A7A60)
private val Seal = Color(0xFFB23A2E)
private val WoodFrame = listOf(Color(0xFF7C5527), Color(0xFF95692F), Color(0xFF5E3F1B))
private val Wood = listOf(Color(0xFFECCB8C), Color(0xFFDCB26A), Color(0xFFC6994E))
private val Grain = Color(0xFF9A7031)
private val GridInk = Color(0xFF42301B)
private val Slate = listOf(Color(0xFF5E6878), Color(0xFF1A1E28), Color(0xFF06080D))
private val Clam = listOf(Color(0xFFFFFFFF), Color(0xFFF5EEDC), Color(0xFFD8CCA5))
private val ClamRim = Color(0xFFB6A87F)
private val WhiteSide = Color(0xFFA08D62)

// Exercise-book skin: a real grid exercise notebook — green squares, red margin and
// header rules, binding details, paper grain, and hand-drawn pen marks (blue circles
// for black, red checks for white) placed at square centres like real homework.
private val SheetWhite = listOf(Color(0xFFFEFDF4), Color(0xFFF5F2E4))
private val SheetDesk = listOf(Color(0xFFEFEBDF), Color(0xFFDFD9C6))
private val SheetPaperEdge = Color(0xFFFCFAF2)
private val GridGreen = Color(0xFF9CC29A)
private val RedRule = Color(0xFFE08A86)
private val PenBlue = Color(0xFF3A5A8C)
private val PenBlueLight = Color(0xFF6D8DB8)
private val PenRed = Color(0xFFD9483B)
private val PenRedDeep = Color(0xFFB23227)

@Composable
fun GomokuScreen(
    state: GomokuUiState,
    onSelectMode: (GomokuMode) -> Unit,
    onSelectDifficulty: (GomokuDifficulty) -> Unit,
    onSelectBoardSkin: (GomokuBoardSkin) -> Unit,
    onSelectHumanColor: (Int) -> Unit,
    onPlay: (Int) -> Unit,
    onUndo: () -> Unit,
    onRestart: () -> Unit,
    onBack: () -> Unit
) {
    var shopOpen by remember { mutableStateOf(false) }
    Box(
        Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(Paper, PaperDeep, Color(0xFFE8DCC0))))
    ) {
        InkWashBackdrop()
        Column(
            modifier = Modifier.align(Alignment.TopCenter).widthIn(max = 480.dp).fillMaxSize()
                .systemBarsPadding().verticalScroll(rememberScrollState()).padding(horizontal = 22.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(22.dp))
            TextButton(onClick = clickSfx(onBack), modifier = Modifier.align(Alignment.Start)) { Text("‹  返回游戏大厅", color = Seal) }
            GomokuHeader(state, onUndo, onRestart)
            Spacer(Modifier.height(18.dp))
            ModePicker(state.mode, onSelectMode)
            AnimatedVisibility(visible = state.mode == GomokuMode.PVE, enter = expandVertically() + fadeIn()) {
                Column {
                    Spacer(Modifier.height(10.dp))
                    DifficultyPicker(state.difficulty, onSelectDifficulty)
                    Spacer(Modifier.height(10.dp))
                    SidePicker(state.humanColor, onSelectHumanColor)
                }
            }
            Spacer(Modifier.height(20.dp))
            Text(state.boardSkin.caption, color = InkMuted, fontSize = 10.sp, letterSpacing = 2.sp)
            Spacer(Modifier.height(12.dp))
            BoardShopEntry(state.boardSkin) { shopOpen = true }
            Spacer(Modifier.height(16.dp))
            GomokuBoard(state, onPlay)
            Spacer(Modifier.height(18.dp))
            GomokuHint(state)
            Spacer(Modifier.height(24.dp))
            Text(
                "轻点交点落子 · 连成五子者胜",
                color = InkMuted,
                fontSize = 9.sp,
                letterSpacing = 1.4.sp,
                modifier = Modifier.padding(bottom = 18.dp)
            )
        }
    }
    if (state.winner != null || state.isDraw) {
        var reviewed by remember(state.moveId) { mutableStateOf(false) }
        if (!reviewed) GomokuResultDialog(state, onRestart) { reviewed = true }
    }
    if (shopOpen) {
        BoardShopDialog(state.boardSkin, onSelectBoardSkin) { shopOpen = false }
    }
}

/** Rice-paper world behind the board: a faint enso circle, ink-wash mountains and a branch. */
@Composable
private fun InkWashBackdrop() {
    val motion = rememberInfiniteTransition(label = "ink-mist")
    val mist by motion.animateFloat(
        0f, 1f,
        infiniteRepeatable(tween(24000, easing = LinearEasing)),
        label = "mist-drift"
    )
    Canvas(Modifier.fillMaxSize()) {
        val w = size.width
        val h = size.height

        drawCircle(
            Color(0xFF4A3B28).copy(alpha = .05f),
            min(w, h) * .42f,
            Offset(w * .5f, h * .4f),
            style = Stroke(12.dp.toPx())
        )

        inkMountain(h * .68f, .11f, Color(0xFF5A5044))
        inkMountain(h * .72f, .07f, Color(0xFF6B6152))

        val ink = Color(0xFF4A3B28)
        drawPath(
            Path().apply {
                moveTo(-4.dp.toPx(), h * .1f)
                cubicTo(w * .14f, h * .065f, w * .19f, h * .15f, w * .28f, h * .12f)
            },
            ink.copy(alpha = .16f),
            style = Stroke(2.4.dp.toPx(), cap = StrokeCap.Round)
        )
        repeat(5) { index ->
            val branchX = w * (.06f + index * .045f)
            val branchY = h * (.085f + index * .012f)
            drawPath(
                Path().apply {
                    moveTo(branchX, branchY)
                    quadraticBezierTo(branchX + 14.dp.toPx(), branchY - 10.dp.toPx(), branchX + 26.dp.toPx(), branchY - 6.dp.toPx())
                },
                ink.copy(alpha = .14f),
                style = Stroke(1.3.dp.toPx(), cap = StrokeCap.Round)
            )
            drawOval(
                ink.copy(alpha = .12f),
                topLeft = Offset(branchX + 20.dp.toPx(), branchY - 12.dp.toPx()),
                size = Size(9.dp.toPx(), 5.dp.toPx())
            )
        }

        // slow drifting mist band
        val mistX = (mist % 1f) * w * 1.4f - w * .2f
        drawRect(
            Brush.horizontalGradient(
                listOf(Color.White.copy(alpha = 0f), Color.White.copy(alpha = .1f), Color.White.copy(alpha = 0f)),
                startX = mistX, endX = mistX + w * .5f
            ),
            topLeft = Offset(0f, h * .58f),
            size = Size(w, h * .1f)
        )
    }
}

private fun DrawScope.inkMountain(baseY: Float, peak: Float, color: Color) {
    val w = size.width
    val h = size.height
    val path = Path().apply {
        moveTo(0f, baseY)
        cubicTo(w * .15f, baseY - h * peak * 1.4f, w * .3f, baseY - h * peak * .4f, w * .45f, baseY - h * peak)
        cubicTo(w * .6f, baseY - h * peak * 1.6f, w * .8f, baseY - h * peak * .5f, w, baseY - h * peak * .8f)
        lineTo(w, baseY + h * .12f)
        lineTo(0f, baseY + h * .12f)
        close()
    }
    drawPath(
        path,
        Brush.verticalGradient(
            listOf(color.copy(alpha = .16f), color.copy(alpha = 0f)),
            startY = baseY - h * peak * 1.6f,
            endY = baseY + h * .06f
        )
    )
}

@Composable
private fun GomokuHeader(state: GomokuUiState, onUndo: () -> Unit, onRestart: () -> Unit) {
    Column(Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text(
                    "五子棋",
                    style = TextStyle(
                        brush = Brush.linearGradient(listOf(Color(0xFF2E2318), Color(0xFF5A4426))),
                        fontSize = 44.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = (-2).sp
                    )
                )
                Text("手谈一局 · 落子无悔", color = InkMuted, fontSize = 9.sp, letterSpacing = 2.3.sp)
            }
            Spacer(Modifier.size(8.dp))
            Box(
                Modifier
                    .size(24.dp)
                    .clip(RoundedCornerShape(5.dp))
                    .background(Seal),
                contentAlignment = Alignment.Center
            ) { Text("弈", color = Paper, fontSize = 13.sp, fontWeight = FontWeight.Bold) }
            Spacer(Modifier.weight(1f))
            RoundAction("↶", "撤销", state.canUndo && !state.aiThinking, onUndo)
            Spacer(Modifier.size(9.dp))
            RoundAction("↻", "重新开始", true, onRestart)
        }
        Spacer(Modifier.height(20.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(11.dp)) {
            TurnCard(state, Modifier.weight(1f))
            MoveCard(state, Modifier.weight(1f))
        }
    }
}

@Composable
private fun TurnCard(state: GomokuUiState, modifier: Modifier = Modifier) {
    val black = when {
        state.isDraw -> null
        state.winner != null -> state.winner == Gomoku.BLACK
        else -> state.currentPlayer == Gomoku.BLACK
    }
    val label = when {
        state.isDraw -> "平局 · 势均力敌"
        state.winner != null -> if (state.mode == GomokuMode.PVE) {
            val mine = state.winner == state.humanColor
            val side = if (black == true) "黑" else "白"
            if (mine) "你赢了 · 执$side" else "AI 获胜 · 执$side"
        } else if (black == true) "黑棋获胜" else "白棋获胜"
        state.aiThinking -> "AI 思考中…"
        state.mode == GomokuMode.PVE -> {
            val side = if (black == true) "黑" else "白"
            if (state.currentPlayer == state.humanColor) "你的回合 · 执$side" else "AI 回合 · 执$side"
        }
        else -> if (black == true) "黑棋落子" else "白棋落子"
    }
    val accent = when (black) {
        null -> InkMuted
        true -> InkText
        false -> WhiteSide
    }
    val thinking = rememberInfiniteTransition(label = "thinking")
    val pulse by thinking.animateFloat(
        0f, 1f,
        infiniteRepeatable(tween(900, easing = FastOutSlowInEasing), repeatMode = RepeatMode.Reverse),
        label = "thinking-dot"
    )
    Box(
        modifier
            .shadow(14.dp, RoundedCornerShape(18.dp), ambientColor = InkText.copy(alpha = .2f), spotColor = InkText.copy(alpha = .28f))
            .clip(RoundedCornerShape(18.dp))
            .background(Brush.linearGradient(listOf(Paper, PaperDeep)))
            .border(1.dp, accent.copy(alpha = .5f), RoundedCornerShape(18.dp))
            .padding(horizontal = 16.dp, vertical = 13.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            StoneBadge(black, state.boardSkin)
            Spacer(Modifier.size(10.dp))
            Column {
                Text("对局状态", fontSize = 9.sp, letterSpacing = 1.7.sp, color = accent.copy(alpha = .8f))
                Text(label, color = InkText, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 1)
            }
        }
        if (state.aiThinking) {
            Box(
                Modifier
                    .align(Alignment.CenterEnd)
                    .size(7.dp)
                    .alpha(.3f + .7f * pulse)
                    .clip(CircleShape)
                    .background(Seal)
            )
        }
    }
}

/** Side badge: yunzi stone on the classic board, pen mark on the exercise book. */
@Composable
private fun StoneBadge(black: Boolean?, skin: GomokuBoardSkin) {
    if (skin == GomokuBoardSkin.EXERCISE) {
        Canvas(Modifier.size(24.dp)) {
            val r = size.minDimension * .4f
            when (black) {
                null -> drawLine(
                    Color(0xFF8C7B5E), Offset(size.width * .18f, center.y), Offset(size.width * .82f, center.y), 2.dp.toPx(), StrokeCap.Round
                )
                true -> drawCircle(PenBlue, r, center, style = Stroke(2.4.dp.toPx()))
                else -> drawPath(
                    Path().apply {
                        moveTo(center.x - r * .85f, center.y)
                        lineTo(center.x - r * .15f, center.y + r * .75f)
                        lineTo(center.x + r, center.y - r * .8f)
                    },
                    PenRed,
                    style = Stroke(2.4.dp.toPx(), cap = StrokeCap.Round)
                )
            }
        }
        return
    }
    val base = when (black) {
        null -> Color(0xFFB7A98A)
        true -> Color(0xFF1A1E28)
        false -> Color(0xFFF7F1DE)
    }
    val rim = when (black) {
        null -> Color(0xFF8C7B5E)
        true -> Color(0xFF5E6878)
        false -> ClamRim
    }
    Box(
        Modifier
            .size(24.dp)
            .shadow(8.dp, CircleShape, ambientColor = InkText.copy(alpha = .28f), spotColor = InkText.copy(alpha = .28f))
            .clip(CircleShape)
            .background(base)
            .border(1.dp, rim, CircleShape)
    )
}

@Composable
private fun MoveCard(state: GomokuUiState, modifier: Modifier = Modifier) {
    Box(
        modifier
            .shadow(14.dp, RoundedCornerShape(18.dp), ambientColor = InkText.copy(alpha = .2f), spotColor = InkText.copy(alpha = .28f))
            .clip(RoundedCornerShape(18.dp))
            .background(Brush.linearGradient(listOf(Paper, PaperDeep)))
            .border(1.dp, Seal.copy(alpha = .5f), RoundedCornerShape(18.dp))
            .padding(horizontal = 18.dp, vertical = 13.dp)
    ) {
        Column {
            Text("手数", fontSize = 9.sp, letterSpacing = 1.7.sp, color = Seal.copy(alpha = .85f))
            Text(
                state.moveCount.toString().padStart(3, '0'),
                color = InkText, fontSize = 23.sp, fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun RoundAction(symbol: String, label: String, enabled: Boolean, action: () -> Unit) {
    IconButton(
        onClick = clickSfx(action),
        enabled = enabled,
        modifier = Modifier
            .size(48.dp)
            .semantics { contentDescription = label }
            .shadow(10.dp, CircleShape, ambientColor = InkText.copy(alpha = .22f), spotColor = InkText.copy(alpha = .3f))
            .clip(CircleShape)
            .background(Brush.linearGradient(listOf(Paper, PaperDeep)))
            .border(1.dp, InkText.copy(alpha = if (enabled) .5f else .16f), CircleShape)
    ) {
        Text(symbol, fontSize = 25.sp, fontWeight = FontWeight.Medium, color = InkText.copy(alpha = if (enabled) .85f else .25f))
    }
}

@Composable
private fun ModePicker(mode: GomokuMode, onSelect: (GomokuMode) -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        listOf(
            GomokuMode.PVP to ("双人对战" to "同屏轮流执子"),
            GomokuMode.PVE to ("人机对战" to "挑战三档 AI")
        ).forEach { (option, labels) ->
            SegmentOption(
                label = labels.first,
                caption = labels.second,
                selected = mode == option,
                modifier = Modifier.weight(1f)
            ) { onSelect(option) }
        }
    }
}

@Composable
private fun DifficultyPicker(difficulty: GomokuDifficulty, onSelect: (GomokuDifficulty) -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        GomokuDifficulty.entries.forEach { option ->
            SegmentOption(
                label = option.title,
                caption = when (option) {
                    GomokuDifficulty.EASY -> "偶尔失误"
                    GomokuDifficulty.MEDIUM -> "攻守均衡"
                    GomokuDifficulty.HARD -> "算无遗策"
                },
                selected = difficulty == option,
                modifier = Modifier.weight(1f)
            ) { onSelect(option) }
        }
    }
}

@Composable
private fun SidePicker(humanColor: Int, onSelect: (Int) -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        listOf(
            Gomoku.BLACK to ("执黑" to "先行落子"),
            Gomoku.WHITE to ("执白" to "后行应对")
        ).forEach { (color, labels) ->
            SegmentOption(
                label = labels.first,
                caption = labels.second,
                selected = humanColor == color,
                modifier = Modifier.weight(1f)
            ) { onSelect(color) }
        }
    }
}

@Composable
private fun SegmentOption(
    label: String,
    caption: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val outline = if (selected) Seal else InkMuted.copy(alpha = .35f)
    Column(
        modifier
            .heightIn(min = 48.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(if (selected) Seal.copy(alpha = .1f) else Paper.copy(alpha = .85f))
            .border(if (selected) 1.5.dp else 1.dp, outline, RoundedCornerShape(16.dp))
            .clickSfx(onClickLabel = label) { onClick() }
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Box(Modifier.size(8.dp).clip(CircleShape).background(if (selected) Seal else InkMuted.copy(alpha = .4f)))
            Text(label, color = InkText, fontSize = 13.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium)
        }
        Text(caption, color = InkMuted, fontSize = 10.sp)
    }
}

@Composable
private fun GomokuBoard(state: GomokuUiState, onPlay: (Int) -> Unit) {
    val appear = remember { Animatable(1f) }
    LaunchedEffect(state.moveId, state.lastMove) {
        if (state.lastMove != null) {
            appear.snapTo(0f)
            appear.animateTo(1f, spring(dampingRatio = .5f, stiffness = 520f))
        } else appear.snapTo(1f)
    }
    val glow = rememberInfiniteTransition(label = "win-glow")
    val pulse by glow.animateFloat(
        0f, 1f,
        infiniteRepeatable(tween(1300, easing = FastOutSlowInEasing)),
        label = "win-pulse"
    )
    val interactive = state.winner == null && !state.isDraw && !state.aiThinking &&
        (state.mode == GomokuMode.PVP || state.currentPlayer == state.humanColor)
    val exercise = state.boardSkin == GomokuBoardSkin.EXERCISE
    val frameShadow = if (exercise) Color(0xFF8A8060) else Color(0xFF5E3F1B)
    val textMeasurer = rememberTextMeasurer()

    Box(
        Modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .shadow(26.dp, RoundedCornerShape(26.dp), ambientColor = frameShadow.copy(alpha = .4f), spotColor = frameShadow.copy(alpha = .45f))
            .clip(RoundedCornerShape(26.dp))
            .background(Brush.verticalGradient(if (exercise) SheetDesk else WoodFrame))
            .border(if (exercise) 2.dp else 1.dp, if (exercise) SheetPaperEdge else Color(0xFF463013), RoundedCornerShape(26.dp))
            .padding(9.dp)
    ) {
        Canvas(
            Modifier
                .fillMaxSize()
                .clip(RoundedCornerShape(18.dp))
                .background(Brush.linearGradient(if (exercise) SheetWhite else Wood))
                .padding(11.dp)
                .pointerInput(interactive, state.boardSkin) {
                    if (!interactive) return@pointerInput
                    detectTapGestures { tap ->
                        if (state.boardSkin == GomokuBoardSkin.EXERCISE) {
                            // homework is played inside the squares, not on intersections
                            val cell = size.width / Gomoku.SIZE
                            val column = (tap.x / cell).toInt()
                            val row = (tap.y / cell).toInt()
                            if (column in 0 until Gomoku.SIZE && row in 0 until Gomoku.SIZE) {
                                onPlay(row * Gomoku.SIZE + column)
                            }
                        } else {
                            val cell = size.width / (Gomoku.SIZE - 1)
                            val column = (tap.x / cell).roundToInt()
                            val row = (tap.y / cell).roundToInt()
                            if (column in 0 until Gomoku.SIZE && row in 0 until Gomoku.SIZE &&
                                abs(tap.x - column * cell) <= cell * .48f &&
                                abs(tap.y - row * cell) <= cell * .48f
                            ) onPlay(row * Gomoku.SIZE + column)
                        }
                    }
                }
        ) {
            val side = min(size.width, size.height)
            val cell = if (exercise) side / Gomoku.SIZE else side / (Gomoku.SIZE - 1)
            fun center(index: Int) = if (exercise)
                Offset(((index % Gomoku.SIZE) + .5f) * cell, ((index / Gomoku.SIZE) + .5f) * cell)
            else Offset((index % Gomoku.SIZE) * cell, (index / Gomoku.SIZE) * cell)

            if (exercise) {
                drawExerciseSheet(side, cell, textMeasurer)
            } else {
                // wood grain: gentle wavy growth lines
                repeat(9) { index ->
                    val grainY = side * (.07f + index * .105f)
                    val amp = side * .012f
                    drawPath(
                        Path().apply {
                            moveTo(0f, grainY)
                            cubicTo(side * .3f, grainY - amp, side * .62f, grainY + amp, side, grainY - amp * .6f)
                        },
                        Grain.copy(alpha = .1f + (index % 3) * .035f),
                        style = Stroke(1.1.dp.toPx())
                    )
                }
                drawPath(
                    Path().apply {
                        moveTo(0f, side * .34f)
                        cubicTo(side * .25f, side * .31f, side * .7f, side * .38f, side, side * .33f)
                    },
                    Grain.copy(alpha = .2f),
                    style = Stroke(1.6.dp.toPx())
                )
                drawRect(
                    Brush.linearGradient(
                        listOf(Color.White.copy(alpha = .12f), Color.White.copy(alpha = 0f), Color.White.copy(alpha = .06f)),
                        start = Offset.Zero, end = Offset(side, side)
                    )
                )
                // ink grid
                val line = 1.dp.toPx()
                for (i in 0 until Gomoku.SIZE) {
                    val position = i * cell
                    drawLine(GridInk.copy(alpha = .85f), Offset(0f, position), Offset(side, position), line)
                    drawLine(GridInk.copy(alpha = .85f), Offset(position, 0f), Offset(position, side), line)
                }
                drawLine(GridInk, Offset(0f, 0f), Offset(side, 0f), line * 1.7f)
                drawLine(GridInk, Offset(0f, side), Offset(side, side), line * 1.7f)
                drawLine(GridInk, Offset(0f, 0f), Offset(0f, side), line * 1.7f)
                drawLine(GridInk, Offset(side, 0f), Offset(side, side), line * 1.7f)
                listOf(3 to 3, 3 to 11, 11 to 3, 11 to 11, 7 to 7).forEach { (sx, sy) ->
                    drawCircle(GridInk, 2.4.dp.toPx(), Offset(sx * cell, sy * cell))
                }
            }

            val winAccent = if (exercise) PenRedDeep else Seal
            if (state.winningLine.isNotEmpty()) {
                val from = center(state.winningLine.first())
                val to = center(state.winningLine.last())
                if (exercise) {
                    // hand-drawn red pen stroke: a bold pass and a brighter thin pass
                    drawLine(PenRedDeep.copy(alpha = .45f + .3f * pulse), from, to, 3.6.dp.toPx(), StrokeCap.Round)
                    drawLine(
                        Color(0xFFEE6A5C).copy(alpha = .45f + .3f * pulse),
                        from + Offset(0f, 1.6f), to + Offset(0f, 1.6f), 1.6.dp.toPx(), StrokeCap.Round
                    )
                } else {
                    drawLine(
                        Seal.copy(alpha = .3f + .45f * pulse), from, to,
                        strokeWidth = 4.dp.toPx(), cap = StrokeCap.Round
                    )
                }
            }

            val radius = if (exercise) cell * .34f else cell * .44f
            state.board.forEachIndexed { index, stone ->
                if (stone == Gomoku.EMPTY) return@forEachIndexed
                val scale = if (index == state.lastMove) appear.value else 1f
                drawStone(center(index), radius * scale, stone, state.boardSkin)
            }

            state.lastMove?.let { index ->
                if (state.board[index] != Gomoku.EMPTY) {
                    if (exercise) {
                        val marker = if (state.board[index] == Gomoku.BLACK) PenRed else PenBlue
                        drawCircle(marker, radius * .16f * appear.value, center(index))
                    } else {
                        drawCircle(Seal, radius * .16f * appear.value, center(index))
                        drawCircle(Paper.copy(alpha = .8f), radius * .16f * appear.value, center(index), style = Stroke(.8.dp.toPx()))
                    }
                }
            }
            if (state.winningLine.isNotEmpty()) {
                state.winningLine.forEach { index ->
                    drawCircle(
                        winAccent.copy(alpha = .45f + .4f * pulse),
                        radius * 1.18f,
                        center(index),
                        style = Stroke(2.dp.toPx())
                    )
                }
            }
        }
    }
}

/** The exercise-book sheet itself: paper grain, green squares, red rules, binding
 *  details and a folded corner — everything a real 方格本 page has. */
private fun DrawScope.drawExerciseSheet(side: Float, cell: Float, textMeasurer: TextMeasurer) {
    // paper grain: faint laid lines and stray fibres
    repeat(22) { index ->
        val y = side * ((index * 37 + 11) % 100) / 100f
        drawLine(Color(0xFF8A8570).copy(alpha = .025f), Offset(0f, y), Offset(side, y + side * .004f), 1f)
    }
    repeat(46) { index ->
        val x = side * ((index * 53 + 7) % 97) / 97f
        val y = side * ((index * 71 + 29) % 101) / 101f
        drawCircle(Color(0xFF8A8570).copy(alpha = .028f), .7.dp.toPx(), Offset(x, y))
    }

    // green square grid (16 rules for 15 squares), each line inked slightly unevenly
    for (i in 0..Gomoku.SIZE) {
        val position = i * cell
        val ink = GridGreen.copy(alpha = .4f + ((i * 37) % 13) / 42f)
        drawLine(ink, Offset(0f, position), Offset(side, position), 1.dp.toPx())
        drawLine(ink, Offset(position, 0f), Offset(position, side), 1.dp.toPx())
    }

    // red margin rule down the left, header rules across the top
    drawLine(RedRule.copy(alpha = .75f), Offset(cell * .52f, 0f), Offset(cell * .52f, side), 1.5.dp.toPx())
    drawLine(RedRule.copy(alpha = .65f), Offset(0f, cell * .52f), Offset(side, cell * .52f), 1.dp.toPx())
    drawLine(RedRule.copy(alpha = .5f), Offset(0f, cell * .66f), Offset(side, cell * .66f), .8.dp.toPx())

    // handwritten homework header between the paper edge and the rules
    drawText(
        textMeasurer, "姓名：BZX",
        topLeft = Offset(cell * .7f, cell * .1f),
        style = TextStyle(fontSize = 8.sp, color = PenRed.copy(alpha = .75f), fontStyle = FontStyle.Italic)
    )
    drawText(
        textMeasurer, "五子棋作业",
        topLeft = Offset(side * .64f, cell * .1f),
        style = TextStyle(fontSize = 8.sp, color = PenRed.copy(alpha = .75f), fontStyle = FontStyle.Italic)
    )

    // two staples along the top edge
    listOf(side * .3f, side * .7f).forEach { stapleX ->
        drawRoundRect(
            Color(0xFFC9CED6),
            topLeft = Offset(stapleX - 4.dp.toPx(), cell * .08f),
            size = Size(8.dp.toPx(), 2.6.dp.toPx()),
            cornerRadius = CornerRadius(1.dp.toPx())
        )
        drawLine(
            Color.White.copy(alpha = .85f),
            Offset(stapleX - 3.dp.toPx(), cell * .08f + .9.dp.toPx()),
            Offset(stapleX + 3.dp.toPx(), cell * .08f + .9.dp.toPx()),
            .6.dp.toPx()
        )
    }

    // punched holes on the left edge, half cut by the sheet
    listOf(side * .22f, side * .78f).forEach { holeY ->
        drawCircle(Color(0xFFDAD4C0), 2.6.dp.toPx(), Offset(1.2.dp.toPx(), holeY))
        drawCircle(Color(0xFFBDB6A0).copy(alpha = .8f), 2.6.dp.toPx(), Offset(1.2.dp.toPx(), holeY), style = Stroke(.7.dp.toPx()))
    }

    // folded bottom-right corner with its crease
    val fold = cell * .85f
    drawPath(
        Path().apply {
            moveTo(side - fold, side)
            lineTo(side, side - fold)
            lineTo(side, side)
            close()
        },
        Color(0xFFE9E3D0)
    )
    drawLine(Color(0xFFCFC7AE), Offset(side - fold, side), Offset(side, side - fold), 1.dp.toPx())
}

/** Classic skin keeps the yunzi stones; the exercise book is marked with a pen:
 *  a quick hand-drawn circle for black and a two-stroke check mark for white. */
private fun DrawScope.drawStone(center: Offset, radius: Float, stone: Int, skin: GomokuBoardSkin) {
    if (radius <= 0f) return
    if (skin == GomokuBoardSkin.EXERCISE) {
        if (stone == Gomoku.BLACK) {
            // the circle is drawn in one swift motion: arc slightly overlapping its tail
            val diameter = radius * 1.36f
            val topLeft = Offset(center.x - diameter / 2f, center.y - diameter / 2f)
            drawArc(
                PenBlue, -78f, 322f, useCenter = false,
                topLeft = topLeft, size = Size(diameter, diameter),
                style = Stroke(radius * .22f, cap = StrokeCap.Butt)
            )
            // lighter second pass where the pen lifted
            drawArc(
                PenBlueLight, 40f, 58f, useCenter = false,
                topLeft = topLeft, size = Size(diameter, diameter),
                style = Stroke(radius * .09f, cap = StrokeCap.Round)
            )
        } else {
            // check mark: a bold pass plus a thinner bright pass reads as pen pressure
            val check = Path().apply {
                moveTo(center.x - radius * .5f, center.y + .02f * radius)
                quadraticBezierTo(
                    center.x - radius * .25f, center.y + radius * .3f,
                    center.x - radius * .05f, center.y + radius * .5f
                )
                quadraticBezierTo(
                    center.x + radius * .25f, center.y - radius * .02f,
                    center.x + radius * .62f, center.y - radius * .46f
                )
            }
            drawPath(check, PenRedDeep, style = Stroke(radius * .3f, cap = StrokeCap.Round))
            drawPath(check, PenRed, style = Stroke(radius * .15f, cap = StrokeCap.Round))
        }
        return
    }
    drawOval(
        Color.Black.copy(alpha = .2f),
        topLeft = Offset(center.x - radius * .92f + radius * .14f, center.y - radius * .82f + radius * .22f),
        size = Size(radius * 1.84f, radius * 1.64f)
    )
    if (stone == Gomoku.BLACK) {
        drawCircle(
            Brush.radialGradient(Slate, center = center + Offset(-radius * .35f, -radius * .35f), radius = radius * 1.9f),
            radius, center
        )
        drawCircle(Color(0xFF8B96A8).copy(alpha = .3f), radius, center, style = Stroke(1.dp.toPx()))
        drawCircle(Color.White.copy(alpha = .32f), radius * .16f, center + Offset(-radius * .38f, -radius * .38f))
    } else {
        drawCircle(
            Brush.radialGradient(Clam, center = center + Offset(-radius * .35f, -radius * .35f), radius = radius * 1.9f),
            radius, center
        )
        drawCircle(ClamRim.copy(alpha = .5f), radius, center, style = Stroke(1.dp.toPx()))
        drawCircle(Color.White.copy(alpha = .5f), radius * .14f, center + Offset(-radius * .36f, -radius * .36f))
    }
}

/** Entry pill under the caption that opens the board shop. */
@Composable
private fun BoardShopEntry(skin: GomokuBoardSkin, onOpen: () -> Unit) {
    Row(
        Modifier
            .clip(CircleShape)
            .background(Paper.copy(alpha = .9f))
            .border(1.dp, InkText.copy(alpha = .28f), CircleShape)
            .clickSfx(onClickLabel = "棋盘商店") { onOpen() }
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(7.dp)
    ) {
        ShopBagGlyph(Modifier.size(15.dp), Seal)
        Text("棋盘商店 · ${skin.title}", fontSize = 12.sp, color = InkText, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun ShopBagGlyph(modifier: Modifier, tint: Color) {
    Canvas(modifier) {
        val w = size.width
        val h = size.height
        // shopping bag: body plus handle arc
        drawRoundRect(
            tint,
            topLeft = Offset(w * .16f, h * .42f),
            size = Size(w * .68f, h * .5f),
            cornerRadius = CornerRadius(w * .1f, w * .1f)
        )
        drawArc(
            tint,
            startAngle = 180f,
            sweepAngle = 180f,
            useCenter = false,
            topLeft = Offset(w * .32f, h * .12f),
            size = Size(w * .36f, h * .6f),
            style = Stroke(1.6.dp.toPx(), cap = StrokeCap.Round)
        )
    }
}

@Composable
private fun BoardShopDialog(
    current: GomokuBoardSkin,
    onSelect: (GomokuBoardSkin) -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Paper,
        tonalElevation = 12.dp,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ShopBagGlyph(Modifier.size(17.dp), Seal)
                Column {
                    Text("棋盘商店", color = InkText, fontWeight = FontWeight.Black, fontSize = 18.sp)
                    Text("挑选一款棋盘皮肤，随时可换", color = InkMuted, fontSize = 11.sp)
                }
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                GomokuBoardSkin.entries.forEach { skin ->
                    SkinOption(skin, selected = skin == current) { onSelect(skin) }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = clickSfx(onDismiss)) { Text("完成", color = Seal, fontWeight = FontWeight.Bold) }
        }
    )
}

@Composable
private fun SkinOption(skin: GomokuBoardSkin, selected: Boolean, onClick: () -> Unit) {
    val outline = if (selected) Seal else InkMuted.copy(alpha = .35f)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(if (selected) Seal.copy(alpha = .08f) else PaperDeep.copy(alpha = .6f))
            .border(if (selected) 1.5.dp else 1.dp, outline, RoundedCornerShape(16.dp))
            .clickSfx(onClickLabel = skin.title) { onClick() }
            .padding(horizontal = 12.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        SkinPreview(skin, Modifier.size(64.dp))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(skin.title, color = InkText, fontSize = 15.sp, fontWeight = FontWeight.Bold)
            Text(
                if (skin == GomokuBoardSkin.CLASSIC) "榧木棋盘 · 墨线云子" else "方格纸面 · 蓝圈红勾",
                color = InkMuted, fontSize = 11.sp
            )
        }
        if (selected) {
            Text(
                "使用中",
                color = Paper, fontSize = 10.sp, fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(Seal)
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            )
        }
    }
}

/** Small live preview of each board skin drawn with the same style as the real board. */
@Composable
private fun SkinPreview(skin: GomokuBoardSkin, modifier: Modifier = Modifier) {
    Canvas(modifier) {
        val corner = CornerRadius(10.dp.toPx(), 10.dp.toPx())
        val exercise = skin == GomokuBoardSkin.EXERCISE
        if (exercise) {
            drawRoundRect(Color(0xFFDFD9C6), cornerRadius = corner)
            drawRoundRect(Color(0xFFFBF9EE), topLeft = Offset(3.dp.toPx(), 3.dp.toPx()), size = Size(size.width - 6.dp.toPx(), size.height - 6.dp.toPx()), cornerRadius = corner)
        } else {
            drawRoundRect(Color(0xFF7C5527), cornerRadius = corner)
            drawRoundRect(Color(0xFFDCB26A), topLeft = Offset(3.dp.toPx(), 3.dp.toPx()), size = Size(size.width - 6.dp.toPx(), size.height - 6.dp.toPx()), cornerRadius = corner)
        }
        val inset = size.width * .26f
        val span = size.width - inset * 2
        val gridLine = if (exercise) GridGreen.copy(alpha = .6f) else GridInk.copy(alpha = .85f)
        repeat(3) { i ->
            val position = inset + span * i / 2f
            drawLine(gridLine, Offset(inset, position), Offset(size.width - inset, position), 1.dp.toPx())
            drawLine(gridLine, Offset(position, inset), Offset(position, size.height - inset), 1.dp.toPx())
        }
        val step = span / 2f
        if (exercise) {
            // red margin rule + marks centred in squares, like the real sheet
            drawLine(
                RedRule.copy(alpha = .7f),
                Offset(inset * .4f, 3.dp.toPx()),
                Offset(inset * .4f, size.height - 3.dp.toPx()),
                1.2.dp.toPx()
            )
            drawStone(Offset(inset + step * .5f, inset + step * .5f), step * .26f, Gomoku.BLACK, skin)
            drawStone(Offset(inset + step * 1.5f, inset + step * 1.5f), step * .26f, Gomoku.WHITE, skin)
        } else {
            drawStone(Offset(inset, inset), step * .3f, Gomoku.BLACK, skin)
            drawStone(Offset(inset + step, inset + step), step * .3f, Gomoku.WHITE, skin)
        }
    }
}

@Composable
private fun GomokuHint(state: GomokuUiState) {
    val message = when {
        state.winner != null || state.isDraw -> "一局终了 · 点「↻」再来一局"
        state.aiThinking -> "启发式 AI 正在计算最优落子…"
        state.mode == GomokuMode.PVE -> {
            val mine = if (state.humanColor == Gomoku.BLACK) "执黑先行" else "执白后行"
            val theirs = if (state.humanColor == Gomoku.BLACK) "执白应战" else "执黑开局"
            "你$mine · ${state.difficulty.title}难度 AI $theirs"
        }
        else -> "黑先白后 · 任意方向连成五子即胜"
    }
    Row(
        Modifier
            .clip(CircleShape)
            .background(InkText.copy(alpha = .06f))
            .border(1.dp, InkText.copy(alpha = .18f), CircleShape)
            .padding(horizontal = 15.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(6.dp).clip(CircleShape).background(Seal))
        Text("  $message", fontSize = 12.sp, color = InkMuted)
    }
}

@Composable
private fun GomokuResultDialog(state: GomokuUiState, onRestart: () -> Unit, onReview: () -> Unit) {
    val blackWins = state.winner == Gomoku.BLACK
    val humanWon = state.mode == GomokuMode.PVE && state.winner == state.humanColor
    val title: String
    val message: String
    when {
        state.isDraw && state.mode == GomokuMode.PVE -> {
            title = "战平 AI"
            message = "225 个交点全部落满，${state.difficulty.title}难度的 AI 也没能赢你——能与计算机战至满盘，相当了不起！"
        }
        state.isDraw -> {
            title = "棋逢对手"
            message = "225 个交点全部落满，未分胜负——这一局值得回味。"
        }
        humanWon -> {
            title = "漂亮，你赢了"
            message = "你执${if (blackWins) "黑" else "白"}连成五子，战胜了${state.difficulty.title}难度的 AI。要不要换一边再战？"
        }
        state.mode == GomokuMode.PVE -> {
            title = "AI 棋高一着"
            message = "${state.difficulty.title}难度的 AI 先你一步连成五子。复盘看看破绽在哪里，再战一局吧。"
        }
        blackWins -> {
            title = "黑棋连珠"
            message = "执黑方五子连珠获胜，全局共 ${state.moveCount} 手。交换执子再来一局？"
        }
        else -> {
            title = "白棋连珠"
            message = "执白方五子连珠获胜，全局共 ${state.moveCount} 手。交换执子再来一局？"
        }
    }
    AlertDialog(
        onDismissRequest = {},
        containerColor = Paper,
        tonalElevation = 12.dp,
        title = {
            Text(
                title,
                color = when {
                    state.isDraw -> InkMuted
                    humanWon -> Seal
                    else -> InkText
                },
                fontWeight = FontWeight.Black
            )
        },
        text = { Text(message, color = InkMuted) },
        confirmButton = {
            Button(
                onClick = clickSfx(onRestart),
                colors = ButtonDefaults.buttonColors(containerColor = Seal, contentColor = Paper)
            ) { Text("再来一局") }
        },
        dismissButton = {
            TextButton(onClick = clickSfx(onReview)) { Text("复盘棋局", color = InkText) }
        }
    )
}
