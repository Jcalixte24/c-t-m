/* GET /api/media/<id> : images de projets envoyées depuis l'admin.
   L'identifiant est l'empreinte du fichier : le contenu ne change jamais, le cache peut être long. */
import { json, mediaStore, IMAGE_ID_RE } from "./_lib.mjs";

export default async (req) => {
  if (req.method !== "GET") return json(405, { error: "Méthode non autorisée" });
  const id = new URL(req.url).pathname.split("/").pop() || "";
  if (!IMAGE_ID_RE.test(id)) return json(404, { error: "Introuvable" });
  try {
    const found = await mediaStore().getWithMetadata(id, { type: "arrayBuffer" });
    if (!found) return json(404, { error: "Introuvable" });
    return new Response(found.data, {
      status: 200,
      headers: {
        "Content-Type": found.metadata?.type || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch (err) {
    console.error("media:", err);
    return json(500, { error: "Erreur interne" });
  }
};

export const config = { path: "/api/media/*" };
