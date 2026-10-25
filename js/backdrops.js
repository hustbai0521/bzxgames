/* ============================================================
   backdrops.js — 各屏幕的 Canvas 背景动画
   TechGrid / AmbientParticleField / NatureBackdrop /
   ShinkaiCountrysideBackdrop / InkWashBackdrop / FeltVignette
   ============================================================ */
(function () {
  "use strict";
  const BZX = window.BZX;

  /* ---------------- TechGrid（NEON 主题网格 + 大圆） ---------------- */

  BZX.techGrid = function (canvas, palette, alpha, withCircles) {
    const fit = BZX.fitCanvas(canvas);
    const stop = BZX.animLoop(
      () => {
        fit.resize();
        const { ctx, state } = fit;
        const { w, h } = state;
        ctx.clearRect(0, 0, w, h);
        const step = 44;
        ctx.lineWidth = 1;
        ctx.strokeStyle = hexA(palette.primary, alpha);
        for (let x = 0; x < w; x += step) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        ctx.strokeStyle = hexA(palette.secondary, alpha * 0.75);
        for (let y = 0; y < h; y += step) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
        if (withCircles) {
          // MainActivity 版本还画了两个居中大圆
          const min = Math.min(w, h);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = hexA(palette.primary, alpha);
          ctx.beginPath(); ctx.arc(w / 2, h / 2, min * 0.36, 0, Math.PI * 2); ctx.stroke();
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(w / 2, h / 2, min * 0.48, 0, Math.PI * 2); ctx.stroke();
        }
      },
      () => canvas.isConnected
    );
    return stop;
  };

  /* ---------------- AmbientParticleField（2048 NEON 漂浮粒子） ---------------- */

  BZX.ambientParticles = function (canvas, palette) {
    const fit = BZX.fitCanvas(canvas);
    let t = 0;
    const stop = BZX.animLoop(
      (_now, dt) => {
        t += dt / 7.2; // 7200ms 循环
        fit.resize();
        const { ctx, state } = fit;
        const { w, h } = state;
        ctx.clearRect(0, 0, w, h);
        for (let index = 0; index < 32; index++) {
          const seedX = ((index * 47 + 13) % 101) / 100;
          const seedY = ((index * 71 + 29) % 103) / 102;
          const speed = 0.35 + (index % 7) * 0.065;
          const normalizedY = ((seedY - t * speed + 1.4) % 1.15 + 1.15) % 1.15;
          const wave = Math.sin(t * 6.283 + index * 0.73);
          const x = seedX * w + wave * (8 + (index % 5));
          const y = normalizedY * h;
          const color = index % 3 === 0 ? palette.primary : index % 3 === 1 ? palette.secondary : palette.tertiary;
          const pa = 0.1 + (index % 5) * 0.025;
          ctx.strokeStyle = hexA(color, pa * 0.45);
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(x, y + 16); ctx.lineTo(x, y + 3); ctx.stroke();
          ctx.fillStyle = hexA(color, pa);
          ctx.beginPath();
          ctx.arc(x, y, 1.2 + (index % 3) * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      () => canvas.isConnected
    );
    return stop;
  };

  /* ---------------- NatureBackdrop（NATURE 主题：山丘、叶枝、飘叶） ---------------- */

  BZX.natureBackdrop = function (canvas) {
    const fit = BZX.fitCanvas(canvas);
    let drift = 0;
    function leaf(ctx, cx, cy, len, rot, color) {
      const half = len / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-half, 0);
      ctx.bezierCurveTo(-half * 0.35, -half * 0.8, half * 0.55, -half * 0.65, half, 0);
      ctx.bezierCurveTo(half * 0.3, half * 0.7, -half * 0.5, half * 0.6, -half, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = color.replace(/[\d.]+\)$/, (Number(color.match(/[\d.]+\)$/)[0].replace(")", "")) * 0.6) + ")");
      ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(-half * 0.7, 0); ctx.lineTo(half * 0.7, 0); ctx.stroke();
      ctx.restore();
    }
    const stop = BZX.animLoop(
      (_now, dt) => {
        drift = (drift + dt / 24) % 1;
        fit.resize();
        const { ctx, state } = fit;
        const { w, h } = state;
        ctx.clearRect(0, 0, w, h);
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, "#F5F9EB"); g.addColorStop(0.5, "#EAF3DF"); g.addColorStop(1, "#D6E9C9");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        // sun glow
        const sun = ctx.createRadialGradient(w * 0.86, h * 0.1, 0, w * 0.86, h * 0.1, w * 0.55);
        sun.addColorStop(0, "rgba(255,248,217,.9)");
        sun.addColorStop(1, "rgba(255,248,217,0)");
        ctx.fillStyle = sun;
        ctx.beginPath(); ctx.arc(w * 0.86, h * 0.1, w * 0.55, 0, Math.PI * 2); ctx.fill();
        // distant hill
        ctx.fillStyle = "rgba(175,208,154,.48)";
        ctx.beginPath();
        ctx.moveTo(0, h * 0.88);
        ctx.bezierCurveTo(w * 0.25, h * 0.79, w * 0.52, h * 0.97, w, h * 0.82);
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
        // near hill
        ctx.fillStyle = "rgba(124,167,110,.25)";
        ctx.beginPath();
        ctx.moveTo(0, h * 0.93);
        ctx.bezierCurveTo(w * 0.3, h * 0.84, w * 0.66, h * 0.99, w, h * 0.91);
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
        // leaf sprigs framing the sky
        const stem = "rgba(92,137,81,.2)";
        ctx.strokeStyle = stem; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-4, h * 0.025); ctx.lineTo(w * 0.2, h * 0.14); ctx.stroke();
        for (let index = 0; index < 4; index++) {
          const branch = (index + 1) / 5;
          const x = w * 0.2 * branch;
          const y = h * (0.025 + 0.115 * branch);
          leaf(ctx, x, y - 8, 22 + index * 2, -45, "rgba(109,155,94,.17)");
          leaf(ctx, x - 8, y + 3, 20 + index * 2, 25, "rgba(127,168,113,.15)");
        }
        ctx.beginPath(); ctx.moveTo(w + 4, h * 0.19); ctx.lineTo(w * 0.91, h * 0.32); ctx.stroke();
        for (let index = 0; index < 3; index++) {
          const y = h * (0.21 + index * 0.035);
          const x = w * (0.985 - index * 0.024);
          leaf(ctx, x - 8, y, 26, 35, "rgba(111,152,99,.18)");
          leaf(ctx, x + 7, y + 12, 22, -45, "rgba(111,152,99,.13)");
        }
        // falling leaves
        for (let index = 0; index < 8; index++) {
          const progress = (drift + index / 8) % 1;
          const sway = Math.sin(progress * 6.283185 + index);
          const x = w * (index % 2 === 0 ? 0.035 : 0.965) + sway * 7;
          const y = h * (progress * 1.2 - 0.1);
          leaf(ctx, x, y, 13 + (index % 3) * 4, index * 41 + sway * 32, "rgba(92,139,76," + (0.13 + (index % 3) * 0.025) + ")");
        }
      },
      () => canvas.isConnected
    );
    return stop;
  };

  /* ---------------- ShinkaiCountrysideBackdrop（大厅/设置页夏日背景） ----------------
     图片缓慢推拉 + 滚动视差；高层云带、鸟群、花瓣各自独立循环。 */

  BZX.shinkaiBackdrop = function (container, scrollEl) {
    const img = BZX.el("img");
    img.src = "assets/lobby_summer.jpg";
    img.alt = "";
    img.draggable = false;
    container.appendChild(img);
    const cv = BZX.el("canvas");
    container.appendChild(cv);
    const fit = BZX.fitCanvas(cv);

    let camera = 0, breeze = 0, clouds = 0;
    let scrollOffset = 0;
    const onScroll = () => { scrollOffset = scrollEl ? scrollEl.scrollTop : 0; };
    if (scrollEl) scrollEl.addEventListener("scroll", onScroll, { passive: true });

    const stop = BZX.animLoop(
      (_now, dt) => {
        camera = (camera + dt / 18) % 2;
        breeze = (breeze + dt / 32) % 1;
        clouds = (clouds + dt / 90) % 1;
        fit.resize();
        const { state } = fit;
        const { w, h } = state;
        const cam = camera < 1 ? camera : 2 - camera; // Reverse repeat
        const scale = 1.065 + cam * 0.018;
        const parallax = Math.min(scrollOffset, h) * 0.025;
        img.style.transform =
          "translateX(-50%) scale(" + scale + ") translateY(" + (-parallax) + "px)";

        const ctx = fit.ctx;
        ctx.clearRect(0, 0, w, h);
        // 渐变遮罩：顶部保持鲜艳，底部托起卡片
        const g = ctx.createLinearGradient(0, -parallax, 0, h - parallax);
        g.addColorStop(0, "rgba(7,56,95,.22)");
        g.addColorStop(0.28, "rgba(7,56,95,0)");
        g.addColorStop(0.4, "rgba(242,248,245,.58)");
        g.addColorStop(0.58, "rgba(242,248,245,.88)");
        g.addColorStop(0.82, "rgba(242,248,245,.97)");
        g.addColorStop(1, "#F2F8F5");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        // 高层云带
        for (let i = 0; i < 3; i++) {
          const phase = (clouds + i / 3) % 1;
          const cx = (phase * 1.8 - 0.4) * w;
          const cy = h * (0.17 + i * 0.075);
          const r = w * 0.32;
          const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          cg.addColorStop(0, "rgba(255,255,255,.11)");
          cg.addColorStop(1, "rgba(255,255,255,0)");
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(1, 0.13);
          ctx.translate(-cx, -cy);
          ctx.fillStyle = cg;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        // 鸟群（各自扑翼）
        for (let i = 0; i < 3; i++) {
          const phase = (breeze + i * 0.055) % 1;
          const x = (1.15 - phase * 1.45) * w;
          const y = h * (0.235 + i * 0.019) + Math.sin(phase * 2 * Math.PI) * 5;
          const wing = Math.sin(phase * 120 + i) * 2;
          const span = 3.5 - i * 0.6;
          ctx.strokeStyle = "rgba(41,77,103,.58)";
          ctx.lineWidth = 0.9;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(x - span, y - wing);
          ctx.quadraticCurveTo(x - span * 0.4, y - span * 0.35, x, y);
          ctx.quadraticCurveTo(x + span * 0.4, y - span * 0.35, x + span, y - wing);
          ctx.stroke();
        }
        // 前景花瓣
        for (let i = 0; i < 12; i++) {
          const phase = (breeze * (1 + (i % 2)) + i / 12) % 1;
          const sway = Math.sin(phase * 2 * Math.PI + i);
          const x = (((i * 37) % 101) / 100 + sway * 0.08) * w;
          const y = (phase * 1.2 - 0.1) * h;
          const r = 2.6 + (i % 3) * 0.7;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((phase * 360 + i * 29) * Math.PI / 180);
          ctx.fillStyle = i % 3 === 0 ? "rgba(255,217,229,.68)" : "rgba(255,254,240,.68)";
          ctx.beginPath();
          ctx.moveTo(-r, 0);
          ctx.bezierCurveTo(-r, -r, r * 0.7, -r, r, 0);
          ctx.bezierCurveTo(r * 0.4, r * 0.85, -r * 0.25, r * 0.7, -r, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      },
      () => cv.isConnected
    );
    return () => {
      stop();
      if (scrollEl) scrollEl.removeEventListener("scroll", onScroll);
    };
  };

  /* ---------------- InkWashBackdrop（五子棋水墨背景） ---------------- */

  BZX.inkWash = function (canvas) {
    const fit = BZX.fitCanvas(canvas);
    let mist = 0;
    const stop = BZX.animLoop(
      (_now, dt) => {
        mist = (mist + dt / 24) % 1;
        fit.resize();
        const { ctx, state } = fit;
        const { w, h } = state;
        ctx.clearRect(0, 0, w, h);
        // 禅圆（enso）
        ctx.strokeStyle = "rgba(74,59,40,.05)";
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.4, Math.min(w, h) * 0.42, 0, Math.PI * 2);
        ctx.stroke();
        // 水墨山两层
        inkMountain(ctx, w, h, h * 0.68, 0.11, "90,80,68");
        inkMountain(ctx, w, h, h * 0.72, 0.07, "107,97,82");
        // 梅枝
        const ink = "rgba(74,59,40,.16)";
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2.4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-4, h * 0.1);
        ctx.bezierCurveTo(w * 0.14, h * 0.065, w * 0.19, h * 0.15, w * 0.28, h * 0.12);
        ctx.stroke();
        for (let index = 0; index < 5; index++) {
          const bx = w * (0.06 + index * 0.045);
          const by = h * (0.085 + index * 0.012);
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.quadraticCurveTo(bx + 14, by - 10, bx + 26, by - 6);
          ctx.stroke();
          ctx.fillStyle = "rgba(74,59,40,.12)";
          ctx.beginPath();
          ctx.ellipse(bx + 20, by - 12, 4.5, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // 缓慢漂移的雾带
        const mistX = mist * w * 1.4 - w * 0.2;
        const mg = ctx.createLinearGradient(mistX, 0, mistX + w * 0.5, 0);
        mg.addColorStop(0, "rgba(255,255,255,0)");
        mg.addColorStop(0.5, "rgba(255,255,255,.1)");
        mg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = mg;
        ctx.fillRect(0, h * 0.58, w, h * 0.1);
      },
      () => canvas.isConnected
    );
    return stop;
  };

  function inkMountain(ctx, w, h, baseY, peak, rgb) {
    const grad = ctx.createLinearGradient(0, baseY - h * peak * 1.6, 0, baseY + h * 0.06);
    grad.addColorStop(0, "rgba(" + rgb + ",.16)");
    grad.addColorStop(1, "rgba(" + rgb + ",0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.bezierCurveTo(w * 0.15, baseY - h * peak * 1.4, w * 0.3, baseY - h * peak * 0.4, w * 0.45, baseY - h * peak);
    ctx.bezierCurveTo(w * 0.6, baseY - h * peak * 1.6, w * 0.8, baseY - h * peak * 0.5, w, baseY - h * peak * 0.8);
    ctx.lineTo(w, baseY + h * 0.12);
    ctx.lineTo(0, baseY + h * 0.12);
    ctx.closePath();
    ctx.fill();
  }

  /* ---------------- FeltVignette（蜘蛛纸牌桌面暗角） ---------------- */

  BZX.feltVignette = function (canvas) {
    const fit = BZX.fitCanvas(canvas);
    const stop = BZX.animLoop(
      () => {
        fit.resize();
        const { ctx, state } = fit;
        const { w, h } = state;
        ctx.clearRect(0, 0, w, h);
        const r = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.78);
        r.addColorStop(0, "rgba(0,0,0,0)");
        r.addColorStop(1, "rgba(0,0,0,.26)");
        ctx.fillStyle = r;
        ctx.fillRect(0, 0, w, h);
        const v = ctx.createLinearGradient(0, 0, 0, h);
        v.addColorStop(0, "rgba(255,255,255,.07)");
        v.addColorStop(0.5, "rgba(255,255,255,0)");
        v.addColorStop(1, "rgba(0,0,0,.12)");
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, w, h);
      },
      () => canvas.isConnected
    );
    return stop;
  };

  /* ---------------- hexA：#RRGGBB + alpha → rgba() ---------------- */

  function hexA(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }
  BZX.hexA = hexA;
})();
