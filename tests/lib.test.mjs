import test from "node:test";
import assert from "node:assert/strict";
import {
  signToken, verifyToken, checkPassword, adminConfigured, loginAllowed, nextFailureRecord,
  LOGIN_MAX_FAILURES, LOGIN_WINDOW_MS, sanitizeContent, safeUrl, cleanStr, cleanNum,
  parseUserAgent, looksLikeBot, sameOrigin, SESSION_HOURS,
} from "../netlify/functions/_lib.mjs";
import { resolveDay } from "../netlify/functions/track.mjs";

const ENV = { ADMIN_PASSWORD: "un-mot-de-passe-solide", SESSION_SECRET: "secret-de-test" };

test("adminConfigured exige un mot de passe d'au moins 8 caractères", () => {
  assert.equal(adminConfigured({}), false);
  assert.equal(adminConfigured({ ADMIN_PASSWORD: "court" }), false);
  assert.equal(adminConfigured(ENV), true);
});

test("checkPassword accepte le bon mot de passe et refuse les autres", () => {
  assert.equal(checkPassword(ENV.ADMIN_PASSWORD, ENV), true);
  assert.equal(checkPassword("autre", ENV), false);
  assert.equal(checkPassword("", ENV), false);
  assert.equal(checkPassword(ENV.ADMIN_PASSWORD, {}), false);
});

test("un jeton signé est valide puis expire", () => {
  const now = 1_000_000;
  const { token, exp } = signToken(now, ENV);
  assert.equal(exp, now + SESSION_HOURS * 3600_000);
  assert.equal(verifyToken(token, now + 1000, ENV), true);
  assert.equal(verifyToken(token, exp + 1, ENV), false);
});

test("un jeton falsifié, tronqué ou signé avec un autre secret est refusé", () => {
  const { token } = signToken(1_000_000, ENV);
  const [payload] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ exp: 9e15 })).toString("base64url");
  assert.equal(verifyToken(`${forged}.${token.split(".")[1]}`, 1_000_001, ENV), false);
  assert.equal(verifyToken(payload, 1_000_001, ENV), false);
  assert.equal(verifyToken(token + ".x", 1_000_001, ENV), false);
  assert.equal(verifyToken(token, 1_000_001, { ...ENV, SESSION_SECRET: "autre" }), false);
  assert.equal(verifyToken("", 1, ENV), false);
  assert.equal(verifyToken(undefined, 1, ENV), false);
  assert.equal(verifyToken(token, 1_000_001, {}), false);
});

test("la limite d'essais bloque après 5 échecs puis se réinitialise", () => {
  let record = null;
  const t0 = 5_000;
  for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
    assert.equal(loginAllowed(record, t0 + i), true);
    record = nextFailureRecord(record, t0 + i);
  }
  assert.equal(loginAllowed(record, t0 + 10), false);
  assert.equal(loginAllowed(record, t0 + LOGIN_WINDOW_MS + 1), true);
  assert.deepEqual(nextFailureRecord(record, t0 + LOGIN_WINDOW_MS + 1), { count: 1, first: t0 + LOGIN_WINDOW_MS + 1 });
});

test("safeUrl accepte http(s), chemins relatifs et pages .html, refuse le reste", () => {
  assert.equal(safeUrl("https://aia-ci.cloud/"), "https://aia-ci.cloud/");
  assert.equal(safeUrl("  http://exemple.ci/x "), "http://exemple.ci/x");
  assert.equal(safeUrl("/cassandra"), "/cassandra");
  assert.equal(safeUrl("index.html#contact"), "index.html#contact");
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl("data:text/html,<script>"), "");
  assert.equal(safeUrl("//evil.example"), "");
  assert.equal(safeUrl("https://a b.com"), "");
  assert.equal(safeUrl(42), "");
});

test("sanitizeContent nettoie, plafonne et ignore les entrées invalides", () => {
  const out = sanitizeContent({
    projects: {
      "association-ivoirienne-d-astronomie": { title: "  AIA  ", url: "https://aia-ci.cloud/", hidden: true, type: "site", inconnu: "x" },
      "ID INVALIDE": { title: "non" },
      vide: {},
    },
    added: [
      { id: "nouveau-projet", title: "Nouveau", type: "app", url: "javascript:alert(1)", art: "route", preview: true },
      { id: "nouveau-projet", title: "Doublon" },
      { title: "Sans id" },
      "pas un objet",
    ],
  });
  assert.deepEqual(Object.keys(out.projects), ["association-ivoirienne-d-astronomie"]);
  assert.equal(out.projects["association-ivoirienne-d-astronomie"].title, "AIA");
  assert.equal(out.projects["association-ivoirienne-d-astronomie"].hidden, true);
  assert.equal("inconnu" in out.projects["association-ivoirienne-d-astronomie"], false);
  assert.equal(out.added.length, 1);
  assert.equal(out.added[0].url, "");
  assert.equal(out.added[0].art, "route");
  assert.equal(out.added[0].preview, true);
});

test("sanitizeContent renvoie une structure vide pour une entrée absurde", () => {
  for (const bad of [null, undefined, 3, "x", []]) {
    const out = sanitizeContent(bad);
    assert.deepEqual(out.projects, {});
    assert.deepEqual(out.added, []);
  }
});

test("cleanStr retire les caractères de contrôle et tronque", () => {
  assert.equal(cleanStr("a\u0000b\nc", 10), "a b c");
  assert.equal(cleanStr("x".repeat(500), 20).length, 20);
  assert.equal(cleanStr(null), "");
});

test("cleanNum borne les nombres et refuse les valeurs non finies", () => {
  assert.equal(cleanNum("12.345", 0, 100), 12.35);
  assert.equal(cleanNum(500, 0, 100), 100);
  assert.equal(cleanNum(-5, 0, 100), 0);
  assert.equal(cleanNum("abc", 0, 100), null);
  assert.equal(cleanNum(Infinity, 0, 100), null);
});

test("parseUserAgent reconnaît navigateur et système courants", () => {
  const android = parseUserAgent("Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36");
  assert.deepEqual([android.browser, android.os, android.browserVersion], ["Chrome", "Android", "126"]);
  const iphone = parseUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1");
  assert.deepEqual([iphone.browser, iphone.os], ["Safari", "iOS"]);
  const edge = parseUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0");
  assert.deepEqual([edge.browser, edge.os], ["Edge", "Windows"]);
});

test("looksLikeBot détecte les robots et l'absence d'user-agent", () => {
  assert.equal(looksLikeBot("Googlebot/2.1"), true);
  assert.equal(looksLikeBot(""), true);
  assert.equal(looksLikeBot(null), true);
  assert.equal(looksLikeBot("Mozilla/5.0 (Windows NT 10.0) Chrome/126.0"), false);
});

test("sameOrigin accepte l'absence d'Origin et refuse un autre domaine", () => {
  const mk = (origin) => new Request("https://creative-talent-management.netlify.app/api/track", { method: "POST", headers: origin ? { origin } : {} });
  assert.equal(sameOrigin(mk()), true);
  assert.equal(sameOrigin(mk("https://creative-talent-management.netlify.app")), true);
  assert.equal(sameOrigin(mk("https://evil.example")), false);
  assert.equal(sameOrigin(mk("pas-une-url")), false);
});

test("resolveDay garde le jour du navigateur s'il est proche de l'heure serveur", () => {
  const now = Date.parse("2026-10-25T12:00:00Z");
  assert.equal(resolveDay("2026-10-25", now), "2026-10-25");
  assert.equal(resolveDay("2026-10-24", now), "2026-10-24");
  assert.equal(resolveDay("2026-10-26", now), "2026-10-26");
  assert.equal(resolveDay("2020-01-01", now), "2026-10-25");
  assert.equal(resolveDay("n'importe quoi", now), "2026-10-25");
  assert.equal(resolveDay(undefined, now), "2026-10-25");
});
