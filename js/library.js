/* ============================================================
   library.js — 游戏大厅（夏日新海诚风格 + 视差背景 + 入场动画）
   ============================================================ */
(function () {
  "use strict";
  const BZX = window.BZX;
  const C = BZX.SummerColors;
  const el = BZX.el;

  BZX.LibraryScreen = function (root) {
    root.classList.add("lobby");

    // backdrop（图片 + 动画层，滚动视差）
    const backdrop = el("div", "lobby-backdrop");
    root.appendChild(backdrop);

    const scroll = el("div", "lobby-scroll");
    root.appendChild(scroll);

    const stopBackdrop = BZX.shinkaiBackdrop(backdrop, scroll);

    /* ---------- hero ---------- */
    const hero = el("div", "lobby-hero reveal-block reveal-sm");

    const topbar = el("div", "lobby-topbar");
    const brand = el("div", "lobby-brand");
    brand.appendChild(breezeMark(22, "#fff"));
    brand.appendChild(el("span", null, "BZX / 小游戏合集"));
    topbar.appendChild(brand);

    const chip = el("div", "lobby-chip");
    chip.appendChild(sunMark(13));
    chip.appendChild(el("span", null, "晴日心情"));
    topbar.appendChild(chip);

    const gear = el("button", "gear-btn");
    gear.title = "设置";
    gear.setAttribute("aria-label", "设置");
    gear.appendChild((function () {
      const disc = el("div", "gear-disc");
      disc.appendChild(gearGlyph(20));
      return disc;
    })());
    BZX.sfxButton(gear, () => BZX.router.go("settings"));
    topbar.appendChild(gear);
    hero.appendChild(topbar);

    const headline = el("div", "lobby-headline");
    headline.appendChild(el("div", "lh-kicker", "风很轻，快乐很近。"));
    headline.appendChild(el("div", "lh-title", "把时光，\n留给喜欢的事。"));
    headline.appendChild(el("div", "lh-foot", "A LITTLE MOMENT OF JOY"));
    hero.appendChild(headline);
    const heroSpacer = el("div");
    heroSpacer.style.height = "38px";
    hero.appendChild(heroSpacer);
    scroll.appendChild(hero);

    /* ---------- 此刻，来一局 ---------- */
    const section = el("div", "reveal-block");

    const secRow = el("div", "lobby-section-row");
    const secLeft = el("div", "lsr-left");
    secLeft.appendChild(el("div", "lsr-title", "此刻，来一局"));
    secLeft.appendChild(el("div", "lsr-sub", "没有倒计时，只有好时光"));
    secRow.appendChild(secLeft);
    secRow.appendChild(el("div", "lsr-tag", "随时开玩"));
    section.appendChild(secRow);

    const playableRow = el("div", "playable-row");
    playableRow.appendChild(playableCard("2048", "轻轻一滑，快乐加倍", "数字益智", C.SeaGlass, false, () => BZX.router.go("2048")));
    playableRow.appendChild(playableCard("五子棋", "落子之间，慢慢来", "人机 / 双人", C.WarmRose, true, () => BZX.router.go("gomoku")));
    section.appendChild(playableRow);

    /* ---------- 下一站，小惊喜 ---------- */
    const upHeader = el("div", "upcoming-header");
    upHeader.appendChild(el("div", "uh-title", "下一站，小惊喜"));
    upHeader.appendChild(el("div", "uh-sub", "5 款全上线"));
    section.appendChild(upHeader);

    const games = [
      { name: "贪吃蛇", subtitle: "一路生长", icon: 0, route: "snake" },
      { name: "俄罗斯方块", subtitle: "拼出新可能", icon: 1, route: "tetris" },
      { name: "连连看", subtitle: "遇见成双的美好", icon: 2, route: "link" },
      { name: "蜘蛛纸牌", subtitle: "理好每一手牌", icon: 3, route: "spider" },
      { name: "扫雷", subtitle: "每一步都是灵感", icon: 4, route: "mines" },
    ];
    const grid = el("div", "upcoming-grid");
    for (let i = 0; i < games.length; i += 2) {
      const row = el("div", "upcoming-row");
      games.slice(i, i + 2).forEach((g) => {
        row.appendChild(upcomingCard(g));
      });
      if (games.slice(i, i + 2).length === 1) {
        const filler = el("div");
        filler.style.flex = "1";
        row.appendChild(filler);
      }
      grid.appendChild(row);
    }
    section.appendChild(grid);

    section.appendChild(el("div", "lobby-foot", "愿每一天，都有小小的好天气。"));
    scroll.appendChild(section);

    function playableCard(title, subtitle, category, accent, gomoku, onClick) {
      const card = el("button", "playable-card");
      card.style.color = "inherit";
      const cat = el("div", "pc-cat", category);
      cat.style.color = accent;
      card.appendChild(cat);
      const art = el("div", "pc-art");
      if (gomoku) {
        const holder = el("div", "tilt-r");
        holder.appendChild(gomokuIllustration(73));
        art.appendChild(holder);
      } else {
        const holder = el("div", "tilt-l");
        holder.appendChild(numberIllustration());
        art.appendChild(holder);
      }
      card.appendChild(art);
      card.appendChild(el("div", "pc-title", title));
      card.appendChild(el("div", "pc-sub", subtitle));
      const go = el("div", "pc-go");
      const label = el("div", "go-label", "开始游戏");
      label.style.color = accent;
      go.appendChild(label);
      const circle = el("div", "go-circle", "→");
      circle.style.background = hexA(accent, 0.1);
      circle.style.color = accent;
      go.appendChild(circle);
      card.appendChild(go);
      BZX.sfxButton(card, onClick);
      return card;
    }

    function upcomingCard(game) {
      const card = el("button", "upcoming-card");
      const icon = el("div", "uc-icon");
      icon.appendChild(upcomingIcon(game.icon, 26));
      card.appendChild(icon);
      const texts = el("div");
      texts.appendChild(el("div", "uc-name", game.name));
      texts.appendChild(el("div", "uc-sub", game.subtitle));
      texts.appendChild(el("div", "uc-go", "开始游戏 →"));
      card.appendChild(texts);
      BZX.sfxButton(card, () => BZX.router.go(game.route));
      return card;
    }

    return () => stopBackdrop();
  };

  /* ---------------- 小插画（对应 Compose Canvas 矢量画） ---------------- */

  function breezeMark(size, color) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", size); svg.setAttribute("height", size);
    svg.setAttribute("viewBox", "0 0 22 22");
    let d = "";
    for (let i = 0; i < 3; i++) {
      const y = 22 * (0.25 + i * 0.25);
      const midX = 22 * (0.6 - i * 0.12);
      const ctrlX = 22 * (0.95 - i * 0.1);
      const endX = 22 * (0.8 - i * 0.12);
      d += "M0 " + y + " L" + midX + " " + y + " Q" + ctrlX + " " + y + " " + endX + " " + (y - 22 * 0.15) + " ";
    }
    svg.innerHTML =
      '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.4" stroke-linecap="round"/>';
    return svg;
  }

  function sunMark(size) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", size); svg.setAttribute("height", size);
    svg.setAttribute("viewBox", "0 0 13 13");
    let rays = "";
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const cx = 6.5, cy = 6.5;
      rays +=
        '<line x1="' + (cx + Math.cos(a) * 13 * 0.34) + '" y1="' + (cy + Math.sin(a) * 13 * 0.34) +
        '" x2="' + (cx + Math.cos(a) * 13 * 0.46) + '" y2="' + (cy + Math.sin(a) * 13 * 0.46) +
        '" stroke="#FFE7AD" stroke-width="1" stroke-linecap="round"/>';
    }
    svg.innerHTML =
      '<circle cx="6.5" cy="6.5" r="' + 13 * 0.23 + '" fill="#FFE7AD"/>' + rays;
    return svg;
  }

  function gearGlyph(size) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", size); svg.setAttribute("height", size);
    svg.setAttribute("viewBox", "0 0 20 20");
    const c = 10, r = 10 * 0.46;
    let d = "";
    for (let tooth = 0; tooth < 8; tooth++) {
      const points = [[0, 0.74], [0.18, 0.74], [0.24, 1], [0.56, 1], [0.62, 0.74]];
      points.forEach((p, index) => {
        const angle = ((tooth + p[0]) * Math.PI) / 4;
        const x = c + Math.cos(angle) * r * p[1];
        const y = c + Math.sin(angle) * r * p[1];
        d += (tooth === 0 && index === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2) + " ";
      });
    }
    d += "Z ";
    const hole = r * 0.34;
    // open center via evenodd
    d += "M" + (c - hole) + " " + c + " a" + hole + " " + hole + " 0 1 0 " + hole * 2 + " 0 a" + hole + " " + hole + " 0 1 0 " + (-hole * 2) + " 0 Z";
    svg.innerHTML = '<path d="' + d + '" fill="#fff" fill-rule="evenodd"/>';
    return svg;
  }

  function numberIllustration() {
    const wrap = el("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:4px;width:70px;height:70px;";
    const colors = ["#EAF2E7", "#D7EAE3", "#F9E4BF", "#E9B69D"];
    const nums = ["2", "4", "8", "16"];
    for (let row = 0; row < 2; row++) {
      const r = el("div");
      r.style.cssText = "display:flex;gap:4px;flex:1;";
      for (let col = 0; col < 2; col++) {
        const i = row * 2 + col;
        const cell = el("div", null, nums[i]);
        cell.style.cssText =
          "flex:1;border-radius:8px;background:" + colors[i] + ";box-shadow:0 2px 4px rgba(0,0,0,.12);" +
          "display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;" +
          "color:" + (i === 3 ? "#fff" : "#244B54") + ";";
        r.appendChild(cell);
      }
      wrap.appendChild(r);
    }
    return wrap;
  }

  function gomokuIllustration(size) {
    const canvas = el("canvas");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const s = size;
    const rr = 10 * (s / 73); // corner 10dp at 73dp
    roundRect(ctx, 0, 0, s, s, rr);
    ctx.fillStyle = "#E6D8B9";
    ctx.fill();
    const pad = s * 0.15;
    const step = (s - pad * 2) / 4;
    ctx.strokeStyle = "#B2A185";
    ctx.lineWidth = 0.65 * (s / 73);
    for (let i = 0; i < 5; i++) {
      const p = pad + i * step;
      ctx.beginPath(); ctx.moveTo(pad, p); ctx.lineTo(s - pad, p); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p, pad); ctx.lineTo(p, s - pad); ctx.stroke();
    }
    const stones = [[1, 1], [2, 2], [3, 3], [2, 1], [1, 3]];
    stones.forEach((st, i) => {
      const cx = pad + st[0] * step;
      const cy = pad + st[1] * step;
      ctx.fillStyle = "rgba(107,102,91,.18)";
      ctx.beginPath(); ctx.arc(cx, cy + 1.5 * (s / 73), step * 0.4, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createRadialGradient(cx - 2 * (s / 73), cy - 2 * (s / 73), 0, cx, cy, step * 0.65);
      if (i < 3) { g.addColorStop(0, "#647076"); g.addColorStop(1, "#2E3C43"); }
      else { g.addColorStop(0, "#FFFFFF"); g.addColorStop(1, "#ECEDE5"); }
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, step * 0.39, 0, Math.PI * 2); ctx.fill();
    });
    return canvas;
  }

  function upcomingIcon(kind, size) {
    const canvas = el("canvas");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const ink = hexA(C.SeaGlass, 0.8);
    const w = size, h = size;
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineCap = "round";
    if (kind === 0) { // 贪吃蛇
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w * 0.15, h * 0.8);
      ctx.lineTo(w * 0.65, h * 0.8);
      ctx.quadraticCurveTo(w * 0.9, h * 0.8, w * 0.9, h * 0.56);
      ctx.quadraticCurveTo(w * 0.9, h * 0.37, w * 0.65, h * 0.37);
      ctx.lineTo(w * 0.36, h * 0.37);
      ctx.quadraticCurveTo(w * 0.13, h * 0.37, w * 0.13, h * 0.16);
      ctx.lineTo(w * 0.48, h * 0.16);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(w * 0.43, h * 0.13, 1, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 1) { // 俄罗斯方块
      [[0, 1, 0.85], [1, 1, 0.5], [1, 0, 0.85], [2, 0, 0.5]].forEach((b) => {
        ctx.fillStyle = hexA(C.SeaGlass, b[2]);
        roundRect(ctx, b[0] * w / 3 + 1, b[1] * h / 3 + h * 0.17, w * 0.27, h * 0.27, 2);
        ctx.fill();
      });
    } else if (kind === 2) { // 连连看
      for (let i = 0; i < 2; i++) {
        const cx = w * (0.33 + i * 0.35);
        const cy = h * (0.36 + i * 0.28);
        ctx.strokeStyle = hexA(C.SeaGlass, i === 0 ? 0.45 : 0.9);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx, cy - h * 0.25);
        ctx.lineTo(cx + w * 0.22, cy);
        ctx.lineTo(cx, cy + h * 0.25);
        ctx.lineTo(cx - w * 0.22, cy);
        ctx.closePath();
        ctx.stroke();
      }
    } else if (kind === 3) { // 蜘蛛纸牌
      ctx.fillStyle = hexA(C.SeaGlass, 0.25);
      roundRect(ctx, w * 0.1, h * 0.08, w * 0.58, h * 0.77, 3);
      ctx.fill();
      ctx.fillStyle = "#FAFCF7";
      roundRect(ctx, w * 0.32, h * 0.2, w * 0.58, h * 0.77, 3);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.6;
      roundRect(ctx, w * 0.32, h * 0.2, w * 0.58, h * 0.77, 3);
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(w * 0.61, h * 0.56, w * 0.1, 0, Math.PI * 2); ctx.fill();
    } else { // 扫雷
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.24, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(w / 2 + Math.cos(a) * w * 0.31, h / 2 + Math.sin(a) * w * 0.31);
        ctx.lineTo(w / 2 + Math.cos(a) * w * 0.44, h / 2 + Math.sin(a) * w * 0.44);
        ctx.stroke();
      }
      ctx.fillStyle = hexA(C.SeaGlass, 0.35);
      ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.07, 0, Math.PI * 2); ctx.fill();
    }
    return canvas;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function hexA(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }
})();
