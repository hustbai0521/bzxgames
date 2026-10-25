/* ============================================================
   settings.js — 设置页（左侧栏：音效 / 关于 / 致谢）
   侧边栏顺序契约：功能项在前，关于/致谢永远固定在最后。
   ============================================================ */
(function () {
  "use strict";
  const BZX = window.BZX;
  const C = BZX.SummerColors;
  const el = BZX.el;

  const SECTION_SOUND = 0;
  const SECTION_ABOUT = 1;
  const SECTION_THANKS = 2;

  const AboutInfo = {
    APP_NAME: "小游戏合集",
    VERSION: "V1.0.0",
    AUTHOR: "BZX",
    EMAIL: "3346937394@qq.com",
    GITHUB_URL: "https://github.com/hustbai0521/bzxgames",
    GITHUB_LABEL: "github.com/hustbai0521/bzxgames",
  };

  BZX.SettingsScreen = function (root) {
    root.classList.add("settings");

    const backdrop = el("div", "lobby-backdrop");
    root.appendChild(backdrop);
    const scroll = el("div", "settings-scroll");
    root.appendChild(scroll);
    const stopBackdrop = BZX.shinkaiBackdrop(backdrop, scroll);

    /* ---------- hero ---------- */
    const hero = el("div", "settings-hero reveal-block reveal-sm");
    const topbar = el("div", "settings-topbar");
    const brand = el("div", "st-brand");
    brand.appendChild(breezeMark(22, "#fff"));
    brand.appendChild(el("span", null, "BZX / 设置"));
    topbar.appendChild(brand);
    topbar.appendChild(el("div", "st-version", AboutInfo.VERSION));
    hero.appendChild(topbar);

    hero.appendChild(el("div", "sh-kicker", "SETTINGS"));
    hero.appendChild(el("div", "sh-title", "关于，与感谢。"));
    hero.appendChild(el("div", "sh-sub", "认识一下这款小小世界"));
    hero.appendChild((function () { const s = el("div"); s.style.height = "34px"; return s; })());
    scroll.appendChild(hero);

    /* ---------- body ---------- */
    const body = el("div", "reveal-block");
    const row = el("div", "settings-body");

    const sidebar = el("div", "settings-sidebar");
    const entries = {};
    [
      [SECTION_SOUND, "音效", soundMark],
      [SECTION_ABOUT, "关于", infoMark],
      [SECTION_THANKS, "致谢", heartMark],
    ].forEach(([section, title, icon]) => {
      const btn = el("button", "sidebar-entry");
      btn.appendChild(icon(18));
      btn.appendChild(el("div", "se-title", title));
      BZX.sfxButton(btn, () => select(section));
      entries[section] = btn;
      sidebar.appendChild(btn);
    });
    row.appendChild(sidebar);

    const panel = el("div", "settings-panel");
    row.appendChild(panel);
    body.appendChild(row);

    const foot = el("div", "settings-foot", "BZX 的小游戏世界  ·  愿每一天，都有小小的好天气。");
    body.appendChild(foot);
    scroll.appendChild(body);

    let current = SECTION_SOUND;

    function select(section) {
      if (current === section) return;
      current = section;
      render();
    }

    function render() {
      Object.keys(entries).forEach((k) => {
        entries[k].classList.toggle("selected", Number(k) === current);
      });
      BZX.clear(panel);
      const wrap = el("div", "panel-anim");
      if (current === SECTION_ABOUT) wrap.appendChild(aboutCard());
      else if (current === SECTION_THANKS) wrap.appendChild(thanksCard());
      else wrap.appendChild(soundCard());
      panel.appendChild(wrap);
    }
    render();

    /* ---------- 音效卡 ---------- */

    function soundCard() {
      const card = el("div", "translucent-card sound-card");
      card.appendChild(el("div", "snd-title", "音效"));
      card.appendChild(el("div", "snd-sub", "让每一次轻点，都有小小的回应。"));

      const sfxState = BZX.sfx;

      const switchBtn = el("button", "switch-row");
      const txt = el("div", "sw-text");
      txt.appendChild(el("div", "sw-title", "按键音效"));
      txt.appendChild(el("div", "sw-caption", "按下按钮时，响起轻巧的一声"));
      switchBtn.appendChild(txt);
      const sw = el("div", "bzx-switch" + (sfxState.enabled ? " checked" : ""));
      switchBtn.appendChild(sw);
      BZX.sfxButton(switchBtn, () => {
        sfxState.setEnabled(!sfxState.enabled);
        sw.classList.toggle("checked", sfxState.enabled);
        pickerHolder.classList.toggle("collapse-anim", false);
        renderPicker();
      });
      card.appendChild(switchBtn);

      const pickerHolder = el("div");
      pickerHolder.style.display = sfxState.enabled ? "" : "none";
      card.appendChild(pickerHolder);

      function renderPicker() {
        BZX.clear(pickerHolder);
        if (!sfxState.enabled) return;
        pickerHolder.style.display = "";
        pickerHolder.classList.add("collapse-anim");
        const row2 = el("div", "sound-type-row");
        row2.appendChild(el("div", "str-label", "音效种类"));
        const picker = el("div", "sound-type-picker");
        const btn = el("button", "sound-type-btn");
        const label = el("span", null, soundLabel(sfxState.type));
        btn.appendChild(label);
        btn.appendChild(el("span", "caret", "▾"));
        picker.appendChild(btn);
        const menu = el("div", "sound-type-menu");
        menu.style.display = "none";
        ["RAIN", "DRIP", "BUBBLE", "WOOD"].forEach((type) => {
          const item = el("button", type === sfxState.type ? "current" : "");
          item.appendChild(el("span", null, soundLabel(type)));
          if (type === sfxState.type) item.appendChild(el("span", "check", "✓"));
          item.addEventListener("click", () => {
            sfxState.setType(type);
            sfxState.play(type); // 选中即试听（对应 DropdownMenuItem 行为）
            menu.style.display = "none";
            renderPicker();
          });
          menu.appendChild(item);
        });
        picker.appendChild(menu);
        BZX.sfxButton(btn, () => {
          menu.style.display = menu.style.display === "none" ? "" : "none";
        });
        document.addEventListener("click", function onDoc(e) {
          if (!picker.contains(e.target)) menu.style.display = "none";
          if (!picker.isConnected) document.removeEventListener("click", onDoc);
        });
        row2.appendChild(picker);
        pickerHolder.appendChild(row2);
      }
      renderPicker();

      card.appendChild(divider());

      const musicBtn = el("button", "switch-row");
      const mtxt = el("div", "sw-text");
      mtxt.appendChild(el("div", "sw-title", "背景音乐"));
      mtxt.appendChild(el("div", "sw-caption", "静静的伴奏，正在筹备中"));
      musicBtn.appendChild(mtxt);
      const msw = el("div", "bzx-switch" + (sfxState.bgMusic ? " checked" : ""));
      musicBtn.appendChild(msw);
      BZX.sfxButton(musicBtn, () => {
        sfxState.setBgMusic(!sfxState.bgMusic);
        msw.classList.toggle("checked", sfxState.bgMusic);
      });
      card.appendChild(musicBtn);
      return card;
    }

    function soundLabel(type) {
      return { RAIN: "雨滴", DRIP: "水滴", BUBBLE: "泡泡", WOOD: "木鱼" }[type] || type;
    }

    /* ---------- 关于卡 ---------- */

    function aboutCard() {
      const card = el("div", "translucent-card about-card");
      infoRow(card, "应用名称", AboutInfo.APP_NAME);
      card.appendChild(divider());
      infoRow(card, "版本", AboutInfo.VERSION);
      card.appendChild(divider());
      infoRow(card, "作者", AboutInfo.AUTHOR);
      card.appendChild(divider());
      const emailRow = infoRow(card, "作者邮箱", AboutInfo.EMAIL, "✉");
      emailRow.addEventListener("click", () => {
        window.location.href = "mailto:" + AboutInfo.EMAIL;
      });
      card.appendChild(divider());
      const ghRow = infoRow(card, "GitHub", AboutInfo.GITHUB_LABEL, "↗");
      ghRow.addEventListener("click", () => {
        window.open(AboutInfo.GITHUB_URL, "_blank");
      });
      return card;
    }

    function infoRow(card, label, value, trail) {
      const rowEl = el("div", "info-row" + (trail ? " clickable" : ""));
      if (trail) rowEl.title = label;
      rowEl.appendChild(el("div", "ir-label", label));
      rowEl.appendChild(el("div", "ir-value", value));
      if (trail) rowEl.appendChild(el("div", "ir-trail", "  " + trail));
      BZX.sfxButton(rowEl, () => { /* sound only; navigation handled outside */ });
      card.appendChild(rowEl);
      return rowEl;
    }

    /* ---------- 致谢卡（致谢名单为项目要求，请保留名字） ---------- */

    function thanksCard() {
      const card = el("div", "translucent-card thanks-card");
      card.appendChild(el("div", "tc-title", "致谢"));
      card.appendChild(el("p", null, "这款小游戏世界，从一行行代码到一笔笔矢量画，都离不开几位 AI 伙伴的耐心相伴。"));

      const p = el("p");
      p.appendChild(document.createTextNode("感谢 "));
      p.appendChild(el("span", "thanks-name", "GLM5.3"));
      p.appendChild(document.createTextNode(" 的严谨与稳健，为项目奠定了可靠的骨架；感谢 "));
      p.appendChild(el("span", "thanks-name", "GPT 6.1 Sol"));
      p.appendChild(document.createTextNode(" 的清晰思路，在复杂逻辑前拨云见日；感谢 "));
      p.appendChild(el("span", "thanks-name", "GPT 5.6 Sol"));
      p.appendChild(document.createTextNode(" 的细腻打磨，让每一处界面都经得起端详；也感谢 "));
      p.appendChild(el("span", "thanks-name", "GPT 6 Astra"));
      p.appendChild(document.createTextNode(" 的灵动想象，为这个小小世界添上许多意想不到的色彩。"));
      card.appendChild(p);

      card.appendChild(el("p", null, "技术与温度并存，是这段旅程最好的注脚。谢谢你们，也谢谢正在使用的你。"));
      card.appendChild(el("div", "tc-sign", "—— BZX"));
      return card;
    }

    function divider() {
      return el("div", "info-divider");
    }

    return () => stopBackdrop();
  };

  /* ---------------- 侧边栏小图标 ---------------- */

  function markSvg(size, inner) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", size); svg.setAttribute("height", size);
    svg.setAttribute("viewBox", "0 0 18 18");
    svg.innerHTML = inner;
    return svg;
  }
  function markColor(selected) {
    return selected ? C.SeaGlass : "rgba(93,119,123,.7)";
  }

  function soundMark(selected) {
    const c = markColor(selected);
    return markSvg(18,
      '<ellipse cx="6.2" cy="12.9" rx="2.9" ry="1.9" fill="' + c + '"/>' +
      '<path d="M8.3 13.7 L8.3 3.1 Q13.1 4.2 11.6 8" fill="none" stroke="' + c + '" stroke-width="1.5" stroke-linecap="round"/>');
  }
  function infoMark(selected) {
    const c = markColor(selected);
    return markSvg(18,
      '<circle cx="9" cy="9" r="7.6" fill="none" stroke="' + c + '" stroke-width="1.5"/>' +
      '<circle cx="9" cy="5.8" r="0.8" fill="' + c + '"/>' +
      '<line x1="9" y1="8.4" x2="9" y2="12.4" stroke="' + c + '" stroke-width="1.5" stroke-linecap="round"/>');
  }
  function heartMark(selected) {
    const c = markColor(selected);
    return markSvg(18,
      '<path d="M9 15.8 C0.9 10.4 1.8 2.2 9 6.1 C16.2 2.2 17.1 10.4 9 15.8 Z" fill="' + c + '"/>');
  }

  function breezeMark(size, color) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", size); svg.setAttribute("height", size);
    svg.setAttribute("viewBox", "0 0 22 22");
    let d = "";
    for (let i = 0; i < 3; i++) {
      const y = 22 * (0.25 + i * 0.25);
      d += "M0 " + y + " L" + 22 * (0.6 - i * 0.12) + " " + y +
        " Q" + 22 * (0.95 - i * 0.1) + " " + y + " " + 22 * (0.8 - i * 0.12) + " " + (y - 22 * 0.15) + " ";
    }
    svg.innerHTML = '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.4" stroke-linecap="round"/>';
    return svg;
  }
})();
