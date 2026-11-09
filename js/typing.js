/* 打字练习：逐行原文与输入，保留原生输入法和键盘操作。 */
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
    let compositionTimer = null;
    let timer = null;
    let entered = "";
    let rows = [];
    let compact = null;
    let resultDialog = null;

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
    const translationButton = el("button", "typing-translation-toggle", "查看中文译文");
    translationButton.type = "button";
    translationButton.setAttribute("aria-expanded", "false");
    translationButton.setAttribute("aria-controls", "typing-translation");
    panel.appendChild(translationButton);
    const translation = el("div", "typing-translation");
    translation.id = "typing-translation";
    translation.hidden = true;
    translation.appendChild(el("div", "typing-translation-label", "中文参考译文 · AI 生成"));
    const translationText = el("p", "typing-translation-text");
    translation.appendChild(translationText);
    panel.appendChild(translation);

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

    const readingLabel = el("div", "typing-section-label", "逐行跟打  /  原文在上，输入在下");
    panel.appendChild(readingLabel);
    const reading = el("div", "typing-reading");
    reading.setAttribute("aria-label", "逐行打字练习");
    panel.appendChild(reading);
    const footer = el("div", "typing-footer");
    const help = el("p", "typing-help", "在每行原文下方输入，输满自动换行；可退格修改。英文空格以 · 表示，标点也需输入。");
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
      const stats = engine.getStats(passage, entered, elapsed());
      speedValue.textContent = Math.round(stats.speed) + " " + (language === "zh" ? "字符/分" : "WPM");
      accuracyValue.textContent = Math.round(stats.accuracy) + "%";
      timeValue.textContent = clock(elapsed());
      progressText.textContent = Math.min(stats.typed, stats.total) + " / " + stats.total;
      progressFill.style.width = Math.min(100, stats.progress) + "%";
      progressTrack.setAttribute("aria-valuenow", String(Math.round(Math.min(100, stats.progress))));
      return stats;
    }
    function closeResult() {
      if (resultDialog) { resultDialog.remove(); resultDialog = null; }
    }
    function showResult(stats) {
      closeResult();
      const scrim = el("div", "typing-result-scrim");
      resultDialog = scrim;
      const confetti = el("div", "typing-confetti");
      confetti.setAttribute("aria-hidden", "true");
      for (let i = 0; i < 36; i++) {
        const piece = el("i", "typing-confetti-piece");
        piece.style.setProperty("--x", (8 + ((i * 37) % 85)) + "%");
        piece.style.setProperty("--delay", ((i % 9) * .11) + "s");
        piece.style.setProperty("--drift", (((i * 43) % 180) - 90) + "px");
        piece.style.setProperty("--color", ["#ddb876", "#79aa9c", "#d99580", "#b6a7cc"][i % 4]);
        confetti.appendChild(piece);
      }
      for (let burst = 0; burst < 2; burst++) {
        const firework = el("div", "typing-firework " + (burst ? "typing-firework-right" : "typing-firework-left"));
        for (let ray = 0; ray < 12; ray++) {
          const spark = el("i", "typing-firework-spark");
          spark.style.setProperty("--angle", (ray * 30) + "deg");
          spark.style.setProperty("--color", ["#f4ca7e", "#b3ddc9", "#f0a28a"][ray % 3]);
          firework.appendChild(spark);
        }
        confetti.appendChild(firework);
      }
      scrim.appendChild(confetti);
      const box = el("section", "typing-result");
      box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
      box.setAttribute("aria-labelledby", "typing-result-title");
      box.appendChild(el("div", "typing-result-mark", "✦"));
      box.appendChild(el("div", "typing-result-kicker", "A PAGE WELL SPENT"));
      const title = el("h2", "typing-result-title", "这一篇，完成了！");
      title.id = "typing-result-title"; box.appendChild(title);
      box.appendChild(el("p", "typing-result-caption", passage.title + " · " + passage.author));
      const summary = el("div", "typing-result-metrics");
      [["平均速度", stats.speed + (language === "zh" ? " 字符/分" : " WPM")], ["准确率", stats.accuracy + "%"], ["用时", clock(elapsed())]].forEach(([label, value]) => {
        const item = el("div", "typing-result-metric");
        item.appendChild(el("strong", null, value)); item.appendChild(el("span", null, label)); summary.appendChild(item);
      });
      box.appendChild(summary);
      const buttons = el("div", "typing-result-actions");
      const dismiss = el("button", "typing-result-dismiss", "查看练习"); dismiss.type = "button";
      const again = el("button", "typing-result-again", "再练一次"); again.type = "button";
      dismiss.addEventListener("click", () => { closeResult(); restart.focus(); });
      again.addEventListener("click", () => { closeResult(); reset(); rows[0].input.focus(); });
      scrim.addEventListener("keydown", (event) => {
        if (event.key === "Escape") { event.preventDefault(); closeResult(); restart.focus(); }
        if (event.key === "Tab") {
          event.preventDefault();
          (document.activeElement === again ? dismiss : again).focus();
        }
      });
      buttons.appendChild(dismiss); buttons.appendChild(again); box.appendChild(buttons); scrim.appendChild(box);
      root.appendChild(scrim); again.focus();
    }
    function stopTimer() { if (timer !== null) { clearInterval(timer); timer = null; } }
    function cancelCompositionTimer() {
      if (compositionTimer !== null) { clearTimeout(compositionTimer); compositionTimer = null; }
    }
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
    function focusRow(index, atEnd) {
      const row = rows[Math.max(0, Math.min(index, rows.length - 1))];
      if (!row) return;
      row.input.focus({ preventScroll: true });
      if (atEnd) row.input.setSelectionRange(row.input.value.length, row.input.value.length);
      const rect = row.wrap.getBoundingClientRect(), container = reading.getBoundingClientRect();
      if (rect.bottom > container.bottom || rect.top < container.top) {
        reading.scrollTop += rect.top - container.top - 20;
      }
    }
    function syncRows() {
      const chars = Array.from(entered);
      rows.forEach((row) => {
        const text = chars.slice(row.start, row.start + row.length).join("");
        if (row.input.value !== text) {
          const active = document.activeElement === row.input;
          const start = row.input.selectionStart, end = row.input.selectionEnd;
          row.input.value = text;
          if (active) row.input.setSelectionRange(Math.min(start, text.length), Math.min(end, text.length));
        }
        row.input.readOnly = finishedAt !== null || row.start > chars.length;
        row.count = Array.from(text).length;
        Array.from(row.source.children).forEach((node, offset) => {
          const index = row.start + offset;
          const style = (index < chars.length ? (chars[index] === row.chars[offset] ? "typing-correct" : "typing-error") : (index === chars.length && finishedAt === null ? "typing-current" : "")) + (row.chars[offset] === " " ? " typing-space" : "");
          if (node.className !== style) node.className = style;
        });
      });
    }
    function buildRows() {
      compact = window.innerWidth <= 600;
      const limit = language === "zh" ? (compact ? 12 : 23) : (compact ? 22 : 40);
      const chars = Array.from(passage.text);
      reading.replaceChildren(); rows = [];
      for (let start = 0; start < chars.length;) {
        let end = Math.min(start + limit, chars.length);
        if (language === "en" && end < chars.length && chars[end - 1] !== " " && chars[end] !== " ") {
          const split = chars.slice(start, end).lastIndexOf(" ");
          if (split >= Math.floor(limit / 2)) end = start + split + 1;
        }
        if (language === "en" && chars[end] === " ") end++;
        const row = { start, length: end - start, chars: chars.slice(start, end), count: 0 };
        row.wrap = el("div", "typing-line");
        row.source = el("div", "typing-line-source");
        row.source.setAttribute("aria-hidden", "true");
        row.chars.forEach((char) => row.source.appendChild(el("span", "", char === " " ? "·" : char)));
        row.wrap.appendChild(row.source);
        row.input = el("input", "typing-line-input");
        row.input.type = "text";
        row.input.placeholder = start === 0 ? "在这里开始输入…" : "";
        row.input.setAttribute("aria-label", "第 " + (rows.length + 1) + " 行，原文：" + row.chars.join(""));
        row.input.setAttribute("aria-describedby", "typing-help typing-status");
        row.input.setAttribute("autocomplete", "off");
        row.input.setAttribute("autocapitalize", "off");
        row.input.setAttribute("spellcheck", "false");
        const rowIndex = rows.length;
        row.input.addEventListener("focus", () => {
          if (finishedAt === null && row.start > Array.from(entered).length) {
            focusRow(rows.findIndex((r) => r.start + r.length > Array.from(entered).length), true);
          }
        });
        row.input.addEventListener("beforeinput", (event) => {
          if (finishedAt !== null || composing) return;
          if (event.inputType === "deleteContentBackward" && rowIndex > 0 && row.input.selectionStart === 0 && row.input.selectionEnd === 0) {
            event.preventDefault();
            const current = Array.from(entered);
            current.splice(row.start - 1, 1); entered = current.join("");
            syncRows(); updateStats(); focusRow(rowIndex - 1, false);
            const previousRow = rows[rowIndex - 1];
            const caret = Array.from(previousRow.input.value).slice(0, row.start - previousRow.start - 1).join("").length;
            previousRow.input.setSelectionRange(caret, caret);
          } else if (event.inputType && event.inputType.indexOf("insert") === 0 && !event.isComposing) begin();
        });
        row.input.addEventListener("compositionstart", () => { cancelCompositionTimer(); composing = true; begin(); });
        row.input.addEventListener("compositionend", () => {
          composing = false;
          // Some input methods commit their final value in an input event after compositionend.
          cancelCompositionTimer();
          compositionTimer = setTimeout(() => { compositionTimer = null; processInput(row, rowIndex); resize(); }, 0);
        });
        row.input.addEventListener("input", (event) => {
          if (!event.isComposing) { cancelCompositionTimer(); processInput(row, rowIndex); resize(); }
        });
        ["paste", "drop"].forEach((name) => row.input.addEventListener(name, (event) => {
          event.preventDefault(); status.textContent = "请手动输入原文，完成一次打字练习。";
        }));
        row.wrap.appendChild(row.input); reading.appendChild(row.wrap); rows.push(row);
        start = end;
      }
      syncRows();
    }
    function processInput(row, rowIndex) {
      if (composing || finishedAt !== null) return;
      const previous = Array.from(entered);
      const chars = previous.slice(0, row.start).concat(Array.from(row.input.value), previous.slice(row.start + row.count));
      const total = Array.from(passage.text).length;
      const changed = chars.slice(0, total).join("") !== entered;
      const caretAtEnd = row.input.selectionStart === row.input.value.length;
      const caretIndex = Math.min(total, row.start + Array.from(row.input.value.slice(0, row.input.selectionStart)).length);
      entered = chars.slice(0, total).join("");
      if (entered && startedAt === null) begin();
      let stats = updateStats();
      if (stats.complete) {
        finishedAt = performance.now();
        stopTimer();
        stats = updateStats();
        status.textContent = "练习完成！平均速度 " + Math.round(stats.speed) + (language === "zh" ? " 字符/分" : " WPM") + "，准确率 " + Math.round(stats.accuracy) + "%";
      }
      syncRows();
      if (stats.complete) showResult(stats);
      else if (changed && caretAtEnd && caretIndex >= row.start + row.length && rowIndex + 1 < rows.length) {
        let target = rows.findIndex((candidate) => caretIndex < candidate.start + candidate.length);
        if (target < 0) target = rows.length - 1;
        focusRow(target, false);
        const offset = Array.from(rows[target].input.value).slice(0, caretIndex - rows[target].start).join("").length;
        rows[target].input.setSelectionRange(offset, offset);
      }
    }
    function reset() {
      closeResult();
      cancelCompositionTimer();
      stopTimer(); startedAt = null; finishedAt = null; composing = false;
      entered = "";
      status.textContent = "准备好后，开始输入吧。";
      workKicker.textContent = "TODAY’S READING  /  " + (passage.scope ? "经典全文" : "经典节选");
      workTitle.textContent = passage.title;
      workAuthor.textContent = passage.author + " · " + (passage.scope || "节选") + " · " + Array.from(passage.text).length + " 字符";
      translationButton.hidden = !passage.translation;
      translationButton.textContent = "查看中文译文";
      translationButton.setAttribute("aria-expanded", "false");
      translation.hidden = true;
      translationText.textContent = passage.translation || "";
      root.setAttribute("data-language", language);
      zhBtn.classList.toggle("active", language === "zh");
      enBtn.classList.toggle("active", language === "en");
      zhBtn.setAttribute("aria-pressed", String(language === "zh"));
      enBtn.setAttribute("aria-pressed", String(language === "en"));
      updateStats(); buildRows(); reading.scrollTop = 0;
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
        const option = el("option", null, item.title + " · " + item.author + "（" + (item.scope || "节选") + "）");
        option.value = item.id;
        select.appendChild(option);
      });
      passage = engine.passages.find((item) => item.language === language);
      select.value = passage.id;
    }
    zhBtn.addEventListener("click", () => chooseLanguage("zh"));
    enBtn.addEventListener("click", () => chooseLanguage("en"));
    translationButton.addEventListener("click", () => {
      const open = translation.hidden;
      translation.hidden = !open;
      translationButton.textContent = open ? "收起中文译文" : "查看中文译文";
      translationButton.setAttribute("aria-expanded", String(open));
    });
    select.addEventListener("change", () => {
      passage = engine.passages.find((item) => item.id === select.value) || passage;
      reset();
    });
    restart.addEventListener("click", () => { reset(); focusRow(0, false); });
    function resize() {
      if (composing || compact === (window.innerWidth <= 600)) return;
      const active = rows.findIndex((row) => row.input === document.activeElement);
      const caret = active < 0 ? null : rows[active].start + Array.from(rows[active].input.value.slice(0, rows[active].input.selectionStart)).length;
      buildRows();
      if (caret !== null && finishedAt === null) {
        let index = rows.findIndex((row) => caret < row.start + row.length);
        if (index < 0) index = rows.length - 1;
        focusRow(index, false);
        const offset = Array.from(rows[index].input.value).slice(0, Math.max(0, caret - rows[index].start)).join("").length;
        rows[index].input.setSelectionRange(offset, offset);
      }
    }
    window.addEventListener("resize", resize);
    fillOptions(); reset();
    return () => { cancelCompositionTimer(); stopTimer(); closeResult(); window.removeEventListener("resize", resize); };
  };
})();
