/* 打字练习：原生文本框保留输入法、选区与移动端键盘支持。 */
(function () {
  "use strict";
  const BZX = window.BZX;
  const el = BZX.el;

  BZX.TypingScreen = function (root) {
    const engine = BZX.TypingEngine;
    root.classList.add("typing-screen");
    let language = "zh";
    let passage = engine.passages.find((item) => item.language === language);
    let startedAt = null;
    let finishedAt = null;
    let composing = false;
    let timer = null;

    const page = el("div", "typing-page");
    root.appendChild(page);
    const top = el("header", "typing-top");
    const back = el("button", "typing-back", "←  返回游戏大厅");
    back.type = "button";
    BZX.sfxButton(back, () => BZX.router.backToLibrary());
    top.appendChild(back);
    top.appendChild(el("div", "typing-brand", "BZX  /  THE TYPING ROOM"));
    page.appendChild(top);

    const intro = el("div", "typing-intro");
    const eyebrow = el("div", "typing-eyebrow", "一字一句，遇见好文章");
    intro.appendChild(eyebrow);
    intro.appendChild(el("h1", "typing-title", "书页之间"));
    intro.appendChild(el("p", "typing-subtitle", "放慢一点，在经典里练习打字。"));
    page.appendChild(intro);

    const panel = el("main", "typing-panel");
    page.appendChild(panel);
    const toolbar = el("div", "typing-toolbar");
    const modes = el("div", "typing-modes");
    modes.setAttribute("role", "group");
    modes.setAttribute("aria-label", "选择练习语言");
    const zhBtn = el("button", "typing-mode", "中文练习");
    const enBtn = el("button", "typing-mode", "English");
    zhBtn.type = enBtn.type = "button";
    modes.appendChild(zhBtn); modes.appendChild(enBtn);
    toolbar.appendChild(modes);
    const selection = el("div", "typing-selection");
    const selectLabel = el("label", "typing-select-label", "选择篇目");
    selectLabel.htmlFor = "typing-passage";
    const select = el("select", "typing-select");
    select.id = "typing-passage";
    selection.appendChild(selectLabel); selection.appendChild(select);
    toolbar.appendChild(selection);
    panel.appendChild(toolbar);

    const heading = el("div", "typing-work-heading");
    const workInfo = el("div");
    const workKicker = el("div", "typing-work-kicker", "TODAY’S READING  /  经典节选");
    const workTitle = el("h2", "typing-work-title");
    const workAuthor = el("div", "typing-work-author");
    workInfo.appendChild(workKicker); workInfo.appendChild(workTitle); workInfo.appendChild(workAuthor);
    heading.appendChild(workInfo);
    const restart = el("button", "typing-restart", "↻  重新练习");
    restart.type = "button";
    heading.appendChild(restart);
    panel.appendChild(heading);

    const metrics = el("div", "typing-metrics");
    function metric(label) {
      const box = el("div", "typing-metric");
      box.appendChild(el("div", "typing-metric-label", label));
      const value = el("div", "typing-metric-value");
      box.appendChild(value); metrics.appendChild(box);
      return value;
    }
    const speedValue = metric("平均速度");
    const accuracyValue = metric("准确率");
    const timeValue = metric("用时");
    panel.appendChild(metrics);

    const progressRow = el("div", "typing-progress-row");
    progressRow.appendChild(el("span", null, "练习进度"));
    const progressText = el("span", "typing-progress-text");
    progressRow.appendChild(progressText); panel.appendChild(progressRow);
    const progressTrack = el("div", "typing-progress-track");
    progressTrack.setAttribute("role", "progressbar");
    progressTrack.setAttribute("aria-label", "练习进度");
    progressTrack.setAttribute("aria-valuemin", "0");
    progressTrack.setAttribute("aria-valuemax", "100");
    const progressFill = el("div", "typing-progress-fill");
    progressTrack.appendChild(progressFill); panel.appendChild(progressTrack);

    const readingLabel = el("div", "typing-section-label", "原文  /  阅读并跟打");
    panel.appendChild(readingLabel);
    const reading = el("div", "typing-reading");
    reading.setAttribute("role", "text");
    reading.tabIndex = 0;
    panel.appendChild(reading);
    const inputHead = el("div", "typing-input-head");
    const inputLabel = el("label", "typing-section-label", "在这里输入");
    inputLabel.htmlFor = "typing-input";
    inputHead.appendChild(inputLabel);
    const inputHint = el("span", "typing-input-hint", "支持中文输入法，可退格修改");
    inputHead.appendChild(inputHint); panel.appendChild(inputHead);
    const input = el("textarea", "typing-input");
    input.id = "typing-input";
    input.placeholder = "从这里开始，计时将在输入时启动…";
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("aria-describedby", "typing-help typing-status");
    panel.appendChild(input);
    const footer = el("div", "typing-footer");
    const help = el("p", "typing-help", "按原文输入，包含空格和标点；可在完成前修改。粘贴不可用于练习。");
    help.id = "typing-help";
    footer.appendChild(help);
    const status = el("p", "typing-status", "准备好后，开始输入吧。");
    status.id = "typing-status";
    status.setAttribute("role", "status");
    footer.appendChild(status); panel.appendChild(footer);
    const note = el("p", "typing-note", "速度按当前输入的正确字符计算（含标点和空格）；中文为字符/分钟，英文以 5 个字符计为 1 词。准确率按当前文本计算。");
    page.appendChild(note);

    function elapsed() {
      return startedAt === null ? 0 : Math.max(0, (finishedAt === null ? performance.now() : finishedAt) - startedAt);
    }
    function clock(ms) {
      const seconds = Math.floor(ms / 1000);
      return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
    }
    function updateStats() {
      const stats = engine.getStats(passage, input.value, elapsed());
      speedValue.textContent = Math.round(stats.speed) + " " + (language === "zh" ? "字符/分" : "WPM");
      accuracyValue.textContent = Math.round(stats.accuracy) + "%";
      timeValue.textContent = clock(elapsed());
      progressText.textContent = Math.min(stats.typed, stats.total) + " / " + stats.total;
      progressFill.style.width = Math.min(100, stats.progress) + "%";
      progressTrack.setAttribute("aria-valuenow", String(Math.round(Math.min(100, stats.progress))));
      return stats;
    }
    function renderReading() {
      const expected = Array.from(passage.text);
      const actual = Array.from(input.value);
      const fragment = document.createDocumentFragment();
      let current = null;
      expected.forEach((char, index) => {
        const node = el("span", index < actual.length ? (actual[index] === char ? "typing-correct" : "typing-error") : (index === actual.length && finishedAt === null ? "typing-current" : ""), char);
        if (index === actual.length) current = node;
        fragment.appendChild(node);
      });
      reading.replaceChildren(fragment);
      if (current && startedAt !== null) {
        const currentRect = current.getBoundingClientRect();
        const readingRect = reading.getBoundingClientRect();
        if (currentRect.top < readingRect.top || currentRect.bottom > readingRect.bottom) {
          reading.scrollTop += currentRect.top - readingRect.top - reading.clientHeight / 3;
        }
      } else if (startedAt === null) reading.scrollTop = 0;
    }
    function stopTimer() { if (timer !== null) { clearInterval(timer); timer = null; } }
    function begin() {
      if (startedAt === null && finishedAt === null) {
        startedAt = performance.now();
        status.textContent = "正在练习，慢慢来。";
        timer = setInterval(() => {
          if (composing) timeValue.textContent = clock(elapsed());
          else updateStats();
        }, 250);
      }
    }
    function processInput() {
      if (composing || finishedAt !== null) return;
      const chars = Array.from(input.value);
      const total = Array.from(passage.text).length;
      if (chars.length > total) input.value = chars.slice(0, total).join("");
      if (input.value && startedAt === null) begin();
      let stats = updateStats();
      if (stats.complete) {
        finishedAt = performance.now();
        stopTimer();
        input.readOnly = true;
        stats = updateStats();
        status.textContent = "练习完成！平均速度 " + Math.round(stats.speed) + (language === "zh" ? " 字符/分" : " WPM") + "，准确率 " + Math.round(stats.accuracy) + "%";
      }
      renderReading();
    }
    function reset() {
      stopTimer(); startedAt = null; finishedAt = null; composing = false;
      input.value = ""; input.readOnly = false;
      status.textContent = "准备好后，开始输入吧。";
      workTitle.textContent = passage.title;
      workAuthor.textContent = passage.author + " · 节选";
      reading.setAttribute("aria-label", "练习原文：" + passage.text);
      inputHint.textContent = language === "zh" ? "支持中文输入法，可退格修改" : "区分大小写，可退格修改";
      root.setAttribute("data-language", language);
      zhBtn.classList.toggle("active", language === "zh");
      enBtn.classList.toggle("active", language === "en");
      zhBtn.setAttribute("aria-pressed", String(language === "zh"));
      enBtn.setAttribute("aria-pressed", String(language === "en"));
      updateStats(); renderReading();
    }
    function chooseLanguage(next) {
      if (language === next) return;
      language = next;
      fillOptions();
      reset();
    }
    function fillOptions() {
      select.replaceChildren();
      engine.passages.filter((item) => item.language === language).forEach((item) => {
        const option = el("option", null, item.title + " · " + item.author);
        option.value = item.id;
        select.appendChild(option);
      });
      passage = engine.passages.find((item) => item.language === language);
      select.value = passage.id;
    }
    zhBtn.addEventListener("click", () => chooseLanguage("zh"));
    enBtn.addEventListener("click", () => chooseLanguage("en"));
    select.addEventListener("change", () => {
      passage = engine.passages.find((item) => item.id === select.value) || passage;
      reset();
    });
    restart.addEventListener("click", () => { reset(); input.focus(); });
    input.addEventListener("beforeinput", (event) => {
      if (event.inputType && event.inputType.indexOf("insert") === 0 && !event.isComposing) begin();
    });
    input.addEventListener("compositionstart", () => { composing = true; begin(); });
    input.addEventListener("compositionend", () => { composing = false; processInput(); });
    input.addEventListener("input", (event) => { if (!event.isComposing) processInput(); });
    ["paste", "drop"].forEach((name) => input.addEventListener(name, (event) => {
      event.preventDefault(); status.textContent = "请手动输入原文，完成一次打字练习。";
    }));
    fillOptions(); reset();
    return () => stopTimer();
  };
})();
