package com.example.bzxandroidgames.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bzxandroidgames.game.Gomoku
import com.example.bzxandroidgames.game.GomokuDifficulty
import com.example.bzxandroidgames.game.GomokuMode
import com.example.bzxandroidgames.game.GomokuUiState
import com.example.bzxandroidgames.ui.theme.GamePalette
import com.example.bzxandroidgames.ui.theme.GameTheme
import com.example.bzxandroidgames.ui.theme.LocalGamePalette
import com.example.bzxandroidgames.ui.theme.NatureBackdrop
import com.example.bzxandroidgames.ui.theme.ThemePicker
import kotlin.math.abs
import kotlin.math.min
import kotlin.math.roundToInt

@Composable
fun GomokuScreen(
    state: GomokuUiState,
    onSelectMode: (GomokuMode) -> Unit,
    onSelectDifficulty: (GomokuDifficulty) -> Unit,
    onPlay: (Int) -> Unit,
    onUndo: () -> Unit,
    onRestart: () -> Unit,
    onThemeChange: (GameTheme) -> Unit,
    onBack: () -> Unit
) {
    val palette = LocalGamePalette.current
    Box(
        Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(palette.background))
    ) {
        if (palette.isNature) NatureBackdrop() else GomokuBackdrop()
        Column(
            modifier = Modifier.align(Alignment.TopCenter).widthIn(max = 480.dp).fillMaxSize()
                .systemBarsPadding().verticalScroll(rememberScrollState()).padding(horizontal = 22.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(22.dp))
            TextButton(onClick = onBack, modifier = Modifier.align(Alignment.Start)) { Text("‹  返回游戏大厅", color = palette.primary) }
            GomokuHeader(state, onUndo, onRestart)
            Spacer(Modifier.height(18.dp))
            ModePicker(state.mode, onSelectMode)
            AnimatedVisibility(visible = state.mode == GomokuMode.PVE, enter = expandVertically() + fadeIn()) {
                Column {
                    Spacer(Modifier.height(10.dp))
                    DifficultyPicker(state.difficulty, onSelectDifficulty)
                }
            }
            Spacer(Modifier.height(18.dp))
            ThemePicker(palette.theme, onThemeChange)
            Spacer(Modifier.height(20.dp))
            Text(
                if (palette.isNature) "黑白手谈 · 方寸之间" else "GOMOKU · PLACE AND LINK FIVE",
                color = palette.mutedText, fontSize = 10.sp, letterSpacing = 2.sp
            )
            Spacer(Modifier.height(17.dp))
            GomokuBoard(state, onPlay)
            Spacer(Modifier.height(18.dp))
            GomokuHint(state)
            Spacer(Modifier.height(24.dp))
            Text(
                if (palette.isNature) "轻点交点落子，率先连成五子者胜" else "TAP AN INTERSECTION  /  FIVE IN A ROW WINS",
                color = palette.mutedText,
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
}

@Composable
private fun GomokuBackdrop() {
    val palette = LocalGamePalette.current
    Canvas(Modifier.fillMaxSize()) {
        val step = 46.dp.toPx()
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
        drawCircle(palette.tertiary.copy(alpha = .06f), 280.dp.toPx(), Offset(size.width * .92f, size.height * .16f))
        drawCircle(palette.primary.copy(alpha = .07f), 220.dp.toPx(), Offset(size.width * .06f, size.height * .86f))
    }
}

@Composable
private fun GomokuHeader(state: GomokuUiState, onUndo: () -> Unit, onRestart: () -> Unit) {
    val palette = LocalGamePalette.current
    Column(Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text(
                    "五子棋",
                    style = TextStyle(
                        brush = Brush.linearGradient(palette.titleColors),
                        fontSize = 44.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = (-2).sp
                    )
                )
                Text(
                    if (palette.isNature) "清风手谈 · 连五制胜" else "NEON GOBAN",
                    color = palette.secondary.copy(alpha = .78f), fontSize = 9.sp, letterSpacing = 2.3.sp
                )
            }
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
    val palette = LocalGamePalette.current
    val black = when {
        state.isDraw -> null
        state.winner != null -> state.winner == Gomoku.BLACK
        else -> state.currentPlayer == Gomoku.BLACK
    }
    val label = when {
        state.isDraw -> "平局 · 势均力敌"
        state.winner != null -> if (state.mode == GomokuMode.PVE) {
            if (black == true) "你赢了 · 执黑" else "AI 获胜 · 执白"
        } else if (black == true) "黑棋获胜" else "白棋获胜"
        state.aiThinking -> "AI 思考中…"
        state.mode == GomokuMode.PVE -> if (black == true) "你的回合 · 执黑" else "AI 回合 · 执白"
        else -> if (black == true) "黑棋落子" else "白棋落子"
    }
    val accent = when (black) {
        null -> palette.mutedText
        true -> palette.primary
        false -> palette.tertiary
    }
    val thinking = rememberInfiniteTransition(label = "thinking")
    val pulse by thinking.animateFloat(
        0f, 1f,
        infiniteRepeatable(tween(900, easing = FastOutSlowInEasing), repeatMode = RepeatMode.Reverse),
        label = "thinking-dot"
    )
    Box(
        modifier
            .shadow(18.dp, RoundedCornerShape(18.dp), ambientColor = accent.copy(alpha = .28f), spotColor = accent.copy(alpha = .45f))
            .clip(RoundedCornerShape(18.dp))
            .background(Brush.linearGradient(listOf(accent.copy(alpha = .18f), palette.cardEnd)))
            .border(1.dp, accent.copy(alpha = .55f), RoundedCornerShape(18.dp))
            .padding(horizontal = 16.dp, vertical = 13.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            StoneBadge(black)
            Spacer(Modifier.size(10.dp))
            Column {
                Text("对局状态", fontSize = 9.sp, letterSpacing = 1.7.sp, color = accent.copy(alpha = .86f))
                Text(label, color = palette.text, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 1)
            }
        }
        if (state.aiThinking) {
            Box(
                Modifier
                    .align(Alignment.CenterEnd)
                    .size(7.dp)
                    .alpha(.3f + .7f * pulse)
                    .clip(CircleShape)
                    .background(palette.tertiary)
            )
        }
    }
}

@Composable
private fun StoneBadge(black: Boolean?) {
    val base = when (black) {
        null -> Color(0xFF8A94A6)
        true -> Color(0xFF11151D)
        false -> Color(0xFFF2F4F8)
    }
    val rim = when (black) {
        null -> Color(0xFF6C7688)
        true -> Color(0xFF3A4252)
        false -> Color(0xFF9AA3B4)
    }
    Box(
        Modifier
            .size(24.dp)
            .shadow(8.dp, CircleShape, ambientColor = Color.Black.copy(alpha = .3f), spotColor = Color.Black.copy(alpha = .3f))
            .clip(CircleShape)
            .background(base)
            .border(1.dp, rim, CircleShape)
    )
}

@Composable
private fun MoveCard(state: GomokuUiState, modifier: Modifier = Modifier) {
    val palette = LocalGamePalette.current
    Box(
        modifier
            .shadow(18.dp, RoundedCornerShape(18.dp), ambientColor = palette.secondary.copy(alpha = .28f), spotColor = palette.secondary.copy(alpha = .45f))
            .clip(RoundedCornerShape(18.dp))
            .background(Brush.linearGradient(listOf(palette.secondary.copy(alpha = .18f), palette.cardEnd)))
            .border(1.dp, palette.secondary.copy(alpha = .55f), RoundedCornerShape(18.dp))
            .padding(horizontal = 18.dp, vertical = 13.dp)
    ) {
        Column {
            Text("手数", fontSize = 9.sp, letterSpacing = 1.7.sp, color = palette.secondary.copy(alpha = .86f))
            Text(
                state.moveCount.toString().padStart(3, '0'),
                color = palette.text, fontSize = 23.sp, fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun RoundAction(symbol: String, label: String, enabled: Boolean, action: () -> Unit) {
    val palette = LocalGamePalette.current
    IconButton(
        onClick = action,
        enabled = enabled,
        modifier = Modifier
            .size(48.dp)
            .semantics { contentDescription = label }
            .shadow(12.dp, CircleShape, ambientColor = palette.primary.copy(alpha = .25f), spotColor = palette.primary.copy(alpha = .4f))
            .clip(CircleShape)
            .background(Brush.linearGradient(palette.actionBackground))
            .border(1.dp, palette.primary.copy(alpha = if (enabled) .55f else .14f), CircleShape)
    ) {
        Text(symbol, fontSize = 25.sp, fontWeight = FontWeight.Medium, color = palette.text.copy(alpha = if (enabled) .9f else .22f))
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
                    GomokuDifficulty.HARD -> "四层搜索"
                },
                selected = difficulty == option,
                modifier = Modifier.weight(1f)
            ) { onSelect(option) }
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
    val palette = LocalGamePalette.current
    val outline = if (selected) palette.primary else palette.mutedText.copy(alpha = .3f)
    Column(
        modifier
            .heightIn(min = 48.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(if (selected) palette.primary.copy(alpha = .12f) else palette.surface.copy(alpha = .72f))
            .border(if (selected) 1.5.dp else 1.dp, outline, RoundedCornerShape(16.dp))
            .clickable(onClickLabel = label) { onClick() }
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Box(Modifier.size(8.dp).clip(CircleShape).background(if (selected) palette.primary else palette.mutedText.copy(alpha = .35f)))
            Text(label, color = palette.text, fontSize = 13.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium)
        }
        Text(caption, color = palette.mutedText, fontSize = 10.sp)
    }
}

@Composable
private fun GomokuBoard(state: GomokuUiState, onPlay: (Int) -> Unit) {
    val palette = LocalGamePalette.current
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
        (state.mode == GomokuMode.PVP || state.currentPlayer == Gomoku.BLACK)

    Box(
        Modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .shadow(30.dp, RoundedCornerShape(26.dp), ambientColor = palette.primary.copy(alpha = .26f), spotColor = palette.secondary.copy(alpha = .38f))
            .clip(RoundedCornerShape(26.dp))
            .background(Brush.linearGradient(listOf(palette.primary.copy(alpha = .72f), palette.secondary.copy(alpha = .7f), palette.tertiary.copy(alpha = .68f))))
            .padding(1.dp)
    ) {
        val gridColor = if (palette.isNature) Color(0xFF4E6B47).copy(alpha = .6f) else palette.primary.copy(alpha = .32f)
        val gridEdge = if (palette.isNature) Color(0xFF3D5738) else palette.secondary.copy(alpha = .55f)
        Canvas(
            Modifier
                .fillMaxSize()
                .clip(RoundedCornerShape(25.dp))
                .background(palette.boardSurface)
                .padding(11.dp)
                .pointerInput(interactive) {
                    if (!interactive) return@pointerInput
                    detectTapGestures { tap ->
                        val cell = size.width / (Gomoku.SIZE - 1)
                        val column = (tap.x / cell).roundToInt()
                        val row = (tap.y / cell).roundToInt()
                        if (column in 0 until Gomoku.SIZE && row in 0 until Gomoku.SIZE &&
                            abs(tap.x - column * cell) <= cell * .48f &&
                            abs(tap.y - row * cell) <= cell * .48f
                        ) onPlay(row * Gomoku.SIZE + column)
                    }
                }
        ) {
            val side = min(size.width, size.height)
            val cell = side / (Gomoku.SIZE - 1)
            val line = 1.dp.toPx()

            for (i in 0 until Gomoku.SIZE) {
                val position = i * cell
                drawLine(gridColor, Offset(0f, position), Offset(side, position), line)
                drawLine(gridColor, Offset(position, 0f), Offset(position, side), line)
            }
            drawLine(gridEdge, Offset(0f, 0f), Offset(side, 0f), line * 1.6f)
            drawLine(gridEdge, Offset(0f, side), Offset(side, side), line * 1.6f)
            drawLine(gridEdge, Offset(0f, 0f), Offset(0f, side), line * 1.6f)
            drawLine(gridEdge, Offset(side, 0f), Offset(side, side), line * 1.6f)
            listOf(3 to 3, 3 to 11, 11 to 3, 11 to 11, 7 to 7).forEach { (sx, sy) ->
                drawCircle(gridEdge, 2.2.dp.toPx(), Offset(sx * cell, sy * cell))
            }

            fun center(index: Int) = Offset((index % Gomoku.SIZE) * cell, (index / Gomoku.SIZE) * cell)
            val accent = if (palette.isNature) palette.primary else palette.tertiary
            if (state.winningLine.isNotEmpty()) {
                drawLine(
                    accent.copy(alpha = .25f + .45f * pulse),
                    center(state.winningLine.first()),
                    center(state.winningLine.last()),
                    strokeWidth = 4.dp.toPx(),
                    cap = StrokeCap.Round
                )
            }

            val radius = cell * .44f
            state.board.forEachIndexed { index, stone ->
                if (stone == Gomoku.EMPTY) return@forEachIndexed
                val scale = if (index == state.lastMove) appear.value else 1f
                drawStone(center(index), radius * scale, stone, palette)
            }

            state.lastMove?.let { index ->
                if (state.board[index] != Gomoku.EMPTY) {
                    val marker = if (state.board[index] == Gomoku.BLACK) Color.White.copy(alpha = .85f) else Color(0xFF1B2334).copy(alpha = .75f)
                    drawCircle(marker, radius * .18f * appear.value, center(index))
                }
            }
            if (state.winningLine.isNotEmpty()) {
                state.winningLine.forEach { index ->
                    drawCircle(
                        accent.copy(alpha = .4f + .4f * pulse),
                        radius * 1.16f,
                        center(index),
                        style = Stroke(2.dp.toPx())
                    )
                }
            }
        }
    }
}

private fun DrawScope.drawStone(center: Offset, radius: Float, stone: Int, palette: GamePalette) {
    if (radius <= 0f) return
    if (stone == Gomoku.BLACK) {
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(
                    if (palette.isNature) Color(0xFF46524A) else Color(0xFF4D5872),
                    if (palette.isNature) Color(0xFF151B17) else Color(0xFF0B0E16),
                    if (palette.isNature) Color(0xFF0C110D) else Color(0xFF05070C)
                ),
                center = Offset(center.x - radius * .4f, center.y - radius * .4f),
                radius = radius * 1.8f
            ),
            radius = radius,
            center = center
        )
        if (!palette.isNature) {
            drawCircle(palette.primary.copy(alpha = .22f), radius, center, style = Stroke(1.dp.toPx()))
        }
        drawCircle(Color.White.copy(alpha = .3f), radius * .16f, Offset(center.x - radius * .38f, center.y - radius * .38f))
    } else {
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(
                    Color.White,
                    if (palette.isNature) Color(0xFFEFF3E6) else Color(0xFFDDE2EC),
                    if (palette.isNature) Color(0xFFC9D2BC) else Color(0xFF9FA9BE)
                ),
                center = Offset(center.x - radius * .4f, center.y - radius * .4f),
                radius = radius * 1.9f
            ),
            radius = radius,
            center = center
        )
        drawCircle(Color(0xFF39404E).copy(alpha = .35f), radius, center, style = Stroke(.8.dp.toPx()))
        if (!palette.isNature) {
            drawCircle(palette.secondary.copy(alpha = .18f), radius, center, style = Stroke(1.dp.toPx()))
        }
    }
}

@Composable
private fun GomokuHint(state: GomokuUiState) {
    val palette = LocalGamePalette.current
    val message = when {
        state.winner != null || state.isDraw -> "一局终了 · 点「↻」再来一局"
        state.aiThinking -> "启发式 AI 正在计算最优落子…"
        state.mode == GomokuMode.PVE -> "你执黑先行 · ${state.difficulty.title}难度 AI 执白应战"
        else -> "黑先白后 · 任意方向连成五子即胜"
    }
    Row(
        Modifier
            .clip(CircleShape)
            .background(palette.primary.copy(alpha = .07f))
            .border(1.dp, palette.primary.copy(alpha = .16f), CircleShape)
            .padding(horizontal = 15.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(6.dp).clip(CircleShape).background(palette.primary))
        Text("  $message", fontSize = 12.sp, color = palette.mutedText)
    }
}

@Composable
private fun GomokuResultDialog(state: GomokuUiState, onRestart: () -> Unit, onReview: () -> Unit) {
    val palette = LocalGamePalette.current
    val blackWins = state.winner == Gomoku.BLACK
    val title: String
    val message: String
    when {
        state.isDraw -> {
            title = if (palette.isNature) "棋逢对手" else "STALEMATE"
            message = "225 个交点全部落满，未分胜负——这一局势均力敌。"
        }
        state.mode == GomokuMode.PVE && blackWins -> {
            title = if (palette.isNature) "漂亮，你赢了" else "HUMAN WINS"
            message = "你执黑连成五子，战胜了${state.difficulty.title}难度的 AI。要不要升一档再战？"
        }
        state.mode == GomokuMode.PVE -> {
            title = if (palette.isNature) "AI 棋高一着" else "AI WINS"
            message = "${state.difficulty.title}难度的 AI 先你一步连成五子。复盘看看破绽在哪里，再战一局吧。"
        }
        blackWins -> {
            title = if (palette.isNature) "黑棋连珠" else "BLACK WINS"
            message = "执黑方五子连珠获胜，全局共 ${state.moveCount} 手。交换执子再来一局？"
        }
        else -> {
            title = if (palette.isNature) "白棋连珠" else "WHITE WINS"
            message = "执白方五子连珠获胜，全局共 ${state.moveCount} 手。交换执子再来一局？"
        }
    }
    AlertDialog(
        onDismissRequest = {},
        containerColor = palette.surface,
        tonalElevation = 16.dp,
        title = {
            Text(
                title,
                color = when {
                    state.isDraw -> palette.mutedText
                    blackWins -> palette.primary
                    else -> palette.tertiary
                },
                fontWeight = FontWeight.Black
            )
        },
        text = { Text(message, color = palette.mutedText) },
        confirmButton = {
            Button(
                onClick = onRestart,
                colors = ButtonDefaults.buttonColors(containerColor = palette.secondary, contentColor = Color.White)
            ) { Text("再来一局") }
        },
        dismissButton = {
            TextButton(onClick = onReview) { Text("复盘棋局", color = palette.primary) }
        }
    )
}
