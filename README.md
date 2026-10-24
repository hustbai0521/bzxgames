# K60 2048

一款使用 Kotlin 与 Jetpack Compose 编写的简约 2048 Android 游戏。

## 环境

- Android Studio Ladybug 或更新版本
- JDK 17（建议使用 Android Studio 内置 JDK）
- Android SDK 36
- `minSdk 26`、`targetSdk 36`

红米 K60 出厂 Android 13（API 33），也可运行在后续 HyperOS/Android 版本。项目支持全面屏、两套可切换主题与高密度屏幕。

## 运行

1. 用 Android Studio 打开本目录。
2. 等待 Gradle 同步（已按本机现有 `E:\androidsdk\sdk` 配置 Android SDK 36）。
3. 连接手机并开启 USB 调试，选择设备后运行 `app`。

也可以直接安装工程根目录中已构建的 `K60-2048-debug.apk`。

## 主题切换

在游戏界面得分卡片下方的主题选择区，可随时切换「炫彩科技」与「清新自然」主题。默认使用原有的炫彩科技主题；清新自然主题采用浅绿配色、山丘、枝叶与缓慢飘叶背景，棋盘、按钮、弹窗、启动动画和系统栏同步适配。切换主题不会重置当前棋盘、分数或撤销记录，所选主题会自动保存，下次启动继续使用。

## 项目路径迁移

当前项目位于 `E:\K60-2048`。项目引用使用相对路径或 `$PROJECT_DIR$`，可以整体移动后重新用 Android Studio 打开。移动目录后建议运行 `gradlew clean` 再重新构建，以重新生成包含旧绝对路径的构建缓存。

`local.properties` 的 `sdk.dir` 和 `gradle.properties` 的可选 `org.gradle.java.home` 指向本机安装的 Android SDK 与 JDK，不需要随项目目录移动而更改。只有 SDK/JDK 安装位置发生变化或换用其他电脑时，才需要更新相应配置；也可以移除 `org.gradle.java.home`，交由 Android Studio 的 Gradle JDK 设置或 `JAVA_HOME` 管理 JDK。

## 功能

- 触摸滑动合并数字
- 新方块弹性动画
- 霓虹能量环启动动画与动态过场
- 青蓝、紫色、玫红科技风界面与发光棋盘
- 炫彩科技与清新自然主题自由切换，自动记住选择
- 背景动态漂浮光粒子
- 合成格定点能量环、放射粒子与强化弹跳
- 得分与本地最高分
- 单步撤销、重新开始
- 2048 达成提示与继续挑战
- 游戏结束检测
- 核心规则单元测试

## 构建验证

已在本机使用 Gradle 8.14.5、AGP 8.12.3、Kotlin 2.2.20 与 Android SDK 36 执行：

```text
gradlew testDebugUnitTest assembleDebug lintDebug
BUILD SUCCESSFUL
```

2026-10-23 验证：构建前已执行 `clean` 清理迁移前的构建产物；3 项核心规则单元测试通过，Lint 为 0 错误（保留 10 条现有的依赖版本、屏幕方向与资源建议）。Android 16 / API 36 模拟器已验证主题双向切换、进程重启后恢复主题、切换时保留棋盘与分数，以及纵向滑动和切换后的撤销。

## 二次元启动演出

启动页使用本地二次元插画、缓慢镜头运动、前景光粒、流星光轨与分阶段标题登场。时长约 4.2 秒，右上角可跳过；科技/自然主题分别使用对应氛围色与文案。无需联网播放。此为原生动画驱动的插画演出，非逐帧角色视频。

插画：`app/src/main/res/drawable-nodpi/intro_world.png`，使用内置 image_gen 生成。

生成提示词：

> Use case: stylized-concept. Create a premium Japanese anime film background for a portrait Android 2048 puzzle game's opening cinematic. Portrait 1024x1536. Dreamlike landscape where a lush green meadow with delicate windblown leaves and sparkling turquoise river meets distant futuristic crystalline towers under a sweeping starry indigo sky with teal aurora and magenta luminous clouds. A tiny original anime traveler in a flowing light cape seen from behind at lower right, looking towards floating luminous translucent square crystals in the sky; no recognizable franchise. Painterly detailed anime background, beautiful cinematic cel shading, atmospheric depth, luminous edges, exquisite soft light, optimistic magical adventure. Main scenic focal point in upper middle, lower quarter quieter and darker for later title overlay. Full bleed single illustration, no collage, NO text, numbers, logos, borders or watermark. Designed for slow camera push-in and animated particles overlaid in code.

## 小游戏合集大厅

应用名称为「小游戏合集」。启动页欢迎词为「欢迎来到bzx的小游戏世界！」，播放结束或跳过后进入游戏大厅。大厅提供 2048、贪吃蛇、俄罗斯方块、五子棋、连连看、蜘蛛纸牌、扫雷；目前仅 2048 可玩，其余入口点击显示「敬请期待」。2048 内的返回按钮及系统返回键均回到大厅；同一次运行中往返大厅保留棋盘。大厅支持两套主题。新版安装包：`小游戏合集-debug.apk`，原 `K60-2048-debug.apk` 同步更新以兼容旧入口。
