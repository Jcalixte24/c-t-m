/* Contenu éditable du portfolio (géré depuis /admin).
   Charge /api/content et applique les modifications sur les cartes de projets.
   Sans réponse de l'API (hors ligne, fonction non déployée), la page reste telle quelle.
   Expose window.__ctmReady : promesse résolue quand le contenu est appliqué, pour que
   les filtres et les animations de portfolio.html partent d'un DOM à jour. */
(function () {
  "use strict";

  var CACHE_KEY = "ctm-content-v1";
  var WAIT_MS = 1000;

  function safeUrl(u) {
    u = String(u || "").trim();
    if (!u) return "";
    if (/^(https?:\/\/|\/|[a-z0-9._-]+\.html(#.*)?$)/i.test(u)) return u;
    return "";
  }

  function hostLabel(u) {
    try {
      var x = new URL(u, location.href);
      return (x.host + x.pathname).replace(/\/$/, "").replace(/^www\./, "");
    } catch (e) { return u; }
  }

  var TYPE_LABEL = { site: "Web", app: "App", data: "Data", produit: "Produit" };

  var IMAGE_RE = /^[a-f0-9]{24}\.(jpg|png|webp)$/;

  function ensureShotStyle() {
    if (document.getElementById("ctm-shot-style")) return;
    var st = document.createElement("style");
    st.id = "ctm-shot-style";
    st.textContent = ".media .shot{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1}";
    document.head.appendChild(st);
  }

  /* Image téléversée depuis l'admin : remplace l'illustration et l'aperçu en direct de la carte. */
  function setImage(card, id, alt) {
    var media = card.querySelector(".media");
    if (!media || !IMAGE_RE.test(String(id || ""))) return;
    ensureShotStyle();
    media.removeAttribute("data-live");
    var old = media.querySelector(".shot");
    if (old) old.remove();
    var img = document.createElement("img");
    img.className = "shot";
    img.src = "/api/media/" + id;
    img.alt = alt || "";
    img.loading = "lazy";
    img.decoding = "async";
    media.appendChild(img);
  }

  function applyTexts(texts) {
    Object.keys(texts || {}).forEach(function (key) {
      var value = texts[key];
      if (typeof value !== "string" || !value) return;
      Array.prototype.forEach.call(document.querySelectorAll('[data-edit="' + key.replace(/[^a-z0-9-]/g, "") + '"]'), function (el) {
        if (el.hasAttribute("data-count")) {
          var m = /^(\d+)(\D*)$/.exec(value.trim());
          if (!m) return;
          el.dataset.count = m[1];
          el.dataset.suffix = m[2];
          el.textContent = m[1] + m[2];
          return;
        }
        el.textContent = value;
        if (el.tagName === "A" && /^mailto:/i.test(el.getAttribute("href") || "") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          el.setAttribute("href", "mailto:" + value);
        }
      });
    });
  }

  function setText(el, value) { if (el && typeof value === "string") el.textContent = value; }

  function applyOverride(card, o) {
    if (o.hidden) { card.remove(); return; }
    if (o.type && card.dataset.type !== o.type) card.dataset.type = o.type;
    if (typeof o.sub === "string" && o.sub) card.dataset.sub = o.sub;

    var inner = card.querySelector(".card");
    var body = card.querySelector(".body");
    if (!inner || !body) return;

    setText(body.querySelector("h3"), o.title);
    setText(body.querySelector("p"), o.desc);
    if (typeof o.sub === "string" && o.sub) setText(body.querySelector(".meta span:last-child"), o.sub);
    if (o.type) setText(body.querySelector(".ty"), TYPE_LABEL[o.type] || "Web");

    if (o.image) setImage(card, o.image, o.title || "");

    if ("url" in o) {
      var url = safeUrl(o.url);
      var media = card.querySelector(".media");
      if (url) {
        var a = inner;
        if (inner.tagName !== "A") {
          a = document.createElement("a");
          a.className = inner.className.replace(/\bsoon\b/, "").trim();
          while (inner.firstChild) a.appendChild(inner.firstChild);
          inner.replaceWith(a);
        }
        a.href = url;
        if (/^https?:/i.test(url)) { a.target = "_blank"; a.rel = "noopener"; }
        var label = body.querySelector(".url");
        if (label) {
          var led = label.querySelector("i");
          label.textContent = o.label || hostLabel(url);
          if (led) { led.className = "led " + (o.status === "wip" ? "wip" : "live"); label.prepend(led); }
        }
        if (media) {
          if (o.preview && !o.image) media.dataset.live = url; else media.removeAttribute("data-live");
        }
      } else if (inner.tagName === "A") {
        var d = document.createElement("div");
        d.className = inner.className + " soon";
        while (inner.firstChild) d.appendChild(inner.firstChild);
        inner.replaceWith(d);
        if (media) media.removeAttribute("data-live");
      }
    } else if (o.status) {
      var l3 = body.querySelector(".url i");
      if (l3) l3.className = "led " + (o.status === "wip" ? "wip" : "live");
      if (o.label) { var l4 = body.querySelector(".url"); l4.lastChild.textContent = o.label; }
    } else if (o.label) {
      var l2 = body.querySelector(".url");
      if (l2) { var i2 = l2.querySelector("i"); l2.textContent = o.label; if (i2) l2.prepend(i2); }
    }
  }

  function buildCard(p) {
    var url = safeUrl(p.url);
    var wrap = document.createElement("div");
    wrap.className = "cw rv";
    wrap.dataset.type = p.type || "site";
    wrap.dataset.sub = p.sub || "Divers";
    wrap.dataset.id = p.id;
    var inner = document.createElement(url ? "a" : "div");
    inner.className = url ? "card" : "card soon";
    if (url) {
      inner.href = url;
      if (/^https?:/i.test(url)) { inner.target = "_blank"; inner.rel = "noopener"; }
    }
    var media = document.createElement("div");
    media.className = "media";
    media.dataset.art = ["graph", "route", "code", "hbars", "bars", "chat", "heart", "phone"].indexOf(p.art) > -1 ? p.art : "graph";
    media.dataset.v = String(1 + (Math.abs(hash(p.id)) % 4));
    if (url && p.preview) media.dataset.live = url;
    var body = document.createElement("div");
    body.className = "body";
    var meta = document.createElement("div");
    meta.className = "meta";
    var ty = document.createElement("span"); ty.className = "ty"; ty.textContent = TYPE_LABEL[p.type] || "Web";
    var sub = document.createElement("span"); sub.textContent = p.sub || "Divers";
    meta.append(ty, sub);
    var h3 = document.createElement("h3"); h3.textContent = p.title || "Nouveau projet";
    var pp = document.createElement("p"); pp.textContent = p.desc || "";
    var lab = document.createElement("span"); lab.className = "url";
    var led = document.createElement("i");
    led.className = "led " + (p.status === "wip" || !url ? "wip" : "live");
    led.setAttribute("role", "img");
    led.setAttribute("aria-label", p.status === "wip" || !url ? "en cours" : "en ligne");
    lab.append(led, document.createTextNode(p.label || (url ? hostLabel(url) : "bientôt disponible")));
    body.append(meta, h3, pp, lab);
    inner.append(media, body);
    wrap.append(inner);
    if (p.image) setImage(wrap, p.image, p.title || "");
    return wrap;
  }

  function hash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return h;
  }

  function apply(content) {
    if (!content) return;
    applyTexts(content.texts);
    var grid = document.getElementById("pgrid");
    if (!grid) return;
    var overrides = content.projects || {};
    Object.keys(overrides).forEach(function (id) {
      var card = grid.querySelector('.cw[data-id="' + id.replace(/"/g, "") + '"]');
      if (card) applyOverride(card, overrides[id] || {});
    });
    (content.added || []).forEach(function (p) {
      if (!p || !p.id || p.hidden) return;
      var wrap = buildCard(p);
      var heads = grid.querySelectorAll('.grp[data-type="' + wrap.dataset.type + '"]');
      if (!heads.length) { grid.appendChild(wrap); return; }
      var last = heads[0];
      var n = last.nextElementSibling;
      while (n && !n.classList.contains("grp")) { last = n; n = n.nextElementSibling; }
      last.after(wrap);
    });
  }

  function readCache() {
    try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null"); } catch (e) { return null; }
  }
  function writeCache(c) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) {}
  }

  var domReady = new Promise(function (res) {
    if (document.readyState !== "loading") res();
    else document.addEventListener("DOMContentLoaded", res);
  });

  var network = fetch("/api/content", { headers: { Accept: "application/json" }, cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (c) { if (c && typeof c === "object") writeCache(c); return c; })
    .catch(function () { return null; });

  /* Le réseau d'abord (contenu toujours à jour) ; la copie de la session ne sert que si le serveur tarde ou échoue. */
  var cached = readCache();
  var content = Promise.race([
    network.then(function (c) { return c || cached; }),
    new Promise(function (r) { setTimeout(function () { r(cached); }, WAIT_MS); })
  ]);

  window.__ctmReady = Promise.all([content, domReady]).then(function (r) {
    try { apply(r[0]); } catch (e) { console.warn("ctm-content :", e); }
  });

  window.CTMContent = { safeUrl: safeUrl, hostLabel: hostLabel };
})();
