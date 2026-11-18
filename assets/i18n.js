/* 界面多语言：语言包注册、取词、插值与 DOM 文案应用 */
(function () {
  "use strict";

  var FALLBACK = "zh";
  var packs = {};
  var order = [];
  var current = FALLBACK;
  var listeners = [];

  function register(code, pack) {
    if (!code || !pack) return;
    if (!packs[code]) order.push(code);
    packs[code] = { name: pack.name || code, dict: pack.dict || {} };
  }

  function has(code) { return !!packs[code]; }

  function resolve(code) {
    if (packs[code]) return code;
    return packs[FALLBACK] ? FALLBACK : (order[0] || code);
  }

  function getLang() { return current; }

  function setLang(code) {
    current = resolve(code);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", current === "zh" ? "zh-CN" : current);
      document.documentElement.setAttribute("data-lang", current);
    }
    listeners.forEach(function (fn) {
      try { fn(current); } catch (err) { /* 单个监听失败不影响其他 */ }
    });
    return current;
  }

  function interpolate(str, params) {
    if (!params) return str;
    return String(str).replace(/\{(\w+)\}/g, function (match, name) {
      return params[name] != null ? String(params[name]) : match;
    });
  }

  function t(key, params) {
    var pack = packs[current];
    var str = pack && pack.dict[key];
    if (str == null && packs[FALLBACK]) str = packs[FALLBACK].dict[key];
    if (str == null) {
      for (var i = 0; i < order.length; i++) {
        if (packs[order[i]].dict[key] != null) {
          str = packs[order[i]].dict[key];
          break;
        }
      }
    }
    if (str == null) return key;
    return interpolate(str, params);
  }

  function list() {
    return order.map(function (code) {
      return { code: code, name: packs[code].name };
    });
  }

  function each(root, selector, fn) {
    Array.prototype.slice.call(root.querySelectorAll(selector)).forEach(fn);
  }

  function apply(root) {
    var scope = root || document;
    each(scope, "[data-i18n]", function (node) {
      node.textContent = t(node.getAttribute("data-i18n"));
    });
    each(scope, "[data-i18n-title]", function (node) {
      node.setAttribute("title", t(node.getAttribute("data-i18n-title")));
    });
    each(scope, "[data-i18n-aria]", function (node) {
      node.setAttribute("aria-label", t(node.getAttribute("data-i18n-aria")));
    });
    each(scope, "[data-i18n-placeholder]", function (node) {
      node.setAttribute("placeholder", t(node.getAttribute("data-i18n-placeholder")));
    });
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t("app.desc"));
  }

  function onChange(fn) {
    if (typeof fn === "function") listeners.push(fn);
  }

  window.I18N = {
    register: register,
    t: t,
    setLang: setLang,
    getLang: getLang,
    list: list,
    apply: apply,
    onChange: onChange,
    has: has
  };
})();
