/* Mesure d'audience du site CTM.
   Envoie à /api/track : la page vue, le temps passé, le défilement maximal et les clics sur
   les liens de contact / projets. L'adresse IP et la localisation sont ajoutées côté serveur.
   Aucun cookie : un identifiant aléatoire est gardé dans le navigateur (localStorage).
   Respecte « Ne pas me suivre » (DNT) et Global Privacy Control, et ignore l'administrateur
   connecté ainsi que les robots. Détails publics : confidentialite.html. */
(function () {
  "use strict";

  var dnt = navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true;
  if (dnt) return;
  if (navigator.webdriver || /bot|crawl|spider|headless|lighthouse|preview/i.test(navigator.userAgent || "")) return;

  var host = location.hostname;
  var isLocal = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  try {
    if (localStorage.getItem("ctm-admin-session")) return;
    if (isLocal && !localStorage.getItem("ctm-track-dev")) return;
  } catch (e) {}

  var ENDPOINT = "/api/track";
  var MAX_SECONDS = 4 * 3600;

  function rid() {
    var a = new Uint8Array(12);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }

  function stored(area, name) {
    try {
      var s = window[area], v = s.getItem(name);
      if (v) return { v: v, fresh: false };
      v = rid(); s.setItem(name, v);
      return { v: v, fresh: true };
    } catch (e) { return { v: rid(), fresh: true }; }
  }

  var visitor = stored("localStorage", "ctm_vid");
  var session = stored("sessionStorage", "ctm_sid");
  var pid = rid();
  var day = new Date().toISOString().slice(0, 10);

  function post(payload, keepalive) {
    var body = JSON.stringify(payload);
    try {
      if (keepalive && navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain" }))) return;
      fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain" }, body: body, keepalive: !!keepalive }).catch(function () {});
    } catch (e) {}
  }

  function device() {
    var w = window.innerWidth || document.documentElement.clientWidth;
    return w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
  }

  function utm() {
    var q = new URLSearchParams(location.search);
    return { source: q.get("utm_source") || "", medium: q.get("utm_medium") || "", campaign: q.get("utm_campaign") || "" };
  }

  function connection() {
    var c = navigator.connection;
    return c ? [c.effectiveType, c.downlink ? c.downlink + "Mb/s" : "", c.saveData ? "économie de données" : ""].filter(Boolean).join(" · ") : "";
  }

  var tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}

  post({
    t: "pv", d: day, pid: pid, vid: visitor.v, sid: session.v,
    path: location.pathname + location.search, title: document.title, ref: document.referrer,
    utm: utm(), device: device(), lang: navigator.language, langs: navigator.languages ? Array.prototype.slice.call(navigator.languages) : [],
    tz: tz, sw: screen.width, sh: screen.height, dpr: window.devicePixelRatio,
    vw: window.innerWidth, vh: window.innerHeight,
    dark: !!(window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches),
    reduced: !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches),
    touch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
    cores: navigator.hardwareConcurrency, mem: navigator.deviceMemory, conn: connection(),
    returning: !visitor.fresh
  });

  /* ---------- clics utiles : contact, réseaux, projets ---------- */
  var KINDS = [
    [/^mailto:/i, "email"], [/^tel:/i, "téléphone"], [/wa\.me|whatsapp\.com/i, "whatsapp"],
    [/github\.com/i, "github"], [/linkedin\.com|lnkd\.in/i, "linkedin"], [/instagram\.com/i, "instagram"],
    [/facebook\.com|fb\.com/i, "facebook"], [/youtube\.com|youtu\.be/i, "youtube"]
  ];
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    var name = "";
    for (var i = 0; i < KINDS.length; i++) if (KINDS[i][0].test(href)) { name = "clic " + KINDS[i][1]; break; }
    if (!name && a.classList.contains("card")) name = "clic projet";
    if (!name && /^https?:\/\//i.test(a.href) && a.hostname !== host) name = "lien sortant";
    if (!name) return;
    var label = a.querySelector("h3") ? a.querySelector("h3").textContent : "";
    post({ t: "ev", pid: pid, d: day, name: name, target: label ? label + " → " + href : href }, true);
  }, true);

  /* ---------- temps passé (onglet visible) et défilement maximal ---------- */
  var shownAt = document.visibilityState === "visible" ? Date.now() : 0;
  var spent = 0, maxScroll = 0, lastSent = -1;

  function onScroll() {
    var doc = document.documentElement;
    var total = Math.max(doc.scrollHeight - (window.innerHeight || 1), 1);
    var pct = Math.round(((window.scrollY || doc.scrollTop) / total) * 100);
    if (pct > maxScroll) maxScroll = Math.min(100, pct);
  }
  addEventListener("scroll", onScroll, { passive: true });

  function flush() {
    if (shownAt) { spent += Date.now() - shownAt; shownAt = 0; }
    var seconds = Math.min(MAX_SECONDS, Math.round(spent / 1000));
    if (seconds === lastSent && !maxScroll) return;
    lastSent = seconds;
    post({ t: "end", pid: pid, d: day, dur: seconds, scroll: maxScroll }, true);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") flush(); else shownAt = Date.now();
  });
  addEventListener("pagehide", flush);
})();
