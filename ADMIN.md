# Espace admin CTM

Adresse : `https://creative-talent-management.netlify.app/admin`

## Mise en route (une seule fois)

1. Netlify → site → **Site configuration → Environment variables → Add a variable**
   - `ADMIN_PASSWORD` : votre mot de passe (8 caractères minimum, long et unique)
   - `SESSION_SECRET` (facultatif) : une longue chaîne aléatoire
2. Le site doit être déployé depuis GitHub (`Jcalixte24/c-t-m`) pour que `netlify/functions` soit construit
   et que `@netlify/blobs` soit installé. Un dépôt-glisser-déposer du dossier ne déploie pas les fonctions.
3. **Deploys → Trigger deploy** après avoir ajouté les variables.
4. Ouvrez `/admin`, connectez-vous.

## Ce que fait l'admin

- **Visites** : chaque page vue avec IP, pays/région/ville, appareil, navigateur, écran, langue, source, temps passé,
  défilement et clics de contact. Recherche, détail par visite, export CSV.
- **Visiteurs** : regroupement par identifiant de navigateur (visites répétées).
- **Projets** : modifier titre, description, lien, secteur, statut ; masquer ; ajouter. Cliquer sur « Publier » met le
  portfolio à jour sans redéploiement (lu via `/api/content`).
- **Données** : suppression des anciennes visites.

## Fonctionnement

| Élément | Rôle |
|---|---|
| `ctm-track.js` | envoie les visites à `/api/track` (respecte « Ne pas me suivre », ignore robots et admin) |
| `ctm-content.js` | applique les changements de projets sur `portfolio.html` |
| `netlify/functions/track.mjs` | enregistre visite + IP/géo fournies par Netlify |
| `netlify/functions/content.mjs` | contenu public des projets |
| `netlify/functions/admin.mjs` | connexion (5 essais / 15 min / IP), visites, contenu |
| Stockage | Netlify Blobs (`ctm-visits`, `ctm-content`, `ctm-auth`) |

Les cartes de projets portent un `data-id` stable dans `portfolio.html` : ne le changez pas, il relie les modifications
de l'admin à la carte d'origine.

## Test en local

```bash
npm install
npm test
npx netlify-cli dev   # puis ADMIN_PASSWORD=... dans un fichier .env
```
