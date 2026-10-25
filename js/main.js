/* ============================================================
   main.js — 启动动画（AnimeLaunchScreen）与入口
   4.2s 时间线：世界图景推拉 → 光尘 → 划光 → 标题浮现 → 进度条，
   可点击「跳过 ›」直接进入大厅。
   ============================================================ */
(function () {
  "use strict";
  const BZX = window.BZX;
  const el = BZX.el;

  BZX.splash = function (onFinished) {
    const app = document.getElementById("app");
    const root = el("div", "screen entering splash");
    app.appendChild(root);

    const palette = BZX.getTheme();
    const accent = palette.accent; // 9EEFFF / D5F6A3
    const tint = palette.launchTint; // 553BAE / 89C55B

    const img = el("img", "splash-img");
    img.src = "assets/intro_world.jpg";
    img.alt = "";
    img.draggable = false;
    root.appendChild(img);

    const cv = el("canvas", "splash-canvas");
    root.appendChild(cv);
    const fit = BZX.fitCanvas(cv);

    const text = el("div", "splash-text");
    text.style.opacity = "0";
    const kicker = el("div", "splash-kicker", palette.isNature ? "风起之处 · 万物生长" : "星光相遇 · 世界新生");
    kicker.style.color = accent;
    text.appendChild(kicker);
    text.appendChild(el("div", "splash-title", "欢迎来到\nbzx的小游戏世界！")).style.whiteSpace = "pre-line";
    text.appendChild(el("div", "splash-sub", palette.isNature ? "在绿意中，遇见下一种可能" : "每一次相遇，都让光芒更近"));
    const bar = el("div", "splash-bar");
    const barFill = el("i");
    barFill.style.background = accent;
    bar.appendChild(barFill);
    text.appendChild(bar);
    text.appendChild(el("div", "splash-foot", "轻滑指尖 · 即刻启程"));
    root.appendChild(text);

    const skip = el("button", "splash-skip", "跳过 ›");
    root.appendChild(skip);

    // 主题消息连播：tint 覆盖 + 底部渐暗 + 光尘 + 划光
    const DURATION = 4200;
    const start = performance.now();
    let done = false;
    let stopped = false;
    let stopLoop = null;

    stopLoop = BZX.animLoop(
      () => {
        if (stopped) return;
        const t = Math.min(1, (performance.now() - start) / DURATION);
        // image: 1.16 → 1.04，纵向轻移，前 13% 淡入
        const scale = 1.16 - t * 0.12;
        img.style.transform = "scale(" + scale + ") translateY(" + (t - 0.5) * 24 + "px)";
        img.style.opacity = String(Math.min(1, t / 0.13));

        fit.resize();
        const { ctx, state } = fit;
        const { w, h } = state;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = hexA(tint, 0.09);
        ctx.fillRect(0, 0, w, h);
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, "rgba(0,0,0,.25)");
        g.addColorStop(0.5, "rgba(0,0,0,0)");
        g.addColorStop(1, "rgba(6,19,33,.93)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        // 前景光尘
        for (let i = 0; i < 36; i++) {
          const x = (((i * 73) % 101) / 100 + Math.sin(t * 5 + i) * 0.025) * w;
          const y = ((((i * 47) % 103) / 103 - t * (0.12 + (i % 4) * 0.04) + 1) % 1 + 1) % 1 * h;
          const opacity = (Math.sin(t * 8 + i) * 0.25 + 0.45) * Math.min(1, t * 5);
          ctx.fillStyle = hexA(accent, Math.max(0, opacity));
          ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3), 0, Math.PI * 2); ctx.fill();
        }
        // 划光（18% → 56%）
        const streak = clamp01((t - 0.18) / 0.38);
        if (streak > 0 && streak < 1) {
          const headX = w * (1.2 - streak * 1.5);
          const headY = h * (0.12 + streak * 0.35);
          const tailX = headX + w * 0.14, tailY = headY - h * 0.055;
          const lg = ctx.createLinearGradient(tailX, tailY, headX, headY);
          lg.addColorStop(0, "rgba(0,0,0,0)");
          lg.addColorStop(1, accent);
          ctx.strokeStyle = lg;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(headX, headY); ctx.stroke();
        }
        // 标题浮现（36% → 58%）
        const reveal = clamp01((t - 0.36) / 0.22);
        text.style.opacity = String(reveal);
        text.style.transform = "translateY(" + (1 - reveal) * 28 + "px)";
        barFill.style.width = t * 100 + "%";

        if (t >= 1) {
          finish();
        }
      },
      () => root.isConnected
    );

    function finish() {
      if (done) return;
      done = true;
      stopped = true;
      if (stopLoop) stopLoop();
      root.style.transition = "opacity 380ms ease, transform 380ms ease";
      root.style.opacity = "0";
      root.style.transform = "scale(1.06)";
      setTimeout(() => {
        root.remove();
        onFinished();
      }, 390);
    }

    skip.addEventListener("click", finish);

    return () => {
      stopped = true;
      if (stopLoop) stopLoop();
    };
  };

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function hexA(hex, a) {
    if (!hex || hex[0] !== "#") return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

  // 首次访问播放启动动画；之后直接进大厅（hash 可直达）。
  window.addEventListener("DOMContentLoaded", () => {
    const played = sessionStorage.getItem("bzx_splash_played");
    if (!played && !location.hash) {
      sessionStorage.setItem("bzx_splash_played", "1");
      BZX.splash(() => BZX.start());
    } else {
      BZX.start();
    }
  });
})();
