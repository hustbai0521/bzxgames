package com.example.bzxandroidgames.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.*
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import com.example.bzxandroidgames.game.*
import com.example.bzxandroidgames.sound.clickSfx
import com.example.bzxandroidgames.ui.theme.BzxAndroidGamesTheme
import com.example.bzxandroidgames.ui.theme.GameTheme
import com.example.bzxandroidgames.ui.theme.NatureBackdrop
import com.example.bzxandroidgames.ui.theme.NaturePalette
import kotlinx.coroutines.delay

@Composable
fun SudokuScreen(
    state: SudokuUiState,
    active: Boolean,
    onBack: () -> Unit,
    onStart: () -> Unit,
    onRestart: () -> Unit,
    onSelectDifficulty: (SudokuDifficulty) -> Unit,
    onSelect: (Int) -> Unit,
    onInput: (Int) -> Unit,
    onErase: () -> Unit,
    onUndo: () -> Unit,
    onToggleNotes: () -> Unit,
    onTick: () -> Unit
) = BzxAndroidGamesTheme(GameTheme.NATURE) {
    val game = state.game
    val palette = NaturePalette
    val playing = game.status == SudokuStatus.PLAYING
    val owner = LocalLifecycleOwner.current
    val keyboardFocus = remember { FocusRequester() }
    LaunchedEffect(playing, active) { if (playing && active) keyboardFocus.requestFocus() }
    val tick by rememberUpdatedState(onTick)
    LaunchedEffect(owner, playing, active) {
        if (playing && active) owner.lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
            while (true) { delay(1000); tick() }
        }
    }
    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(palette.background))) {
        NatureBackdrop()
        Column(
            Modifier.align(Alignment.TopCenter).widthIn(max = 540.dp).fillMaxSize()
                .systemBarsPadding().verticalScroll(rememberScrollState())
                .padding(horizontal = 18.dp, vertical = 10.dp)
                .focusRequester(keyboardFocus)
                .onPreviewKeyEvent { event ->
                    if (!playing || event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                    val digit = when (event.key) {
                        Key.One, Key.NumPad1 -> 1; Key.Two, Key.NumPad2 -> 2; Key.Three, Key.NumPad3 -> 3
                        Key.Four, Key.NumPad4 -> 4; Key.Five, Key.NumPad5 -> 5; Key.Six, Key.NumPad6 -> 6
                        Key.Seven, Key.NumPad7 -> 7; Key.Eight, Key.NumPad8 -> 8; Key.Nine, Key.NumPad9 -> 9
                        else -> null
                    }
                    when {
                        digit != null -> onInput(digit)
                        event.key == Key.Backspace || event.key == Key.Delete || event.key == Key.Zero -> onErase()
                        event.key == Key.N -> onToggleNotes()
                        event.key in listOf(Key.DirectionLeft, Key.DirectionRight, Key.DirectionUp, Key.DirectionDown) -> {
                            val index = game.selected ?: 0
                            val next = when (event.key) {
                                Key.DirectionLeft -> index / 9 * 9 + (index % 9 - 1).coerceAtLeast(0)
                                Key.DirectionRight -> index / 9 * 9 + (index % 9 + 1).coerceAtMost(8)
                                Key.DirectionUp -> (index - 9).coerceAtLeast(index % 9)
                                else -> (index + 9).coerceAtMost(72 + index % 9)
                            }
                            onSelect(next)
                        }
                        else -> return@onPreviewKeyEvent false
                    }
                    true
                }.focusable(),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            TextButton(onClick = clickSfx(onBack)) { Text("‹  返回游戏大厅", color = palette.primary) }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("数独", color = palette.primary, fontSize = 34.sp, fontWeight = FontWeight.Bold)
                    Text("CLASSIC SUDOKU", color = palette.mutedText, fontSize = 10.sp, letterSpacing = 2.sp)
                }
                SudokuAction("↶ 撤销", playing && game.history.isNotEmpty(), onClick = onUndo)
                Spacer(Modifier.width(8.dp))
                SudokuAction("↻ 重开", enabled = true, onClick = onRestart)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                SudokuStat("用时", sudokuClock(game.elapsedSeconds), Modifier.weight(1f))
                SudokuStat("最佳", state.bestSeconds?.let(::sudokuClock) ?: "--", Modifier.weight(1f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SudokuDifficulty.entries.forEach { difficulty ->
                    Column(
                        Modifier.weight(1f).clip(RoundedCornerShape(16.dp))
                            .background(if (game.difficulty == difficulty) Color(0xFFD6E8CA) else Color.White.copy(alpha = .65f))
                            .border(1.dp, palette.primary.copy(alpha = if (game.difficulty == difficulty) .65f else .18f), RoundedCornerShape(16.dp))
                            .clickSfx(role = Role.Button, onClickLabel = "${difficulty.title}难度") { onSelectDifficulty(difficulty) }
                            .padding(horizontal = 10.dp, vertical = 12.dp)
                    ) {
                        Text(difficulty.title, color = palette.text, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                        Text(difficulty.caption, color = palette.mutedText, fontSize = 10.sp)
                    }
                }
            }
            if (game.status == SudokuStatus.READY || game.status == SudokuStatus.GENERATING) {
                SudokuAction(
                    if (game.status == SudokuStatus.GENERATING) "正在生成唯一解题目…" else "开始游戏",
                    enabled = game.status == SudokuStatus.READY,
                    modifier = Modifier.fillMaxWidth(), filled = true, onClick = onStart
                )
            }
            SudokuBoard(game, onSelect)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                for (digit in 1..9) {
                    val complete = game.cells.count { it == digit } >= 9
                    SudokuAction(digit.toString(), playing,
                        modifier = Modifier.weight(1f), muted = complete, onClick = { onInput(digit) })
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SudokuAction("⌫ 擦除", playing, Modifier.weight(1f), onClick = onErase)
                SudokuAction("✎ 笔记 ${if (game.noteMode) "开" else "关"}", playing,
                    Modifier.weight(1f), filled = game.noteMode, onClick = onToggleNotes)
            }
            Text("每行每列每宫都是 1–9 · 打开笔记记录候选数", color = palette.mutedText,
                fontSize = 11.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp))
        }
    }
    if (game.status == SudokuStatus.DONE) {
        AlertDialog(
            onDismissRequest = {}, containerColor = palette.surface,
            title = { Text("拼图完成！", color = palette.primary) },
            text = { Text("用时 ${sudokuClock(game.elapsedSeconds)}（${game.difficulty.title}难度）" +
                if (state.newRecord) "，这是你的新纪录！" else "，最佳纪录 ${state.bestSeconds?.let(::sudokuClock)}。") },
            confirmButton = { TextButton(onClick = clickSfx(onRestart)) { Text("再来一局") } },
            dismissButton = { TextButton(onClick = clickSfx(onBack)) { Text("返回大厅") } }
        )
    }
}

@Composable
private fun SudokuBoard(game: SudokuGame, onSelect: (Int) -> Unit) {
    val palette = NaturePalette
    val conflicts = remember(game.cells) { Sudoku.conflicts(game.cells) }
    val selected = game.selected
    val selectedValue = selected?.let { game.cells[it] } ?: 0
    BoxWithConstraints(Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(10.dp))
        .background(Color(0xFFFAFCF5)).border(2.dp, palette.primary, RoundedCornerShape(10.dp))) {
        val cell = maxWidth / 9
        Column {
            repeat(9) { row ->
                Row {
                    repeat(9) { column ->
                        val index = row * 9 + column
                        val value = game.cells[index]
                        val given = game.puzzle[index] != 0
                        val conflict = index in conflicts
                        val background = when {
                            selected == index -> Color(0xFFB8D9AA)
                            conflict -> Color(0xFFFFDAD6)
                            selectedValue != 0 && value == selectedValue -> Color(0xFFCDE2BB)
                            selected != null && Sudoku.peers(selected, index) -> Color(0xFFE5EFDB)
                            else -> Color.Transparent
                        }
                        Box(Modifier.size(cell).background(background)
                            .semantics {
                                contentDescription = "第${row + 1}行第${column + 1}列，" +
                                    (if (value == 0) "空格" else value.toString()) +
                                    (if (given) "，题目数字" else "") + (if (conflict) "，数字冲突" else "") +
                                    (if (game.notes[index] == 0) "" else "，笔记 " + (1..9).filter {
                                        game.notes[index] and (1 shl (it - 1)) != 0
                                    }.joinToString("、"))
                                this.selected = selected == index
                            }
                            .clickSfx(enabled = game.status == SudokuStatus.PLAYING, role = Role.Button) { onSelect(index) },
                            contentAlignment = Alignment.Center) {
                            if (value != 0) {
                                Text(value.toString(), color = when {
                                    conflict -> Color(0xFFB3261E)
                                    given -> palette.text
                                    else -> palette.secondary
                                }, fontSize = (cell.value * .56f).sp, lineHeight = (cell.value * .65f).sp,
                                    fontWeight = if (given) FontWeight.Bold else FontWeight.Medium)
                            } else if (game.notes[index] != 0) {
                                Column {
                                    repeat(3) { noteRow ->
                                        Row {
                                            repeat(3) { noteColumn ->
                                                val digit = noteRow * 3 + noteColumn + 1
                                                Box(Modifier.size(cell / 3), contentAlignment = Alignment.Center) {
                                                    if (game.notes[index] and (1 shl (digit - 1)) != 0)
                                                        Text(digit.toString(), color = palette.mutedText,
                                                            fontSize = (cell.value * .24f).sp, lineHeight = (cell.value * .28f).sp)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        Canvas(Modifier.fillMaxSize()) {
            for (line in 1..8) {
                val thick = line % 3 == 0
                val color = palette.primary.copy(alpha = if (thick) .8f else .2f)
                val width = (if (thick) 1.8.dp else .5.dp).toPx()
                val position = size.width * line / 9
                drawLine(color, Offset(position, 0f), Offset(position, size.height), width)
                drawLine(color, Offset(0f, position), Offset(size.width, position), width)
            }
        }
    }
}

@Composable
private fun SudokuAction(
    label: String, enabled: Boolean, modifier: Modifier = Modifier,
    filled: Boolean = false, muted: Boolean = false, onClick: () -> Unit
) {
    val palette = NaturePalette
    Text(label, color = (if (filled) Color.White else palette.primary).copy(alpha = if (enabled && !muted) 1f else .4f),
        fontSize = 14.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center,
        modifier = modifier.clip(RoundedCornerShape(14.dp))
            .background(if (filled) palette.secondary else Color.White.copy(alpha = .8f))
            .border(1.dp, palette.primary.copy(alpha = .2f), RoundedCornerShape(14.dp))
            .clickSfx(enabled = enabled, role = Role.Button, onClickLabel = label, onClick = onClick)
            .padding(horizontal = if (label.length == 1) 0.dp else 10.dp, vertical = 14.dp))
}

@Composable
private fun SudokuStat(label: String, value: String, modifier: Modifier) {
    Column(modifier.clip(RoundedCornerShape(18.dp)).background(Color.White.copy(alpha = .8f)).padding(14.dp)) {
        Text(label, color = NaturePalette.mutedText, fontSize = 11.sp)
        Text(value, color = NaturePalette.primary, fontSize = 25.sp, fontWeight = FontWeight.Bold)
    }
}

private fun sudokuClock(seconds: Int) = "%02d:%02d".format(seconds / 60, seconds % 60)
