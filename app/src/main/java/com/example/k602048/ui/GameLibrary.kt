package com.example.k602048.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.k602048.ui.theme.*

@Composable
fun GameLibrary(theme: GameTheme, onTheme: (GameTheme) -> Unit, on2048: () -> Unit) {
    val p = LocalGamePalette.current
    var upcoming by rememberSaveable { mutableStateOf<String?>(null) }
    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(p.background))) {
        Column(
            Modifier.align(Alignment.TopCenter).widthIn(max = 600.dp).fillMaxSize()
                .systemBarsPadding().verticalScroll(rememberScrollState()).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("BZX  /  PLAY WORLD", color = p.primary, fontSize = 11.sp, letterSpacing = 3.sp)
                Text("小游戏合集", color = p.text, fontSize = 32.sp, fontWeight = FontWeight.Bold)
                Text("把片刻闲暇，交给一点快乐。", color = p.mutedText, fontSize = 14.sp)
            }
            ThemePicker(theme, onTheme)
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(28.dp))
                    .background(Brush.linearGradient(listOf(p.primary.copy(alpha = .22f), p.secondary.copy(alpha = .12f))))
                    .border(1.dp, p.primary.copy(alpha = .35f), RoundedCornerShape(28.dp))
                    .clickable(onClickLabel = "进入2048", onClick = on2048).padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text("精选游戏   ·   即刻开玩", color = p.primary, fontSize = 12.sp)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("2048", color = p.text, fontSize = 52.sp, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                    Text("↗", color = p.primary, fontSize = 36.sp)
                }
                Text("滑动、合并，在数字之间寻找下一种可能。", color = p.mutedText, fontSize = 14.sp)
                Text("开始游戏  →", color = p.primary, fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("探索更多", color = p.text, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Text("6 款游戏筹备中", color = p.mutedText, fontSize = 12.sp)
            }
            val games = listOf(
                Triple("贪吃蛇", "一路生长", "S"), Triple("俄罗斯方块", "拼出无限可能", "▦"),
                Triple("五子棋", "落子之间见智慧", "●"), Triple("连连看", "发现成双的乐趣", "◇"),
                Triple("蜘蛛纸牌", "静享一局好牌", "♠"), Triple("扫雷", "每一步都是推理", "⚑")
            )
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                games.chunked(2).forEach { pair ->
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        pair.forEach { (name, subtitle, symbol) ->
                            Column(
                                Modifier.weight(1f).clip(RoundedCornerShape(22.dp))
                                    .background(p.surface.copy(alpha = .85f))
                                    .border(1.dp, p.mutedText.copy(alpha = .16f), RoundedCornerShape(22.dp))
                                    .clickable(onClickLabel = "$name，敬请期待") { upcoming = name }.padding(18.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(symbol, color = p.secondary, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                                Text(name, color = p.text, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                                Text(subtitle, color = p.mutedText, fontSize = 11.sp)
                                Text("敬请期待", color = p.primary, fontSize = 11.sp)
                            }
                        }
                    }
                }
            }
            Text("BZX 的小游戏世界  ·  快乐，简单一点", color = p.mutedText, fontSize = 11.sp, modifier = Modifier.align(Alignment.CenterHorizontally))
        }
    }
    upcoming?.let { name ->
        AlertDialog(onDismissRequest = { upcoming = null },
            title = { Text("敬请期待") },
            text = { Text("$name 正在筹备中，先来一局 2048 吧。") },
            confirmButton = { TextButton(onClick = { upcoming = null }) { Text("知道了") } })
    }
}
