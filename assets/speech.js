/* 语音朗读：优先自然音色，支持美式 / 英式口音；离线自动回退到本机音色 */
(function () {
  "use strict";

  var synth = window.speechSynthesis || null;
  var Utter = window.SpeechSynthesisUtterance || null;
  var cache = [];
  var current = null;
  var speaking = false;
  var stateListeners = [];
  var voiceListeners = [];

  var ACCENTS = {
    us: { lang: "en-US", label: "美式", test: /^en[-_]US/i },
    uk: { lang: "en-GB", label: "英式", test: /^en[-_]GB/i },
    auto: { lang: "en-US", label: "自动", test: /^en([-_]|$)/i }
  };

  var NATURAL_HINTS = /natural|neural|premium|enhanced/i;
  var KNOWN_NATURAL = /aria|jenny|guy|sonia|libby|ryan|natasha|emily|michelle|adri|ana|andrew|brian|christopher|eric|roger|steffan|ava|alloy|echo|fable|nova|onyx|samantha|daniel|karen|moira|tessa|alex|victoria|fred/i;

  function supported() {
    return !!(synth && Utter);
  }

  function settings() {
    try {
      if (window.Store && window.Store.state && window.Store.state.settings) {
        return window.Store.state.settings;
      }
    } catch (err) { /* noop */ }
    return {};
  }

  function load() {
    if (!supported()) {
      cache = [];
      return cache;
    }
    try {
      cache = synth.getVoices() || [];
    } catch (err) {
      cache = [];
    }
    return cache;
  }

  function voices() {
    return cache.length ? cache : load();
  }

  function englishVoices() {
    return voices().filter(function (voice) {
      return /^en([-_]|$)/i.test(voice.lang || "");
    });
  }

  function accentOf() {
    var value = settings().accent;
    return ACCENTS[value] ? value : "us";
  }

  function score(voice, accent) {
    var name = (voice.name || "").toLowerCase();
    var value = 0;
    if (ACCENTS[accent].test.test(voice.lang || "")) value += 45;
    if (NATURAL_HINTS.test(name)) value += 90;
    if (KNOWN_NATURAL.test(name)) value += 25;
    if (/online|cloud/.test(name)) value += 8;
    if (/google/.test(name)) value += 18;
    if (voice.localService === true) value += 22;
    else if (voice.localService === false) value += 4;
    if (navigator.onLine === false && voice.localService === false) value -= 200;
    if (/desktop|compact/i.test(name)) value -= 12;
    return value;
  }

  function pick(accent) {
    var list = englishVoices();
    if (!list.length) return null;
    var wanted = ACCENTS[accent] ? accent : accentOf();
    if (wanted !== "auto") {
      var matched = list.filter(function (voice) {
        return ACCENTS[wanted].test.test(voice.lang || "");
      });
      if (matched.length) list = matched;
    }
    var chosen = null;
    var best = -Infinity;
    list.forEach(function (voice) {
      var value = score(voice, wanted);
      if (value > best) {
        best = value;
        chosen = voice;
      }
    });
    return chosen;
  }

  function byURI(uri) {
    if (!uri) return null;
    var list = englishVoices();
    for (var i = 0; i < list.length; i++) {
      if (list[i].voiceURI === uri || list[i].name === uri) return list[i];
    }
    return null;
  }

  function resolveVoice(accent) {
    return byURI(settings().voiceURI) || pick(accent);
  }

  function notifyState(value) {
    if (speaking === value) return;
    speaking = value;
    stateListeners.forEach(function (fn) {
      try { fn(value); } catch (err) { /* noop */ }
    });
  }

  function stop() {
    if (!supported()) return;
    current = null;
    notifyState(false);
    try { synth.cancel(); } catch (err) { /* noop */ }
  }

  function speak(text, options) {
    if (!supported()) return false;
    var content = String(text == null ? "" : text).trim();
    if (!content) return false;

    var opts = options || {};
    var accent = opts.accent || accentOf();
    var voice = opts.voice || resolveVoice(accent);
    var rate = Number(opts.rate || settings().voiceRate || 0.95);
    if (!isFinite(rate)) rate = 0.95;
    rate = Math.min(1.4, Math.max(0.6, rate));

    stop();

    var utter = new Utter(content);
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang || ACCENTS[accent].lang;
    } else {
      utter.lang = ACCENTS[accent] ? ACCENTS[accent].lang : "en-US";
    }
    utter.rate = rate;
    utter.pitch = 1;
    utter.volume = 1;

    utter.onstart = function () {
      if (current !== utter) return;
      notifyState(true);
      if (typeof opts.onstart === "function") opts.onstart();
    };
    utter.onend = function () {
      if (current !== utter) return;
      current = null;
      notifyState(false);
      if (typeof opts.onend === "function") opts.onend();
    };
    utter.onerror = function () {
      if (current !== utter) return;
      current = null;
      notifyState(false);
      if (typeof opts.onerror === "function") opts.onerror();
    };

    current = utter;

    // 部分 Chromium 版本在 cancel 后立刻 speak 会丢首句，延后一帧再播放
    window.setTimeout(function () {
      if (current !== utter) return;
      try {
        synth.speak(utter);
        if (synth.paused) synth.resume();
      } catch (err) {
        current = null;
        notifyState(false);
        if (typeof opts.onerror === "function") opts.onerror();
      }
    }, 40);
    return true;
  }

  function test(text) {
    return speak(text || "Practice a little every day, and your English will sound more natural.", { accent: accentOf() });
  }

  function describe() {
    var accent = accentOf();
    var voice = resolveVoice(accent);
    return {
      supported: supported(),
      accent: accent,
      accentLabel: ACCENTS[accent].label,
      count: englishVoices().length,
      voiceName: voice ? voice.name : "",
      voiceLang: voice ? voice.lang : ACCENTS[accent].lang,
      natural: voice ? NATURAL_HINTS.test(voice.name || "") : false,
      online: voice ? voice.localService === false : false,
      speaking: speaking
    };
  }

  if (supported() && typeof synth.addEventListener === "function") {
    synth.addEventListener("voiceschanged", function () {
      load();
      voiceListeners.forEach(function (fn) {
        try { fn(englishVoices()); } catch (err) { /* noop */ }
      });
    });
  }

  window.Speech = {
    supported: supported,
    voices: voices,
    englishVoices: englishVoices,
    pick: pick,
    speak: speak,
    stop: stop,
    test: test,
    describe: describe,
    isSpeaking: function () { return speaking; },
    onState: function (fn) {
      if (typeof fn === "function") stateListeners.push(fn);
    },
    onVoices: function (fn) {
      if (typeof fn === "function") voiceListeners.push(fn);
    },
    accents: ACCENTS
  };
})();
