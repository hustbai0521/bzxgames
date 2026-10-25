package com.example.bzxandroidgames.ui

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.togetherWith
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bzxandroidgames.sound.ButtonSound
import com.example.bzxandroidgames.sound.LocalSoundController
import com.example.bzxandroidgames.sound.SoundController
import com.example.bzxandroidgames.sound.clickSfx
import com.example.bzxandroidgames.ui.theme.ShinkaiCountrysideBackdrop

private object AboutInfo {
    const val APP_NAME = "小游戏合集"
    const val VERSION = "V1.0.0"
    const val AUTHOR = "BZX"
    const val EMAIL = "3346937394@qq.com"
    const val GITHUB_URL = "https://github.com/hustbai0521/bzxgames"
    const val GITHUB_LABEL = "github.com/hustbai0521/bzxgames"
}

// Sidebar order contract (user-requested, DO NOT reshuffle): FEATURE entries come first,
// 关于 and 致谢 are the "about this app" block and ALWAYS stay pinned at the bottom.
// Add any new settings section above SECTION_ABOUT and renumber accordingly.
private const val SECTION_SOUND = 0
private const val SECTION_ABOUT = 1
private const val SECTION_THANKS = 2

/** Settings page sharing the summer lobby's backdrop and visual language. */
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    onSkyVisibleChange: (Boolean) -> Unit = {}
) {
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val sound = LocalSoundController.current
    val scroll = rememberScrollState()
    var entered by remember { mutableStateOf(false) }
    var section by rememberSaveable { mutableStateOf(SECTION_SOUND) }
    val reveal = animateFloatAsState(if (entered) 1f else 0f, tween(900), label = "settings-arrival")
    LaunchedEffect(Unit) { entered = true }

    fun openOrCopy(uri: Uri, copiedHint: String) {
        try {
            context.startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (_: android.content.ActivityNotFoundException) {
            clipboard.setText(AnnotatedString(uri.toString().removePrefix("mailto:")))
            Toast.makeText(context, "未找到可打开的应用，$copiedHint", Toast.LENGTH_SHORT).show()
        }
    }

    BoxWithConstraints(Modifier.fillMaxSize().background(Color(0xFFF2F8F5))) {
        val heroHeight = (maxHeight * .3f).coerceIn(210.dp, 300.dp)
        val skyThreshold = with(LocalDensity.current) { maxHeight.toPx() * .3f }
        val skyVisible by remember(skyThreshold) { derivedStateOf { scroll.value < skyThreshold } }
        LaunchedEffect(skyVisible, onSkyVisibleChange) { onSkyVisibleChange(skyVisible) }
        ShinkaiCountrysideBackdrop(scrollOffset = { scroll.value })
        Column(
            Modifier.align(Alignment.TopCenter).widthIn(max = 600.dp).fillMaxSize()
                .systemBarsPadding().verticalScroll(scroll).padding(horizontal = 24.dp)
        ) {
            Column(Modifier.fillMaxWidth().heightIn(min = heroHeight).padding(top = 14.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                        BreezeMark(Modifier.size(22.dp), Color.White)
                        Spacer(Modifier.width(9.dp))
                        Text("BZX / 设置", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Medium, letterSpacing = 1.sp)
                    }
                    Text(
                        "V1.0.0",
                        color = Color.White, fontSize = 10.sp,
                        modifier = Modifier.clip(RoundedCornerShape(50)).background(Color.White.copy(alpha = .16f))
                            .border(.7.dp, Color.White.copy(alpha = .42f), RoundedCornerShape(50))
                            .padding(horizontal = 11.dp, vertical = 7.dp)
                    )
                }
                Column(Modifier.padding(top = 30.dp).graphicsLayer {
                    alpha = reveal.value
                    translationY = (1f - reveal.value) * 14.dp.toPx()
                }) {
                    Text("SETTINGS", color = Color.White.copy(alpha = .78f), fontSize = 9.sp, letterSpacing = 2.sp)
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "关于，与感谢。",
                        style = TextStyle(color = Color.White, fontSize = 32.sp, lineHeight = 44.sp,
                            fontWeight = FontWeight.Light, letterSpacing = 2.sp,
                            shadow = androidx.compose.ui.graphics.Shadow(Color(0xFF1C5272).copy(alpha = .22f), Offset(0f, 2f), 12f))
                    )
                    Spacer(Modifier.height(15.dp))
                    Text("认识一下这款小小世界", color = Color.White.copy(alpha = .88f), fontSize = 12.sp, letterSpacing = 3.sp)
                }
                Spacer(Modifier.height(34.dp))
            }

            Column(Modifier.graphicsLayer {
                alpha = reveal.value
                translationY = (1f - reveal.value) * 24.dp.toPx()
            }) {
                Row(
                    Modifier.fillMaxWidth().padding(bottom = 14.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    SettingsSidebar(Modifier.width(124.dp), section) { section = it }
                    Box(Modifier.weight(1f)) {
                        AnimatedContent(
                            targetState = section,
                            transitionSpec = {
                                (fadeIn(tween(260)) + scaleIn(tween(260), initialScale = .97f)) togetherWith
                                    (fadeOut(tween(160)))
                            },
                            label = "settings-section"
                        ) { current ->
                            if (current == SECTION_ABOUT) {
                                AboutCard(
                                    onEmail = { openOrCopy(Uri.parse("mailto:${AboutInfo.EMAIL}"), "已复制邮箱地址") },
                                    onGithub = { openOrCopy(Uri.parse(AboutInfo.GITHUB_URL), "已复制仓库链接") }
                                )
                            } else if (current == SECTION_THANKS) {
                                ThanksCard()
                            } else {
                                SoundCard(sound)
                            }
                        }
                    }
                }
                Text(
                    "BZX 的小游戏世界  ·  愿每一天，都有小小的好天气。",
                    color = SoftInk, fontSize = 10.sp, letterSpacing = 1.sp, textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(top = 24.dp, bottom = 24.dp)
                )
            }
        }
    }
}

/**
 * Left sidebar with entries listed like a classic settings page; translucent like the cards.
 * ORDER CONTRACT (user-requested): feature entries on top, 关于/致谢 pinned LAST —
 * keep new entries above the 关于 row; never move 关于/致谢 up.
 */
@Composable
private fun SettingsSidebar(modifier: Modifier = Modifier, selected: Int, onSelect: (Int) -> Unit) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SidebarEntry("音效", selected == SECTION_SOUND, ::SoundMark, Modifier.fillMaxWidth()) { onSelect(SECTION_SOUND) }
        SidebarEntry("关于", selected == SECTION_ABOUT, ::InfoMark, Modifier.fillMaxWidth()) { onSelect(SECTION_ABOUT) }
        SidebarEntry("致谢", selected == SECTION_THANKS, ::HeartMark, Modifier.fillMaxWidth()) { onSelect(SECTION_THANKS) }
    }
}

@Composable
private fun SidebarEntry(
    title: String,
    selected: Boolean,
    icon: @Composable (Modifier, Color) -> Unit,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Row(
        modifier
            .clip(RoundedCornerShape(16.dp))
            .background(if (selected) Color.White.copy(alpha = .82f) else Color.White.copy(alpha = .4f))
            .border(1.dp, if (selected) Color.White.copy(alpha = .95f) else Color.White.copy(alpha = .6f), RoundedCornerShape(16.dp))
            .clickSfx(role = Role.Button, onClickLabel = title, onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        icon(
            Modifier.size(18.dp),
            if (selected) SeaGlass else SoftInk.copy(alpha = .7f)
        )
        Text(
            title,
            color = if (selected) DeepInk else DeepInk.copy(alpha = .72f),
            fontSize = 13.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium
        )
    }
}

@Composable
private fun InfoMark(modifier: Modifier, tint: Color) {
    Canvas(modifier) {
        val stroke = 1.5.dp.toPx()
        drawCircle(tint, size.minDimension * .42f, center, style = Stroke(stroke))
        drawCircle(tint, .8.dp.toPx(), Offset(center.x, center.y - size.height * .18f))
        drawLine(tint, Offset(center.x, center.y + size.height * .02f), Offset(center.x, center.y + size.height * .22f), 1.5.dp.toPx(), StrokeCap.Round)
    }
}

@Composable
private fun HeartMark(modifier: Modifier, tint: Color) {
    Canvas(modifier) {
        val w = size.width
        val h = size.height
        val heart = Path().apply {
            moveTo(w * .5f, h * .88f)
            cubicTo(w * .05f, h * .58f, w * .1f, h * .12f, w * .5f, h * .34f)
            cubicTo(w * .9f, h * .12f, w * .95f, h * .58f, w * .5f, h * .88f)
            close()
        }
        drawPath(heart, tint)
    }
}

/** Semi-transparent so the summer backdrop keeps showing through. */
@Composable
private fun AboutCard(onEmail: () -> Unit, onGithub: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp))
            .shadow(12.dp, RoundedCornerShape(24.dp), clip = false, ambientColor = SeaGlass.copy(alpha = .13f), spotColor = SeaGlass.copy(alpha = .15f))
            .background(Brush.verticalGradient(listOf(Color.White.copy(alpha = .8f), Color(0xFFF9FCF8).copy(alpha = .72f))))
            .border(1.dp, Color.White.copy(alpha = .75f), RoundedCornerShape(24.dp))
            .padding(horizontal = 18.dp, vertical = 8.dp)
    ) {
        InfoRow("应用名称", AboutInfo.APP_NAME)
        Divider()
        InfoRow("版本", AboutInfo.VERSION)
        Divider()
        InfoRow("作者", AboutInfo.AUTHOR)
        Divider()
        InfoRow(
            "作者邮箱", AboutInfo.EMAIL,
            trailing = "✉",
            onClickLabel = "发送邮件或复制邮箱",
            onClick = onEmail
        )
        Divider()
        InfoRow(
            "GitHub", AboutInfo.GITHUB_LABEL,
            trailing = "↗",
            onClickLabel = "打开 GitHub 仓库或复制链接",
            onClick = onGithub
        )
    }
}

@Composable
private fun ThanksCard() {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp))
            .shadow(12.dp, RoundedCornerShape(24.dp), clip = false, ambientColor = WarmRose.copy(alpha = .13f), spotColor = WarmRose.copy(alpha = .15f))
            .background(Brush.verticalGradient(listOf(Color.White.copy(alpha = .8f), Color(0xFFF9FCF8).copy(alpha = .72f))))
            .border(1.dp, Color.White.copy(alpha = .75f), RoundedCornerShape(24.dp))
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("致谢", color = DeepInk, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
        Text(
            "这款小游戏世界，从一行行代码到一笔笔矢量画，都离不开几位 AI 伙伴的耐心相伴。",
            color = DeepInk.copy(alpha = .92f), fontSize = 13.sp, lineHeight = 22.sp
        )
        Text(
            buildAnnotatedString {
                append("感谢 ")
                withStyle(SpanStyle(color = SeaGlass, fontWeight = FontWeight.SemiBold)) { append("GLM5.3") }
                append(" 的严谨与稳健，为项目奠定了可靠的骨架；感谢 ")
                withStyle(SpanStyle(color = SeaGlass, fontWeight = FontWeight.SemiBold)) { append("GPT 6.1 Sol") }
                append(" 的清晰思路，在复杂逻辑前拨云见日；感谢 ")
                withStyle(SpanStyle(color = SeaGlass, fontWeight = FontWeight.SemiBold)) { append("GPT 5.6 Sol") }
                append(" 的细腻打磨，让每一处界面都经得起端详；也感谢 ")
                withStyle(SpanStyle(color = SeaGlass, fontWeight = FontWeight.SemiBold)) { append("GPT 6 Astra") }
                append(" 的灵动想象，为这个小小世界添上许多意想不到的色彩。")
            },
            color = DeepInk.copy(alpha = .92f), fontSize = 13.sp, lineHeight = 22.sp
        )
        Text(
            "技术与温度并存，是这段旅程最好的注脚。谢谢你们，也谢谢正在使用的你。",
            color = DeepInk.copy(alpha = .92f), fontSize = 13.sp, lineHeight = 22.sp
        )
        Text("—— BZX", color = SoftInk, fontSize = 11.sp, modifier = Modifier.align(Alignment.End))
    }
}

/** Sound preferences: tap sounds (with a style dropdown) and a placeholder music switch. */
@Composable
private fun SoundCard(sound: SoundController?) {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp))
            .shadow(12.dp, RoundedCornerShape(24.dp), clip = false, ambientColor = SeaGlass.copy(alpha = .13f), spotColor = SeaGlass.copy(alpha = .15f))
            .background(Brush.verticalGradient(listOf(Color.White.copy(alpha = .8f), Color(0xFFF9FCF8).copy(alpha = .72f))))
            .border(1.dp, Color.White.copy(alpha = .75f), RoundedCornerShape(24.dp))
            .padding(horizontal = 20.dp, vertical = 18.dp)
    ) {
        Text("音效", color = DeepInk, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
        Text(
            "让每一次轻点，都有小小的回应。",
            color = DeepInk.copy(alpha = .92f), fontSize = 13.sp, lineHeight = 22.sp
        )
        Spacer(Modifier.height(6.dp))
        SettingSwitchRow(
            title = "按键音效",
            caption = "按下按钮时，响起轻巧的一声",
            checked = sound?.buttonSoundEnabled == true,
            onCheckedChange = { sound?.enableButtonSound(it) }
        )
        AnimatedVisibility(
            visible = sound?.buttonSoundEnabled == true,
            enter = expandVertically() + fadeIn(),
            exit = shrinkVertically() + fadeOut()
        ) {
            sound?.let { SoundTypePicker(it) }
        }
        Divider()
        SettingSwitchRow(
            title = "背景音乐",
            caption = "静静的伴奏，正在筹备中",
            checked = sound?.bgMusicEnabled == true,
            onCheckedChange = { sound?.enableBgMusic(it) }
        )
    }
}

@Composable
private fun SettingSwitchRow(
    title: String,
    caption: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        Modifier.fillMaxWidth()
            .clickSfx(role = Role.Switch, onClickLabel = title) { onCheckedChange(!checked) }
            .padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, color = DeepInk, fontSize = 14.sp, fontWeight = FontWeight.Medium)
            Spacer(Modifier.height(2.dp))
            Text(caption, color = SoftInk, fontSize = 11.sp)
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedTrackColor = SeaGlass,
                checkedThumbColor = Color.White,
                checkedIconColor = SeaGlass,
                uncheckedTrackColor = SoftInk.copy(alpha = .16f),
                uncheckedThumbColor = Color.White,
                uncheckedIconColor = SoftInk.copy(alpha = .35f),
                uncheckedBorderColor = SoftInk.copy(alpha = .3f)
            )
        )
    }
}

/** The tap-sound style dropdown; picking a type plays it once so it can be heard. */
@Composable
private fun SoundTypePicker(sound: SoundController) {
    var menuOpen by remember { mutableStateOf(false) }
    Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Text("音效种类", color = SoftInk, fontSize = 12.sp, modifier = Modifier.widthIn(min = 76.dp))
        Box {
            Row(
                Modifier.clip(RoundedCornerShape(12.dp))
                    .background(SeaGlass.copy(alpha = .1f))
                    .border(1.dp, SeaGlass.copy(alpha = .4f), RoundedCornerShape(12.dp))
                    .clickSfx(onClickLabel = "选择音效种类") { menuOpen = true }
                    .padding(horizontal = 13.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(sound.buttonSoundType.label, color = DeepInk, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                Spacer(Modifier.width(7.dp))
                Text("▾", color = SeaGlass, fontSize = 11.sp)
            }
            DropdownMenu(
                expanded = menuOpen,
                onDismissRequest = { menuOpen = false },
                containerColor = Color.White
            ) {
                ButtonSound.entries.forEach { type ->
                    DropdownMenuItem(
                        text = {
                            Text(
                                type.label,
                                color = if (type == sound.buttonSoundType) SeaGlass else DeepInk,
                                fontWeight = if (type == sound.buttonSoundType) FontWeight.SemiBold else FontWeight.Medium
                            )
                        },
                        trailingIcon = {
                            if (type == sound.buttonSoundType) Text("✓", color = SeaGlass, fontSize = 13.sp)
                        },
                        onClick = {
                            sound.selectButtonSound(type)
                            sound.play(type)
                            menuOpen = false
                        }
                    )
                }
            }
        }
    }
}

/** A single eighth note, matching the hairline style of the other sidebar marks. */
@Composable
private fun SoundMark(modifier: Modifier, tint: Color) {
    Canvas(modifier) {
        val w = size.width
        val h = size.height
        drawOval(tint, topLeft = Offset(w * .16f, h * .68f), size = Size(w * .32f, h * .21f))
        drawLine(tint, Offset(w * .46f, h * .76f), Offset(w * .46f, h * .17f), 1.5.dp.toPx(), StrokeCap.Round)
        drawPath(
            Path().apply {
                moveTo(w * .46f, h * .17f)
                quadraticTo(w * .82f, h * .26f, w * .68f, h * .5f)
            },
            tint, style = Stroke(1.5.dp.toPx(), cap = StrokeCap.Round)
        )
    }
}

@Composable
private fun InfoRow(
    label: String,
    value: String,
    trailing: String? = null,
    onClickLabel: String? = null,
    onClick: (() -> Unit)? = null
) {
    val base = Modifier.fillMaxWidth()
    val row = if (onClick != null) {
        base.clip(RoundedCornerShape(12.dp))
            .clickSfx(onClickLabel = onClickLabel) { onClick() }
            .padding(horizontal = 4.dp, vertical = 11.dp)
    } else base.padding(horizontal = 4.dp, vertical = 11.dp)
    Row(row, verticalAlignment = Alignment.CenterVertically) {
        Text(label, color = SoftInk, fontSize = 12.sp, modifier = Modifier.widthIn(min = 76.dp))
        Text(
            value,
            color = DeepInk, fontSize = 13.sp, fontWeight = FontWeight.Medium,
            modifier = Modifier.weight(1f)
        )
        if (trailing != null) Text("  $trailing", color = SeaGlass, fontSize = 13.sp)
    }
}

@Composable
private fun Divider() {
    Box(
        Modifier.fillMaxWidth().height(1.dp)
            .background(SoftInk.copy(alpha = .12f), RoundedCornerShape(1.dp))
    )
}

@Composable
private fun BreezeMark(modifier: Modifier, color: Color) {
    Canvas(modifier) {
        repeat(3) { i ->
            val y = size.height * (.25f + i * .25f)
            val path = Path().apply {
                moveTo(0f, y)
                lineTo(size.width * (.6f - i * .12f), y)
                quadraticTo(size.width * (.95f - i * .1f), y, size.width * (.8f - i * .12f), y - size.height * .15f)
            }
            drawPath(path, color.copy(alpha = 1f - i * .18f), style = Stroke(1.4.dp.toPx(), cap = StrokeCap.Round))
        }
    }
}
