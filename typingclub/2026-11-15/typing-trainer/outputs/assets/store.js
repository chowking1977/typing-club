/* 本地数据层：练习记录、进度、错词、成就全部保存在 localStorage */
(function () {
  "use strict";

  var STORAGE_KEY = "zhijian.typing.v1";
  var XP_PER_LEVEL = 300;
  var MAX_SESSIONS = 300;

  function defaultSettings() {
    return {
      theme: "auto",
      language: "zh",
      sound: true,
      speak: false,
      keyboard: true,
      accent: "us",
      voiceURI: "",
      voiceRate: 0.95
    };
  }

  function defaults() {
    return {
      version: 1,
      createdAt: null,
      settings: defaultSettings(),
      xp: 0,
      levels: {},
      imports: [],
      sessions: [],
      daily: {},
      errors: {},
      keyErrors: {},
      keyMisses: {},
      achievements: {},
      meta: {
        totalSessions: 0,
        totalChars: 0,
        totalCorrect: 0,
        totalKeystrokes: 0,
        totalSeconds: 0,
        totalItems: 0
      }
    };
  }

  var storageOK = true;
  var state = load();

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return defaults();
      return migrate(parsed);
    } catch (err) {
      storageOK = false;
      return defaults();
    }
  }

  function migrate(parsed) {
    var base = defaults();
    var merged = Object.assign(base, parsed);
    merged.settings = Object.assign(defaultSettings(), parsed.settings || {});
    merged.meta = Object.assign(base.meta, parsed.meta || {});
    merged.levels = parsed.levels || {};
    merged.imports = Array.isArray(parsed.imports) ? parsed.imports : [];
    merged.sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
    merged.daily = parsed.daily || {};
    merged.errors = parsed.errors || {};
    merged.keyErrors = parsed.keyErrors || {};
    merged.keyMisses = parsed.keyMisses || {};
    merged.achievements = parsed.achievements || {};
    merged.xp = Number(parsed.xp) || 0;
    if (!merged.createdAt) merged.createdAt = Date.now();
    return merged;
  }

  function save() {
    if (!state.createdAt) state.createdAt = Date.now();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageOK = true;
    } catch (err) {
      storageOK = false;
    }
  }

  function dateKey(d) {
    var date = d || new Date();
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function hasPractice(dkey) {
    var entry = state.daily[dkey];
    return !!(entry && entry.sessions > 0);
  }

  function streak() {
    var cursor = new Date();
    if (!hasPractice(dateKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    var count = 0;
    while (hasPractice(dateKey(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
      if (count > 3650) break;
    }
    return count;
  }

  function levelStat(levelId) {
    return state.levels[levelId] || null;
  }

  function completedCount() {
    var n = 0;
    Object.keys(state.levels).forEach(function (id) {
      if (state.levels[id] && state.levels[id].completed) n += 1;
    });
    return n;
  }

  function isLevelCompleted(levelId) {
    var stat = levelStat(levelId);
    return !!(stat && stat.completed);
  }

  function isUnlocked(course, index) {
    if (!course.sequential) return true;
    if (index === 0) return true;
    var prev = course.levels[index - 1];
    return isLevelCompleted(prev.id);
  }

  function courseProgress(course) {
    var done = 0;
    var stars = 0;
    course.levels.forEach(function (level) {
      var stat = levelStat(level.id);
      if (stat && stat.completed) done += 1;
      if (stat && stat.stars) stars += stat.stars;
    });
    return {
      done: done,
      total: course.levels.length,
      stars: stars,
      maxStars: course.levels.length * 3,
      percent: course.levels.length ? Math.round((done / course.levels.length) * 100) : 0
    };
  }

  function recommendation(courseId) {
    var list = window.APP_DATA.allLevels();
    if (courseId) {
      list = list.filter(function (entry) { return entry.course.id === courseId; });
    }
    var i;
    for (i = 0; i < list.length; i++) {
      var entry = list[i];
      if (isUnlocked(entry.course, entry.index) && !isLevelCompleted(entry.level.id)) {
        return entry;
      }
    }
    // 指定课程全部完成后，回到该课程第一关做复习
    return courseId ? list[0] || null : null;
  }

  function todayStats() {
    var entry = state.daily[todayKey()];
    var todays = state.sessions.filter(function (s) {
      return dateKey(new Date(s.at)) === todayKey();
    });
    var chars = entry ? entry.chars : 0;
    var sec = entry ? entry.sec : 0;
    var wpm = 0;
    if (sec > 0 && chars > 0) wpm = Math.round((chars / 5) / (sec / 60));
    return {
      sessions: entry ? entry.sessions : 0,
      chars: chars,
      seconds: sec,
      wpm: wpm,
      list: todays
    };
  }

  function totals() {
    var meta = state.meta;
    var acc = meta.totalKeystrokes > 0 ? (meta.totalCorrect / meta.totalKeystrokes) * 100 : 0;
    return {
      sessions: meta.totalSessions,
      chars: meta.totalChars,
      seconds: meta.totalSeconds,
      items: meta.totalItems,
      keystrokes: meta.totalKeystrokes,
      accuracy: acc,
      levels: completedCount()
    };
  }

  function bestWpm() {
    var best = 0;
    state.sessions.forEach(function (s) {
      if (s.wpm > best) best = s.wpm;
    });
    return best;
  }

  function xpInfo() {
    var level = Math.floor(state.xp / XP_PER_LEVEL) + 1;
    var inLevel = state.xp % XP_PER_LEVEL;
    return {
      xp: state.xp,
      level: level,
      inLevel: inLevel,
      next: XP_PER_LEVEL,
      percent: Math.round((inLevel / XP_PER_LEVEL) * 100)
    };
  }

  function errorArray() {
    return Object.keys(state.errors)
      .map(function (word) {
        var entry = state.errors[word];
        return {
          word: word,
          count: entry.count || 1,
          meaning: entry.meaning || "",
          mode: entry.mode || "word",
          lastAt: entry.lastAt || 0
        };
      })
      .sort(function (a, b) {
        if (b.count !== a.count) return b.count - a.count;
        return b.lastAt - a.lastAt;
      });
  }

  function errorCount() {
    return Object.keys(state.errors).length;
  }

  function clearErrors() {
    state.errors = {};
    save();
  }

  function removeError(word) {
    if (state.errors[word]) {
      delete state.errors[word];
      save();
    }
  }

  function topKeys(map, limit) {
    return Object.keys(map)
      .map(function (key) { return { key: key, count: map[key] }; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, limit || 6);
  }

  function achievementList() {
    var defs = window.APP_DATA.achievements;
    return defs.map(function (def) {
      var at = state.achievements[def.id] || 0;
      return {
        id: def.id,
        name: def.name,
        desc: def.desc,
        icon: def.icon,
        color: def.color,
        unlocked: !!at,
        at: at
      };
    });
  }

  function unlockAchievements(ctx) {
    var fresh = [];
    function unlock(id) {
      if (!state.achievements[id]) {
        state.achievements[id] = Date.now();
        fresh.push(id);
      }
    }
    var meta = state.meta;
    if (meta.totalSessions >= 1) unlock("first");
    if (ctx.session.wpm >= 30) unlock("wpm30");
    if (ctx.session.wpm >= 50) unlock("wpm50");
    if (ctx.session.wpm >= 70) unlock("wpm70");
    if (ctx.session.acc >= 100 && ctx.session.keystrokes >= 100) unlock("acc100");
    if (streak() >= 3) unlock("streak3");
    if (streak() >= 7) unlock("streak7");
    if (completedCount() >= 5) unlock("levels5");
    if (completedCount() >= 15) unlock("levels15");
    if (meta.totalChars >= 500) unlock("chars500");
    if (ctx.isReview) unlock("review");

    var basics = null;
    window.APP_DATA.courses.forEach(function (c) {
      if (c.id === "basics") basics = c;
    });
    if (basics) {
      var allDone = basics.levels.every(function (lv) { return isLevelCompleted(lv.id); });
      if (allDone) unlock("basics");
    }

    return fresh.map(function (id) {
      var found = null;
      window.APP_DATA.achievements.forEach(function (a) {
        if (a.id === id) found = a;
      });
      return found;
    }).filter(Boolean);
  }

  /**
   * 记录一次完成的练习。
   * res: { levelId, courseId, courseTitle, title, mode, wpm, acc, sec,
   *        keystrokes, correct, chars, items, stars, errored, keyErrors, keyMisses, maxCombo }
   */
  function recordSession(res) {
    var now = Date.now();
    var isReview = res.levelId === "review" || String(res.levelId).indexOf("custom-") === 0;
    var prevBest = bestWpm();

    var session = {
      id: now.toString(36) + Math.random().toString(36).slice(2, 6),
      at: now,
      levelId: res.levelId,
      courseId: res.courseId,
      courseTitle: res.courseTitle,
      title: res.title,
      mode: res.mode,
      wpm: Math.round(res.wpm * 10) / 10,
      acc: Math.round(res.acc * 10) / 10,
      sec: Math.max(1, Math.round(res.sec)),
      keystrokes: res.keystrokes,
      correct: res.correct,
      chars: res.chars,
      items: res.items,
      stars: res.stars,
      maxCombo: res.maxCombo || 0,
      errored: (res.errored || []).map(function (item) { return item.t; })
    };

    state.sessions.unshift(session);
    if (state.sessions.length > MAX_SESSIONS) state.sessions.length = MAX_SESSIONS;

    if (res.levelId && !isReview) {
      var stat = state.levels[res.levelId] || {
        attempts: 0, completed: false, bestWpm: 0, bestAcc: 0, stars: 0, lastAt: 0
      };
      stat.attempts += 1;
      stat.completed = true;
      stat.stars = Math.max(stat.stars || 0, res.stars || 0);
      if (session.wpm > (stat.bestWpm || 0)) stat.bestWpm = session.wpm;
      if (session.acc > (stat.bestAcc || 0)) stat.bestAcc = session.acc;
      stat.lastAt = now;
      state.levels[res.levelId] = stat;
    }

    var day = state.daily[todayKey()] || { sec: 0, chars: 0, sessions: 0 };
    day.sec += session.sec;
    day.chars += session.chars;
    day.sessions += 1;
    state.daily[todayKey()] = day;

    (res.errored || []).forEach(function (item) {
      var entry = state.errors[item.t] || { count: 0, meaning: item.m || "", mode: res.mode, lastAt: 0 };
      entry.count += 1;
      entry.meaning = item.m || entry.meaning;
      entry.lastAt = now;
      state.errors[item.t] = entry;
    });

    Object.keys(res.keyErrors || {}).forEach(function (key) {
      state.keyErrors[key] = (state.keyErrors[key] || 0) + res.keyErrors[key];
    });
    Object.keys(res.keyMisses || {}).forEach(function (key) {
      state.keyMisses[key] = (state.keyMisses[key] || 0) + res.keyMisses[key];
    });

    state.meta.totalSessions += 1;
    state.meta.totalChars += session.chars;
    state.meta.totalCorrect += session.correct;
    state.meta.totalKeystrokes += session.keystrokes;
    state.meta.totalSeconds += session.sec;
    state.meta.totalItems += session.items;

    var xpGain = 20 + (res.stars || 0) * 10 + Math.round(session.chars / 8) + (isReview ? 10 : 0);
    var beforeLevel = xpInfo().level;
    state.xp += xpGain;
    var afterLevel = xpInfo().level;

    var newAchievements = unlockAchievements({ session: session, isReview: isReview });

    save();

    return {
      session: session,
      xpGain: xpGain,
      levelUp: afterLevel > beforeLevel,
      newAchievements: newAchievements,
      isBest: session.wpm > prevBest && prevBest > 0,
      prevBest: prevBest
    };
  }

  function updateSettings(patch) {
    state.settings = Object.assign({}, state.settings, patch);
    save();
  }

  function addImport(pack) {
    state.imports.push(pack);
    save();
    return pack;
  }

  function removeImport(packId) {
    state.imports = state.imports.filter(function (pack) { return pack.id !== packId; });
    save();
  }

  function exportJson() {
    return JSON.stringify(state, null, 2);
  }

  function importJson(text) {
    var parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || !parsed.settings || !parsed.levels) {
      throw new Error(window.I18N ? window.I18N.t("data.invalid") : "数据格式不正确");
    }
    state = migrate(parsed);
    save();
    return true;
  }

  function reset() {
    state = defaults();
    save();
  }

  window.Store = {
    get state() { return state; },
    get storageOK() { return storageOK; },
    save: save,
    todayKey: todayKey,
    dateKey: dateKey,
    streak: streak,
    levelStat: levelStat,
    isLevelCompleted: isLevelCompleted,
    isUnlocked: isUnlocked,
    courseProgress: courseProgress,
    completedCount: completedCount,
    recommendation: recommendation,
    todayStats: todayStats,
    totals: totals,
    bestWpm: bestWpm,
    xpInfo: xpInfo,
    errors: errorArray,
    errorCount: errorCount,
    clearErrors: clearErrors,
    removeError: removeError,
    topKeys: topKeys,
    achievements: achievementList,
    recordSession: recordSession,
    addImport: addImport,
    removeImport: removeImport,
    updateSettings: updateSettings,
    exportJson: exportJson,
    importJson: importJson,
    reset: reset
  };
})();
