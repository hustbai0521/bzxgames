/* ============================================================
   core.js — 命名空间、本地存储（对应 Android SharedPreferences）、
   音效控制器、主题调色板、路由器与公共 UI 工具
   ============================================================ */
(function () {
  "use strict";

  const BZX = (window.BZX = window.BZX || {});

  /* ---------------- storage (mirrors the app's "game" SharedPreferences) ---------------- */

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem("bzx_" + key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem("bzx_" + key, JSON.stringify(value));
      } catch (e) { /* private mode etc. */ }
    },
  };
  BZX.store = store;

  /* ---------------- sound controller (SoundController / clickSfx) ---------------- */

  let audioCtx = null;
  function ctx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  const sfx = {
    enabled: store.get("buttonSound", false),
    type: store.get("buttonSoundType", "RAIN"),
    bgMusic: store.get("bgMusic", false),
    _buffers: {},

    setEnabled(v) {
      this.enabled = v;
      store.set("buttonSound", v);
      if (v) this.click();
    },
    setType(t) {
      this.type = t;
      store.set("buttonSoundType", t);
    },
    setBgMusic(v) {
      this.bgMusic = v;
      store.set("bgMusic", v);
    },

    _buffer(type) {
      const c = ctx();
      if (!c) return null;
      if (this._buffers[type]) return this._buffers[type];
      const data = window.BZX_SFX && window.BZX_SFX[type];
      if (!data) return null;
      // decodeAudioData needs a copy-safe ArrayBuffer
      const b64 = data.split(",")[1];
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      this._buffers[type] = c.decodeAudioData(bytes.buffer);
      return this._buffers[type];
    },

    play(type) {
      const c = ctx();
      if (!c) return;
      Promise.resolve(this._buffer(type))
        .then((buf) => {
          if (!buf) return;
          const src = c.createBufferSource();
          const gain = c.createGain();
          gain.gain.value = 0.9;
          src.buffer = buf;
          src.connect(gain).connect(c.destination);
          src.start();
        })
        .catch(() => {});
    },

    click() {
      if (this.enabled) this.play(this.type);
    },
  };
  BZX.sfx = sfx;

  // Wrap a handler so the configured tap sound plays first (clickSfx).
  BZX.withSfx = function (fn) {
    return function (e) {
      if (e && e.button !== undefined && e.button !== 0) return;
      sfx.click();
      fn(e);
    };
  };

  // Attach a sounding click handler; returns the element for chaining.
  BZX.sfxButton = function (el, fn) {
    el.addEventListener("click", BZX.withSfx(fn));
    return el;
  };

  /* ---------------- themes (GamePalette from Theme.kt) ---------------- */

  const NEON = {
    key: "neon",
    title: "炫彩科技",
    isNature: false,
    background: ["#050713", "#0A1024", "#120A24"],
    primary: "#22D3EE",
    secondary: "#A855F7",
    tertiary: "#F43F8E",
    text: "#FFFFFF",
    mutedText: "#B4B8CA",
    surface: "#10162A",
    cardEnd: "#11162A",
    actionBackground: ["#14213D", "#25133E"],
    boardSurface: "rgba(9,14,32,.925)",
    tileBase: "#15112B",
    titleColors: ["#22D3EE", "#FFFFFF", "#F43F8E"],
    launchTint: "#553BAE",
    accent: "#9EEFFF",
    tileAccent: {
      0: "#64748B", 2: "#38BDF8", 4: "#22D3EE", 8: "#2DD4BF", 16: "#84CC16",
      32: "#FACC15", 64: "#FB923C", 128: "#FB7185", 256: "#F43F8E",
      512: "#D946EF", 1024: "#A855F7", 2048: "#8B5CF6",
    },
    tileFallback: "#FFFFFF",
    pieceColors: { 1: "#22D3EE", 2: "#FACC15", 3: "#A855F7", 4: "#4ADE80", 5: "#F43F5E", 6: "#3B82F6", 7: "#FB923C" },
  };

  const NATURE = {
    key: "nature",
    title: "清新自然",
    isNature: true,
    background: ["#F7FAEE", "#E5F2D9", "#EDF5E8"],
    primary: "#32734F",
    secondary: "#28776C",
    tertiary: "#8F6B25",
    text: "#234733",
    mutedText: "#50674C",
    surface: "#F7FAEF",
    cardEnd: "#F3F8E8",
    actionBackground: ["#F5FAEB", "#DDECCF"],
    boardSurface: "rgba(233,241,222,.95)",
    tileBase: "#214C38",
    titleColors: ["#276642", "#458943", "#8F6B25"],
    launchTint: "#89C55B",
    accent: "#D5F6A3",
    tileAccent: {
      0: "#8DAF86", 2: "#DDECC8", 4: "#C9E3AA", 8: "#ACD68E", 16: "#83C5A6",
      32: "#377B51", 64: "#28674C", 128: "#207166", 256: "#986D24",
      512: "#8A6020", 1024: "#6D5824", 2048: "#3C642C",
    },
    tileFallback: "#254D3B",
    pieceColors: { 1: "#6FA8C9", 2: "#E3C36B", 3: "#B58BD0", 4: "#7FB575", 5: "#D98B7E", 6: "#5E8AA8", 7: "#D9A05B" },
  };

  BZX.THEMES = { NEON, NATURE };
  BZX.getTheme = function () {
    const key = store.get("theme", "neon");
    return key === "nature" ? NATURE : NEON;
  };
  BZX.setTheme = function (key) {
    store.set("theme", key);
  };

  // Shared summer palette (ShinkaiStyle.kt)
  BZX.SummerColors = {
    DeepInk: "#244B54",
    SoftInk: "#5D777B",
    SeaGlass: "#368A91",
    WarmRose: "#B27C78",
  };

  /* ---------------- canvas helpers ---------------- */

  // Run `frame(now, dtSeconds)` on every animation frame while `alive()` is true.
  BZX.animLoop = function (frame, alive) {
    let raf = 0;
    let prev = 0;
    let running = true;
    const step = (now) => {
      if (!running) return;
      if (!alive || alive()) {
        const dt = prev ? Math.min((now - prev) / 1000, 0.05) : 0;
        prev = now;
        frame(now, dt);
        raf = requestAnimationFrame(step);
      } else {
        running = false;
      }
    };
    raf = requestAnimationFrame(step);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  };

  // Setup a hi-dpi canvas that fills its CSS box; returns { canvas, ctx, w, h, resize }.
  BZX.fitCanvas = function (canvas) {
    const state = { w: 0, h: 0 };
    const ctx2d = canvas.getContext("2d");
    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      state.w = w;
      state.h = h;
    }
    resize();
    return { canvas, ctx: ctx2d, state, resize };
  };

  // Tiny tween helper mirroring Animatable.animateTo with a duration + easing.
  BZX.tween = function (from, to, durationMs, easing, onUpdate, onDone) {
    const start = performance.now();
    let stopped = false;
    function tick(now) {
      if (stopped) return;
      const t = Math.min(1, (now - start) / durationMs);
      onUpdate(from + (to - from) * easing(t));
      if (t < 1) requestAnimationFrame(tick);
      else if (onDone) onDone();
    }
    requestAnimationFrame(tick);
    return () => { stopped = true; };
  };

  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2); // FastOutSlowIn-ish
  BZX.easeInOut = easeInOut;
  BZX.linear = (t) => t;

  /* ---------------- DOM helpers ---------------- */

  BZX.el = function (tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  };

  BZX.clear = function (node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  };

  // Simple toast (Android Toast.LENGTH_SHORT ≈ 2s).
  BZX.toast = function (host, message, life) {
    const t = BZX.el("div", "app-toast", message);
    t.style.setProperty("--toast-life", (life || 2000) + "ms");
    host.appendChild(t);
    setTimeout(() => t.remove(), (life || 2000) + 260);
  };

  /* ---------------- dialog helpers ---------------- */

  // Material-style dialog; returns { close }. Theme = {surface,titleColor,bodyColor,confirmBg,confirmColor,dismissColor}.
  BZX.dialog = function (host, opts) {
    const scrim = BZX.el("div", "dialog-scrim");
    const box = BZX.el("div", "dialog" + (opts.wide ? " wide" : ""));
    if (opts.surface) box.style.background = opts.surface;
    if (opts.elevation !== false) box.style.boxShadow = "0 18px 50px rgba(0,0,0,.35)";

    const title = BZX.el("h3", null, opts.title);
    if (opts.titleColor) title.style.color = opts.titleColor;
    box.appendChild(title);

    if (opts.body) {
      const body = BZX.el("div", "dialog-body");
      if (typeof opts.body === "string") body.textContent = opts.body;
      else body.appendChild(opts.body);
      if (opts.bodyColor) body.style.color = opts.bodyColor;
      box.appendChild(body);
    }

    const actions = BZX.el("div", "dialog-actions");
    if (opts.dismiss) {
      const d = BZX.el("button", "dialog-btn-text", opts.dismiss.label);
      if (opts.dismissColor) d.style.color = opts.dismissColor;
      BZX.sfxButton(d, () => {
        close();
        opts.dismiss.onClick && opts.dismiss.onClick();
      });
      actions.appendChild(d);
    }
    const c = BZX.el("button", "dialog-btn-filled", opts.confirm.label);
    if (opts.confirmBg) c.style.background = opts.confirmBg;
    if (opts.confirmColor) c.style.color = opts.confirmColor;
    BZX.sfxButton(c, () => {
      close();
      opts.confirm.onClick && opts.confirm.onClick();
    });
    actions.appendChild(c);
    box.appendChild(actions);
    scrim.appendChild(box);

    function close() {
      if (!scrim.parentNode) return;
      scrim.parentNode.removeChild(scrim);
      opts.onDismissRequest && opts.onDismissRequest();
    }
    if (opts.dismissible !== false) {
      scrim.addEventListener("click", (e) => {
        if (e.target === scrim) close();
      });
    }
    host.appendChild(scrim);
    return { close };
  };

  /* ---------------- router ---------------- */

  const appHost = () => document.getElementById("app");

  const routes = {
    library: { title: "BZX / 小游戏合集", mount: (root) => BZX.LibraryScreen(root) },
    settings: { title: "设置 · BZX 小游戏合集", mount: (root) => BZX.SettingsScreen(root) },
    "2048": { title: "2048 · BZX 小游戏合集", mount: (root) => BZX.Game2048Screen(root) },
    gomoku: { title: "五子棋 · BZX 小游戏合集", mount: (root) => BZX.GomokuScreen(root) },
    mines: { title: "扫雷 · BZX 小游戏合集", mount: (root) => BZX.MinesweeperScreen(root) },
    snake: { title: "贪吃蛇 · BZX 小游戏合集", mount: (root) => BZX.SnakeScreen(root) },
    tetris: { title: "俄罗斯方块 · BZX 小游戏合集", mount: (root) => BZX.TetrisScreen(root) },
    link: { title: "连连看 · BZX 小游戏合集", mount: (root) => BZX.LinkScreen(root) },
    spider: { title: "蜘蛛纸牌 · BZX 小游戏合集", mount: (root) => BZX.SpiderScreen(root) },
  };

  const router = {
    current: null,
    currentEl: null,
    unmount: null,

    go(route) {
      if (this.current === route) return;
      const host = appHost();
      const def = routes[route];
      if (!def) return;
      this.current = route;
      location.hash = route === "library" ? "" : "/" + route;
      document.title = def.title;

      // enter the new screen
      const el = BZX.el("div", "screen entering");
      host.appendChild(el);
      this.unmount = def.mount(el) || null;

      // exit the old one
      const old = this.currentEl;
      const oldUnmount = this._pendingUnmount;
      if (old) {
        old.classList.remove("entering");
        old.classList.add("exiting");
        setTimeout(() => {
          if (oldUnmount) oldUnmount();
          old.remove();
        }, 390);
      }
      this.currentEl = el;
      this._pendingUnmount = this.unmount;
      setTimeout(() => el.classList.remove("entering"), 560);
    },

    // Navigate back to the lobby from inside a game (BackHandler equivalent).
    backToLibrary() {
      this.go("library");
    },
  };
  BZX.router = router;

  window.addEventListener("hashchange", () => {
    const route = parseHash();
    if (route !== router.current) router.go(route);
  });

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, "");
    return routes[h] ? h : "library";
  }

  BZX.start = function () {
    const route = parseHash();
    router.current = route;
    document.title = routes[route].title;
    location.hash = route === "library" ? "" : "/" + route;
    const el = BZX.el("div", "screen entering");
    appHost().appendChild(el);
    router.currentEl = el;
    router._pendingUnmount = routes[route].mount(el) || null;
    setTimeout(() => el.classList.remove("entering"), 560);
  };

  /* ---------------- shared game chrome builders ---------------- */

  // Standard header used by 2048/tetris/snake (gradient title + caption + round actions).
  BZX.buildHeader = function (palette, title, subtitle, titleSize) {
    const header = BZX.el("div");
    header.style.width = "100%";
    const row = BZX.el("div");
    row.style.cssText = "display:flex;align-items:center;";
    const left = BZX.el("div");
    const h1 = BZX.el("div", "brush-title", title);
    h1.style.fontSize = (titleSize || 36) + "px";
    h1.style.backgroundImage = "linear-gradient(90deg," + palette.titleColors.join(",") + ")";
    h1.style.letterSpacing = titleSize >= 44 ? "-2px" : "-1px";
    left.appendChild(h1);
    const cap = BZX.el("div", "sub-caption", subtitle);
    left.appendChild(cap);
    row.appendChild(left);
    return { header, row, left };
  };

  BZX.roundAction = function (symbol, label, enabled, palette, onClick) {
    const b = BZX.el("button", "round-action ra-themed");
    b.textContent = symbol;
    b.title = label;
    b.setAttribute("aria-label", label);
    b.disabled = !enabled;
    // 始终绑定：disabled 属性本身会拦下点击，动态启用的按钮无需重建监听
    BZX.sfxButton(b, onClick);
    return b;
  };

  BZX.scoreCard = function (label, accent, extraClass) {
    const card = BZX.el("div", "score-card tcard" + (extraClass ? " " + extraClass : ""));
    card.style.setProperty("--accent", accent);
    card.appendChild(BZX.el("div", "sc-label", label));
    const value = BZX.el("div", "sc-value", "0");
    card.appendChild(value);
    return {
      el: card,
      value,
      set(v) {
        if (String(v) !== value.textContent) {
          value.textContent = String(v);
          value.classList.remove("sc-anim");
          void value.offsetWidth; // restart animation
          value.classList.add("sc-anim");
        }
      },
    };
  };

  BZX.hintPill = function (palette, text) {
    const pill = BZX.el("div", "hint-pill hp-themed", text);
    return pill;
  };

  // 暂停/开始遮罩（开始遮罩无遮罩点击恢复；暂停遮罩点遮罩即继续）
  BZX.startOverlay = function (palette, root, onStart, onBack, subtitle) {
    const ov = BZX.el("div", "center-overlay ov-themed");
    const card = BZX.el("div", "ov-card ovc-themed");
    card.appendChild(BZX.el("div", "ov-title", "准备好了吗？"));
    card.appendChild(BZX.el("div", "ov-sub", subtitle));
    const row = BZX.el("div", "ov-row");
    const start = BZX.el("button", "overlay-pill pill-themed-filled", "开始游戏");
    BZX.sfxButton(start, onStart);
    const back = BZX.el("button", "overlay-pill pill-themed-ghost", "返回大厅");
    BZX.sfxButton(back, onBack);
    row.appendChild(start);
    row.appendChild(back);
    card.appendChild(row);
    ov.appendChild(card);
    root.appendChild(ov);
    return ov;
  };

  BZX.pauseOverlay = function (palette, root, onResume, onBack) {
    const ov = BZX.el("div", "center-overlay ov-themed pause");
    ov.addEventListener("click", (e) => {
      if (e.target === ov) {
        sfx.click();
        onResume();
      }
    });
    const card = BZX.el("div", "ov-card ovc-themed");
    card.appendChild(BZX.el("div", "ov-title", "已暂停"));
    card.appendChild(BZX.el("div", "ov-sub", "轻点遮罩继续，或从下面选择"));
    const row = BZX.el("div", "ov-row");
    const resume = BZX.el("button", "overlay-pill pill-themed-filled", "继续游戏");
    BZX.sfxButton(resume, onResume);
    const back = BZX.el("button", "overlay-pill pill-themed-ghost", "返回大厅");
    BZX.sfxButton(back, onBack);
    row.appendChild(resume);
    row.appendChild(back);
    card.appendChild(row);
    ov.appendChild(card);
    root.appendChild(ov);
    return ov;
  };

  // Auto-pause when the tab loses visibility (ON_PAUSE equivalent).
  BZX.autoPauseOnHide = function (pauseFn) {
    const handler = () => {
      if (document.hidden) pauseFn();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  };
})();
