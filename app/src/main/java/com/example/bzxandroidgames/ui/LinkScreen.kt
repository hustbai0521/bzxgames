package com.example.bzxandroidgames.ui

import android.widget.Toast
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bzxandroidgames.game.LinkLink
import com.example.bzxandroidgames.game.LinkStatus
import com.example.bzxandroidgames.game.LinkTile
import com.example.bzxandroidgames.game.LinkUiState
import com.example.bzxandroidgames.sound.clickSfx
import kotlinx.coroutines.delay

// Fixed summer look, shared with the lobby and settings page.
private val LinkBg = Color(0xFFF2F8F5)
private val LinkCard = Color(0xFFF9FCF8)

@Composable
fun LinkScreen(
    state: LinkUiState,
    onBack: () -> Unit,
    onSelect: (Int) -> Unit,
    onHint: () -> Unit,
    onClearHint: () -> Unit,
    onShuffle: () -> Unit,
    onTick: () -> Unit,
    onRestart: () -> Unit
) {
    val context = LocalContext.current

    // the clock only runs while the board is alive
    if (state.status == LinkStatus.PLAYING) {
        LaunchedEffect(Unit) {
            while (true) {
                delay(1000)
                onTick()
            }
        }
    }

    // reshuffles announce themselves, whether auto (dead board) or manual
    var seenShuffles by remember { mutableIntStateOf(0) }
    LaunchedEffect(state.shuffles) {
        if (state.shuffles > seenShuffles) {
            Toast.makeText(context, "重排完成，找找新的配对吧", Toast.LENGTH_SHORT).show()
        }
        seenShuffles = state.shuffles
    }

    LaunchedEffect(state.hintSerial, state.hint) {
        if (state.hint != null) {
            delay(1600)
            onClearHint()
        }
    }

    Box(Modifier.fillMaxSize().background(LinkBg)) {
        Column(
            Modifier.fillMaxSize().systemBarsPadding().padding(horizontal = 18.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = clickSfx(onBack)) {
                    Text("‹  返回游戏大厅", color = SeaGlass)
                }
                Column(Modifier.weight(1f)) {
                    Text("连连看", color = DeepInk, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text("果蔬工具 · 成双成对", color = SoftInk, fontSize = 10.sp, letterSpacing = 1.sp)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("用时", color = SoftInk, fontSize = 9.sp)
                    Text(formatClock(state.elapsedSeconds), color = DeepInk, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                }
            }
            Row(
                Modifier.fillMaxWidth().padding(top = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "已消除 ${state.matched} / ${state.totalPairs} 对",
                    color = SoftInk, fontSize = 11.sp,
                    modifier = Modifier.weight(1f)
                )
                LinkPill("提示", onClick = onHint)
                Spacer(Modifier.width(8.dp))
                LinkPill("重排", onClick = onShuffle)
                Spacer(Modifier.width(8.dp))
                LinkPill("重开", onClick = onRestart)
            }
            Spacer(Modifier.height(10.dp))
            LinkBoard(state, onSelect, Modifier.weight(1f))
            Spacer(Modifier.height(10.dp))
            Text(
                "点中两张相同图案，连线转折不超过两次即可消除",
                color = SoftInk, fontSize = 10.sp,
                modifier = Modifier.padding(bottom = 12.dp)
            )
        }
    }
    if (state.status == LinkStatus.OVER) {
        LinkWinDialog(state, onRestart)
    }
}

private fun formatClock(seconds: Int): String =
    "%02d:%02d".format(seconds / 60, seconds % 60)

@Composable
private fun LinkPill(label: String, onClick: () -> Unit) {
    Text(
        label,
        color = SeaGlass,
        fontSize = 12.sp,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(Color.White.copy(alpha = .85f))
            .border(1.dp, SeaGlass.copy(alpha = .35f), RoundedCornerShape(50))
            .clickSfx(role = Role.Button, onClickLabel = label, onClick = onClick)
            .padding(horizontal = 13.dp, vertical = 7.dp)
    )
}

/** The board card reserves half a tile of open border on every side — classic
 *  连连看 routes may travel around the outside edge. */
@Composable
private fun LinkBoard(state: LinkUiState, onSelect: (Int) -> Unit, modifier: Modifier = Modifier) {
    BoxWithConstraints(modifier) {
        val cell = minOf((maxWidth - 20.dp) / (state.cols + 2), (maxHeight - 20.dp) / (state.rows + 2))
        val linkLine = remember { Animatable(0f) }
        LaunchedEffect(state.clearId) {
            if (state.clearId > 0) {
                linkLine.snapTo(0f)
                linkLine.animateTo(1f, tween(480, easing = LinearEasing))
            }
        }
        val pulse = rememberInfiniteTransition(label = "hint-pulse")
        val hintAlpha by pulse.animateFloat(
            .45f, 1f,
            infiniteRepeatable(tween(480, easing = LinearEasing), RepeatMode.Reverse),
            label = "hint-alpha"
        )

        Box(
            Modifier
                .size(cell * (state.cols + 2), cell * (state.rows + 2))
                .shadow(14.dp, RoundedCornerShape(22.dp), ambientColor = SeaGlass.copy(alpha = .13f), spotColor = SeaGlass.copy(alpha = .15f))
                .clip(RoundedCornerShape(22.dp))
                .background(Brush.verticalGradient(listOf(Color.White.copy(alpha = .92f), LinkCard.copy(alpha = .88f))))
                .border(1.dp, SeaGlass.copy(alpha = .3f), RoundedCornerShape(22.dp))
        ) {
            state.grid.forEachIndexed { index, tile ->
                if (tile != null) {
                    val col = index % state.cols
                    val row = index / state.cols
                    val hinted = state.hint?.let { it.first == index || it.second == index } == true
                    LinkTileCell(
                        tile = tile,
                        selected = state.selected == index,
                        hinted = hinted,
                        hintAlpha = hintAlpha,
                        cellSize = cell,
                        modifier = Modifier.offset(x = cell * (col + 1), y = cell * (row + 1)),
                        onClick = { onSelect(index) }
                    )
                }
            }
            // the freshly matched pair draws its connector, then it fades away
            val path = state.matchedPath
            if (path != null && linkLine.value < 1f) {
                Canvas(Modifier.matchParentSize()) {
                    val cellPx = cell.toPx()
                    val alpha = 1f - linkLine.value
                    val points = path.map { (x, y) -> Offset((x + 1.5f) * cellPx, (y + 1.5f) * cellPx) }
                    val route = Path().apply {
                        moveTo(points.first().x, points.first().y)
                        points.drop(1).forEach { lineTo(it.x, it.y) }
                    }
                    drawPath(route, SeaGlass.copy(alpha = .18f * alpha), style = Stroke(7.dp.toPx(), cap = StrokeCap.Round))
                    drawPath(route, SeaGlass.copy(alpha = alpha), style = Stroke(2.6.dp.toPx(), cap = StrokeCap.Round))
                    points.forEach { drawCircle(SeaGlass.copy(alpha = alpha), 3.2.dp.toPx(), it) }
                }
            }
        }
    }
}

@Composable
private fun LinkTileCell(
    tile: LinkTile,
    selected: Boolean,
    hinted: Boolean,
    hintAlpha: Float,
    cellSize: Dp,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Box(
        modifier
            .size(cellSize)
            .padding(2.dp)
            .clip(RoundedCornerShape(9.dp))
            .background(if (selected) SeaGlass.copy(alpha = .18f) else Color.White)
            .border(
                when {
                    selected -> 1.8.dp
                    hinted -> 1.6.dp
                    else -> .9.dp
                },
                when {
                    selected -> SeaGlass
                    hinted -> WarmRose.copy(alpha = hintAlpha)
                    else -> SeaGlass.copy(alpha = .32f)
                },
                RoundedCornerShape(9.dp)
            )
            .clickSfx(role = Role.Button, onClickLabel = LinkLink.typeNames[tile.type], onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Canvas(Modifier.size(cellSize * .58f)) {
            drawLinkIcon(tile.type)
        }
    }
}

/** Flat fruit/vegetable/tool glyphs, hand-drawn in the app's vector style. */
private fun DrawScope.drawLinkIcon(type: Int) {
    val s = size.minDimension
    fun off(x: Float, y: Float) = center + Offset(x * s, y * s)
    fun sz(w: Float, h: Float) = Size(w * s, h * s)
    when (type) {
        0 -> { // 苹果
            drawCircle(Color(0xFFD9483B), s * .3f, off(0f, .07f))
            drawCircle(Color.White.copy(alpha = .25f), s * .08f, off(-.11f, -.03f))
            drawLine(Color(0xFF7A5230), off(0f, -.18f), off(.02f, -.34f), s * .05f, StrokeCap.Round)
            drawOval(Color(0xFF7FB575), topLeft = off(.01f, -.4f), size = sz(.24f, .13f))
        }
        1 -> { // 橙子
            drawCircle(Color(0xFFF0A04B), s * .3f, off(0f, .06f))
            drawCircle(Color.White.copy(alpha = .3f), s * .07f, off(-.1f, -.03f))
            drawOval(Color(0xFF7FB575), topLeft = off(-.02f, -.42f), size = sz(.2f, .11f))
            drawCircle(Color(0xFFC97B2D), s * .04f, off(0f, -.27f))
        }
        2 -> { // 香蕉
            drawArc(
                Color(0xFFF4C430), 150f, 180f, useCenter = false,
                topLeft = off(-.34f, -.36f), size = sz(.68f, .68f),
                style = Stroke(s * .17f, cap = StrokeCap.Round)
            )
            drawCircle(Color(0xFFB98A1F), s * .035f, off(-.28f, -.02f))
            drawCircle(Color(0xFFB98A1F), s * .035f, off(.28f, -.02f))
        }
        3 -> { // 葡萄
            drawLine(Color(0xFF7A5230), off(0f, -.4f), off(0f, -.16f), s * .05f, StrokeCap.Round)
            val r = s * .1f
            listOf(
                off(-.2f, -.03f), off(0f, -.03f), off(.2f, -.03f),
                off(-.1f, .14f), off(.1f, .14f),
                off(0f, .3f)
            ).forEach { drawCircle(Color(0xFF8E6BB8), r, it) }
            drawCircle(Color.White.copy(alpha = .3f), r * .32f, off(-.23f, -.06f))
        }
        4 -> { // 西瓜
            drawArc(
                Color(0xFFE5544B), 0f, 180f, useCenter = true,
                topLeft = off(-.34f, -.34f), size = sz(.68f, .68f)
            )
            drawArc(
                Color(0xFF3E8E4E), 0f, 180f, useCenter = false,
                topLeft = off(-.4f, -.4f), size = sz(.8f, .8f),
                style = Stroke(s * .07f)
            )
            listOf(off(-.15f, -.07f), off(0f, .01f), off(.15f, -.07f)).forEach {
                drawCircle(Color(0xFF33291C), s * .028f, it)
            }
        }
        5 -> { // 胡萝卜
            drawPath(
                Path().apply {
                    moveTo(center.x - s * .16f, center.y - s * .1f)
                    lineTo(center.x + s * .16f, center.y - s * .1f)
                    lineTo(center.x, center.y + s * .42f)
                    close()
                },
                Color(0xFFE8833A)
            )
            listOf(-.12f, 0f, .12f).forEach { angle ->
                drawLine(Color(0xFF5C8B4C), off(angle, -.12f), off(angle * 2.2f, -.4f), s * .05f, StrokeCap.Round)
            }
        }
        6 -> { // 蘑菇
            drawArc(
                Color(0xFFC25B4E), 180f, 180f, useCenter = true,
                topLeft = off(-.34f, -.38f), size = sz(.68f, .68f)
            )
            drawRoundRect(
                Color(0xFFE8D9B8),
                topLeft = off(-.11f, -.04f), size = sz(.22f, .4f),
                cornerRadius = CornerRadius(s * .05f)
            )
            listOf(off(-.14f, -.17f), off(.05f, -.24f), off(.16f, -.09f)).forEach {
                drawCircle(Color.White.copy(alpha = .8f), s * .045f, it)
            }
        }
        7 -> { // 玉米
            drawOval(Color(0xFFF2C14E), topLeft = off(-.17f, -.36f), size = sz(.34f, .72f))
            for (i in -1..1) {
                drawLine(Color(0xFFC99A2E), off(i * .09f, -.3f), off(i * .09f, .3f), s * .02f)
            }
            drawLine(Color(0xFFC99A2E), off(-.15f, -.05f), off(.15f, -.05f), s * .02f)
            drawLine(Color(0xFFC99A2E), off(-.16f, .13f), off(.16f, .13f), s * .02f)
            drawPath(
                Path().apply {
                    moveTo(center.x - s * .17f, center.y - s * .1f)
                    quadraticTo(center.x - s * .34f, center.y + s * .1f, center.x - s * .1f, center.y + s * .38f)
                    close()
                },
                Color(0xFF7FA36B)
            )
            drawPath(
                Path().apply {
                    moveTo(center.x + s * .17f, center.y - s * .1f)
                    quadraticTo(center.x + s * .34f, center.y + s * .1f, center.x + s * .1f, center.y + s * .38f)
                    close()
                },
                Color(0xFF7FA36B)
            )
        }
        8 -> { // 扳手
            drawArc(
                Color(0xFF6B7B8C), -50f, 280f, useCenter = false,
                topLeft = off(-.42f, -.42f), size = sz(.5f, .5f),
                style = Stroke(s * .13f, cap = StrokeCap.Round)
            )
            drawLine(Color(0xFF6B7B8C), off(.15f, .15f), off(.4f, .4f), s * .14f, StrokeCap.Round)
        }
        else -> { // 锤子
            drawLine(Color(0xFFA9825F), off(0f, -.16f), off(0f, .42f), s * .13f, StrokeCap.Round)
            drawRoundRect(
                Color(0xFF5A6672),
                topLeft = off(-.33f, -.4f), size = sz(.66f, .2f),
                cornerRadius = CornerRadius(s * .05f)
            )
        }
    }
}

@Composable
private fun LinkWinDialog(state: LinkUiState, onRestart: () -> Unit) {
    AlertDialog(
        onDismissRequest = {},
        shape = RoundedCornerShape(28.dp),
        containerColor = Color(0xFFF5FAF7),
        title = { Text("全部配对完成！", color = DeepInk, fontWeight = FontWeight.SemiBold) },
        text = {
            Text(
                "用时 ${formatClock(state.elapsedSeconds)}，重排 ${state.shuffles} 次。苹果找苹果，扳手会扳手——整版清清爽爽。",
                color = SoftInk
            )
        },
        confirmButton = {
            TextButton(onClick = clickSfx(onRestart)) { Text("再来一局", color = SeaGlass) }
        }
    )
}
