package com.example.bzxandroidgames.ui

import android.widget.Toast
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
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
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bzxandroidgames.game.SpiderCard
import com.example.bzxandroidgames.game.SpiderGame
import com.example.bzxandroidgames.game.SpiderSuits
import com.example.bzxandroidgames.game.SpiderSolitaire
import com.example.bzxandroidgames.game.SpiderStatus
import com.example.bzxandroidgames.game.SpiderUiState
import com.example.bzxandroidgames.sound.clickSfx
import kotlinx.coroutines.delay
import kotlin.math.roundToInt
import kotlin.random.Random

// Classic spider table: deep green felt, white cards with black/red ink, blue backs.
private val FeltTop = Color(0xFF138726)
private val FeltBottom = Color(0xFF0A5416)
private val CardWhite = Color.White
private val CardBlack = Color(0xFF141414)
private val CardRed = Color(0xFFD11C1C)
private val CardRim = Color(0xFF9AA0A6)
private val SelectGold = Color(0xFFFFC94D)
private val HintGreen = Color(0xFFB6FFC9)
private val BackBlue = Color(0xFF24559E)
private val BackLattice = Color(0xFF7FA8E0)
private val PanelCream = Color(0xFFF7F1DC)
private val FeltInk = Color(0xFF0A5414)

private val cardShape = RoundedCornerShape(3.dp)

@Composable
fun SpiderScreen(
    state: SpiderUiState,
    onBack: () -> Unit,
    onTapCard: (Int, Int) -> Unit,
    onTapColumn: (Int) -> Unit,
    onDropRun: (Int, Int, Int) -> Unit,
    onSelectRun: (Int, Int) -> Unit,
    onClearSelection: () -> Unit,
    onDeal: () -> Unit,
    onUndo: () -> Unit,
    onRestart: () -> Unit,
    onHint: () -> Unit,
    onSelectSuits: (SpiderSuits) -> Unit,
    onClearHint: () -> Unit
) {
    val game = state.game
    val context = LocalContext.current
    LaunchedEffect(state.hintSerial, state.hint) {
        if (state.hint != null) {
            delay(2000)
            onClearHint()
        }
    }
    BoxWithConstraints(
        Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(FeltTop, FeltBottom)))
    ) {
        FeltVignette()
        val cardWidth = (maxWidth - 12.dp - 3.dp * 9) / 10f
        Column(Modifier.fillMaxSize().safeDrawingPadding()) {
            SpiderTopBar(game, state.canUndo, onBack, onUndo, onRestart, onHint, onSelectSuits)
            SpiderBoard(
                game = game,
                state = state,
                cardWidth = cardWidth,
                modifier = Modifier.weight(1f),
                onTapCard = onTapCard,
                onTapColumn = onTapColumn,
                onSelectRun = onSelectRun,
                onDropRun = onDropRun,
                onClearSelection = onClearSelection
            )
            SpiderBottomStrip(game, cardWidth) { blocked ->
                if (blocked) {
                    Toast.makeText(context, "有空列时不能发牌，先把牌填回去", Toast.LENGTH_SHORT).show()
                } else onDeal()
            }
        }
        if (game.status == SpiderStatus.WON) {
            WinOverlay(game, onRestart, onBack)
        }
    }
}

@Composable
private fun SpiderTopBar(
    game: SpiderGame,
    canUndo: Boolean,
    onBack: () -> Unit,
    onUndo: () -> Unit,
    onRestart: () -> Unit,
    onHint: () -> Unit,
    onSelectSuits: (SpiderSuits) -> Unit
) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 6.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        TextButton(onClick = clickSfx(onBack)) {
            Text("‹  返回游戏大厅", color = Color.White, fontSize = 12.sp)
        }
        Text("蜘蛛纸牌", color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.weight(.6f))
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
            SpiderSuits.entries.forEach { suits ->
                FeltPill(
                    label = suits.title,
                    selected = game.suits == suits,
                    onClick = { onSelectSuits(suits) }
                )
            }
        }
        Spacer(Modifier.weight(.4f))
        FeltPill("新游戏 ↻", onClick = onRestart)
        FeltPill("撤销 ↶", enabled = canUndo, onClick = onUndo)
        FeltPill("提示", onClick = onHint)
        Spacer(Modifier.width(6.dp))
    }
}

@Composable
private fun FeltPill(label: String, selected: Boolean = false, enabled: Boolean = true, onClick: () -> Unit) {
    Text(
        label,
        color = if (selected) FeltInk else Color.White.copy(alpha = if (enabled) .95f else .4f),
        fontSize = 11.sp,
        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) Color.White else Color.White.copy(alpha = .14f))
            .border(.8.dp, Color.White.copy(alpha = if (selected) 1f else .45f), RoundedCornerShape(50))
            .clickSfx(enabled = enabled, onClickLabel = label, onClick = onClick)
            .padding(horizontal = 11.dp, vertical = 6.dp)
    )
}

/** The ten tableau columns, dynamically squeezed so the tallest stack still fits.
 *  Owns the drag session: a lifted run follows the finger and drops onto the column
 *  under its centre; an illegal or off-board release snaps everything back. */
@Composable
private fun SpiderBoard(
    game: SpiderGame,
    state: SpiderUiState,
    cardWidth: Dp,
    modifier: Modifier = Modifier,
    onTapCard: (Int, Int) -> Unit,
    onTapColumn: (Int) -> Unit,
    onSelectRun: (Int, Int) -> Unit,
    onDropRun: (Int, Int, Int) -> Unit,
    onClearSelection: () -> Unit
) {
    val cardHeight = cardWidth * 1.4f
    BoxWithConstraints(modifier) {
        val density = LocalDensity.current
        var drag by remember { mutableStateOf<DragState?>(null) }
        val available = maxHeight
        val freshDeal = game.serial == game.lastDealSerial
        val downGap = cardHeight * .13f
        val upGap = cardHeight * .27f

        fun columnX(column: Int): Dp = 6.dp + (cardWidth + 3.dp) * column
        fun targetColumnAt(centerXPx: Float): Int? =
            (0 until SpiderSolitaire.COLUMN_COUNT).firstOrNull { column ->
                val start = with(density) { columnX(column).toPx() }
                val width = with(density) { cardWidth.toPx() }
                val slack = with(density) { 2.dp.toPx() }
                centerXPx >= start - slack && centerXPx < start + width + slack
            }

        val hoverTarget = drag?.let { d ->
            val centerX = with(density) { d.originX.toPx() + d.delta.x + cardWidth.toPx() / 2 }
            targetColumnAt(centerX)
                ?.takeIf { it != d.from && SpiderSolitaire.canDrop(d.cards, game.columns[it]) }
        }

        for (column in game.columns.indices) {
            val cards = game.columns[column]
            var needed = cardHeight
            for (i in 1 until cards.size) needed += if (cards[i - 1].faceUp) upGap else downGap
            val squeeze = if (needed > available)
                ((available - cardHeight) / (needed - cardHeight)).coerceIn(.22f, 1f)
            else 1f
            ColumnArea(
                game = game,
                state = state,
                column = column,
                cardWidth = cardWidth,
                columnX = columnX(column),
                downGap = downGap * squeeze,
                upGap = upGap * squeeze,
                freshDeal = freshDeal,
                drag = drag,
                isTarget = hoverTarget == column,
                onTapCard = onTapCard,
                onTapColumn = onTapColumn,
                onDragStart = { row, originY ->
                    val run = game.columns[column]
                    drag = DragState(column, row, run.subList(row, run.size), columnX(column), originY, Offset.Zero)
                    onSelectRun(column, row)
                },
                onDrag = { amount ->
                    drag?.let { held -> drag = held.copy(delta = held.delta + amount) }
                },
                onDragEnd = {
                    val held = drag
                    drag = null
                    if (held != null) {
                        val centerX = with(density) { held.originX.toPx() + held.delta.x + cardWidth.toPx() / 2 }
                        val target = targetColumnAt(centerX)
                        if (target != null && target != held.from) {
                            onDropRun(held.from, held.index, target)
                        } else onClearSelection()
                    }
                },
                onDragCancel = {
                    drag = null
                    onClearSelection()
                }
            )
        }

        // The lifted run floats above everything, fanned out like the classic drag.
        drag?.let { d ->
            val origin = with(density) { Offset(d.originX.toPx() + d.delta.x, d.originY.toPx() + d.delta.y) }
            val fan = with(density) { upGap.toPx() }
            d.cards.forEachIndexed { i, card ->
                Box(
                    Modifier
                        .offset { IntOffset(origin.x.roundToInt(), (origin.y + i * fan).roundToInt()) }
                        .size(cardWidth, cardHeight)
                ) {
                    CardFace(
                        card = card,
                        cardWidth = cardWidth,
                        fresh = false,
                        selected = false,
                        highlighted = false,
                        interactive = false,
                        liftShadow = true
                    )
                }
            }
        }
    }
}

private data class DragState(
    val from: Int,
    val index: Int,
    val cards: List<SpiderCard>,
    val originX: Dp,
    val originY: Dp,
    val delta: Offset
)

@Composable
private fun ColumnArea(
    game: SpiderGame,
    state: SpiderUiState,
    column: Int,
    cardWidth: Dp,
    columnX: Dp,
    downGap: Dp,
    upGap: Dp,
    freshDeal: Boolean,
    drag: DragState?,
    isTarget: Boolean,
    onTapCard: (Int, Int) -> Unit,
    onTapColumn: (Int) -> Unit,
    onDragStart: (row: Int, originY: Dp) -> Unit,
    onDrag: (Offset) -> Unit,
    onDragEnd: () -> Unit,
    onDragCancel: () -> Unit
) {
    val cardHeight = cardWidth * 1.4f
    val cards = game.columns[column]
    val hint = state.hint
    val lifted = drag?.takeIf { it.from == column }
    val showTarget = isTarget || (hint != null && hint.to == column && !hint.suggestDeal)
    Box(
        Modifier
            .offset(x = columnX)
            .width(cardWidth)
            .fillMaxHeight()
            .clickable(onClickLabel = "放到第${column + 1}列") { onTapColumn(column) },
        contentAlignment = Alignment.TopStart
    ) {
        if (cards.isEmpty()) {
            Box(
                Modifier
                    .size(cardWidth, cardHeight)
                    .border(
                        1.dp,
                        if (showTarget) HintGreen.copy(alpha = .8f) else Color.White.copy(alpha = .3f),
                        cardShape
                    )
            )
        }
        var y = 0.dp
        cards.forEachIndexed { row, card ->
            val rowY = y
            val isLifted = lifted != null && row >= lifted.index
            val movable = SpiderSolitaire.movableRun(cards, row)
            val selected = state.selectedFrom == column && row >= (state.selectedIndex ?: 0)
            val hintedSource = hint != null && hint.from == column && row >= hint.index && !hint.suggestDeal
            Box(
                Modifier
                    .offset(y = rowY)
                    .size(cardWidth, cardHeight)
                    .alpha(if (isLifted) .3f else 1f)
                    .pointerInput(column, row, movable, cards.size) {
                        detectDragGestures(
                            onDragStart = { if (movable) onDragStart(row, rowY) },
                            onDrag = { change, amount ->
                                change.consume()
                                onDrag(amount)
                            },
                            onDragEnd = onDragEnd,
                            onDragCancel = onDragCancel
                        )
                    }
            ) {
                CardFace(
                    card = card,
                    cardWidth = cardWidth,
                    fresh = freshDeal && row == cards.lastIndex && !isLifted,
                    selected = selected,
                    highlighted = hintedSource || (showTarget && row == cards.lastIndex),
                    onClick = { onTapCard(column, row) }
                )
            }
            y += if (card.faceUp) upGap else downGap
        }
    }
}

@Composable
private fun CardFace(
    card: SpiderCard,
    cardWidth: Dp,
    fresh: Boolean,
    selected: Boolean,
    highlighted: Boolean,
    modifier: Modifier = Modifier,
    interactive: Boolean = true,
    liftShadow: Boolean = false,
    onClick: () -> Unit = {}
) {
    val cardHeight = cardWidth * 1.4f
    var appeared by remember(fresh) { mutableFloatStateOf(if (fresh) .5f else 1f) }
    LaunchedEffect(fresh) { if (fresh) appeared = 1f }
    val scale by animateFloatAsState(appeared, spring(dampingRatio = .55f, stiffness = 600f), label = "deal-pop")
    val pulse = if (highlighted) {
        val transition = rememberInfiniteTransition(label = "hint-pulse")
        val value by transition.animateFloat(
            .5f, 1f,
            infiniteRepeatable(tween(520, easing = LinearEasing), RepeatMode.Reverse),
            label = "hint-alpha"
        )
        value
    } else 1f
    val ink = if (card.suit == 1 || card.suit == 3) CardRed else CardBlack
    val indexSize = (cardWidth.value * .24f).sp
    val indexGlyph = (cardWidth.value * .19f).dp

    @Composable
    fun Index() {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                rankLabel(card.rank),
                color = ink, fontSize = indexSize, fontWeight = FontWeight.Bold,
                lineHeight = indexSize * .95f
            )
            SuitGlyph(card.suit, Modifier.size(indexGlyph), ink)
        }
    }

    Box(
        modifier
            .size(cardWidth, cardHeight)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
                alpha = .45f + .55f * scale
            }
            .shadow(
                when {
                    liftShadow -> 16.dp
                    selected -> 9.dp
                    else -> 3.dp
                },
                cardShape
            )
            .clip(cardShape)
            .background(CardWhite)
            .border(
                if (selected) 1.8.dp else 1.dp,
                when {
                    selected -> SelectGold
                    highlighted -> HintGreen.copy(alpha = pulse)
                    else -> CardRim
                },
                cardShape
            )
            .then(
                if (interactive) Modifier.clickable(onClickLabel = "拿起${rankLabel(card.rank)}") { onClick() }
                else Modifier
            )
    ) {
        Column(Modifier.padding(start = 2.5.dp, top = 1.5.dp)) { Index() }
        SuitGlyph(
            card.suit,
            Modifier.size((cardWidth.value * .46f).dp).align(Alignment.Center),
            ink
        )
        Column(
            Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 2.5.dp, bottom = 1.5.dp)
                .graphicsLayer { rotationZ = 180f }
        ) { Index() }
    }
}

/** Classic blue back: white frame over a diagonal lattice. */
@Composable
private fun CardBack(width: Dp, modifier: Modifier = Modifier) {
    Canvas(modifier.size(width, width * 1.4f)) {
        val radius = CornerRadius(2.5.dp.toPx())
        drawRoundRect(BackBlue, cornerRadius = radius)
        val inset = 2.dp.toPx()
        drawRoundRect(
            Color.White,
            topLeft = Offset(inset, inset),
            size = Size(size.width - inset * 2, size.height - inset * 2),
            cornerRadius = radius,
            style = Stroke(1.1.dp.toPx())
        )
        val inner = inset + 1.5f.dp.toPx()
        clipRect(inner, inner, size.width - inner, size.height - inner) {
            val step = 5.5.dp.toPx()
            val span = size.width + size.height
            var offset = 0f
            while (offset < span) {
                drawLine(
                    BackLattice.copy(alpha = .55f),
                    Offset(offset, 0f), Offset(offset - size.height, size.height),
                    1.dp.toPx()
                )
                drawLine(
                    BackLattice.copy(alpha = .55f),
                    Offset(offset - size.height, 0f), Offset(offset, size.height),
                    1.dp.toPx()
                )
                offset += step
            }
        }
    }
}

@Composable
private fun SuitGlyph(suit: Int, modifier: Modifier = Modifier, tint: Color) {
    Canvas(modifier) { drawSuit(suit, Offset.Zero, size.minDimension, tint) }
}

/** Vector pips (spade ♥ diamond club) so the classic look never depends on font glyphs. */
private fun DrawScope.drawSuit(suit: Int, topLeft: Offset, side: Float, color: Color) {
    val x = topLeft.x
    val y = topLeft.y
    fun fx(f: Float) = x + side * f
    fun fy(f: Float) = y + side * f
    when (suit) {
        1 -> drawPath(
            Path().apply {
                moveTo(fx(.5f), fy(.88f))
                cubicTo(fx(.05f), fy(.58f), fx(.1f), fy(.12f), fx(.5f), fy(.34f))
                cubicTo(fx(.9f), fy(.12f), fx(.95f), fy(.58f), fx(.5f), fy(.88f))
                close()
            },
            color
        )
        3 -> drawPath(
            Path().apply {
                moveTo(fx(.5f), fy(.04f)); lineTo(fx(.9f), fy(.5f))
                lineTo(fx(.5f), fy(.96f)); lineTo(fx(.1f), fy(.5f))
                close()
            },
            color
        )
        0 -> {
            drawPath(
                Path().apply {
                    moveTo(fx(.5f), fy(.06f))
                    cubicTo(fx(.92f), fy(.42f), fx(.88f), fy(.8f), fx(.5f), fy(.66f))
                    cubicTo(fx(.12f), fy(.8f), fx(.08f), fy(.42f), fx(.5f), fy(.06f))
                    close()
                },
                color
            )
            drawPath(
                Path().apply {
                    moveTo(fx(.5f), fy(.52f)); lineTo(fx(.68f), fy(.94f)); lineTo(fx(.32f), fy(.94f))
                    close()
                },
                color
            )
        }
        else -> {
            drawCircle(color, side * .2f, Offset(fx(.5f), fy(.27f)))
            drawCircle(color, side * .2f, Offset(fx(.3f), fy(.56f)))
            drawCircle(color, side * .2f, Offset(fx(.7f), fy(.56f)))
            drawPath(
                Path().apply {
                    moveTo(fx(.5f), fy(.48f)); lineTo(fx(.66f), fy(.94f)); lineTo(fx(.34f), fy(.94f))
                    close()
                },
                color
            )
        }
    }
}

private fun rankLabel(rank: Int): String = when (rank) {
    1 -> "A"; 11 -> "J"; 12 -> "Q"; 13 -> "K"; else -> rank.toString()
}

/** Bottom strip: foundations on the left, score in the middle, stock on the right —
 *  the same arrangement as the classic window. */
@Composable
private fun SpiderBottomStrip(
    game: SpiderGame,
    cardWidth: Dp,
    onDeal: (blocked: Boolean) -> Unit
) {
    val miniWidth = cardWidth * .56f
    val miniHeight = miniWidth * 1.4f
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(3.dp), verticalAlignment = Alignment.CenterVertically) {
            repeat(8) { slot ->
                val suit = game.completed.getOrNull(slot)
                if (suit == null) {
                    Box(
                        Modifier
                            .size(miniWidth, miniHeight)
                            .border(1.dp, Color.White.copy(alpha = .3f), cardShape)
                    )
                } else {
                    Box(
                        Modifier
                            .size(miniWidth, miniHeight)
                            .shadow(3.dp, cardShape)
                            .clip(cardShape)
                            .background(CardWhite)
                            .border(1.dp, CardRim, cardShape),
                        contentAlignment = Alignment.Center
                    ) {
                        SuitGlyph(suit, Modifier.size(miniWidth * .52f), if (suit == 1 || suit == 3) CardRed else CardBlack)
                    }
                }
            }
        }
        Spacer(Modifier.weight(1f))
        Text(
            "得分 ${game.score}",
            color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.width(12.dp))
        Text("步数 ${game.moves}", color = Color.White.copy(alpha = .85f), fontSize = 12.sp)
        Spacer(Modifier.weight(1f))
        val blocked = game.stock.size >= SpiderSolitaire.COLUMN_COUNT && game.columns.any { it.isEmpty() }
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.clickSfx(enabled = game.stock.isNotEmpty(), onClickLabel = "发牌") { onDeal(blocked) }
        ) {
            Box {
                if (game.stock.isEmpty()) {
                    Box(Modifier.size(miniWidth, miniHeight).border(1.dp, Color.White.copy(alpha = .3f), cardShape))
                }
                repeat(game.stock.size / SpiderSolitaire.COLUMN_COUNT) { pile ->
                    CardBack(miniWidth, Modifier.offset(x = 9.dp * pile))
                }
            }
            Spacer(Modifier.width(8.dp))
            Text(
                "发牌 ×${game.stock.size / SpiderSolitaire.COLUMN_COUNT}",
                color = Color.White.copy(alpha = if (game.stock.isEmpty()) .4f else .95f),
                fontSize = 11.sp, fontWeight = FontWeight.Medium
            )
        }
    }
}

/** The classic win: cards leap out of the foundations and bounce across the table. */
@Composable
private fun WinOverlay(game: SpiderGame, onRestart: () -> Unit, onBack: () -> Unit) {
    var panelVisible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { delay(1600); panelVisible = true }
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        BouncingCards(Modifier.fillMaxSize())
        Box(Modifier.fillMaxSize().clickable(enabled = !panelVisible) { panelVisible = true })
        if (panelVisible) {
            Column(
                Modifier
                    .shadow(18.dp, RoundedCornerShape(18.dp))
                    .clip(RoundedCornerShape(18.dp))
                    .background(PanelCream)
                    .border(1.dp, Color(0xFFD9CFAC), RoundedCornerShape(18.dp))
                    .padding(horizontal = 26.dp, vertical = 20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("你赢了！", color = FeltInk, fontSize = 22.sp, fontWeight = FontWeight.Black)
                Spacer(Modifier.height(6.dp))
                Text(
                    "得分 ${game.score} · 步数 ${game.moves}",
                    color = Color(0xFF5D777B), fontSize = 13.sp
                )
                Text("八组同花连珠，全部归位。", color = Color(0xFF5D777B), fontSize = 12.sp)
                Spacer(Modifier.height(14.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        "再来一局",
                        color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(Color(0xFF12872A))
                            .clickSfx(onClickLabel = "再来一局", onClick = onRestart)
                            .padding(horizontal = 18.dp, vertical = 8.dp)
                    )
                    Text(
                        "返回大厅",
                        color = FeltInk, fontSize = 13.sp, fontWeight = FontWeight.Medium,
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .border(1.dp, Color(0xFF12872A), RoundedCornerShape(50))
                            .clickSfx(onClickLabel = "返回大厅", onClick = onBack)
                            .padding(horizontal = 18.dp, vertical = 8.dp)
                    )
                }
            }
        }
    }
}

private class BounceCard(
    val suit: Int,
    val color: Color,
    maxX: Float,
    floor: Float,
    private val densityScale: Float
) {
    var x = maxX * .05f
    var y = floor
    var vx = (150f + Random.nextFloat() * 380f) * densityScale *
        (if (Random.nextBoolean()) 1f else -1f)
    var vy = -(320f + Random.nextFloat() * 460f) * densityScale
    val trail = ArrayDeque<Offset>()
    var gone = false

    fun step(dt: Float, floor: Float, maxX: Float) {
        vy += GRAVITY * densityScale * dt
        x += vx * dt
        y += vy * dt
        if (y > floor) {
            y = floor
            vy = -vy * .76f
        }
        trail.addLast(Offset(x, y))
        if (trail.size > TRAIL) trail.removeFirst()
        gone = x < -SIDE_GAP || x > maxX + SIDE_GAP
    }

    companion object {
        const val TOTAL = 104
        const val TRAIL = 12
        const val GRAVITY = 2100f
        const val SIDE_GAP = 120f
    }
}

@Composable
private fun BouncingCards(modifier: Modifier = Modifier) {
    val density = LocalDensity.current
    var canvasSize by remember { mutableStateOf(IntSize.Zero) }
    val cards = remember { mutableStateListOf<BounceCard>() }
    var spawned by remember { mutableIntStateOf(0) }
    LaunchedEffect(density) {
        var prev = 0L
        var lastSpawn = 0L
        while (spawned < BounceCard.TOTAL || cards.isNotEmpty()) {
            withFrameNanos { now ->
                if (prev == 0L) {
                    prev = now
                    lastSpawn = now
                }
                val dt = ((now - prev) / 1e9f).coerceAtMost(.05f)
                prev = now
                val floor = canvasSize.height.toFloat() - 4f
                if (canvasSize != IntSize.Zero && spawned < BounceCard.TOTAL && now - lastSpawn >= 320_000_000L) {
                    val suit = spawned % 4
                    cards.add(
                        BounceCard(
                            suit,
                            if (suit == 1 || suit == 3) CardRed else CardBlack,
                            canvasSize.width.toFloat(),
                            floor,
                            density.density
                        )
                    )
                    spawned++
                    lastSpawn = now
                }
                cards.forEach { it.step(dt, floor, canvasSize.width.toFloat()) }
                cards.removeAll { it.gone }
            }
        }
    }
    Canvas(modifier.onSizeChanged { canvasSize = it }) {
        val side = 21.dp.toPx()
        cards.forEach { card ->
            card.trail.forEachIndexed { index, position ->
                val alpha = (index + 1f) / card.trail.size * .16f
                drawRoundRect(
                    Color.White.copy(alpha = alpha),
                    topLeft = Offset(position.x - side / 2, position.y - side / 2),
                    size = Size(side, side * 1.4f),
                    cornerRadius = CornerRadius(2.dp.toPx())
                )
            }
            val topLeft = Offset(card.x - side / 2, card.y - side / 2)
            drawRoundRect(
                Color.White,
                topLeft = topLeft,
                size = Size(side, side * 1.4f),
                cornerRadius = CornerRadius(2.dp.toPx())
            )
            drawSuit(card.suit, topLeft + Offset(side * .25f, side * .45f), side * .5f, card.color)
        }
    }
}

/** Soft dark edges over the felt, like the classic table's vignette. */
@Composable
private fun FeltVignette() {
    Canvas(Modifier.fillMaxSize()) {
        drawRect(
            Brush.radialGradient(
                listOf(Color.Transparent, Color.Black.copy(alpha = .26f)),
                center = Offset(size.width / 2, size.height / 2),
                radius = size.maxDimension * .78f
            )
        )
        drawRect(
            Brush.verticalGradient(
                listOf(Color.White.copy(alpha = .07f), Color.Transparent, Color.Black.copy(alpha = .12f))
            )
        )
    }
}
