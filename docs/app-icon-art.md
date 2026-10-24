# 晴空手柄应用图标

- 日期：2026-10-24
- 生成方式：内置 `image_gen`（imagegen 技能）。
- 最终插画：`app/src/main/res/drawable-nodpi/launcher_sky_art.png`。
- 桌面入口：`@mipmap/ic_launcher` / `@mipmap/ic_launcher_round`。
- 通过 11.1111% 前景内缩保留主体裁切余量，提供 Android 13 起的单色主题图层。
- 自适应图标参考：[Android 官方说明](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive)。
- 设置按钮：48dp 触控布局、28dp 装饰圆圈、20dp 齿轮，装饰圈不参与扩大触控布局。
- 验证：`testDebugUnitTest lintDebug exportDebugApk` 成功；27 项测试通过，Lint 0 错误、11 条警告、2 条提示。
- API 36 模拟器已检查设置入口点击、320dp 窄屏与普通屏幕的轮廓间距，以及应用列表中的圆形图标裁切。
- 最终界面预览：`output/design/lobby-settings-updated.png`；窄屏预览：`output/design/lobby-settings-narrow.png`。

## 最终生成提示词

```text
Use case: logo-brand.
Asset type: final production Android launcher app icon for a charming casual minigame collection named BZX, one square 1024x1024 image.
Primary request: create an irresistible premium game app icon that feels joyful, healing and fresh, consistent with a beautiful Japanese anime summer sky and seaside garden aesthetic.
Subject: one beautifully designed chunky ivory game controller as a simple iconic hero, three-quarter front view with subtle perspective, soft luminous ceramic-like shading, dark teal cross-shaped D-pad at left, four clearly separated pastel coral and turquoise action buttons at right, small turquoise center accent. Behind the controller a small golden four-point sparkle and an airy sweeping white cloud ribbon, conveying a magical little world of games. Keep the silhouette simple and instantly recognizable at tiny phone-launcher sizes.
Style: polished Japanese anime-inspired dimensional illustration, crisp clean shapes, luminous gentle sunlight, sophisticated soft volume, warm highlights, no photorealism, no busy scenic detail.
Background: full-bleed rich cobalt blue to turquoise atmospheric sky gradient, bright but saturated, subtle soft clouds near the outer edges, excellent contrast with the ivory controller.
Composition: the complete controller AND all important sparkle details must fit comfortably INSIDE the central 56 percent of the square in both dimensions, centered, with generous blue breathing room on every side. Decorative cloud wisps may extend to the image edges. Designed to survive Android adaptive circle, squircle and rounded-square masks without cropping the controller. Do not add a frame or a pre-rounded app tile: the canvas must remain a completely filled square with blue artwork to all four edges.
Constraints: one icon only, no mockup, no phone, no typography, no letters, no words, no digits, no logo marks, no watermark, no borders, no grid, no collage. Strong memorable silhouette, small-size readability, tasteful and attractive.
```

