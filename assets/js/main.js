// Creative Talent Management · scripts du site (sans bibliothèque)
(function () {
  "use strict";
  var NUM = "2250719509526", MAIL = "contact@ctm-africa.com";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var wa = function (t) { return "https://wa.me/" + NUM + "?text=" + encodeURIComponent(t); };

  // menu mobile
  var mob = $("#mob");
  if (mob) {
    $(".burger").addEventListener("click", function () { mob.classList.add("open"); });
    $$("#mob a, #mob button").forEach(function (el) { el.addEventListener("click", function () { mob.classList.remove("open"); }); });
  }

  // apparitions au défilement
  var rv = $$(".rv");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    rv.forEach(function (el, i) { el.style.setProperty("--i", i % 4); io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add("on"); });

  // filtres des experts
  var chips = $$(".chip[data-f]");
  chips.forEach(function (c) {
    c.addEventListener("click", function () {
      chips.forEach(function (x) { x.classList.toggle("on", x === c); });
      var f = c.getAttribute("data-f");
      $$(".expert").forEach(function (e) { e.hidden = f !== "all" && e.getAttribute("data-dom") !== f; });
    });
  });

  // résultat d'un formulaire : message prêt à envoyer
  function showOut(form, msg, mailSubject) {
    var out = form.querySelector(".out");
    out.innerHTML = '<p class="hint">Votre message est prêt. Choisissez comment l\'envoyer :</p><pre></pre>' +
      '<a class="btn btn-wa btn-block" target="_blank" rel="noopener" href="' + wa(msg) + '">Envoyer sur WhatsApp</a>' +
      (mailSubject ? '<a class="btn btn-block" href="mailto:' + MAIL + "?subject=" + encodeURIComponent(mailSubject) + "&body=" + encodeURIComponent(msg) + '">Envoyer par e-mail</a>' : "");
    out.querySelector("pre").textContent = msg;
    out.classList.add("show");
    out.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function val(form, n) { var e = form.elements[n]; return e ? e.value.trim() : ""; }
  function check(form) {
    var bad = $$("[required]", form).filter(function (f) { return !f.value.trim(); })[0];
    if (bad) { bad.focus(); bad.reportValidity && bad.reportValidity(); return false; }
    return true;
  }

  // page « talent » : trois parcours, trois formulaires
  var paths = $$(".path[data-form]");
  paths.forEach(function (p) {
    p.addEventListener("click", function () {
      paths.forEach(function (x) { x.setAttribute("aria-pressed", String(x === p)); });
      $$(".formcard").forEach(function (f) { f.hidden = f.id !== p.getAttribute("data-form"); });
      var f = document.getElementById(p.getAttribute("data-form"));
      if (f) f.scrollIntoView({ behavior: "smooth", block: "start" });
      try { history.replaceState(null, "", "#" + p.getAttribute("data-form")); } catch (e) {}
    });
  });
  var h = location.hash.replace("#", "");
  var start = paths.filter(function (p) { return p.getAttribute("data-form") === h; })[0];
  if (start) start.click();

  var fe = $("#emploi form");
  if (fe) fe.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!check(fe)) return;
    var L = ["Bonjour Cassandra, je suis un talent et je cherche un emploi.", "", "Nom : " + val(fe, "nom"), "WhatsApp : " + val(fe, "wa"), "Ville : " + (val(fe, "ville") || "Abidjan"),
      "Situation : " + val(fe, "situation"), "Mon objectif : " + val(fe, "objectif")];
    if (val(fe, "msg")) L.push("", val(fe, "msg"));
    showOut(fe, L.join("\n"), "");
  });
  $$("#entrepreneur form, #autre form").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!check(f)) return;
      var kind = f.closest(".formcard").id === "entrepreneur" ? "entrepreneur" : "talent";
      var L = ["Bonjour, je suis un talent (" + kind + ").", "", "Nom : " + val(f, "nom"), "E-mail : " + val(f, "email"), "Domaine : " + val(f, "domaine"), "", val(f, "msg")];
      showOut(f, L.join("\n"), "Demande d'un talent · " + kind);
    });
  });

  // page « entreprise » : exprimer un besoin
  var fb = $("#besoin form");
  if (fb) fb.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!check(fb)) return;
    var L = ["Bonjour, nous sommes une entreprise à la recherche de talents.", "", "Entreprise : " + val(fb, "entreprise"), "Contact : " + val(fb, "nom"), "Téléphone / e-mail : " + val(fb, "contact"),
      "Profil recherché : " + val(fb, "poste"), "Domaine : " + val(fb, "domaine")];
    if (val(fb, "msg")) L.push("", val(fb, "msg"));
    showOut(fb, L.join("\n"), "Besoin en recrutement");
  });
  $$("a[data-ref]").forEach(function (a) {
    a.setAttribute("href", wa("Bonjour, notre entreprise est intéressée par le profil " + a.getAttribute("data-ref") + ". Pouvons-nous en discuter ?"));
    a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener");
  });

  // formulaire de contact de l'accueil
  var fc = $("#contact form");
  if (fc) fc.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!check(fc)) return;
    showOut(fc, "Bonjour, je suis : " + val(fc, "role") + "\nNom : " + val(fc, "nom") + "\nE-mail : " + val(fc, "email") + "\n\n" + val(fc, "msg"), "Contact · " + val(fc, "role"));
  });
})();
