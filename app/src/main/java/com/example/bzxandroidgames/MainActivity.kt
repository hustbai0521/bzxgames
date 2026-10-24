package com.example.bzxandroidgames

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.compose.BackHandler
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.animation.core.Animatable
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.bzxandroidgames.game.Direction
import com.example.bzxandroidgames.game.GameUiState
import com.example.bzxandroidgames.game.GameViewModel
import com.example.bzxandroidgames.ui.theme.BzxAndroidGamesTheme
import com.example.bzxandroidgames.ui.theme.GamePalette
import com.example.bzxandroidgames.ui.theme.GameTheme
import com.example.bzxandroidgames.ui.theme.LocalGamePalette
import com.example.bzxandroidgames.ui.theme.NatureBackdrop
import com.example.bzxandroidgames.ui.theme.ThemePicker
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import com.example.bzxandroidgames.game.Game2048
import com.example.bzxandroidgames.game.GomokuViewModel
import com.example.bzxandroidgames.game.MoveResult
import com.example.bzxandroidgames.ui.GomokuScreen
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val game: GameViewModel = viewModel()
            val gomoku: GomokuViewModel = viewModel()
            val theme by game.theme.collectAsStateWithLifecycle()
            val state by game.state.collectAsStateWithLifecycle()
            val gomokuState by gomoku.state.collectAsStateWithLifecycle()
            SideEffect {
                val dark = theme == GameTheme.NEON
                enableEdgeToEdge(
                    statusBarStyle = SystemBarStyle.auto(
                        android.graphics.Color.TRANSPARENT,
                        android.graphics.Color.TRANSPARENT
                    ) { dark },
                    navigationBarStyle = SystemBarStyle.auto(0xE6FFFFFF.toInt(), 0x801B1B1B.toInt()) { dark }
                )
            }
            BzxAndroidGamesTheme(theme) {
                var splashVisible by rememberSaveable { mutableStateOf(true) }
                var currentGame by rememberSaveable { mutableStateOf<String?>(null) }
                BackHandler(enabled = currentGame != null && !splashVisible) { currentGame = null }
                AnimatedContent(
                    targetState = when {
                        splashVisible -> "intro"
                        currentGame == "2048" -> "2048"
                        currentGame == "gomoku" -> "gomoku"
                        else -> "library"
                    },
                    transitionSpec = {
                        (fadeIn(tween(550)) + scaleIn(tween(550), initialScale = .96f)) togetherWith
                            (fadeOut(tween(380)) + scaleOut(tween(380), targetScale = 1.06f))
                    },
                    label = "screen"
                ) { screen ->
                    if (screen == "intro") {
                        com.example.bzxandroidgames.ui.theme.AnimeLaunchScreen { splashVisible = false }
                    } else if (screen == "2048") {
                        GameScreen(state, game::move, game::undo, game::restart, game::keepPlaying, game::setTheme) { currentGame = null }
                    } else if (screen == "gomoku") {
                        GomokuScreen(
                            state = gomokuState,
                            onSelectMode = gomoku::selectMode,
                            onSelectDifficulty = gomoku::selectDifficulty,
                            onPlay = gomoku::play,
                            onUndo = gomoku::undo,
                            onRestart = gomoku::restart,
                            onThemeChange = game::setTheme,
                            onBack = { currentGame = null }
                        )
                    } else {
                        com.example.bzxandroidgames.ui.GameLibrary(
                            theme,
                            game::setTheme,
                            on2048 = { currentGame = "2048" },
                            onGomoku = { currentGame = "gomoku" }
                        )
                    }
                }
            }
        }
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
        drawCircle(palette.primary.copy(alpha = alpha), size.minDimension * .36f, center, style = androidx.compose.ui.graphics.drawscope.Stroke(1.5f))
        drawCircle(palette.secondary.copy(alpha = alpha), size.minDimension * .48f, center, style = androidx.compose.ui.graphics.drawscope.Stroke(1f))
    }
}

@Composable
private fun GameScreen(
    state: GameUiState,
    onMove: (Direction) -> Unit,
    onUndo: () -> Unit,
    onRestart: () -> Unit,
    onKeepPlaying: () -> Unit,
    onThemeChange: (GameTheme) -> Unit,
    onBack: () -> Unit
) {
    val palette = LocalGamePalette.current
    Box(
        Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(palette.background))
    ) {
        if (palette.isNature) {
            NatureBackdrop()
        } else {
            TechGrid(alpha = .045f)
            AmbientParticleField()
        }
        Canvas(Modifier.fillMaxSize()) {
            drawCircle(palette.primary.copy(alpha = .07f), 240.dp.toPx(), Offset(size.width * .1f, size.height * .25f))
            drawCircle(palette.tertiary.copy(alpha = .06f), 300.dp.toPx(), Offset(size.width, size.height * .78f))
        }
        Column(
            modifier = Modifier.align(Alignment.TopCenter).widthIn(max = 480.dp).fillMaxSize().systemBarsPadding()
                .verticalScroll(rememberScrollState()).padding(horizontal = 22.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(22.dp))
            TextButton(onClick = onBack, modifier = Modifier.align(Alignment.Start)) { Text("‹  返回游戏大厅", color = palette.primary) }
            Header(state, onUndo, onRestart)
            Spacer(Modifier.height(18.dp))
            ThemePicker(palette.theme, onThemeChange)
            Spacer(Modifier.height(24.dp))
            Text(if (palette.isNature) "慢慢生长 · 合成美好" else "COMBINE · EVOLVE · ASCEND", color = palette.mutedText, fontSize = 10.sp, letterSpacing = 2.sp)
            Spacer(Modifier.height(17.dp))
            GameBoard(state.board, state.mergedCells, state.moveId, onMove)
            Spacer(Modifier.height(18.dp))
            Hint()
            Spacer(Modifier.height(24.dp))
            Text(
                if (palette.isNature) "指尖轻滑，让每一次合并焕发生机" else "SWIPE TO MOVE  /  MATCH TO MERGE",
                color = palette.mutedText,
                fontSize = 9.sp,
                letterSpacing = 1.4.sp,
                modifier = Modifier.padding(bottom = 18.dp)
            )
        }
    }

    if (state.gameOver) ResultDialog(false, state.score, onRestart, null)
    else if (state.won && !state.keepPlaying) ResultDialog(true, state.score, onRestart, onKeepPlaying)
}

@Composable
private fun Header(state: GameUiState, onUndo: () -> Unit, onRestart: () -> Unit) {
    val palette = LocalGamePalette.current
    Column(Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text(
                    "2048",
                    style = TextStyle(
                        brush = Brush.linearGradient(palette.titleColors),
                        fontSize = 44.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = (-2).sp
                    )
                )
                Text(if (palette.isNature) "NATURE GARDEN" else "NEON MATRIX", color = palette.secondary.copy(alpha = .78f), fontSize = 9.sp, letterSpacing = 2.3.sp)
            }
            Spacer(Modifier.weight(1f))
            RoundAction("↶", "撤销", state.canUndo, onUndo)
            Spacer(Modifier.size(9.dp))
            RoundAction("↻", "重新开始", true, onRestart)
        }
        Spacer(Modifier.height(20.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(11.dp)) {
            ScoreCard("SCORE", state.score, palette.primary, Modifier.weight(1f))
            ScoreCard("BEST", state.best, palette.tertiary, Modifier.weight(1f))
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
                Text(score.toString().padStart(4, '0'), color = palette.text, fontSize = 23.sp, fontWeight = FontWeight.Bold)
            }
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
private fun GameBoard(board: List<Int>, mergedCells: List<Int>, moveId: Int, onMove: (Direction) -> Unit) {
    val palette = LocalGamePalette.current
    val threshold = with(LocalDensity.current) { 42.dp.toPx() }
    var dragX by remember { mutableFloatStateOf(0f) }
    var dragY by remember { mutableFloatStateOf(0f) }
    val scope = rememberCoroutineScope()
    val latestBoard by rememberUpdatedState(board)
    val slide = remember { Animatable(0f) }
    var moving by remember { mutableStateOf(false) }
    var movement by remember { mutableStateOf<MoveResult?>(null) }
    var animatedMoveId by remember { mutableStateOf(-1) }


    Box(
        Modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .shadow(30.dp, RoundedCornerShape(26.dp), ambientColor = palette.primary.copy(alpha = .26f), spotColor = palette.secondary.copy(alpha = .38f))
            .clip(RoundedCornerShape(26.dp))
            .background(Brush.linearGradient(listOf(palette.primary.copy(alpha = .72f), palette.secondary.copy(alpha = .7f), palette.tertiary.copy(alpha = .68f))))
            .padding(1.dp)
    ) {
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxSize()
                .clip(RoundedCornerShape(25.dp))
                .background(palette.boardSurface)
                .padding(9.dp)
                .pointerInput(board, moving) {
                    detectDragGestures(
                        onDragStart = { dragX = 0f; dragY = 0f },
                        onDrag = { change, amount ->
                            change.consume()
                            dragX += amount.x
                            dragY += amount.y
                        },
                        onDragEnd = {
                            if (!moving && maxOf(abs(dragX), abs(dragY)) >= threshold) {
                                val direction = if (abs(dragX) > abs(dragY)) {
                                        if (dragX > 0) Direction.RIGHT else Direction.LEFT
                                    } else if (dragY > 0) Direction.DOWN else Direction.UP
                                val result = Game2048.move(board, direction)
                                if (result.moved) {
                                    moving = true
                                    movement = result
                                    scope.launch {
                                        try {
                                            slide.snapTo(0f)
                                            slide.animateTo(1f, tween(150, easing = FastOutSlowInEasing))
                                            animatedMoveId = moveId + 1
                                            if (latestBoard == board) onMove(direction)
                                        } finally { moving = false }
                                    }
                                }
                            }
                        }
                    )
                }
        ) {
            val cell = (maxWidth - 27.dp) / 4
            fun position(index: Int) = Modifier.offset(
                x = (cell + 9.dp) * (index % 4),
                y = (cell + 9.dp) * (index / 4)
            ).size(cell)
            repeat(16) { index -> Tile(0, false, 0, position(index)) }
            if (moving) {
                movement?.motions?.forEach { motion ->
                    val progress = slide.value
                    val x = motion.from % 4 + (motion.to % 4 - motion.from % 4) * progress
                    val y = motion.from / 4 + (motion.to / 4 - motion.from / 4) * progress
                    Tile(motion.value, false, 0,
                        Modifier.offset(x = (cell + 9.dp) * x, y = (cell + 9.dp) * y).size(cell))
                }
            } else {
                board.forEachIndexed { index, value ->
                    if (value != 0) {
                        val spawned = animatedMoveId == moveId && movement?.board?.get(index) == 0
                        Tile(value, index in mergedCells, moveId, position(index), spawned)
                    }
                }
            }
        }
        if (!moving) MergeParticleBurst(board, mergedCells, moveId)
    }
}

@Composable
private fun Tile(value: Int, merged: Boolean, moveId: Int, modifier: Modifier = Modifier, spawned: Boolean = false) {
    val palette = LocalGamePalette.current
    var appeared by remember(value, moveId) {
        mutableFloatStateOf(if (value == 0) 1f else if (merged) 1.34f else if (spawned) .76f else 1f)
    }
    val scale by animateFloatAsState(
        appeared,
        spring(dampingRatio = if (merged) .36f else .5f, stiffness = if (merged) 390f else 480f),
        label = "tile"
    )
    LaunchedEffect(value, moveId) { appeared = 1f }
    val accent = palette.tileAccent(value)
    Box(
        modifier = modifier
            .fillMaxSize()
            .scale(scale)
            .shadow(if (value == 0) 0.dp else if (merged) 20.dp else 10.dp, RoundedCornerShape(13.dp), ambientColor = accent, spotColor = accent)
            .clip(RoundedCornerShape(13.dp))
            .background(tileBrush(value, palette))
            .border(1.dp, accent.copy(alpha = if (value == 0) .1f else .72f), RoundedCornerShape(13.dp)),
        contentAlignment = Alignment.Center
    ) {
        if (value != 0) {
            Text(
                text = value.toString(),
                color = palette.tileText(value),
                fontSize = when {
                    value < 100 -> 28.sp
                    value < 1000 -> 25.sp
                    value < 10000 -> 21.sp
                    else -> 17.sp
                },
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center,
                modifier = Modifier.graphicsLayer { translationY = -1.dp.toPx() }
            )
        }
    }
}

@Composable
private fun AmbientParticleField() {
    val palette = LocalGamePalette.current
    val motion = rememberInfiniteTransition(label = "ambient-particles")
    val progress by motion.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(7200, easing = LinearEasing)),
        label = "particle-drift"
    )
    Canvas(Modifier.fillMaxSize()) {
        repeat(32) { index ->
            val seedX = ((index * 47 + 13) % 101) / 100f
            val seedY = ((index * 71 + 29) % 103) / 102f
            val speed = .35f + (index % 7) * .065f
            val normalizedY = (seedY - progress * speed + 1.4f) % 1.15f
            val wave = sin((progress * 6.283f + index * .73f).toDouble()).toFloat()
            val x = seedX * size.width + wave * (8 + index % 5).dp.toPx()
            val y = normalizedY * size.height
            val color = when (index % 3) {
                0 -> palette.primary
                1 -> palette.secondary
                else -> palette.tertiary
            }
            val particleAlpha = .1f + (index % 5) * .025f
            drawLine(
                color.copy(alpha = particleAlpha * .45f),
                Offset(x, y + 16.dp.toPx()),
                Offset(x, y + 3.dp.toPx()),
                strokeWidth = .8.dp.toPx()
            )
            drawCircle(
                color.copy(alpha = particleAlpha),
                radius = (1.2f + index % 3 * .55f).dp.toPx(),
                center = Offset(x, y)
            )
        }
    }
}

@Composable
private fun MergeParticleBurst(board: List<Int>, mergedCells: List<Int>, moveId: Int) {
    val palette = LocalGamePalette.current
    val burst = remember { Animatable(1f) }
    LaunchedEffect(moveId) {
        if (mergedCells.isNotEmpty()) {
            burst.snapTo(0f)
            burst.animateTo(1f, tween(760, easing = FastOutSlowInEasing))
        }
    }

    Canvas(Modifier.fillMaxSize()) {
        if (mergedCells.isEmpty() || burst.value >= 1f) return@Canvas
        val progress = burst.value
        val gap = 9.dp.toPx()
        val inset = 10.dp.toPx()
        val cellSize = (size.width - inset * 2f - gap * 3f) / 4f
        val fade = (1f - progress).coerceIn(0f, 1f)

        mergedCells.forEach { cellIndex ->
            val row = cellIndex / 4
            val column = cellIndex % 4
            val center = Offset(
                inset + column * (cellSize + gap) + cellSize / 2f,
                inset + row * (cellSize + gap) + cellSize / 2f
            )
            val accent = palette.tileAccent(board.getOrElse(cellIndex) { 2 })

            drawCircle(
                color = accent.copy(alpha = fade * .76f),
                radius = cellSize * (.12f + progress * .58f),
                center = center,
                style = androidx.compose.ui.graphics.drawscope.Stroke((2.8f * fade + .4f).dp.toPx())
            )
            drawCircle(
                color = Color.White.copy(alpha = fade * .55f),
                radius = cellSize * (.05f + progress * .4f),
                center = center,
                style = androidx.compose.ui.graphics.drawscope.Stroke((1.4f * fade + .3f).dp.toPx())
            )

            repeat(18) { ray ->
                val angle = ray * (6.283185f / 18f) + cellIndex * .41f
                val direction = Offset(cos(angle), sin(angle))
                val distance = cellSize * (.18f + progress * (.58f + (ray % 4) * .08f))
                val particleCenter = center + direction * distance
                val particleColor = when (ray % 3) {
                    0 -> Color.White
                    1 -> accent
                    else -> palette.primary
                }
                drawLine(
                    particleColor.copy(alpha = fade * .55f),
                    center + direction * (distance * .58f),
                    particleCenter,
                    strokeWidth = (1.2f + ray % 2).dp.toPx()
                )
                drawCircle(
                    particleColor.copy(alpha = fade),
                    radius = (1.4f + ray % 3 * .7f).dp.toPx() * fade,
                    center = particleCenter
                )
            }
        }
    }
}

private fun tileBrush(value: Int, palette: GamePalette): Brush {
    if (value == 0) return Brush.linearGradient(palette.emptyTile)
    val accent = palette.tileAccent(value)
    return if (palette.isNature) {
        Brush.linearGradient(listOf(accent, lerp(accent, palette.tileBase, .12f)))
    } else {
        Brush.linearGradient(listOf(accent.copy(alpha = .94f), accent.copy(alpha = .54f), palette.tileBase))
    }
}

@Composable
private fun Hint() {
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
        Text(if (palette.isNature) "  轻轻滑动，让数字在绿意中生长" else "  每次移动后将生成新的能量方块", fontSize = 12.sp, color = palette.mutedText)
    }
}

@Composable
private fun ResultDialog(won: Boolean, score: Int, onRestart: () -> Unit, onKeepPlaying: (() -> Unit)?) {
    val palette = LocalGamePalette.current
    AlertDialog(
        onDismissRequest = {},
        containerColor = palette.surface,
        tonalElevation = 16.dp,
        title = {
            Text(if (palette.isNature) { if (won) "收获 2048" else "歇一歇，再出发" } else { if (won) "CORE UNLOCKED" else "SYSTEM HALTED" }, color = if (won) palette.primary else palette.tertiary, fontWeight = FontWeight.Black)
        },
        text = {
            Text(
                if (palette.isNature) {
                    if (won) "成功合成 2048，收获 $score 分，继续探索吧。" else "本轮收获 $score 分，开启新一轮的生长吧。"
                } else {
                    if (won) "成功合成 2048，能量得分 $score。" else "本轮能量得分 $score，重新启动矩阵继续挑战。"
                },
                color = palette.mutedText
            )
        },
        confirmButton = {
            Button(onClick = onRestart, colors = ButtonDefaults.buttonColors(containerColor = palette.secondary, contentColor = Color.White)) { Text(if (palette.isNature) "重新开始" else "重新启动") }
        },
        dismissButton = onKeepPlaying?.let { action ->
            { TextButton(onClick = action) { Text(if (palette.isNature) "继续生长" else "继续突破", color = palette.primary) } }
        }
    )
}
