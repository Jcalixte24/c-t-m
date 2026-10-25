/* API de l'espace admin (/api/admin/*) : connexion, visites, contenu du portfolio. */
import {
  HttpError, json, readJson, requireAdmin, adminConfigured, checkPassword, signToken, authStore,
  loginAllowed, nextFailureRecord, ipKey, visitsStore, contentStore, mediaStore, sanitizeContent, parseImageDataUrl, MAX_IMAGE_BYTES,
} from "./_lib.mjs";

const MAX_VISITS = 3000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function login(req, context) {
  if (!adminConfigured()) {
    throw new HttpError(503, "ADMIN_PASSWORD n'est pas configuré dans Netlify (8 caractères minimum).");
  }
  const store = authStore();
  const key = `fail/${ipKey(context.ip)}`;
  const record = await store.get(key, { type: "json" });
  if (!loginAllowed(record)) throw new HttpError(429, "Trop d'essais. Réessayez dans 15 minutes.");

  const body = await readJson(req, 2 * 1024);
  const ok = typeof body.password === "string" && checkPassword(body.password);
  if (!ok) {
    await store.setJSON(key, nextFailureRecord(record));
    throw new HttpError(401, "Mot de passe incorrect");
  }
  if (record) await store.delete(key);
  return json(200, signToken());
}

async function listVisits(url) {
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days")) || 30));
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const store = visitsStore();

  const keys = [];
  for await (const page of store.list({ prefix: "pv/", paginate: true })) {
    for (const blob of page.blobs) {
      const day = blob.key.split("/")[1];
      if (day >= since) keys.push(blob.key);
    }
  }
  keys.sort().reverse();
  const picked = keys.slice(0, MAX_VISITS);

  const visits = [];
  for (let i = 0; i < picked.length; i += 25) {
    const chunk = await Promise.all(picked.slice(i, i + 25).map((k) => store.get(k, { type: "json" })));
    for (const v of chunk) if (v) visits.push(v);
  }
  visits.sort((a, b) => b.ts - a.ts);
  return json(200, { visits, truncated: keys.length > picked.length, total: keys.length });
}

async function deleteVisits(url) {
  const store = visitsStore();
  const before = url.searchParams.get("before");
  if (!before || !DATE_RE.test(before)) throw new HttpError(400, "Paramètre before=AAAA-MM-JJ requis");

  let deleted = 0;
  for await (const page of store.list({ prefix: "pv/", paginate: true })) {
    for (const blob of page.blobs) {
      if (blob.key.split("/")[1] < before) {
        await store.delete(blob.key);
        deleted += 1;
      }
    }
  }
  return json(200, { deleted });
}

async function uploadMedia(req) {
  const body = await readJson(req, Math.ceil(MAX_IMAGE_BYTES * 1.4) + 1024);
  const image = parseImageDataUrl(body.dataUrl);
  await mediaStore().set(image.id, image.bytes, { metadata: { type: image.type } });
  return json(200, { id: image.id });
}

async function putContent(req) {
  const body = await readJson(req);
  const clean = sanitizeContent(body);
  await contentStore().setJSON("projects", clean);
  return json(200, clean);
}

export default async (req, context) => {
  try {
    const url = new URL(req.url);
    const route = url.pathname.replace(/^\/api\/admin\/?/, "").replace(/\/$/, "");

    if (route === "login" && req.method === "POST") return await login(req, context);
    if (route === "status" && req.method === "GET") return json(200, { configured: adminConfigured() });

    requireAdmin(req);

    if (route === "visits" && req.method === "GET") return await listVisits(url);
    if (route === "visits" && req.method === "DELETE") return await deleteVisits(url);
    if (route === "content" && req.method === "GET") {
      const stored = await contentStore().get("projects", { type: "json" });
      return json(200, stored ?? { version: 1, projects: {}, added: [], texts: {} });
    }
    if (route === "content" && req.method === "PUT") return await putContent(req);
    if (route === "media" && req.method === "POST") return await uploadMedia(req);

    throw new HttpError(404, "Route inconnue");
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { error: err.message });
    console.error("admin:", err);
    return json(500, { error: "Erreur interne" });
  }
};

export const config = { path: "/api/admin/*" };
