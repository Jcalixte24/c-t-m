/* Outils partagés par les fonctions Netlify (authentification, validation, stockage). */
import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

export const SESSION_HOURS = 12;
export const MAX_BODY_BYTES = 64 * 1024;
export const PROJECT_TYPES = ["site", "app", "data", "produit"];
export const ART_KINDS = ["graph", "route", "code", "hbars", "bars", "chat", "heart", "phone"];

/* ---------- réponses ---------- */

export function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
}

export async function readJson(req, maxBytes = MAX_BODY_BYTES) {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "Requête trop volumineuse");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "JSON invalide");
  }
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* ---------- stockage ---------- */

export const visitsStore = () => getStore({ name: "ctm-visits", consistency: "strong" });
export const contentStore = () => getStore({ name: "ctm-content", consistency: "strong" });
export const mediaStore = () => getStore({ name: "ctm-media", consistency: "strong" });
export const authStore = () => getStore({ name: "ctm-auth", consistency: "strong" });

/* ---------- authentification administrateur ---------- */

const sha256 = (s) => createHash("sha256").update(String(s)).digest();

function sessionSecret(env) {
  const base = env.SESSION_SECRET || env.ADMIN_PASSWORD || "";
  return createHash("sha256").update("ctm-admin-session:" + base).digest();
}

export function adminConfigured(env = process.env) {
  return typeof env.ADMIN_PASSWORD === "string" && env.ADMIN_PASSWORD.length >= 8;
}

export function checkPassword(candidate, env = process.env) {
  if (!adminConfigured(env)) return false;
  return timingSafeEqual(sha256(candidate), sha256(env.ADMIN_PASSWORD));
}

const b64u = (buf) => Buffer.from(buf).toString("base64url");

export function signToken(now = Date.now(), env = process.env) {
  const exp = now + SESSION_HOURS * 3600 * 1000;
  const payload = b64u(JSON.stringify({ exp }));
  const sig = b64u(createHmac("sha256", sessionSecret(env)).update(payload).digest());
  return { token: `${payload}.${sig}`, exp };
}

export function verifyToken(token, now = Date.now(), env = process.env) {
  if (!adminConfigured(env) || typeof token !== "string") return false;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return false;
  const expected = createHmac("sha256", sessionSecret(env)).update(payload).digest();
  let given;
  try {
    given = Buffer.from(sig, "base64url");
  } catch {
    return false;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof exp === "number" && exp > now;
  } catch {
    return false;
  }
}

export function requireAdmin(req, env = process.env) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!verifyToken(token, Date.now(), env)) throw new HttpError(401, "Session expirée ou invalide");
}

/* Limite les essais de connexion : 5 échecs par IP et par fenêtre de 15 minutes. */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_FAILURES = 5;

export function loginAllowed(record, now = Date.now()) {
  if (!record || now - record.first > LOGIN_WINDOW_MS) return true;
  return record.count < LOGIN_MAX_FAILURES;
}

export function nextFailureRecord(record, now = Date.now()) {
  if (!record || now - record.first > LOGIN_WINDOW_MS) return { count: 1, first: now };
  return { count: record.count + 1, first: record.first };
}

export const ipKey = (ip) => createHash("sha256").update("ctm-ip:" + (ip || "inconnue")).digest("hex").slice(0, 32);

/* ---------- validation ---------- */

export function cleanStr(value, max = 200) {
  if (typeof value !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

export function cleanNum(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n * 100) / 100));
}

export function safeUrl(value) {
  const u = cleanStr(value, 500);
  if (!u) return "";
  if (/^https?:\/\/[^\s]+$/i.test(u)) return u;
  if (/^\/[^\s/][^\s]*$/.test(u) || /^[a-z0-9._-]+\.html(#[^\s]*)?$/i.test(u)) return u;
  return "";
}

const ID_RE = /^[a-z0-9][a-z0-9-]{0,59}$/;
export const TEXT_KEY_RE = /^[a-z0-9][a-z0-9-]{0,49}$/;
export const IMAGE_ID_RE = /^[a-f0-9]{24}\.(jpg|png|webp)$/;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function cleanProject(input, { requireId }) {
  if (!input || typeof input !== "object") return null;
  const out = {};
  if (requireId) {
    if (typeof input.id !== "string" || !ID_RE.test(input.id)) return null;
    out.id = input.id;
  }
  if (PROJECT_TYPES.includes(input.type)) out.type = input.type;
  for (const [key, max] of [["title", 120], ["desc", 600], ["sub", 60], ["label", 80]]) {
    if (typeof input[key] === "string") out[key] = cleanStr(input[key], max);
  }
  if ("url" in input) out.url = safeUrl(input.url);
  if (input.status === "live" || input.status === "wip") out.status = input.status;
  if (ART_KINDS.includes(input.art)) out.art = input.art;
  if (typeof input.image === "string" && (input.image === "" || IMAGE_ID_RE.test(input.image))) out.image = input.image;
  if (input.hidden === true) out.hidden = true;
  if (input.preview === true) out.preview = true;
  return out;
}

export function sanitizeContent(input) {
  const result = { version: 1, updatedAt: new Date().toISOString(), projects: {}, added: [], texts: {} };
  if (!input || typeof input !== "object") return result;

  const projects = input.projects && typeof input.projects === "object" ? input.projects : {};
  for (const [id, value] of Object.entries(projects).slice(0, 200)) {
    if (!ID_RE.test(id)) continue;
    const cleaned = cleanProject(value, { requireId: false });
    if (cleaned && Object.keys(cleaned).length) result.projects[id] = cleaned;
  }

  const texts = input.texts && typeof input.texts === "object" ? input.texts : {};
  for (const [key, value] of Object.entries(texts).slice(0, 100)) {
    const text = cleanStr(value, 600);
    if (TEXT_KEY_RE.test(key) && text) result.texts[key] = text;
  }

  const seen = new Set();
  for (const value of (Array.isArray(input.added) ? input.added : []).slice(0, 100)) {
    const cleaned = cleanProject(value, { requireId: true });
    if (!cleaned || seen.has(cleaned.id)) continue;
    seen.add(cleaned.id);
    result.added.push(cleaned);
  }
  return result;
}

const BOT_RE = /bot|crawl|spider|slurp|lighthouse|headless|preview|facebookexternalhit|monitor|uptime|curl|wget|python-requests/i;
export const looksLikeBot = (ua) => !ua || BOT_RE.test(ua);

export function sameOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

/* ---------- navigateur / système depuis l'user-agent ---------- */

export function parseUserAgent(ua = "") {
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\/|Opera/.test(ua) ? "Opera" :
    /SamsungBrowser/.test(ua) ? "Samsung Internet" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Safari\//.test(ua) ? "Safari" : "Autre";
  const os =
    /Android/i.test(ua) ? "Android" :
    /iPhone|iPad|iPod/i.test(ua) ? "iOS" :
    /Windows/i.test(ua) ? "Windows" :
    /Mac OS X|Macintosh/i.test(ua) ? "macOS" :
    /Linux/i.test(ua) ? "Linux" : "Autre";
  const version = (/(?:Edg|OPR|Firefox|Chrome|Version)\/(\d+)/.exec(ua) || [])[1] || "";
  return { browser, browserVersion: version, os };
}

/* ---------- images envoyées depuis l'admin ---------- */

const SIGNATURES = [
  { type: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", ext: "png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { type: "image/webp", ext: "webp", test: (b) => b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
];

/* Décode une image « data:image/…;base64,… » et vérifie son contenu réel (pas seulement le type annoncé).
   Le SVG est refusé : il peut contenir du script. */
export function parseImageDataUrl(dataUrl) {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(typeof dataUrl === "string" ? dataUrl : "");
  if (!m) throw new HttpError(400, "Image invalide (JPEG, PNG ou WebP uniquement)");
  const bytes = Buffer.from(m[2], "base64");
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new HttpError(413, "Image trop lourde (3 Mo maximum)");
  const sig = SIGNATURES.find((x) => x.test(bytes));
  if (!sig) throw new HttpError(400, "Le contenu du fichier n'est pas une image reconnue");
  const id = createHash("sha256").update(bytes).digest("hex").slice(0, 24) + "." + sig.ext;
  return { id, bytes, type: sig.type };
}
