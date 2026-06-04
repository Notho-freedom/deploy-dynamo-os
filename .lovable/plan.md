
## Objectif

Remplacer le flux Vercel actuel (404 sur Marketplace + connexion par user) par un mode **admin-only** : un seul `VERCEL_ADMIN_TOKEN` côté serveur, tous les utilisateurs déploient leurs repos GitHub sur **ton compte Vercel**. Reconstruire l'UX d'import GitHub pour qu'elle ressemble exactement à "Add New Project" de Vercel.

L'approche OAuth Marketplace existante est **gardée dans le code derrière un feature flag** (`VITE_VERCEL_MODE = 'admin' | 'oauth'`) pour pouvoir la réactiver plus tard.

---

## 1. Mode Vercel "admin"

### Nouveau secret
- `VERCEL_ADMIN_TOKEN` — Personal Access Token de ton compte Vercel (scope full, team ou perso)
- `VERCEL_ADMIN_TEAM_ID` *(optionnel)* — si tu veux scoper à une team

### Refactor `vercel-api` edge function
- Si le body contient `mode: 'admin'` (ou si feature flag serveur `VERCEL_MODE=admin`) → utiliser `VERCEL_ADMIN_TOKEN` + `VERCEL_ADMIN_TEAM_ID` au lieu de lire `connected_accounts`
- Garder la branche existante (lecture `connected_accounts`) intacte derrière un `else`
- Allowlist déjà OK (créer projet, déployer, lister, etc.)

### Tag d'isolation par utilisateur
Puisque tous les projets vivent sur **ton** compte Vercel, on les préfixe et on stocke le mapping dans une nouvelle table `user_projects` :

```
user_projects
  user_id, vercel_project_id, vercel_project_name,
  github_repo_full_name, github_repo_id, branch,
  framework, created_at
```
Nom Vercel = `{user_slug}-{repo}` pour éviter les collisions et permettre le filtrage côté UI (un user ne voit que ses projets).

### Front
- Supprimer le panneau "Install Vercel Integration" du flux user (le code reste, masqué par flag)
- Status Vercel dans Settings → "Managed by OnNebula" au lieu de "Connect"

---

## 2. Flux Import GitHub (UX Vercel-like)

Route : `/dashboard/deploy/new`

```text
┌─────────────────────────────────────────────────────┐
│  Import Git Repository                              │
│  ┌─────────────────────────────────────────────┐    │
│  │ [owner ▾]   🔍 Search repos...              │    │
│  ├─────────────────────────────────────────────┤    │
│  │ ⬢ my-portfolio        TypeScript  2h   [Import]│
│  │ ⬢ landing-page        Next.js     1d   [Import]│
│  │ ⬢ api-server          Node        3d   [Import]│
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Étapes
1. **Sélection** — `/dashboard/deploy/new`
   - Liste virtualisée (max ~10 visibles, scroll), recherche debounced
   - Dropdown owner = user perso + chaque org renvoyée par `github.myOrgs()`
   - Carte par repo : avatar owner, nom, langage, dernière push, badge private/public, bouton **Import**

2. **Configure** — `/dashboard/deploy/new/configure?repo=owner/name`
   - Auto-détection framework (lit `package.json` via GitHub Contents API) : Vite / Next / Remix / Astro / SvelteKit / Static
   - Champs éditables : Project Name, Framework Preset, Root Directory, Build Command, Output Directory, Install Command, Node version
   - Branche (default branch pré-sélectionnée, dropdown sur `github.branches()`)
   - Section **Environment Variables** : table key/value/target, import depuis `.env.example`
   - Bouton **Deploy**

3. **Deploy** — `/dashboard/deploy/{vercel_project_id}`
   - Crée le projet Vercel + 1er deployment via `vercel-api` (mode admin)
   - Status live (polling `/v13/deployments/{id}` toutes les 2s tant que `BUILDING`)
   - Stream build logs via `/v2/deployments/{id}/events` (ajouter à l'allowlist)
   - Sections : Build Logs (terminal style) · Preview URL · Production URL · Settings

### Liste "Mes projets" — `/dashboard/deploy`
- Refonte de la table actuelle : remplacer par cards style Vercel (favicon, prod URL, dernière commit msg, branche, age)
- Filtré par `user_projects.user_id = auth.uid()`
- Action **Redeploy** + **Open in Vercel** (pour toi admin seulement)

---

## 3. GitHub — fixes UX

L'intégration GitHub OAuth reste (les users doivent connecter leur GitHub pour qu'on lise leurs repos), mais :
- Liste actuelle "interminable" → remplacée par la nouvelle vue `/deploy/new` (virtualisée, recherchable, paginée)
- Ajout `github.myOrgs()` (`/user/orgs`) pour le filtre owner
- Ajout `github.repoFile(owner, repo, path)` pour lire `package.json` (détection framework)

---

## 4. Feature flags

`src/lib/featureFlags.ts` (nouveau) :
```ts
export const FLAGS = {
  vercelMode: (import.meta.env.VITE_VERCEL_MODE || 'admin') as 'admin' | 'oauth',
  enableUserVercelConnect: false, // toggle pour réactiver le bouton Install Integration
};
```
Côté edge function : `Deno.env.get('VERCEL_MODE') ?? 'admin'`.

Aucun code supprimé — juste branché derrière les flags.

---

## 5. Détails techniques

**Migration DB** : nouvelle table `public.user_projects` avec RLS (user voit/édite uniquement les siens, service_role full) + grants `authenticated` + index sur `(user_id, created_at desc)`.

**Edge functions modifiées** :
- `vercel-api/index.ts` — branche admin token + injection `teamId=VERCEL_ADMIN_TEAM_ID`
- `github-api/index.ts` — pas de changement nécessaire (déjà proxy générique)

**Nouvelle edge function** : `vercel-deploy` — orchestre create project + first deployment + insert dans `user_projects` en une seule transaction.

**Allowlist Vercel** à étendre : `/v2/deployments/[id]/events` (logs stream — déjà présent, vérifier).

**Pages nouvelles** :
- `src/pages/dashboard/DeployNew.tsx` (sélection repo)
- `src/pages/dashboard/DeployConfigure.tsx` (configure)
- `src/pages/dashboard/DeployDetail.tsx` (suivi + logs)

**Pages modifiées** :
- `src/pages/dashboard/Deploy.tsx` — nouvelle vue "Mes projets" (cards)
- `src/pages/dashboard/CICD.tsx` — supprimer l'étape Connect Vercel (masquée par flag)
- `src/pages/dashboard/Settings.tsx` — Vercel = "Managed"
- `src/components/VercelLivePanel.tsx` — garder mais filtrer par `user_projects`
- `src/lib/github.ts` — ajouter `myOrgs`, `repoFile`
- `src/lib/vercel.ts` — ajouter `createProjectAndDeploy()` qui appelle la nouvelle edge fn

---

## Secrets à demander avant build
- `VERCEL_ADMIN_TOKEN` (obligatoire)
- `VERCEL_ADMIN_TEAM_ID` (optionnel — laisse vide si compte perso)

---

## Hors scope ce tour
- Zoho / Mailcheap / Porkbun / Cloudflare (déjà scaffoldés, on les attaque au prochain tour)
- Payments
- Réactivation du flux OAuth Marketplace (code conservé, flag off)
