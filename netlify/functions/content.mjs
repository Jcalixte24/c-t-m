/* GET /api/content : contenu modifiable du portfolio, lu par toutes les pages publiques. */
import { json, contentStore, sanitizeContent } from "./_lib.mjs";

export default async (req) => {
  if (req.method !== "GET") return json(405, { error: "Méthode non autorisée" });
  try {
    const stored = await contentStore().get("projects", { type: "json" });
    const content = stored ? sanitizeContent(stored) : { version: 1, projects: {}, added: [] };
    if (stored?.updatedAt) content.updatedAt = stored.updatedAt;
    return json(200, content, { "Cache-Control": "public, max-age=0, must-revalidate" });
  } catch (err) {
    console.error("content:", err);
    return json(200, { version: 1, projects: {}, added: [] });
  }
};

export const config = { path: "/api/content" };
