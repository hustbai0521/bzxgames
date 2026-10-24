# 夏日晴空大厅素材

- 日期：2026-10-24
- 生成方式：内置 `image_gen`（imagegen 技能），非 CLI/API 回退。
- 项目素材：`app/src/main/res/drawable-nodpi/lobby_summer.png`，1024 × 1536，离线加载。
- 使用页面：`GameLibrary.kt`；背景动画：`ShinkaiBackdrop.kt`。
- 动态层：18 秒单程缓慢运镜、90 秒高空云雾、32 秒花瓣与飞鸟周期、滚动视差、900 毫秒入场。
- 动画状态仅在绘制和图层阶段读取，不因每帧更新重组整个大厅。
- 大厅截图：`output/design/lobby-preview.png`；实际运行录屏（8 秒）：`output/design/lobby-demo.mp4`。

## 最终生成提示词

```text
Use case: stylized-concept.
Asset type: production background illustration for a portrait Android casual game collection lobby, 1024x1536 portrait, full bleed.
Primary request: a healing, breathtakingly beautiful Makoto Shinkai Japanese anime film background, an idyllic Japanese seaside hill town on a brilliant summer afternoon. Exquisitely hand-painted cinematic anime environment art with luminous towering cumulus clouds, rich atmospheric perspective, delicate detailed architecture, translucent sunlight, wistful but optimistic quiet everyday beauty.
Scene: looking downhill from a grassy flower-lined path towards a small coastal town, a tiny distant railway crossing and glistening turquoise sea; lush green hills, white hydrangeas, a few pink cosmos blossoms near the edges, a subtle distant island. Beautiful crisp blue sky with enormous sunlit white clouds, very subtle pink lavender cloud shadows, golden summer light. No people.
Composition: portrait 2:3. Upper 45 percent is spacious beautiful blue sky, with cloud masses mainly along right edge and far horizon so the upper left has clean mid-blue negative space for white interface typography added later. Town and horizon around middle of image. Bottom half is layered lush garden greens with the pale winding path, scenic but not visually noisy. Floral foreground framing at bottom corners. Carefully composed deep perspective and a feeling of summer breeze.
Lighting/mood: sparkling daylight, gentle warm rim light, peaceful, dreamy, airy, sophisticated, emotionally uplifting.
Constraints: environment art only, no interface, no cards, no lettering, no numbers, no logos, no watermarks, no border. No character or mascot. No large foreground objects that block the view. This is a finished beautiful anime film still, not a flat vector cartoon, not a game screenshot, not a collage.
```

