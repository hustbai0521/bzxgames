# bzxandroidgames

使用 Kotlin 与 Jetpack Compose 编写的 Android 小游戏合集，应用显示名为「小游戏合集」。目前提供 2048、五子棋、扫雷、蜘蛛纸牌、俄罗斯方块、贪吃蛇、连连看与数独八款可玩的游戏。

## 环境

- Android Studio Ladybug 或更新版本
- JDK 17（建议使用 Android Studio 内置 JDK）
- Android SDK 36
- `minSdk 26`、`targetSdk 36`

支持 Android 8.0（API 26）及以上设备、全面屏、两套可切换主题与高密度屏幕。

## 运行

1. 用 Android Studio 打开本目录。
2. 等待 Gradle 同步（已按本机现有 `E:\androidsdk\sdk` 配置 Android SDK 36）。
3. 连接手机并开启 USB 调试，选择设备后运行 `app`。

也可以直接安装工程根目录中已构建的 `bzxandroidgames-debug.apk`（`小游戏合集-debug.apk` 为同一安装包的中文文件名副本）。

运行 `gradlew :app:exportDebugApk` 可重新构建并更新这两个文件，英文文件名自动使用当前 Gradle 项目名。`assembleDebug` 的内部产物仍位于 `app/build/outputs/apk/debug/app-debug.apk`。

## 主题切换

在游戏界面得分卡片下方的主题选择区，可随时切换「炫彩科技」与「清新自然」主题。默认使用原有的炫彩科技主题；清新自然主题采用浅绿配色、山丘、枝叶与缓慢飘叶背景，棋盘、按钮、弹窗、启动动画和系统栏同步适配。切换主题不会重置当前棋盘、分数或撤销记录，所选主题会自动保存，下次启动继续使用。

## 项目路径迁移

当前项目位于 `E:\bzxandroidgames`，Gradle 项目名为 `bzxandroidgames`。项目引用使用相对路径或 `$PROJECT_DIR$`，可以整体移动后重新用 Android Studio 打开。移动目录后建议运行 `gradlew clean` 再重新构建，以重新生成包含旧绝对路径的构建缓存。

源码与测试包名、Android namespace 统一为 `com.example.bzxandroidgames`，应用主题为 `BzxAndroidGamesTheme` / `Theme.BzxAndroidGames`。`applicationId` 有意保留为 `com.example.k602048`，用于让新版覆盖安装旧版并保留最高分、主题等本地数据；它是兼容标识，不随项目改名变更。

`local.properties` 的 `sdk.dir` 和 `gradle.properties` 的可选 `org.gradle.java.home` 指向本机安装的 Android SDK 与 JDK，不需要随项目目录移动而更改。只有 SDK/JDK 安装位置发生变化或换用其他电脑时，才需要更新相应配置；也可以移除 `org.gradle.java.home`，交由 Android Studio 的 Gradle JDK 设置或 `JAVA_HOME` 管理 JDK。

## 2048 功能

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

2026-10-24 改名验证：执行 `clean testDebugUnitTest assembleDebug lintDebug`，4 项核心规则单元测试通过，Lint 为 0 错误、3 条警告与 1 条提示；另已验证 `:app:exportDebugApk` 成功生成两个同内容安装包。APK 的启动类为 `com.example.bzxandroidgames.MainActivity`，安装标识和签名与旧版一致。此次未重新进行模拟器交互验证。

## 二次元启动演出

启动页使用本地二次元插画、缓慢镜头运动、前景光粒、流星光轨与分阶段标题登场。时长约 4.2 秒，右上角可跳过；科技/自然主题分别使用对应氛围色与文案。无需联网播放。此为原生动画驱动的插画演出，非逐帧角色视频。

插画：`app/src/main/res/drawable-nodpi/intro_world.png`，使用内置 image_gen 生成。

生成提示词：

> Use case: stylized-concept. Create a premium Japanese anime film background for a portrait Android 2048 puzzle game's opening cinematic. Portrait 1024x1536. Dreamlike landscape where a lush green meadow with delicate windblown leaves and sparkling turquoise river meets distant futuristic crystalline towers under a sweeping starry indigo sky with teal aurora and magenta luminous clouds. A tiny original anime traveler in a flowing light cape seen from behind at lower right, looking towards floating luminous translucent square crystals in the sky; no recognizable franchise. Painterly detailed anime background, beautiful cinematic cel shading, atmospheric depth, luminous edges, exquisite soft light, optimistic magical adventure. Main scenic focal point in upper middle, lower quarter quieter and darker for later title overlay. Full bleed single illustration, no collage, NO text, numbers, logos, borders or watermark. Designed for slow camera push-in and animated particles overlaid in code.

## 小游戏合集大厅

应用名称为「小游戏合集」。启动页欢迎词为「欢迎来到bzx的小游戏世界！」，播放结束或跳过后进入游戏大厅。八款游戏均可直接进入；2048、五子棋为主推卡，其余六款在「下一站，小惊喜」区域。游戏内的返回按钮及系统返回键均回到大厅，同一次运行中往返保留已有游戏状态；数独与网页端一致，每次从大厅进入时回到等待开始的新局。安装包：`bzxandroidgames-debug.apk`，同时提供中文文件名副本 `小游戏合集-debug.apk`。

大厅已直接替换为治愈日漫夏日风格：蓝天积云、海边小镇、绣球花与铁路的本地插画，搭配柔色半透明卡片。动态包括缓慢运镜、高空流云、振翅飞鸟、旋转飘落的花瓣、滚动视差和淡入登场。大厅使用独立固定配色，2048 内仍可切换原有主题。插画由内置 `image_gen` 生成，素材与完整提示词见 [大厅素材记录](docs/lobby-art.md)。

2026-10-24 大厅改版验证：`testDebugUnitTest lintDebug exportDebugApk` 成功，17 项单元测试通过，Lint 0 错误、9 条现有警告、1 条提示。Android 16 / API 36 模拟器已检查首屏、320dp 窄屏、滚动到底、两个可玩游戏入口与返回、筹备入口弹窗；中途软件图形后端的模拟器进程退出，改用主机图形后端后完成滚动检查。两个根目录 APK 内容一致。

## 应用图标与设置按钮

应用图标已更换为内置 `image_gen` 生成的「晴空手柄」插画，提供自适应图标和单色主题图层。素材、资源接入方式和完整生成提示词见 [应用图标记录](docs/app-icon-art.md)。

大厅右上角设置按钮采用独立的 48dp 点击布局、28dp 可见圆圈和 20dp 齿轮，避免可见外圈超出布局而与天气胶囊交叉。窄屏标题使用更紧凑的字号与字距。

## 2026-10-26 网页端功能同步

以 `E:\bzxwebgames` 当前源码为参照，补入数独并同步蜘蛛纸牌交互，详见 [功能对齐记录](docs/web-parity.md)。

- 数独：简单 / 中等 / 困难，点击开始后异步生成唯一解题目并计时，固定清新自然风格。支持候选笔记、同行 / 同列 / 同宫与相同数字高亮、重复冲突提示、擦除和最多 200 步撤销。题目数字不可修改；重复点同一数字会擦除。退到后台停止计时；完成后按难度保存最佳用时。支持外接键盘方向键、1–9、退格与 N。
- 蜘蛛纸牌：保留单 / 双 / 四花色、点选与同花顺拖拽、合法目标高亮、自动收牌和胜利动画；新增从牌堆向十列依次飞出的发牌动画，动画期间锁定发牌与修改牌面的按钮。修复暗牌显示、拖拽后缺少撤销记录、同列选择非法顺子和连续撤销回退步数的问题；撤销恢复牌面但累计增加一步。
- 难度、笔记开关、数独分难度最佳用时继续使用 `game` SharedPreferences，键名与网页端一致。

验证命令：`gradlew testDebugUnitTest lintDebug exportDebugApk --offline`。84 项单元测试通过，Lint 为 0 错误、6 条现有警告、4 条提示；输出两个内容一致的根目录 APK。历史验证记录保留在上文，反映当时版本。
