/* POST /api/track : enregistre une visite (page vue, fin de visite, clic important).
   L'adresse IP et la localisation viennent de Netlify (côté serveur, non falsifiables par le navigateur). */
import {
  HttpError, json, readJson, visitsStore, cleanStr, cleanNum, parseUserAgent, looksLikeBot, sameOrigin,
} from "./_lib.mjs";

const ID_RE = /^[A-Za-z0-9_-]{6,40}$/;
const MAX_EVENTS = 40;

const validId = (v) => (typeof v === "string" && ID_RE.test(v) ? v : "");
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400_000;
const dayOf = (ts) => new Date(ts).toISOString().slice(0, 10);

/* Le navigateur indique le jour (UTC) de sa visite pour retrouver l'enregistrement à la fermeture.
   On ne l'accepte que s'il est à moins d'un jour de l'heure du serveur (horloge fiable). */
export function resolveDay(candidate, now) {
  if (typeof candidate === "string" && DAY_RE.test(candidate)) {
    const diff = Math.abs(Date.parse(candidate + "T00:00:00Z") - Date.parse(dayOf(now) + "T00:00:00Z"));
    if (diff <= DAY_MS) return candidate;
  }
  return dayOf(now);
}

const keyOf = (day, pid) => `pv/${day}/${pid}`;

function newVisit(body, req, context, now) {
  const ua = cleanStr(req.headers.get("user-agent") || "", 400);
  const geo = context.geo || {};
  const parsed = parseUserAgent(ua);
  const langs = Array.isArray(body.langs) ? body.langs.slice(0, 6).map((l) => cleanStr(l, 20)).filter(Boolean) : [];
  return {
    id: body.pid,
    vid: body.vid,
    sid: body.sid,
    ts: now,
    ip: cleanStr(context.ip || "", 64),
    country: cleanStr(geo.country?.name || "", 60),
    countryCode: cleanStr(geo.country?.code || "", 4),
    region: cleanStr(geo.subdivision?.name || "", 80),
    city: cleanStr(geo.city || "", 80),
    latitude: cleanNum(geo.latitude, -90, 90),
    longitude: cleanNum(geo.longitude, -180, 180),
    geoTimezone: cleanStr(geo.timezone || "", 60),
    userAgent: ua,
    browser: parsed.browser,
    browserVersion: parsed.browserVersion,
    os: parsed.os,
    device: ["mobile", "tablet", "desktop"].includes(body.device) ? body.device : "",
    path: cleanStr(body.path, 200),
    title: cleanStr(body.title, 160),
    referrer: cleanStr(body.ref, 300),
    utm: {
      source: cleanStr(body.utm?.source, 80),
      medium: cleanStr(body.utm?.medium, 80),
      campaign: cleanStr(body.utm?.campaign, 80),
    },
    language: cleanStr(body.lang, 20),
    languages: langs,
    timezone: cleanStr(body.tz, 60),
    screen: { w: cleanNum(body.sw, 0, 20000), h: cleanNum(body.sh, 0, 20000), dpr: cleanNum(body.dpr, 0, 10) },
    viewport: { w: cleanNum(body.vw, 0, 20000), h: cleanNum(body.vh, 0, 20000) },
    colorScheme: body.dark === true ? "sombre" : "clair",
    reducedMotion: body.reduced === true,
    touch: body.touch === true,
    cores: cleanNum(body.cores, 0, 256),
    memoryGb: cleanNum(body.mem, 0, 1024),
    connection: cleanStr(body.conn, 40),
    returning: body.returning === true,
    duration: 0,
    scroll: 0,
    events: [],
  };
}

async function update(store, key, mutate) {
  const record = await store.get(key, { type: "json" });
  if (!record) return false;
  mutate(record);
  await store.setJSON(key, record);
  return true;
}

export default async (req, context) => {
  try {
    if (req.method !== "POST") throw new HttpError(405, "Méthode non autorisée");
    if (!sameOrigin(req)) throw new HttpError(403, "Origine refusée");
    if (looksLikeBot(req.headers.get("user-agent"))) return new Response(null, { status: 204 });

    const body = await readJson(req, 8 * 1024);
    const pid = validId(body.pid);
    if (!pid) throw new HttpError(400, "Identifiant manquant");

    const store = visitsStore();
    const now = Date.now();

    if (body.t === "pv") {
      const vid = validId(body.vid);
      const sid = validId(body.sid);
      if (!vid || !sid) throw new HttpError(400, "Identifiants manquants");
      await store.setJSON(keyOf(resolveDay(body.d, now), pid), newVisit({ ...body, pid, vid, sid }, req, context, now));
      return new Response(null, { status: 204 });
    }

    if (typeof body.d !== "string" || !DAY_RE.test(body.d)) throw new HttpError(400, "Jour manquant");
    const key = keyOf(body.d, pid);

    if (body.t === "end") {
      const duration = cleanNum(body.dur, 0, 4 * 3600);
      const scroll = cleanNum(body.scroll, 0, 100);
      await update(store, key, (r) => {
        r.duration = Math.max(r.duration || 0, duration ?? 0);
        r.scroll = Math.max(r.scroll || 0, scroll ?? 0);
      });
      return new Response(null, { status: 204 });
    }

    if (body.t === "ev") {
      const name = cleanStr(body.name, 40);
      if (!name) throw new HttpError(400, "Évènement vide");
      const target = cleanStr(body.target, 300);
      await update(store, key, (r) => {
        if ((r.events || []).length >= MAX_EVENTS) return;
        r.events = [...(r.events || []), { name, target, at: now }];
      });
      return new Response(null, { status: 204 });
    }

    throw new HttpError(400, "Type inconnu");
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { error: err.message });
    console.error("track:", err);
    return json(500, { error: "Erreur interne" });
  }
};

export const config = { path: "/api/track" };
