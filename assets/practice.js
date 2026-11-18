/* 练习引擎：逐字符反馈、虚拟键盘、实时指标与结果页 */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var t = function (key, params) { return window.I18N ? window.I18N.t(key, params) : key; };

  var el = {
    layer: $("#practiceLayer"),
    course: $("#pCourse"),
    title: $("#pTitle"),
    progress: $("#pProgress"),
    wpm: $("#pWpm"),
    acc: $("#pAcc"),
    time: $("#pTime"),
    combo: $("#pCombo"),
    count: $("#pCount"),
    stage: $("#stage"),
    keyboard: $("#keyboard"),
    keyboardWrap: $("#keyboardWrap"),
    foot: $("#pFootHint"),
    result: $("#resultLayer"),
    back: $("#practiceBack"),
    restart: $("#pRestart"),
    sink: $("#keySink")
  };

  var S = null;
  var audio = null;

  var KEY_ROWS = [
    [
      { k: "`", label: "`" }, { k: "1" }, { k: "2" }, { k: "3" }, { k: "4" }, { k: "5" },
      { k: "6" }, { k: "7" }, { k: "8" }, { k: "9" }, { k: "0" }, { k: "-" }, { k: "=" },
      { k: "Backspace", labelKey: "practice.key.backspace", w: 2, special: true }
    ],
    [
      { k: "Tab", label: "Tab", w: 1.5, special: true },
      { k: "q" }, { k: "w" }, { k: "e" }, { k: "r" }, { k: "t" }, { k: "y" }, { k: "u" },
      { k: "i" }, { k: "o" }, { k: "p" }, { k: "[" }, { k: "]" },
      { k: "\\", label: "\\", w: 1.4 }
    ],
    [
      { k: "CapsLock", label: "Caps", w: 1.7, special: true },
      { k: "a" }, { k: "s" }, { k: "d" }, { k: "f", home: true }, { k: "g" }, { k: "h" },
      { k: "j", home: true }, { k: "k" }, { k: "l" }, { k: ";" }, { k: "'" },
      { k: "Enter", labelKey: "practice.key.enter", w: 2.1, special: true }
    ],
    [
      { k: "ShiftLeft", label: "Shift", w: 2.2, special: true },
      { k: "z" }, { k: "x" }, { k: "c" }, { k: "v" }, { k: "b" }, { k: "n" }, { k: "m" },
      { k: "," }, { k: "." }, { k: "/" },
      { k: "ShiftRight", label: "Shift", w: 2.2, special: true }
    ],
    [
      { k: "Space", labelKey: "practice.key.space", w: 8, special: true }
    ]
  ];

  var KEY_LABELS = { Backspace: "Back", ShiftLeft: "Shift", ShiftRight: "Shift", Space: "Space", CapsLock: "Caps", Enter: "Enter", Tab: "Tab" };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatTime(sec) {
    var s = Math.max(0, Math.round(sec));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ":" + String(r).padStart(2, "0");
  }

  function settings() {
    return window.Store.state.settings;
  }

  function ensureAudio() {
    if (audio) return audio;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audio = { ctx: new Ctx(), key: null, err: null };
    } catch (err) {
      audio = null;
    }
    return audio;
  }

  function tone(freq, dur, type, gainValue) {
    var a = ensureAudio();
    if (!a) return;
    if (a.ctx.state === "suspended") a.ctx.resume();
    var osc = a.ctx.createOscillator();
    var gain = a.ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainValue || 0.03, a.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, a.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(a.ctx.destination);
    osc.start();
    osc.stop(a.ctx.currentTime + dur);
  }

  function soundKey() {
    if (!settings().sound) return;
    tone(1650, 0.035, "square", 0.018);
  }

  function soundError() {
    if (!settings().sound) return;
    tone(132, 0.1, "sawtooth", 0.045);
  }

  function soundDone() {
    if (!settings().sound) return;
    tone(660, 0.09, "sine", 0.04);
    setTimeout(function () { tone(990, 0.12, "sine", 0.035); }, 90);
  }

  function speak(text) {
    if (window.Speech) {
      window.Speech.speak(text);
      return;
    }
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      var utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      utter.rate = 0.95;
      window.speechSynthesis.speak(utter);
    } catch (err) { /* 忽略语音不可用 */ }
  }

  function stopSpeaking() {
    if (window.Speech) {
      window.Speech.stop();
      return;
    }
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (err) { /* noop */ }
    }
  }

  function autoSpeak(text) {
    if (settings().speak) speak(text);
  }

  function focusSink() {
    if (!el.sink) return;
    try {
      el.sink.value = "";
      el.sink.focus({ preventScroll: true });
    } catch (err) {
      el.sink.focus();
    }
  }

  /* ---------- 键盘 ---------- */

  function buildKeyboard() {
    if (!el.keyboard) return;
    el.keyboard.innerHTML = "";
    KEY_ROWS.forEach(function (row) {
      var rowEl = document.createElement("div");
      rowEl.className = "kb-row";
      row.forEach(function (key) {
        var keyEl = document.createElement("div");
        keyEl.className = "key" + (key.special ? " key-special" : "");
        if (key.home) keyEl.classList.add("key-home");
        keyEl.style.flexGrow = key.w || 1;
        keyEl.dataset.key = key.k;
        keyEl.textContent = key.labelKey ? t(key.labelKey) : (key.label || key.k);
        rowEl.appendChild(keyEl);
      });
      el.keyboard.appendChild(rowEl);
    });
  }

  function findKeyEl(name) {
    if (!el.keyboard || !name) return null;
    var selector = '.key[data-key="' + String(name).replace(/"/g, '\\"') + '"]';
    return el.keyboard.querySelector(selector);
  }

  function clearExpected() {
    if (!el.keyboard) return;
    el.keyboard.querySelectorAll(".key.expected").forEach(function (node) {
      node.classList.remove("expected");
    });
  }

  function highlightExpected(char) {
    clearExpected();
    if (!char) return;
    var keyName = char;
    if (char === " ") keyName = "Space";
    var lower = keyName.toLowerCase();
    var target = findKeyEl(lower) || findKeyEl(keyName);
    if (target) target.classList.add("expected");
    if (/[A-Z]/.test(char)) {
      findKeyEl("ShiftLeft") && findKeyEl("ShiftLeft").classList.add("expected");
      findKeyEl("ShiftRight") && findKeyEl("ShiftRight").classList.add("expected");
    } else if (/[A-Za-z]/.test(char) && char !== char.toLowerCase()) {
      findKeyEl("ShiftLeft") && findKeyEl("ShiftLeft").classList.add("expected");
    }
  }

  function pressKeyVisual(key) {
    if (!el.keyboard) return;
    var name = key;
    if (key === " ") name = "Space";
    if (key === "Shift") name = "ShiftLeft";
    var node = findKeyEl(name.toLowerCase()) || findKeyEl(name);
    if (!node) return;
    node.classList.add("pressed");
    setTimeout(function () { node.classList.remove("pressed"); }, 90);
  }

  function markHeat(key, level) {
    if (!el.keyboard) return;
    var name = String(key) === " " ? "Space" : String(key);
    var node = findKeyEl(name.toLowerCase()) || findKeyEl(name);
    if (!node) return;
    node.classList.remove("heat-1", "heat-2", "heat-3");
    node.classList.add(level >= 3 ? "heat-3" : level >= 2 ? "heat-2" : "heat-1");
  }

  /* ---------- 渲染 ---------- */

  function currentItem() {
    return S.items[S.index];
  }

  function renderShell() {
    el.course.textContent = S.cfg.courseTitle + (S.cfg.levelNumber ? " · " + t("practice.level", { n: S.cfg.levelNumber }) : "");
    el.title.textContent = S.cfg.title;
    el.foot.textContent = S.cfg.tip || t(S.cfg.mode === "sentence" ? "practice.tip.sentence" : "practice.tip.word");
    el.progress.style.width = "0%";
    el.wpm.textContent = "0";
    el.acc.textContent = "100";
    el.time.textContent = "0:00";
    el.combo.textContent = "0";
    el.count.textContent = "0 / " + S.items.length;
    el.keyboardWrap.hidden = !settings().keyboard;
    el.result.hidden = true;
  }

  function renderStage() {
    var item = currentItem();
    var hasSpeak = window.Speech ? window.Speech.supported() : !!window.speechSynthesis;
    var unitKey = S.cfg.mode === "sentence" ? "practice.playSentence" : "practice.playWord";
    var repeatKey = S.cfg.mode === "sentence" ? "practice.repeatSentence" : "practice.repeatWord";
    el.stage.innerHTML =
      '<div class="stage-inner" data-mode="' + S.cfg.mode + '">' +
        '<div class="target" id="target"></div>' +
        '<div class="stage-meta">' +
          (hasSpeak
            ? '<span class="speak-tools">' +
                '<button class="speak-btn" id="stageSpeak" title="' + escapeHtml(t(unitKey)) + '" aria-label="' + escapeHtml(t(unitKey)) + '"><svg><use href="#i-speaker"/></svg></button>' +
                '<button class="speak-btn" id="stageRepeat" title="' + escapeHtml(t(repeatKey)) + '" aria-label="' + escapeHtml(t(repeatKey)) + '"><svg><use href="#i-refresh"/></svg></button>' +
                '<button class="speak-btn" id="stageStop" title="' + escapeHtml(t("practice.stop")) + '" aria-label="' + escapeHtml(t("practice.stop")) + '"><svg><use href="#i-close"/></svg></button>' +
              "</span>"
            : "") +
          (item.m ? '<span class="stage-meaning">' + escapeHtml(item.m) + "</span>" : "") +
        "</div>" +
        '<div class="stage-hint" id="stageHint">' + (S.started ? "" : t("practice.startHint")) + "</div>" +
      "</div>";
    buildTarget();

    function play(event) {
      if (event) event.stopPropagation();
      focusSink();
      speak(item.t);
    }

    var speakBtn = $("#stageSpeak");
    var repeatBtn = $("#stageRepeat");
    var stopBtn = $("#stageStop");
    if (speakBtn) speakBtn.addEventListener("click", play);
    if (repeatBtn) repeatBtn.addEventListener("click", play);
    if (stopBtn) {
      stopBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        focusSink();
        stopSpeaking();
      });
    }
    if (window.Speech && window.Speech.isSpeaking() && speakBtn) {
      speakBtn.classList.add("is-speaking");
    }
    highlightExpected(item.t[S.typed.length]);
    if (S.started) autoSpeak(item.t);
  }

  function makeChar(ch) {
    var span = document.createElement("span");
    span.className = "ch";
    if (ch === " ") span.classList.add("space");
    span.textContent = ch === " " ? " " : ch;
    return span;
  }

  function buildTarget() {
    var container = $("#target");
    if (!container) return;
    var target = currentItem().t;
    S.charEls = [];
    var frag = document.createDocumentFragment();

    if (S.cfg.mode === "sentence") {
      var tokens = target.split(" ");
      tokens.forEach(function (token, i) {
        if (token.length) {
          var wordEl = document.createElement("span");
          wordEl.className = "word";
          for (var c = 0; c < token.length; c++) {
            var charEl = makeChar(token[c]);
            wordEl.appendChild(charEl);
            S.charEls.push(charEl);
          }
          frag.appendChild(wordEl);
        }
        if (i < tokens.length - 1) {
          var spaceEl = makeChar(" ");
          frag.appendChild(spaceEl);
          S.charEls.push(spaceEl);
        }
      });
    } else {
      for (var i = 0; i < target.length; i++) {
        var span = makeChar(target[i]);
        frag.appendChild(span);
        S.charEls.push(span);
      }
    }

    container.innerHTML = "";
    container.appendChild(frag);
    paintChars();
  }

  function paintChars() {
    var target = currentItem().t;
    var typed = S.typed;
    for (var i = 0; i < S.charEls.length; i++) {
      var node = S.charEls[i];
      node.className = "ch" + (target[i] === " " ? " space" : "");
      if (i < typed.length) {
        if (typed[i] === target[i]) node.classList.add("correct");
        else node.classList.add("wrong");
      } else if (i === typed.length) {
        node.classList.add("current");
      } else {
        node.classList.add("pending");
      }
    }
    highlightExpected(target[typed.length]);
  }

  function flashError() {
    var inner = el.stage.querySelector(".stage-inner");
    if (!inner) return;
    inner.classList.remove("shake");
    void inner.offsetWidth;
    inner.classList.add("shake");
  }

  /* ---------- 会话 ---------- */

  function elapsed() {
    if (!S || !S.startedAt) return 0;
    var end = S.finishedAt || performance.now();
    return Math.max(0, (end - S.startedAt) / 1000);
  }

  function currentProgressChars() {
    if (!S) return 0;
    var chars = 0;
    for (var i = 0; i < S.typed.length; i++) {
      if (S.typed[i] === currentItem().t[i]) chars += 1;
    }
    return S.netChars + chars;
  }

  function wpmNow() {
    var sec = elapsed();
    if (!sec) return 0;
    return (currentProgressChars() / 5) / (sec / 60);
  }

  function accNow() {
    if (!S || !S.keystrokes) return 100;
    return (S.correct / S.keystrokes) * 100;
  }

  function updateLive() {
    if (!S) return;
    el.time.textContent = formatTime(elapsed());
    el.wpm.textContent = String(Math.round(wpmNow()));
    el.acc.textContent = String(Math.round(accNow()));
    el.combo.textContent = String(S.combo);
  }

  function startClock() {
    if (S.startedAt) return;
    S.startedAt = performance.now();
    var hint = $("#stageHint");
    if (hint) hint.textContent = "";
    S.tick = setInterval(updateLive, 200);
  }

  function updateProgress() {
    var pct = S.items.length ? Math.round((S.index / S.items.length) * 100) : 0;
    el.progress.style.width = pct + "%";
    el.count.textContent = S.index + " / " + S.items.length;
  }

  function handleChar(key) {
    // 单词模式：词间空格不作为输入，避免完成一个词后误记到下一个词
    if (S.cfg.mode === "word" && key === " ") return;
    var item = currentItem();
    if (!item) return;
    var target = item.t;
    if (S.typed.length >= target.length) return;
    var expected = target[S.typed.length];
    S.keystrokes += 1;

    if (key === expected) {
      S.typed.push(key);
      S.correct += 1;
      S.combo += 1;
      if (S.combo > S.maxCombo) S.maxCombo = S.combo;
      soundKey();
      paintChars();
      if (S.typed.length === target.length) {
        completeItem();
      } else {
        updateLive();
      }
    } else {
      S.combo = 0;
      S.itemHadError = true;
      S.wrongKeys[key] = (S.wrongKeys[key] || 0) + 1;
      S.misses[expected] = (S.misses[expected] || 0) + 1;
      if (S.cfg.mode === "sentence") {
        S.typed.push(key);
        paintChars();
        if (S.typed.length === target.length) {
          completeItem();
        }
      } else {
        flashError();
      }
      markHeat(key, S.wrongKeys[key]);
      soundError();
      el.combo.textContent = "0";
      updateLive();
    }
  }

  function backspace() {
    if (!S || !S.typed.length) return;
    S.typed.pop();
    paintChars();
    if (S.finished) return;
    updateLive();
  }

  function completeItem() {
    var item = currentItem();
    var target = item.t;
    var correctChars = 0;
    for (var i = 0; i < S.typed.length; i++) {
      if (S.typed[i] === target[i]) correctChars += 1;
    }
    S.netChars += correctChars;
    S.doneItems += 1;
    if (S.itemHadError) {
      var exists = S.errored.some(function (entry) { return entry.t === item.t; });
      if (!exists) S.errored.push({ t: item.t, m: item.m });
    }

    S.typed = [];
    S.itemHadError = false;
    S.index += 1;
    updateProgress();

    if (S.index >= S.items.length) {
      finish();
      return;
    }

    renderStage();
    updateLive();
  }

  function starsFor(wpm, acc) {
    var target = S.cfg.targetWpm || 25;
    if (acc >= 98 && wpm >= target) return 3;
    if (acc >= 92) return 2;
    return 1;
  }

  function finish() {
    if (!S || S.finished) return;
    S.finished = true;
    S.finishedAt = performance.now();
    clearInterval(S.tick);
    S.tick = null;
    stopSpeaking();
    soundDone();

    var sec = elapsed();
    var wpm = sec > 0 ? (S.netChars / 5) / (sec / 60) : 0;
    var acc = accNow();
    var stars = starsFor(wpm, acc);

    var saved = window.Store.recordSession({
      levelId: S.cfg.levelId,
      courseId: S.cfg.courseId,
      courseTitle: S.cfg.courseTitle,
      title: S.cfg.title,
      mode: S.cfg.mode,
      wpm: wpm,
      acc: acc,
      sec: sec,
      keystrokes: S.keystrokes,
      correct: S.correct,
      chars: S.netChars,
      items: S.doneItems,
      stars: stars,
      errored: S.errored,
      keyErrors: S.wrongKeys,
      keyMisses: S.misses,
      maxCombo: S.maxCombo
    });

    el.progress.style.width = "100%";
    el.count.textContent = S.items.length + " / " + S.items.length;
    el.wpm.textContent = String(Math.round(wpm));
    el.acc.textContent = String(Math.round(acc));
    el.time.textContent = formatTime(sec);

    renderResult(saved, { wpm: wpm, acc: acc, sec: sec, stars: stars });
  }

  function renderResult(saved, summary) {
    var s = saved.session;
    var starHtml = "";
    for (var i = 0; i < 3; i++) {
      starHtml += '<svg class="result-star' + (i < summary.stars ? " filled" : "") + '"><use href="#i-star"/></svg>';
    }

    var achHtml = "";
    if (saved.newAchievements.length) {
      achHtml = '<div class="result-achievements">' +
        saved.newAchievements.map(function (a) {
          return '<span class="ach-chip"><svg><use href="#i-' + a.icon + '"/></svg>' + escapeHtml(a.name) + "</span>";
        }).join("") +
        "</div>";
    }

    var errorHtml = "";
    if (S.errored.length) {
      errorHtml =
        '<div class="result-block">' +
          '<div class="result-block-title">' + t("result.weak") + '</div>' +
          '<div class="error-chips">' +
            S.errored.slice(0, 10).map(function (item) {
              return '<span class="error-chip"><b>' + escapeHtml(item.t) + "</b>" +
                (item.m ? "<i>" + escapeHtml(item.m) + "</i>" : "") + "</span>";
            }).join("") +
          "</div>" +
        "</div>";
    } else {
      errorHtml =
        '<div class="result-block">' +
          '<div class="result-block-title">' + t("result.weak") + '</div>' +
          '<p class="result-none">' + t("result.noErrors") + '</p>' +
        "</div>";
    }

    var topWrong = window.Store.topKeys(S.wrongKeys, 5);
    var keysHtml = topWrong.length
      ? '<div class="result-block"><div class="result-block-title">' + t("result.topWrong") + '</div><div class="key-chips">' +
        topWrong.map(function (entry) {
          return '<span class="key-chip"><kbd>' + escapeHtml(entry.key === " " ? t("heat.space") : entry.key) + "</kbd><i>×" + entry.count + "</i></span>";
        }).join("") + "</div></div>"
      : "";

    var bestHtml = saved.isBest
      ? '<span class="record-chip">' + t("result.newRecord", { n: Math.round(saved.prevBest) }) + "</span>"
      : "";
    var levelUpHtml = saved.levelUp ? '<span class="record-chip">' + t("result.levelUp", { n: window.Store.xpInfo().level }) + "</span>" : "";

    var nextEntry = S.cfg.levelId && S.cfg.levelId.indexOf("custom-") !== 0 && S.cfg.levelId !== "review"
      ? window.APP_DATA.nextLevel(S.cfg.levelId)
      : null;
    var nextBtn = "";
    if (nextEntry && window.Store.isUnlocked(nextEntry.course, nextEntry.index)) {
      nextBtn = '<button class="btn primary" data-result="next" data-next="' +
        escapeHtml(nextEntry.level.id) + '">' + t("result.next") + '<svg><use href="#i-arrow-right"/></svg></button>';
    }

    el.result.innerHTML =
      '<div class="result-scrim"></div>' +
      '<div class="result-card">' +
        '<div class="result-head">' +
          '<div class="result-eyebrow">' + t("result.done") + '</div>' +
          '<h2>' + escapeHtml(S.cfg.title) + "</h2>" +
          '<p class="result-sub">' + escapeHtml(t("result.summary", {
            course: S.cfg.courseTitle,
            count: t(S.cfg.mode === "sentence" ? "unit.sentences" : "unit.words", { n: S.doneItems }),
            time: t("result.timeUsed", { time: formatTime(summary.sec) })
          })) + "</p>" +
          '<div class="result-stars">' + starHtml + "</div>" +
          '<div class="result-chips">' + bestHtml + levelUpHtml + "</div>" +
        "</div>" +
        '<div class="result-grid">' +
          '<div class="result-metric"><span>' + t("metric.speed") + '</span><strong>' + Math.round(s.wpm) + '</strong><i>WPM</i></div>' +
          '<div class="result-metric"><span>' + t("metric.accuracy") + '</span><strong>' + Math.round(s.acc) + '</strong><i>%</i></div>' +
          '<div class="result-metric"><span>' + t("metric.keystrokes") + '</span><strong>' + s.keystrokes + '</strong><i>' + t("unit.times", { n: "" }).trim() + '</i></div>' +
          '<div class="result-metric"><span>' + t("metric.combo") + '</span><strong>' + s.maxCombo + '</strong><i>' + t("unit.times", { n: "" }).trim() + '</i></div>' +
          '<div class="result-metric"><span>' + t("metric.chars") + '</span><strong>' + s.chars + '</strong><i>' + t("unit.chars", { n: "" }).trim() + '</i></div>' +
          '<div class="result-metric"><span>' + t("metric.xp") + '</span><strong>+' + saved.xpGain + '</strong><i>XP</i></div>' +
        "</div>" +
        achHtml +
        errorHtml +
        keysHtml +
        '<div class="result-actions">' +
          '<button class="ghost-btn" data-result="exit">' + t("result.back") + '</button>' +
          '<button class="' + (nextBtn ? "ghost-btn" : "btn primary") + '" data-result="retry">' + t("result.retry") + '</button>' +
          nextBtn +
        "</div>" +
      "</div>";

    el.result.hidden = false;
    el.result.querySelector(".result-card").classList.add("show");
    el.result.scrollTop = 0;
    if (el.sink) el.sink.blur();
  }

  el.result.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-result]");
    if (!btn) return;
    var action = btn.getAttribute("data-result");
    if (action === "retry") {
      restart();
    } else if (action === "next") {
      var nextId = btn.getAttribute("data-next");
      var cfg = buildConfig(nextId);
      if (cfg) {
        try { history.replaceState(null, "", "#/practice/" + nextId); } catch (err) { /* noop */ }
        start(cfg);
      }
    } else if (action === "exit") {
      exit();
    }
  });

  function buildConfig(levelId) {
    var found = window.APP_DATA.findLevel(levelId);
    if (!found) return null;
    var course = found.course;
    var level = found.level;
    var next = window.APP_DATA.nextLevel(levelId);
    var nextCfg = null;
    if (next && window.Store.isUnlocked(next.course, next.index)) {
      nextCfg = { levelId: next.level.id };
    }
    return {
      levelId: level.id,
      courseId: course.id,
      courseTitle: course.title,
      title: level.title,
      tip: level.tip || "",
      mode: level.mode || course.mode,
      targetWpm: level.targetWpm || course.targetWpm,
      levelNumber: found.index + 1,
      items: level.items.map(window.APP_DATA.normalizeItem),
      next: nextCfg,
      isReview: false
    };
  }

  function start(cfg) {
    if (!cfg || !cfg.items || !cfg.items.length) return;
    teardownSession();
    S = {
      cfg: cfg,
      items: cfg.items.slice(),
      index: 0,
      typed: [],
      charEls: [],
      keystrokes: 0,
      correct: 0,
      combo: 0,
      maxCombo: 0,
      wrongKeys: {},
      misses: {},
      errored: [],
      itemHadError: false,
      netChars: 0,
      doneItems: 0,
      startedAt: null,
      finishedAt: null,
      finished: false,
      started: false,
      tick: null
    };

    el.layer.hidden = false;
    el.result.hidden = true;
    document.body.classList.add("is-practicing");
    renderShell();
    if (!el.keyboard.dataset.ready) {
      buildKeyboard();
      el.keyboard.dataset.ready = "1";
    }
    el.keyboard.querySelectorAll(".key").forEach(function (node) {
      node.classList.remove("expected", "pressed", "heat-1", "heat-2", "heat-3");
    });
    renderStage();
    updateLive();
    document.addEventListener("keydown", onKeyDown, true);
    focusSink();
  }

  function teardownSession() {
    if (S && S.tick) clearInterval(S.tick);
    document.removeEventListener("keydown", onKeyDown, true);
    stopSpeaking();
    S = null;
  }

  function restart() {
    if (!S) return;
    var cfg = S.cfg;
    teardownSession();
    if (el.result) el.result.hidden = true;
    start(cfg);
  }

  function exit() {
    var wasActive = !!S;
    if (S) {
      S.finished = true;
      teardownSession();
    }
    document.body.classList.remove("is-practicing");
    if (el.layer) el.layer.hidden = true;
    if (el.result) el.result.hidden = true;
    if (wasActive && window.Practice.onExit) window.Practice.onExit();
  }

  function onKeyDown(event) {
    if (!S || S.finished) return;
    if (!el.result.hidden) return;

    var key = event.key;

    if (key === "Escape") {
      event.preventDefault();
      exit();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (key === "Backspace") {
      event.preventDefault();
      S.started = true;
      if (!S.startedAt) startClock();
      backspace();
      return;
    }
    if (key === "Tab" || key === "Enter" || key === "Delete" || key === "ArrowLeft" ||
        key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown" || key === "Dead") {
      event.preventDefault();
      return;
    }
    if (key.length !== 1) return;

    event.preventDefault();
    S.started = true;
    startClock();
    pressKeyVisual(key);
    handleChar(key);
  }

  function startReview() {
    var items = window.Store.errors().slice(0, 30).map(function (entry) {
      return { t: entry.word, m: entry.meaning };
    });
    if (!items.length) return false;
    start({
      levelId: "review",
      courseId: "review",
      courseTitle: t("review.course"),
      title: t("review.title"),
      tip: t("review.tip"),
      mode: "word",
      targetWpm: 25,
      levelNumber: 0,
      items: items,
      next: null,
      isReview: true
    });
    return true;
  }

  el.back.addEventListener("click", exit);
  el.restart.addEventListener("click", restart);
  el.layer.addEventListener("pointerdown", function (event) {
    if (event.target.closest("button")) return;
    focusSink();
  });

  if (window.Speech) {
    window.Speech.onState(function (speaking) {
      var btn = $("#stageSpeak");
      if (btn) btn.classList.toggle("is-speaking", !!speaking);
    });
  }

  window.Practice = {
    start: start,
    startLevel: function (levelId) {
      var cfg = buildConfig(levelId);
      if (!cfg) return false;
      start(cfg);
      return true;
    },
    startReview: startReview,
    startCustom: function (text) {
      var items = String(text || "")
        .split(/\r?\n/)
        .map(function (line) { return line.trim(); })
        .filter(function (line) { return line.length > 0; })
        .slice(0, 60)
        .map(function (line) { return { t: line, m: "" }; });
      if (!items.length) return false;
      start({
        levelId: "custom-" + Date.now(),
        courseId: "custom",
        courseTitle: t("custom.course"),
        title: t("custom.levelTitle"),
        tip: t("custom.tip"),
        mode: "sentence",
        targetWpm: 30,
        levelNumber: 0,
        items: items,
        next: null,
        isReview: false
      });
      return true;
    },
    restart: restart,
    exit: exit,
    isActive: function () { return !!S; },
    onExit: null,
    onNavigate: null
  };
})();
