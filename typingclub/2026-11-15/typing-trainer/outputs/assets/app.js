/* 应用层：路由、首页、课程库、统计、错词本、设置 */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var t = function (key, params) { return window.I18N ? window.I18N.t(key, params) : key; };

  var VIEWS = ["home", "courses", "stats", "errors", "settings"];
  var VIEW_META = {
    home: { titleKey: "view.home.title", subKey: "view.home.sub" },
    courses: { titleKey: "view.courses.title", subKey: "view.courses.sub" },
    stats: { titleKey: "view.stats.title", subKey: "view.stats.sub" },
    errors: { titleKey: "view.errors.title", subKey: "view.errors.sub" },
    settings: { titleKey: "view.settings.title", subKey: "view.settings.sub" }
  };
  var activeView = "home";

  var els = {
    views: {},
    pageTitle: $("#pageTitle"),
    pageSub: $("#pageSub"),
    nav: $("#nav"),
    themeBtn: $("#themeBtn"),
    profileLevel: $("#profileLevel"),
    profileStreak: $("#profileStreak"),
    profileXpBar: $("#profileXpBar"),
    profileXpText: $("#profileXpText"),
    navErrorBadge: $("#navErrorBadge"),
    modalLayer: $("#modalLayer"),
    modal: $("#modal"),
    toastStack: $("#toastStack"),
    main: $(".main"),
    keySink: $("#keySink")
  };

  var suppressExit = false;
  var mediaTheme = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function icon(name) {
    return '<svg class="ic"><use href="#i-' + name + '"/></svg>';
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------- 主题 ---------- */

  function applyTheme() {
    var setting = window.Store.state.settings.theme || "auto";
    var resolved = setting;
    if (setting === "auto") {
      resolved = mediaTheme && mediaTheme.matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", resolved);
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme");
    var next = current === "dark" ? "light" : "dark";
    window.Store.updateSettings({ theme: next });
    applyTheme();
  }

  /* ---------- 反馈 ---------- */

  function toast(message, type) {
    var node = document.createElement("div");
    node.className = "toast" + (type ? " toast-" + type : "");
    node.textContent = message;
    els.toastStack.appendChild(node);
    setTimeout(function () { node.classList.add("out"); }, 2400);
    setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 2800);
  }

  function openModal(html) {
    els.modal.innerHTML = html;
    els.modalLayer.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    els.modalLayer.hidden = true;
    els.modal.innerHTML = "";
    document.body.classList.remove("modal-open");
  }

  function openSessionModal(sessionId) {
    var session = window.Store.state.sessions.filter(function (s) { return s.id === sessionId; })[0];
    if (!session) {
      toast(t("session.missing"));
      return;
    }
    var entry = session.levelId ? window.APP_DATA.findLevel(session.levelId) : null;
    var canRetry = entry && window.Store.isUnlocked(entry.course, entry.index);
    var cells = [
      [t("metric.speed"), Math.round(session.wpm) + " WPM"],
      [t("metric.accuracy"), Math.round(session.acc) + "%"],
      [t("practice.stat.time"), fmtClock(session.sec)],
      [t("session.content"), modeWord(session.items || 0, session.mode)],
      [t("metric.keystrokes"), t("unit.times", { n: session.keystrokes || 0 })],
      [t("metric.chars"), t("unit.chars", { n: session.chars || 0 })],
      [t("metric.combo"), t("unit.times", { n: session.maxCombo || 0 })],
      [t("session.rating"), starRow(session.stars || 0)]
    ].map(function (cell) {
      return '<div class="session-cell"><span>' + cell[0] + "</span><b>" + cell[1] + "</b></div>";
    }).join("");

    var errored = (session.errored || []).map(function (word) {
      return '<span class="err-chip">' + escapeHtml(word) + "</span>";
    }).join("");

    openModal(
      '<div class="modal-head"><h3>' + t("session.title") + '</h3>' +
        '<button class="icon-btn" data-modal-close aria-label="' + escapeHtml(t("session.close")) + '">' + icon("close") + "</button></div>" +
      '<div class="modal-body">' +
        '<div class="session-title"><b>' + escapeHtml(session.title) + "</b>" +
          "<span>" + escapeHtml(session.courseTitle) + " · " + fmtDate(session.at) + "</span></div>" +
        '<div class="session-grid">' + cells + "</div>" +
        (errored ? '<div class="session-note"><span>' + t("session.missed") + '</span><div>' + errored + "</div></div>" : "") +
        '<div class="modal-actions">' +
          '<button class="ghost-btn" data-modal-close>' + t("session.close") + "</button>" +
          (canRetry ? '<button class="btn primary" id="sessionRetry">' + t("session.retry") + "</button>" : "") +
        "</div>" +
      "</div>"
    );

    var retry = $("#sessionRetry");
    if (retry) {
      retry.addEventListener("click", function () {
        closeModal();
        startLevel(session.levelId);
      });
    }
  }

  /* ---------- 工具 ---------- */

  function fmtDuration(sec) {
    if (!sec || sec < 1) return "—";
    if (sec < 60) return t("time.sec", { n: Math.round(sec) });
    var minutes = sec / 60;
    if (minutes < 60) return t("time.min", { n: minutes < 10 ? minutes.toFixed(1) : Math.round(minutes) });
    var hours = Math.floor(minutes / 60);
    var rest = Math.round(minutes % 60);
    return rest ? t("time.hourMin", { h: hours, m: rest }) : t("time.hour", { h: hours });
  }

  function fmtClock(sec) {
    var s = Math.max(0, Math.round(sec || 0));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function fmtDate(ts) {
    if (!ts) return "—";
    var d = new Date(ts);
    return (d.getMonth() + 1) + "/" + d.getDate() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function fmtRelative(ts) {
    if (!ts) return "—";
    var diff = Date.now() - ts;
    if (diff < 60 * 1000) return t("time.justNow");
    if (diff < 60 * 60 * 1000) return t("time.minutesAgo", { n: Math.floor(diff / 60000) });
    if (diff < 24 * 60 * 60 * 1000) return t("time.hoursAgo", { n: Math.floor(diff / 3600000) });
    if (diff < 7 * 24 * 60 * 60 * 1000) return t("time.daysAgo", { n: Math.floor(diff / 86400000) });
    return fmtDate(ts);
  }

  function starRow(stars) {
    var html = '<span class="stars">';
    for (var i = 0; i < 3; i++) {
      html += '<svg class="' + (i < stars ? "on" : "") + '"><use href="#i-star"/></svg>';
    }
    return html + "</span>";
  }

  function emptyState(iconName, title, desc, action) {
    return '<div class="empty">' +
      '<span class="empty-icon">' + icon(iconName) + "</span>" +
      "<b>" + escapeHtml(title) + "</b>" +
      "<span>" + escapeHtml(desc) + "</span>" +
      (action || "") +
      "</div>";
  }

  function modeWord(count, mode) {
    return t(mode === "sentence" ? "unit.sentences" : "unit.words", { n: count });
  }

  /* ---------- 图表 ---------- */

  function trendChart(sessions) {
    if (!sessions.length) {
      return emptyState("chart", t("chart.emptyTitle"), t("chart.emptyDesc"));
    }
    var list = sessions.slice(0, 12).slice().reverse();
    var width = 720;
    var height = 230;
    var padL = 42;
    var padR = 46;
    var padT = 20;
    var padB = 30;
    var innerW = width - padL - padR;
    var innerH = height - padT - padB;
    var maxWpm = Math.max(30, Math.ceil(Math.max.apply(null, list.map(function (s) { return s.wpm; })) / 10) * 10);

    function xAt(i) {
      if (list.length === 1) return padL + innerW / 2;
      return padL + (i * innerW) / (list.length - 1);
    }
    function yWpm(v) { return padT + (1 - v / maxWpm) * innerH; }
    function yAcc(v) { return padT + (1 - v / 100) * innerH; }

    var points = list.map(function (s, i) { return xAt(i) + "," + yWpm(s.wpm); });
    var accPoints = list.map(function (s, i) { return xAt(i) + "," + yAcc(s.acc); });
    var areaPath = "M" + xAt(0) + "," + (padT + innerH) + " L" + points.join(" L") +
      " L" + xAt(list.length - 1) + "," + (padT + innerH) + " Z";

    var grid = "";
    var gridLabels = "";
    [0, 0.25, 0.5, 0.75, 1].forEach(function (ratio) {
      var y = padT + ratio * innerH;
      var wpmValue = Math.round(maxWpm * (1 - ratio));
      var accValue = Math.round(100 * (1 - ratio));
      grid += '<line x1="' + padL + '" y1="' + y + '" x2="' + (width - padR) + '" y2="' + y + '" class="grid-line"/>';
      gridLabels += '<text x="' + (padL - 10) + '" y="' + (y + 4) + '" class="axis-label" text-anchor="end">' + wpmValue + "</text>";
      gridLabels += '<text x="' + (width - padR + 10) + '" y="' + (y + 4) + '" class="axis-label" text-anchor="start">' + accValue + "%</text>";
    });

    var dots = list.map(function (s, i) {
      return '<circle cx="' + xAt(i) + '" cy="' + yWpm(s.wpm) + '" r="3.4" class="chart-dot"/>';
    }).join("");

    var firstLabel = fmtDate(list[0].at).split(" ")[0];
    var lastLabel = fmtDate(list[list.length - 1].at).split(" ")[0];
    var xLabels =
      '<text x="' + padL + '" y="' + (height - 8) + '" class="axis-label">' + firstLabel + "</text>" +
      '<text x="' + (width - padR) + '" y="' + (height - 8) + '" class="axis-label" text-anchor="end">' + lastLabel + "</text>";

    return '<div class="chart-head">' +
        '<div class="chart-legend"><span><i class="legend-line accent"></i>' + t("chart.legend.speed") + '</span><span><i class="legend-line dashed"></i>' + t("chart.legend.acc") + "</span></div>" +
        '<span class="chart-caption">' + t("chart.caption", { n: list.length }) + "</span>" +
      "</div>" +
      '<svg viewBox="0 0 ' + width + " " + height + '" class="trend-svg" role="img" aria-label="' + escapeHtml(t("chart.aria")) + '">' +
        grid + gridLabels +
        '<path d="' + areaPath + '" class="chart-area"/>' +
        '<polyline points="' + points.join(" ") + '" class="chart-line"/>' +
        '<polyline points="' + accPoints.join(" ") + '" class="chart-line dashed"/>' +
        dots + xLabels +
      "</svg>";
  }

  function keyboardHeat() {
    var wrong = window.Store.state.keyErrors;
    var misses = window.Store.state.keyMisses;
    var rows = [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
      ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
      ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
      ["z", "x", "c", "v", "b", "n", "m"]
    ];
    var max = 1;
    Object.keys(wrong).forEach(function (key) { if (wrong[key] > max) max = wrong[key]; });

    var html = '<div class="heat-keyboard">';
    rows.forEach(function (row, rowIndex) {
      html += '<div class="heat-row" style="padding-left:' + (rowIndex * 8) + 'px">';
      row.forEach(function (key) {
        var count = wrong[key] || 0;
        var level = count === 0 ? 0 : Math.max(1, Math.min(4, Math.ceil((count / max) * 4)));
        html += '<span class="heat-key heat-' + level + '" title="' + escapeHtml(t("heat.keyTitle", { key: key, n: count })) + '">' + key + "</span>";
      });
      html += "</div>";
    });
    html += "</div>";

    var topWrong = window.Store.topKeys(wrong, 5);
    var topMiss = window.Store.topKeys(misses, 4);
    html += '<div class="heat-summary">';
    if (topWrong.length) {
      html += "<div><span class=\"heat-label\">" + t("heat.mostWrong") + "</span>" + topWrong.map(function (entry) {
        return '<span class="key-chip"><kbd>' + escapeHtml(entry.key === " " ? t("heat.space") : entry.key) + "</kbd><i>×" + entry.count + "</i></span>";
      }).join("") + "</div>";
    } else {
      html += '<p class="muted small">' + t("heat.none") + "</p>";
    }
    if (topMiss.length) {
      html += "<div><span class=\"heat-label\">" + t("heat.mostMissed") + "</span>" + topMiss.map(function (entry) {
        return '<span class="key-chip"><kbd>' + escapeHtml(entry.key === " " ? t("heat.space") : entry.key) + "</kbd><i>×" + entry.count + "</i></span>";
      }).join("") + "</div>";
    }
    html += "</div>";
    return html;
  }

  function calendarHeat() {
    var daily = window.Store.state.daily;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var dow = (today.getDay() + 6) % 7;
    var start = new Date(today);
    start.setDate(today.getDate() - dow - 11 * 7);

    var weeks = 12;
    var cells = [];
    for (var i = 0; i < weeks * 7; i++) {
      var d = new Date(start);
      d.setDate(start.getDate() + i);
      var key = window.Store.dateKey(d);
      var entry = daily[key];
      var minutes = entry ? entry.sec / 60 : 0;
      var level = 0;
      if (minutes > 0) level = 1;
      if (minutes >= 5) level = 2;
      if (minutes >= 15) level = 3;
      if (minutes >= 30) level = 4;
      var isFuture = d.getTime() > today.getTime();
      cells.push('<span class="cal-cell cal-' + (isFuture ? "future" : level) +
        '" title="' + key + (minutes > 0 ? " · " + t("cal.minutes", { n: Math.round(minutes) }) : " · " + t("cal.none")) + '"></span>');
    }

    var dayNames = t("cal.days").split("|");
    return '<div class="calendar-wrap">' +
        '<div class="cal-weekdays">' + dayNames.map(function (name) { return "<span>" + escapeHtml(name) + "</span>"; }).join("") + "</div>" +
        '<div class="cal-grid">' + cells.join("") + "</div>" +
      "</div>" +
      '<div class="cal-legend"><span>' + t("cal.less") + '</span><i class="cal-cell cal-0"></i><i class="cal-cell cal-1"></i><i class="cal-cell cal-2"></i><i class="cal-cell cal-3"></i><i class="cal-cell cal-4"></i><span>' + t("cal.more") + "</span></div>" +
      '<p class="muted small">' + t("cal.note") + "</p>";
  }

  /* ---------- 首页 ---------- */

  function renderHome() {
    var rec = window.Store.recommendation("words");
    var wordsCourse = window.APP_DATA.courses.filter(function (c) { return c.id === "words"; })[0];
    var wordsStarted = wordsCourse ? window.Store.courseProgress(wordsCourse).done > 0 : false;
    var today = window.Store.todayStats();
    var totals = window.Store.totals();
    var streak = window.Store.streak();
    var sessions = window.Store.state.sessions;
    var achievements = window.Store.achievements();
    var errorCount = window.Store.errorCount();

    var quickItems = window.APP_DATA.courses.filter(function (course) {
      return !course.imported;
    }).map(function (course) {
      var entry = window.Store.recommendation(course.id);
      var p = window.Store.courseProgress(course);
      var ic = course.id === "basics" ? "keyboard" : course.id === "words" ? "book" : "pen";
      var sub = t("home.quick.progress", { done: p.done, total: p.total });
      if (entry) sub += " · " + t("home.quick.next", { n: String(entry.index + 1).padStart(2, "0") });
      return '<button class="quick-item" data-action="start-level" data-level="' + (entry ? entry.level.id : course.levels[0].id) + '">' +
        '<span class="quick-icon">' + icon(ic) + "</span>" +
        '<span class="quick-text"><b>' + escapeHtml(course.title) + "</b><small>" + escapeHtml(sub) + "</small></span>" +
        '<span class="quick-go">' + icon("arrow-right") + "</span>" +
        "</button>";
    }).join("");
    var topError = window.Store.errors()[0];
    var errorSub = errorCount
      ? t("home.errorsSub", { n: errorCount, word: topError ? topError.word : "" })
      : t("home.errorsEmpty");
    quickItems += '<button class="quick-item quick-error" data-action="goto" data-view="errors">' +
      '<span class="quick-icon">' + icon("book") + "</span>" +
      '<span class="quick-text"><b>' + t("home.errorsTitle") + "</b><small>" + escapeHtml(errorSub) + "</small></span>" +
      '<span class="quick-go">' + icon("arrow-right") + "</span></button>";

    var heroAttrs = rec
      ? ' class="hero-main is-clickable" role="button" tabindex="0" data-href="#/practice/' + rec.level.id + '"'
      : ' class="hero-main"';

    var heroBtn = rec
      ? '<button class="btn primary lg" data-action="start-level" data-level="' + rec.level.id + '">' + t("home.start") + icon("arrow-right") + "</button>"
      : errorCount
        ? '<button class="btn primary lg" data-action="review">' + t("home.review") + icon("arrow-right") + "</button>"
        : '<button class="btn primary lg" data-action="custom">' + t("home.custom") + icon("arrow-right") + "</button>";

    var heroTitle = rec ? rec.level.title : t("home.allDone");
    var heroDesc = rec
      ? t("home.hero.desc", {
          course: rec.course.title,
          index: rec.index + 1,
          total: rec.total,
          mode: modeWord(rec.level.items.length, rec.course.mode)
        })
      : t("home.hero.descDone");

    var todayRows = [
      [t("home.row.duration"), fmtDuration(today.seconds)],
      [t("home.row.chars"), today.chars ? t("unit.chars", { n: today.chars }) : "—"],
      [t("home.row.wpm"), today.wpm ? today.wpm + " WPM" : "—"],
      [t("home.row.streak"), streak ? t("unit.days", { n: streak }) : "—"]
    ].map(function (row) {
      return '<div class="kv-row"><span>' + row[0] + "</span><b>" + row[1] + "</b></div>";
    }).join("");

    var statCards = [
      { label: t("home.stat.todayPractice"), value: fmtDuration(today.seconds), hint: today.sessions ? t("home.stat.sessions", { n: today.sessions }) : t("home.stat.noPractice"), icon: "clock" },
      { label: t("home.stat.todayWpm"), value: today.wpm ? today.wpm : "—", unit: today.wpm ? "WPM" : "", hint: t("home.stat.todayWpmHint"), icon: "bolt" },
      { label: t("home.stat.accuracy"), value: totals.accuracy ? Math.round(totals.accuracy) : "—", unit: totals.accuracy ? "%" : "", hint: totals.keystrokes ? t("home.stat.keystrokes", { n: totals.keystrokes }) : t("home.stat.startCounting"), icon: "target" },
      { label: t("home.stat.streak"), value: streak || "—", unit: streak ? t("unit.days", { n: "" }).trim() : "", hint: streak ? t("home.stat.streakHint") : t("home.stat.streakStart"), icon: "flame" }
    ].map(function (card) {
      return '<a class="stat-card" href="#/stats" title="' + escapeHtml(t("home.viewStats")) + '">' +
        '<span class="stat-icon">' + icon(card.icon) + "</span>" +
        '<span class="stat-label">' + escapeHtml(card.label) + "</span>" +
        '<span class="stat-value">' + card.value + (card.unit ? "<i>" + escapeHtml(card.unit) + "</i>" : "") + "</span>" +
        '<span class="stat-hint">' + escapeHtml(card.hint) + "</span>" +
        "</a>";
    }).join("");

    var recent = sessions.slice(0, 5);
    var recentHtml = recent.length
      ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>' + t("table.content") + "</th><th>" + t("table.speed") + "</th><th>" + t("table.accuracy") + "</th><th>" + t("table.time") + "</th><th>" + t("table.when") + "</th></tr></thead><tbody>" +
        recent.map(function (s) {
          return '<tr data-session-id="' + s.id + '" title="' + escapeHtml(t("table.rowTitle")) + '">' +
            "<td><b>" + escapeHtml(s.title) + "</b><span class=\"cell-sub\">" + escapeHtml(s.courseTitle) + "</span></td>" +
            "<td>" + Math.round(s.wpm) + " WPM</td>" +
            "<td>" + Math.round(s.acc) + "%</td>" +
            "<td>" + fmtClock(s.sec) + "</td>" +
            "<td class=\"muted\">" + fmtRelative(s.at) + "</td></tr>";
        }).join("") + "</tbody></table></div>"
      : emptyState("keyboard", t("home.recentEmptyTitle"), t("home.recentEmptyDesc"),
        '<button class="btn primary" data-action="start-level" data-level="words-01">' + t("home.startWords") + "</button>");

    var achHtml = achievements.slice(0, 6).map(function (a) {
      return '<div class="ach ' + (a.unlocked ? "on" : "off") + ' color-' + a.color + '">' +
        '<span class="ach-icon">' + icon(a.icon) + "</span>" +
        '<span class="ach-body"><b>' + escapeHtml(a.name) + "</b><small>" + escapeHtml(a.desc) + "</small></span>" +
        "</div>";
    }).join("");

    var now = new Date();
    els.views.home.innerHTML =
      '<div class="home-hero">' +
        "<div" + heroAttrs + ">" +
          '<div class="eyebrow">' + (rec ? (wordsStarted ? t("home.eyebrow.resume") : t("home.eyebrow.recommend")) : t("home.eyebrow.free")) + "</div>" +
          "<h2>" + escapeHtml(heroTitle) + "</h2>" +
          '<p class="hero-desc">' + escapeHtml(heroDesc) + "</p>" +
          '<div class="hero-actions">' + heroBtn +
            '<a class="ghost-btn" href="#/courses">' + t("home.browse") + "</a>" +
          "</div>" +
          (rec && rec.level.tip ? '<p class="hero-tip">' + escapeHtml(rec.level.tip) + "</p>" : "") +
        "</div>" +
        '<div class="hero-side card is-clickable" role="button" tabindex="0" data-href="#/stats" title="' + escapeHtml(t("home.viewStats")) + '">' +
          '<div class="card-head"><h3>' + t("home.today") + '</h3><span class="muted small">' + escapeHtml(t("home.date", { month: now.getMonth() + 1, day: now.getDate() })) + "</span></div>" +
          todayRows +
        "</div>" +
      "</div>" +
      '<div class="quick-head"><h3>' + t("home.courses") + '</h3><a class="text-link" href="#/courses">' + t("home.allCourses") + "</a></div>" +
      '<div class="quick-grid">' + quickItems + "</div>" +
      '<div class="stat-grid">' + statCards + "</div>" +
      '<div class="split">' +
        '<div class="card chart-card is-clickable" role="button" tabindex="0" data-href="#/stats" title="' + escapeHtml(t("home.viewChart")) + '">' +
          '<div class="card-head"><h3>' + t("home.chart") + '</h3><a class="text-link" href="#/stats">' + t("home.viewStats") + "</a></div>" + trendChart(sessions) + "</div>" +
        '<div class="card ach-card is-clickable" role="button" tabindex="0" data-href="#/stats" title="' + escapeHtml(t("home.viewAllAchievements")) + '">' +
          '<div class="card-head"><h3>' + t("home.achievements") + '</h3><span class="muted small">' + t("home.achCount", { done: achievements.filter(function (a) { return a.unlocked; }).length, total: achievements.length }) + "</span></div>" +
          '<div class="ach-grid">' + achHtml + "</div></div>" +
      "</div>" +
      '<div class="card recent-card"><div class="card-head"><h3>' + t("home.recent") + "</h3>" +
        (sessions.length ? '<span class="muted small">' + t("home.recentCount", { n: sessions.length }) + "</span>" : "") +
      "</div>" + recentHtml + "</div>";
  }

  /* ---------- 导入内容 ---------- */

  function toAscii(raw) {
    return String(raw == null ? "" : raw)
      .replace(/\r\n?/g, "\n")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u00a0/g, " ");
  }

  function cleanChunk(raw) {
    var text = toAscii(raw).replace(/"/g, " ");
    text = text.replace(/[^A-Za-z0-9\s'\-.,;:!?]/g, " ");
    text = text.replace(/\s+/g, " ").trim();
    text = text.replace(/\s+([,.;:!?])/g, "$1");
    text = text.replace(/([,;:])(?=[A-Za-z0-9])/g, "$1 ");
    text = text.replace(/([,;:])\1+/g, "$1");
    text = text.replace(/\.{3,}/g, "...");
    text = text.replace(/([!?])\1+/g, "$1");
    text = text.replace(/^[\s,.;:!?\-]+/, "").replace(/[\s,;:\-]+$/, "");
    return text;
  }

  function finishSentence(raw) {
    var text = cleanChunk(raw);
    if (!text) return "";
    text = text.charAt(0).toUpperCase() + text.slice(1);
    if (!/[.!?]$/.test(text)) text += ".";
    return text;
  }

  function cleanWord(raw) {
    var text = toAscii(raw).toLowerCase();
    text = text.replace(/^[^a-z]+/, "").replace(/[^a-z']+$/, "");
    text = text.replace(/'{2,}/g, "'");
    if (!text || !/[a-z]/.test(text) || text.length > 24) return "";
    return text;
  }

  function splitLineChunks(line) {
    var text = cleanChunk(line);
    if (!text) return [];
    var parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
    return parts.map(function (part) { return part.trim(); }).filter(Boolean);
  }

  function detectDelimiter(text) {
    var lines = toAscii(text).split(/\n+/).filter(function (line) { return line.trim(); }).slice(0, 8);
    if (!lines.length) return "";
    var best = "";
    var bestHits = 0;
    [",", "\t", ";", "|"].forEach(function (delimiter) {
      var hits = lines.filter(function (line) { return line.indexOf(delimiter) !== -1; }).length;
      if (hits > bestHits) {
        bestHits = hits;
        best = delimiter;
      }
    });
    return bestHits >= Math.ceil(lines.length * 0.6) ? best : "";
  }

  function looksLikeTable(text, fileName) {
    if (/\.(csv|tsv)$/i.test(fileName || "")) return true;
    var lines = toAscii(text).split(/\n+/).filter(function (line) { return line.trim(); }).slice(0, 10);
    if (lines.length < 2) return false;
    var delimiter = detectDelimiter(lines.join("\n"));
    if (!delimiter) return false;
    var hits = 0;
    lines.forEach(function (line) {
      var cells = line.split(delimiter);
      var first = (cells[0] || "").trim();
      var second = (cells[1] || "").trim();
      var wordCount = (first.match(/[A-Za-z][A-Za-z'\-]*/g) || []).length;
      if (first && second && wordCount <= 5 && !/[.!?]$/.test(first)) hits += 1;
    });
    return hits >= Math.ceil(lines.length * 0.7);
  }

  function parseTable(text, delimiter) {
    var sep = delimiter || detectDelimiter(text) || ",";
    var rows = [];
    var row = [];
    var cell = "";
    var quoted = false;
    var source = String(text == null ? "" : text);
    for (var i = 0; i < source.length; i++) {
      var ch = source[i];
      if (quoted) {
        if (ch === '"') {
          if (source[i + 1] === '"') {
            cell += '"';
            i += 1;
          } else {
            quoted = false;
          }
        } else {
          cell += ch;
        }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === sep) {
        row.push(cell);
        cell = "";
      } else if (ch === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (ch !== "\r") {
        cell += ch;
      }
    }
    row.push(cell);
    if (row.length > 1 || row[0].trim()) rows.push(row);
    return rows.filter(function (entry) {
      return entry.some(function (value) { return value.trim(); });
    });
  }

  function isHeaderRow(row) {
    var first = String(row[0] || "").trim().toLowerCase();
    var second = String(row[1] || "").trim().toLowerCase();
    return /^(word|words|term|terms|english|vocabulary|vocab|spelling|item)$/.test(first) ||
      /^(meaning|translation|definition|中文|释义|翻译)$/.test(second);
  }

  function analyzeImport(text, mode, fileName) {
    var kind = mode === "csv" || (mode === "auto" && looksLikeTable(text, fileName)) ? "csv" : "text";
    var words = [];
    var sentences = [];
    var seen = {};
    var duplicates = 0;
    var rows = 0;

    function pushWord(raw, meaning) {
      var value = cleanWord(raw);
      if (!value) return;
      var key = "w:" + value;
      if (seen[key]) {
        duplicates += 1;
        return;
      }
      seen[key] = 1;
      words.push({
        t: value,
        m: meaning ? String(meaning).replace(/\s+/g, " ").trim().slice(0, 40) : ""
      });
    }

    function pushSentence(raw, meaning) {
      var value = finishSentence(raw);
      if (!value) return;
      var key = "s:" + value.toLowerCase();
      if (seen[key]) {
        duplicates += 1;
        return;
      }
      seen[key] = 1;
      sentences.push({
        t: value,
        m: meaning ? String(meaning).replace(/\s+/g, " ").trim().slice(0, 60) : ""
      });
    }

    if (kind === "csv") {
      parseTable(text).forEach(function (row, index) {
        var first = row[0] || "";
        var second = row[1] || "";
        if (!first.trim()) return;
        if (index === 0 && isHeaderRow(row)) return;
        rows += 1;
        var tokens = first.match(/[A-Za-z][A-Za-z'\-]*/g) || [];
        if (tokens.length <= 1) pushWord(first, second);
        else pushSentence(first, second);
      });
    } else {
      toAscii(text).split(/\n+/).forEach(function (line) {
        splitLineChunks(line).forEach(function (chunk) {
          var tokens = chunk.match(/[A-Za-z][A-Za-z'\-]*/g) || [];
          if (!tokens.length) return;
          rows += 1;
          if (tokens.length === 1) pushWord(chunk);
          else pushSentence(chunk);
        });
      });
    }

    if (words.length > 400) words = words.slice(0, 400);
    if (sentences.length > 200) sentences = sentences.slice(0, 200);
    return { kind: kind, words: words, sentences: sentences, duplicates: duplicates, rows: rows };
  }

  function importPreviewHtml(result, fileName) {
    if (!result.rows) {
      return '<p class="import-empty">' + t("import.empty") + "</p>";
    }
    var chips = result.words.slice(0, 8).map(function (item) {
      return '<span class="import-chip">' + escapeHtml(item.t) + "</span>";
    }).join("");
    chips += result.sentences.slice(0, 4).map(function (item) {
      return '<span class="import-chip sentence">' + escapeHtml(item.t) + "</span>";
    }).join("");
    var wordLevels = Math.ceil(result.words.length / 20);
    var sentenceLevels = Math.ceil(result.sentences.length / 6);
    return '<div class="import-summary">' +
        "<span><b>" + result.words.length + "</b> " + escapeHtml(t("import.words", { n: "" }).trim()) + "</span>" +
        "<span><b>" + result.sentences.length + "</b> " + escapeHtml(t("import.sentences", { n: "" }).trim()) + "</span>" +
        (result.duplicates ? "<span>" + t("import.duplicates", { n: result.duplicates }) + "</span>" : "") +
        "<span>" + (result.kind === "csv" ? t("import.parsedTable") : t("import.parsedText")) + "</span>" +
        (fileName ? "<span>" + escapeHtml(fileName) + "</span>" : "") +
      "</div>" +
      (chips ? '<div class="import-chips">' + chips + "</div>" : "") +
      '<p class="import-note">' + t("import.note", { words: wordLevels, sentences: sentenceLevels }) + "</p>";
  }

  function openImportModal() {
    openModal(
      '<div class="modal-head"><h3>' + t("import.title") + '</h3><button class="icon-btn" data-modal-close aria-label="' + escapeHtml(t("session.close")) + '">' + icon("close") + "</button></div>" +
      '<div class="modal-body">' +
        '<p class="muted small">' + t("import.desc") + "</p>" +
        '<div class="import-form">' +
          '<div class="import-input-row">' +
            '<input type="text" id="importTitle" class="text-input" maxlength="30" placeholder="' + escapeHtml(t("import.namePlaceholder")) + '">' +
            '<label class="ghost-btn small import-file-btn">' + icon("book") + t("import.chooseFile") +
              '<input type="file" id="importPracticeFile" accept=".txt,.csv,.tsv,text/plain,text/csv" hidden>' +
            "</label>" +
          "</div>" +
          '<textarea id="importText" rows="7" spellcheck="false" placeholder="' + escapeHtml(t("import.textPlaceholder")) + '"></textarea>' +
          '<div class="segmented import-mode" id="importMode">' +
            '<button data-import-mode="auto" class="active">' + t("import.mode.auto") + "</button>" +
            '<button data-import-mode="text">' + t("import.mode.text") + "</button>" +
            '<button data-import-mode="csv">' + t("import.mode.csv") + "</button>" +
          "</div>" +
          '<div class="import-preview" id="importPreview"></div>' +
        "</div>" +
        '<div class="modal-actions">' +
          '<button class="ghost-btn" data-modal-close>' + t("import.cancel") + "</button>" +
          '<button class="btn primary" id="importConfirm">' + t("import.confirm") + "</button>" +
        "</div>" +
      "</div>"
    );

    var textarea = $("#importText");
    var titleInput = $("#importTitle");
    var preview = $("#importPreview");
    var fileInput = $("#importPracticeFile");
    var modeBar = $("#importMode");
    var state = { mode: "auto", fileName: "" };

    function analyze() {
      return analyzeImport(textarea ? textarea.value : "", state.mode, state.fileName);
    }

    function update() {
      if (preview) preview.innerHTML = importPreviewHtml(analyze(), state.fileName);
    }

    if (textarea) {
      textarea.addEventListener("input", update);
      textarea.focus();
    }

    if (fileInput) {
      fileInput.addEventListener("change", function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
          toast(t("import.tooLarge"));
          fileInput.value = "";
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          state.fileName = file.name;
          if (textarea) textarea.value = String(reader.result || "");
          if (titleInput && !titleInput.value.trim()) {
            titleInput.value = file.name.replace(/\.[^.]+$/, "").slice(0, 30);
          }
          if (/\.(csv|tsv)$/i.test(file.name) && modeBar) {
            state.mode = "csv";
            $$("[data-import-mode]", modeBar).forEach(function (btn) {
              btn.classList.toggle("active", btn.getAttribute("data-import-mode") === "csv");
            });
          }
          update();
          toast(t("import.read", { name: file.name }));
        };
        reader.onerror = function () { toast(t("import.readFail"), "error"); };
        reader.readAsText(file, "utf-8");
      });
    }

    if (modeBar) {
      modeBar.addEventListener("click", function (event) {
        var btn = event.target.closest("[data-import-mode]");
        if (!btn) return;
        state.mode = btn.getAttribute("data-import-mode");
        $$("[data-import-mode]", modeBar).forEach(function (node) {
          node.classList.toggle("active", node === btn);
        });
        update();
      });
    }

    var confirm = $("#importConfirm");
    if (confirm) {
      confirm.addEventListener("click", function () {
        var result = analyze();
        if (!result.words.length && !result.sentences.length) {
          toast(t("import.none"));
          return;
        }
        var title = (titleInput && titleInput.value.trim()) ||
          t("import.defaultTitle", { n: window.Store.state.imports.length + 1 });
        var pack = {
          id: "imp-" + Date.now().toString(36),
          title: title.slice(0, 30),
          source: state.fileName || "",
          createdAt: Date.now(),
          words: result.words,
          sentences: result.sentences,
          kind: result.kind,
          stats: { duplicates: result.duplicates, rows: result.rows }
        };
        window.Store.addImport(pack);
        window.APP_DATA.setImports(window.Store.state.imports);
        closeModal();
        if (location.hash === "#/courses") {
          renderCourses();
        } else {
          location.hash = "#/courses";
        }
        updateProfile();
        toast(t("import.done", { title: pack.title, words: result.words.length, sentences: result.sentences.length }));
        window.setTimeout(function () {
          var block = document.querySelector('[data-course-id="' + pack.id + '"]');
          if (block && block.scrollIntoView) {
            block.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 120);
      });
    }

    update();
  }

  /* ---------- 课程库 ---------- */

  function levelCard(course, entry) {
    var level = entry.level;
    var index = entry.index;
    var stat = window.Store.levelStat(level.id);
    var unlocked = window.Store.isUnlocked(course, index);
    var done = stat && stat.completed;
    var cls = "level-card" + (done ? " done" : "") + (unlocked ? "" : " locked");
    var metaBits = [modeWord(level.items.length, level.mode || course.mode)];
    if (done && stat.bestWpm) metaBits.push(t("courses.best", { n: Math.round(stat.bestWpm) }));
    if (!unlocked) metaBits = [t("courses.locked")];

    var stateIcon = done ? "check" : unlocked ? "arrow-right" : "lock";
    return '<button class="' + cls + '" data-level="' + level.id + '"' + (unlocked ? "" : ' aria-disabled="true"') + ">" +
      '<span class="level-index">' + String(index + 1).padStart(2, "0") + "</span>" +
      '<span class="level-body"><span class="level-title">' + escapeHtml(level.title) + "</span>" +
      '<span class="level-meta">' + metaBits.join(" · ") + "</span>" +
      (done ? starRow(stat.stars || 0) : "") +
      "</span>" +
      '<span class="level-state">' + icon(stateIcon) + "</span>" +
      "</button>";
  }

  function renderCourses() {
    var importedCount = window.Store.state.imports.length;
    var blocks = window.APP_DATA.courses.map(function (course) {
      var progress = window.Store.courseProgress(course);
      var levels = course.levels.map(function (level, index) {
        return levelCard(course, { level: level, index: index, total: course.levels.length });
      }).join("");

      return '<section class="course-block' + (course.imported ? " imported-block" : "") +
          '" data-course-id="' + escapeHtml(course.id) + '">' +
        '<div class="course-head">' +
          '<div class="course-title-row">' +
            '<span class="course-tag">' + escapeHtml(course.short) + "</span>" +
            "<h2>" + escapeHtml(course.title) + "</h2>" +
            '<span class="course-count">' + t("courses.levels", { done: progress.done, total: progress.total }) + "</span>" +
            (course.imported
              ? '<button class="icon-btn tiny course-remove" data-action="remove-import" data-import-id="' +
                escapeHtml(course.id) + '" title="' + escapeHtml(t("import.removeTitle")) + '" aria-label="' + escapeHtml(t("import.removeTitle")) + '">' + icon("trash") + "</button>"
              : "") +
          "</div>" +
          '<p class="course-desc">' + escapeHtml(course.desc) + "</p>" +
          '<div class="course-progress"><div class="mini-track"><i style="width:' + progress.percent + '%"></i></div>' +
            '<span>' + (progress.stars ? t("courses.stars", { n: progress.stars, max: progress.maxStars }) : t("courses.notStarted")) + "</span></div>" +
        "</div>" +
        '<div class="level-grid">' + levels + "</div>" +
      "</section>";
    }).join("");

    els.views.courses.innerHTML = blocks +
      '<section class="course-block import-block">' +
        '<div class="course-title-row import-head">' +
          "<h2>" + t("import.sectionTitle") + "</h2>" +
          (importedCount ? '<span class="course-count">' + t("import.importedCount", { n: importedCount }) + "</span>" : "") +
        "</div>" +
        '<p class="course-desc">' + t("import.sectionDesc") + "</p>" +
        '<div class="import-grid">' +
          '<div class="custom-card" data-action="import-content">' +
            '<span class="custom-icon">' + icon("book") + "</span>" +
            "<div><h3>" + t("import.cardTitle") + "</h3><p>" + t("import.cardDesc") + "</p></div>" +
            '<span class="custom-go">' + icon("plus") + "</span>" +
          "</div>" +
          '<div class="custom-card" data-action="custom">' +
            '<span class="custom-icon">' + icon("pen") + "</span>" +
            "<div><h3>" + t("import.customTitle") + "</h3><p>" + t("import.customDesc") + "</p></div>" +
            '<span class="custom-go">' + icon("arrow-right") + "</span>" +
          "</div>" +
        "</div>" +
      "</section>";
  }

  /* ---------- 统计 ---------- */

  function renderStats() {
    var totals = window.Store.totals();
    var best = window.Store.bestWpm();
    var sessions = window.Store.state.sessions;
    var achievements = window.Store.achievements();

    var summary = [
      { label: t("stats.sessions"), value: totals.sessions || "—", hint: t("stats.sessionsHint") },
      { label: t("stats.chars"), value: totals.chars ? totals.chars : "—", hint: t("stats.charsHint") },
      { label: t("stats.best"), value: best ? Math.round(best) : "—", hint: best ? t("stats.bestUnit") : t("stats.bestHint") },
      { label: t("stats.accuracy"), value: totals.accuracy ? Math.round(totals.accuracy) + "%" : "—", hint: totals.keystrokes ? t("stats.keystrokesHint", { n: totals.keystrokes }) : t("stats.afterPractice") },
      { label: t("stats.levels"), value: totals.levels || "—", hint: t("stats.levelsHint") },
      { label: t("stats.duration"), value: fmtDuration(totals.seconds), hint: t("stats.durationHint") }
    ].map(function (item) {
      return '<div class="stat-card compact"><span class="stat-label">' + escapeHtml(item.label) + "</span>" +
        '<span class="stat-value">' + item.value + "</span>" +
        '<span class="stat-hint">' + escapeHtml(item.hint) + "</span></div>";
    }).join("");

    var records = sessions.slice(0, 12);
    var tableHtml = records.length
      ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>' + t("stats.col.time") + "</th><th>" + t("stats.col.content") + "</th><th>" + t("stats.col.speed") + "</th><th>" + t("stats.col.accuracy") + "</th><th>" + t("stats.col.duration") + "</th><th>" + t("stats.col.stars") + "</th></tr></thead><tbody>" +
        records.map(function (s) {
          return '<tr data-session-id="' + s.id + '" title="' + escapeHtml(t("table.rowTitle")) + '">' +
            "<td class=\"muted\">" + fmtDate(s.at) + "</td>" +
            "<td><b>" + escapeHtml(s.title) + "</b><span class=\"cell-sub\">" + escapeHtml(s.courseTitle) + "</span></td>" +
            "<td>" + Math.round(s.wpm) + " WPM</td>" +
            "<td>" + Math.round(s.acc) + "%</td>" +
            "<td>" + fmtClock(s.sec) + "</td>" +
            "<td>" + starRow(s.stars || 0) + "</td></tr>";
        }).join("") + "</tbody></table></div>"
      : emptyState("chart", t("stats.emptyTitle"), t("stats.emptyDesc"),
        '<button class="btn primary" data-action="start-level" data-level="basics-01">' + t("stats.startFirst") + "</button>");

    els.views.stats.innerHTML =
      '<div class="stat-grid stats-summary">' + summary + "</div>" +
      '<div class="card chart-card wide"><div class="card-head"><h3>' + t("stats.trendTitle") + '</h3><span class="muted small">' + t("stats.trendSub") + "</span></div>" +
        trendChart(sessions) + "</div>" +
      '<div class="split">' +
        '<div class="card"><div class="card-head"><h3>' + t("stats.heatTitle") + '</h3><span class="muted small">' + t("stats.heatSub") + "</span></div>" + keyboardHeat() + "</div>" +
        '<div class="card"><div class="card-head"><h3>' + t("stats.calTitle") + '</h3><span class="muted small">' + t("stats.calSub", { n: window.Store.streak() }) + "</span></div>" + calendarHeat() + "</div>" +
      "</div>" +
      '<div class="card"><div class="card-head"><h3>' + t("stats.achievements") + '</h3><span class="muted small">' +
        t("home.achCount", { done: achievements.filter(function (a) { return a.unlocked; }).length, total: achievements.length }) + "</span></div>" +
        '<div class="ach-grid wide">' + achievements.map(function (a) {
          return '<div class="ach ' + (a.unlocked ? "on" : "off") + ' color-' + a.color + '">' +
            '<span class="ach-icon">' + icon(a.icon) + "</span>" +
            '<span class="ach-body"><b>' + escapeHtml(a.name) + "</b><small>" + escapeHtml(a.desc) + "</small></span>" +
            "</div>";
        }).join("") + "</div></div>" +
      '<div class="card"><div class="card-head"><h3>' + t("stats.records") + "</h3>" +
        (sessions.length > 12 ? '<span class="muted small">' + t("stats.showRecent") + "</span>" : "") + "</div>" + tableHtml + "</div>";
  }

  /* ---------- 错词本 ---------- */

  function renderErrors() {
    var errors = window.Store.errors();
    var topWord = errors[0];

    var head = '<div class="page-tools">' +
        '<div><b>' + errors.length + "</b> " + escapeHtml(t("errors.count", { n: "" }).replace(/^\s+|\s+$/g, "")) +
          (topWord ? t("errors.most", { word: "<b>" + escapeHtml(topWord.word) + "</b>" }) : "") + "</div>" +
        (errors.length
          ? '<div class="tool-actions"><button class="ghost-btn danger" data-action="clear-errors">' + icon("trash") + t("errors.clear") + "</button>" +
            '<button class="btn primary" data-action="review">' + icon("play") + t("errors.review") + "</button></div>"
          : "") +
      "</div>";

    var body;
    if (!errors.length) {
      body = emptyState("book", t("errors.emptyTitle"), t("errors.emptyDesc"),
        '<button class="btn primary" data-action="start-level" data-level="words-01">' + t("errors.goWords") + "</button>");
    } else {
      body = '<div class="table-wrap"><table class="data-table error-table"><thead><tr><th>' + t("errors.col.word") + "</th><th>" + t("errors.col.meaning") + "</th><th>" + t("errors.col.count") + "</th><th>" + t("errors.col.last") + "</th><th></th></tr></thead><tbody>" +
        errors.map(function (entry) {
          return "<tr><td><b class=\"mono\">" + escapeHtml(entry.word) + "</b></td>" +
            '<td class="muted">' + (entry.meaning ? escapeHtml(entry.meaning) : "—") + "</td>" +
            "<td>" + t("errors.times", { n: entry.count }) + "</td>" +
            '<td class="muted">' + fmtRelative(entry.lastAt) + "</td>" +
            '<td class="cell-action"><button class="icon-btn tiny" data-action="remove-error" data-word="' + escapeHtml(entry.word) + '" title="' + escapeHtml(t("errors.remove")) + '">' + icon("close") + "</button></td></tr>";
        }).join("") + "</tbody></table></div>";
    }

    els.views.errors.innerHTML = head + body;
  }

  /* ---------- 设置 ---------- */

  function toggleRow(name, title, desc, checked) {
    return '<label class="setting-row">' +
      '<span class="setting-text"><b>' + title + "</b><small>" + desc + "</small></span>" +
      '<span class="switch"><input type="checkbox" data-setting="' + name + '"' + (checked ? " checked" : "") + '><i></i></span>' +
      "</label>";
  }

  function renderSettings() {
    var settings = window.Store.state.settings;
    var xp = window.Store.xpInfo();
    var themeMode = settings.theme || "auto";
    var speech = window.Speech ? window.Speech.describe() : { supported: false, count: 0 };
    var accent = settings.accent || "us";

    var accentButtons = [["us", t("settings.accent.us")], ["uk", t("settings.accent.uk")], ["auto", t("settings.accent.auto")]].map(function (pair) {
      return '<button data-accent-value="' + pair[0] + '" class="' +
        (accent === pair[0] ? "active" : "") + '">' + escapeHtml(pair[1]) + "</button>";
    }).join("");

    var languageOptions = "";
    if (window.I18N) {
      var currentLang = window.I18N.getLang();
      languageOptions = window.I18N.list().map(function (lang) {
        return '<option value="' + escapeHtml(lang.code) + '"' +
          (currentLang === lang.code ? " selected" : "") + ">" + escapeHtml(lang.name) + "</option>";
      }).join("");
    }

    var voiceOptions = '<option value="">' + t("settings.voiceAuto") + "</option>";
    if (window.Speech) {
      window.Speech.englishVoices().forEach(function (voice) {
        var label = voice.name + " · " + voice.lang + (voice.localService === false ? " · " + t("settings.voiceOnlineOption") : "");
        voiceOptions += '<option value="' + escapeHtml(voice.voiceURI) + '"' +
          ((settings.voiceURI || "") === voice.voiceURI ? " selected" : "") + ">" +
          escapeHtml(label) + "</option>";
      });
    }

    var voiceHint;
    if (!speech.supported) {
      voiceHint = t("settings.voiceHint.unsupported");
    } else if (!speech.count) {
      voiceHint = t("settings.voiceHint.loading");
    } else {
      voiceHint = t("settings.voiceHint.current", { name: speech.voiceName || t("settings.voiceDefault") }) +
        (speech.natural ? " · " + t("settings.voiceNatural") : "") +
        (speech.online ? " · " + t("settings.voiceOnline") : " · " + t("settings.voiceLocal"));
    }
    var rate = Number(settings.voiceRate) || 0.95;

    els.views.settings.innerHTML =
      '<div class="settings-grid">' +
        '<div class="settings-col">' +
          '<div class="card settings-card">' +
            '<div class="card-head"><h3>' + t("settings.appearance") + "</h3></div>" +
            '<div class="setting-row"><span class="setting-text"><b>' + t("settings.theme") + "</b><small>" + t("settings.themeDesc") + "</small></span>" +
              '<span class="segmented" id="themeChoice">' +
                '<button data-theme-value="light" class="' + (themeMode === "light" ? "active" : "") + '">' + t("settings.light") + "</button>" +
                '<button data-theme-value="dark" class="' + (themeMode === "dark" ? "active" : "") + '">' + t("settings.dark") + "</button>" +
                '<button data-theme-value="auto" class="' + (themeMode === "auto" ? "active" : "") + '">' + t("settings.auto") + "</button>" +
              "</span></div>" +
            '<div class="setting-row"><span class="setting-text"><b>' + t("settings.language") + "</b><small>" + t("settings.languageDesc") + "</small></span>" +
              '<select class="select" data-setting="language">' + languageOptions + "</select></div>" +
          "</div>" +
          '<div class="card settings-card">' +
            '<div class="card-head"><h3>' + t("settings.practice") + "</h3></div>" +
            toggleRow("keyboard", t("settings.keyboard"), t("settings.keyboardDesc"), settings.keyboard) +
          "</div>" +
          '<div class="card settings-card">' +
            '<div class="card-head"><h3>' + t("settings.about") + "</h3></div>" +
            '<div class="about-row"><span>' + t("settings.level") + '</span><b>Lv.' + xp.level + "</b></div>" +
            '<div class="about-row"><span>' + t("settings.xp") + '</span><b>' + xp.xp + " XP</b></div>" +
            '<div class="about-row"><span>' + t("settings.version") + '</span><b>v1</b></div>' +
            '<p class="muted small">' + t("settings.aboutNote") + "</p>" +
          "</div>" +
        "</div>" +
        '<div class="settings-col">' +
          '<div class="card settings-card">' +
            '<div class="card-head"><h3>' + t("settings.soundSection") + "</h3></div>" +
            toggleRow("sound", t("settings.sound"), t("settings.soundDesc"), settings.sound) +
            toggleRow("speak", t("settings.speak"), t("settings.speakDesc"), settings.speak) +
            '<div class="setting-row"><span class="setting-text"><b>' + t("settings.accent") + "</b><small>" + t("settings.accentDesc") + "</small></span>" +
              '<span class="segmented" id="accentChoice">' + accentButtons + "</span></div>" +
            '<div class="setting-row"><span class="setting-text"><b>' + t("settings.voice") + "</b><small>" + escapeHtml(voiceHint) + "</small></span>" +
              '<select class="select" data-setting="voiceURI">' + voiceOptions + "</select></div>" +
            '<div class="setting-row"><span class="setting-text"><b>' + t("settings.rate") + "</b><small>" + t("settings.rateDesc") + "</small></span>" +
              '<span class="rate-control"><input type="range" min="0.7" max="1.15" step="0.05" data-setting="voiceRate" value="' + rate + '">' +
              '<b id="voiceRateValue">' + rate.toFixed(2) + "</b></span></div>" +
            '<div class="setting-row"><span class="setting-text"><b>' + t("settings.test") + "</b><small>" + t("settings.testDesc") + "</small></span>" +
              '<button class="ghost-btn small" data-action="test-voice">' + icon("speaker") + t("settings.test") + "</button></div>" +
            '<p class="setting-note">' + t("settings.speechNote") + "</p>" +
          "</div>" +
          '<div class="card settings-card">' +
            '<div class="card-head"><h3>' + t("settings.data") + "</h3></div>" +
            '<div class="setting-row"><span class="setting-text"><b>' + t("settings.storage") + "</b><small>" + t("settings.storageDesc") +
              (window.Store.storageOK ? "" : t("settings.storageWarn")) + "</small></span></div>" +
            '<div class="button-row">' +
              '<button class="ghost-btn" data-action="export">' + icon("arrow-right") + t("settings.export") + "</button>" +
              '<button class="ghost-btn" data-action="import">' + icon("refresh") + t("settings.import") + "</button>" +
              '<button class="ghost-btn danger" data-action="reset">' + icon("trash") + t("settings.reset") + "</button>" +
            "</div>" +
            '<input type="file" id="importFile" accept="application/json,.json" hidden>' +
          "</div>" +
        "</div>" +
      "</div>";
  }

  /* ---------- 视图切换 ---------- */

  function renderView(name) {
    if (name === "home") renderHome();
    else if (name === "courses") renderCourses();
    else if (name === "stats") renderStats();
    else if (name === "errors") renderErrors();
    else if (name === "settings") renderSettings();
  }

  function showView(name) {
    activeView = name;
    VIEWS.forEach(function (view) {
      els.views[view].hidden = view !== name;
    });
    var meta = VIEW_META[name] || VIEW_META.home;
    els.pageTitle.textContent = t(meta.titleKey);
    els.pageSub.textContent = t(meta.subKey);
    $$("[data-nav]").forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("data-nav") === name);
    });
    document.title = t(meta.titleKey) + " · " + t("app.title");
    window.scrollTo(0, 0);
    if (els.main) els.main.scrollTop = 0;
  }

  function applyLanguage(code) {
    var lang = window.I18N ? window.I18N.setLang(code) : "zh";
    window.Store.updateSettings({ language: lang });
    window.APP_DATA.refresh();
    if (window.I18N) window.I18N.apply(document);
    renderView(activeView);
    showView(activeView);
    updateProfile();
  }

  function updateProfile() {
    var xp = window.Store.xpInfo();
    var streak = window.Store.streak();
    var errorCount = window.Store.errorCount();
    els.profileLevel.textContent = "Lv." + xp.level;
    els.profileStreak.innerHTML = icon("flame") + escapeHtml(t("profile.streak", { n: streak }));
    els.profileXpBar.style.width = xp.percent + "%";
    els.profileXpText.textContent = xp.inLevel + " / " + xp.next + " XP";
    if (errorCount) {
      els.navErrorBadge.hidden = false;
      els.navErrorBadge.textContent = errorCount > 99 ? "99+" : String(errorCount);
    } else {
      els.navErrorBadge.hidden = true;
    }
  }

  function route() {
    var hash = location.hash || "#/home";
    var practiceMatch = hash.match(/^#\/practice\/(.+)$/);

    if (practiceMatch) {
      if (window.Practice.isActive()) return;
      var id = decodeURIComponent(practiceMatch[1]);
      var started = window.Practice.startLevel(id);
      if (!started) {
        toast(t("practice.expired"));
        location.hash = "#/courses";
      }
      return;
    }

    if (window.Practice.isActive()) {
      suppressExit = true;
      window.Practice.exit();
      suppressExit = false;
    }

    var name = hash.replace(/^#\//, "").split("?")[0];
    if (VIEWS.indexOf(name) === -1) name = "home";
    renderView(name);
    showView(name);
    updateProfile();
  }

  /* ---------- 交互 ---------- */

  function startLevel(levelId) {
    if (!levelId) return;
    location.hash = "#/practice/" + encodeURIComponent(levelId);
  }

  function openCustomModal() {
    openModal(
      '<div class="modal-head"><h3>' + t("custom.title") + '</h3><button class="icon-btn" data-modal-close aria-label="' + escapeHtml(t("session.close")) + '">' + icon("close") + "</button></div>" +
      '<div class="modal-body">' +
        '<p class="muted small">' + t("custom.desc") + "</p>" +
        '<textarea id="customText" rows="8" spellcheck="false" placeholder="The quick brown fox jumps over the lazy dog.\nPractice a little every day."></textarea>' +
        '<div class="modal-actions">' +
          '<button class="ghost-btn" data-modal-close>' + t("import.cancel") + "</button>" +
          '<button class="btn primary" id="customStart">' + t("custom.start") + "</button>" +
        "</div>" +
      "</div>"
    );
    var textarea = $("#customText");
    if (textarea) textarea.focus();
    var startBtn = $("#customStart");
    if (startBtn) {
      startBtn.addEventListener("click", function () {
        var text = textarea ? textarea.value : "";
        if (!text.trim()) {
          toast(t("custom.needText"));
          return;
        }
        var ok = window.Practice.startCustom(text);
        if (!ok) {
          toast(t("custom.none"));
          return;
        }
        closeModal();
        try { history.replaceState(null, "", "#/practice/custom"); } catch (err) { /* noop */ }
      });
    }
  }

  function confirmReset() {
    openModal(
      '<div class="modal-head"><h3>' + t("reset.title") + '</h3><button class="icon-btn" data-modal-close aria-label="' + escapeHtml(t("session.close")) + '">' + icon("close") + "</button></div>" +
      '<div class="modal-body">' +
        '<p>' + t("reset.desc") + "</p>" +
        '<div class="modal-actions">' +
          '<button class="ghost-btn" data-modal-close>' + t("import.cancel") + "</button>" +
          '<button class="btn danger-solid" id="confirmReset">' + t("reset.confirm") + "</button>" +
        "</div>" +
      "</div>"
    );
    var btn = $("#confirmReset");
    if (btn) {
      btn.addEventListener("click", function () {
        window.Store.reset();
        closeModal();
        route();
        toast(t("reset.done"));
      });
    }
  }

  function exportData() {
    var blob = new Blob([window.Store.exportJson()], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "zhijian-typing-" + window.Store.todayKey() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    toast(t("data.exported"));
  }

  function handleImportFile(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        window.Store.importJson(String(reader.result));
        applyTheme();
        applyLanguage(window.Store.state.settings.language || "zh");
        toast(t("data.imported"));
      } catch (err) {
        toast(t("data.importFailed", { msg: err.message }), "error");
      }
      input.value = "";
    };
    reader.readAsText(file);
  }

  $("#views").addEventListener("click", function (event) {
    var sessionRow = event.target.closest("[data-session-id]");
    if (sessionRow) {
      openSessionModal(sessionRow.getAttribute("data-session-id"));
      return;
    }

    var themeBtn = event.target.closest("[data-theme-value]");
    if (themeBtn) {
      var value = themeBtn.getAttribute("data-theme-value");
      window.Store.updateSettings({ theme: value });
      applyTheme();
      renderSettings();
      return;
    }

    var accentBtn = event.target.closest("[data-accent-value]");
    if (accentBtn) {
      window.Store.updateSettings({ accent: accentBtn.getAttribute("data-accent-value") });
      renderSettings();
      if (window.Speech) window.Speech.test();
      return;
    }

    var removeBtn = event.target.closest('[data-action="remove-error"]');
    if (removeBtn) {
      window.Store.removeError(removeBtn.getAttribute("data-word"));
      renderErrors();
      updateProfile();
      return;
    }

    var levelBtn = event.target.closest(".level-card");
    if (levelBtn) {
      if (levelBtn.classList.contains("locked")) return;
      startLevel(levelBtn.getAttribute("data-level"));
      return;
    }

    if (event.target.closest('[data-action="custom"]')) {
      openCustomModal();
      return;
    }

    var target = event.target.closest("[data-action]");
    if (!target) return;
    var action = target.getAttribute("data-action");

    if (action === "start-level") {
      startLevel(target.getAttribute("data-level"));
    } else if (action === "goto") {
      location.hash = "#/" + target.getAttribute("data-view");
    } else if (action === "import-content") {
      openImportModal();
    } else if (action === "remove-import") {
      window.Store.removeImport(target.getAttribute("data-import-id"));
      window.APP_DATA.setImports(window.Store.state.imports);
      renderCourses();
      updateProfile();
      toast(t("import.removed"));
    } else if (action === "test-voice") {
      if (!window.Speech || !window.Speech.test()) toast(t("voice.unsupported"));
    } else if (action === "review") {
      if (!window.Practice.startReview()) {
        toast(t("review.empty"));
        return;
      }
      try { history.replaceState(null, "", "#/practice/review"); } catch (err) { /* noop */ }
    } else if (action === "export") {
      exportData();
    } else if (action === "import") {
      var fileInput = $("#importFile");
      if (fileInput) fileInput.click();
    } else if (action === "reset") {
      confirmReset();
    } else if (action === "clear-errors") {
      openModal(
        '<div class="modal-head"><h3>' + t("errors.clearTitle") + '</h3><button class="icon-btn" data-modal-close aria-label="' + escapeHtml(t("session.close")) + '">' + icon("close") + "</button></div>" +
        '<div class="modal-body"><p>' + t("errors.clearDesc") + "</p>" +
          '<div class="modal-actions"><button class="ghost-btn" data-modal-close>' + t("import.cancel") + "</button>" +
          '<button class="btn danger-solid" id="confirmErrors">' + t("errors.confirm") + "</button></div></div>"
      );
      var btn = $("#confirmErrors");
      if (btn) {
        btn.addEventListener("click", function () {
          window.Store.clearErrors();
          closeModal();
          renderErrors();
          updateProfile();
          toast(t("errors.cleared"));
        });
      }
    }
  });

  // 首页信息卡整块可点：内层按钮/链接优先，不被卡片劫持
  $("#views").addEventListener("click", function (event) {
    var card = event.target.closest("[data-href]");
    if (!card) return;
    if (event.target.closest("a[href], button")) return;
    location.hash = card.getAttribute("data-href");
  });

  $("#views").addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    var card = event.target.closest("[data-href][role='button']");
    if (!card || event.target.closest("a[href], button")) return;
    event.preventDefault();
    location.hash = card.getAttribute("data-href");
  });

  $("#views").addEventListener("change", function (event) {
    var settingInput = event.target.closest("[data-setting]");
    if (settingInput) {
      var name = settingInput.getAttribute("data-setting");
      var value = settingInput.type === "checkbox" ? settingInput.checked
        : settingInput.type === "range" ? Number(settingInput.value)
        : settingInput.value;
      var patch = {};
      patch[name] = value;
      window.Store.updateSettings(patch);
      if (name === "language") {
        applyLanguage(value);
        return;
      }
      if (name === "keyboard" && window.Practice.isActive()) {
        var wrap = $("#keyboardWrap");
        if (wrap) wrap.hidden = !settingInput.checked;
      }
      if (name === "voiceURI") {
        renderSettings();
        if (window.Speech) window.Speech.test();
      }
      return;
    }
    if (event.target.id === "importFile") {
      handleImportFile(event.target);
    }
  });

  $("#views").addEventListener("input", function (event) {
    var range = event.target.closest('input[type="range"][data-setting="voiceRate"]');
    if (!range) return;
    var label = $("#voiceRateValue");
    if (label) label.textContent = Number(range.value).toFixed(2);
  });

  els.themeBtn.addEventListener("click", toggleTheme);

  els.modalLayer.addEventListener("click", function (event) {
    if (event.target === els.modalLayer || event.target.closest("[data-modal-close]")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !els.modalLayer.hidden) {
      closeModal();
    }
  }, true);

  window.Practice.onExit = function () {
    if (suppressExit) return;
    if (location.hash.indexOf("#/practice") === 0) {
      location.hash = "#/courses";
    } else {
      route();
    }
  };

  if (mediaTheme) {
    var onThemeChange = function () {
      if ((window.Store.state.settings.theme || "auto") === "auto") applyTheme();
    };
    if (mediaTheme.addEventListener) mediaTheme.addEventListener("change", onThemeChange);
    else if (mediaTheme.addListener) mediaTheme.addListener(onThemeChange);
  }

  VIEWS.forEach(function (name) {
    els.views[name] = $('[data-view="' + name + '"]');
  });

  if (window.Speech) {
    window.Speech.onVoices(function () {
      if (!els.views.settings.hidden) renderSettings();
    });
  }

  applyTheme();
  if (window.I18N) {
    window.I18N.setLang(window.Store.state.settings.language || "zh");
    window.I18N.apply(document);
  }
  window.APP_DATA.setImports(window.Store.state.imports || []);
  window.addEventListener("hashchange", route);
  route();
})();
