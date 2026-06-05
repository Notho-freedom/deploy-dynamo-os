## Objectif

Terminer la refonte du dashboard alignée Vercel en une seule passe: corriger les bugs bloquants, brancher tout ce qui peut l'être sur l'API Vercel, et restructurer les pages secondaires encore en chantier. Aucune donnée fictive — sources réelles ou empty states.

## 1. Corrections bloquantes (priorité immédiate)

**Bug "Invalid time value"** — `formatDistanceToNow` reçoit `undefined`/`null` sur des deployments incomplets (créés à l'instant, sans `ready`, sans `created`).
- Helper `safeDate(value)` + `safeFormatDistance(value)` dans `src/lib/utils.ts`, retourne `'—'` si invalide.
- Remplacer toutes les occurrences `formatDistanceToNow(...)` et `new Date(...)` dans `DashboardPrimitives.tsx`, `DeployDetail.tsx`, `Deploy.tsx`, `Dashboard.tsx`.

**Bug "Vercel 404: Deployment not found"** — polling continue après suppression d'un déploiement ou ID invalide; les erreurs sont uncaught.
- Dans `DeployDetail`: stop polling après 1 erreur 404, basculer en empty state "Deployment removed".
- `vercel-api`: laisser passer les 404 sans throw côté client (déjà JSON via `data.status`), mais ajouter un flag `silent404` côté `vercel.getDeployment`.
- Wrap tous les `void load…()` polling avec try/catch + abort cleanup.

## 2. Page Deployments (liste)

Réordonner colonnes façon Vercel:
1. **Deployment ID** (court, `dpl_xxx…7chars`, mono) — première colonne
2. **Status** + durée
3. **Environment**
4. **Commit message** — `line-clamp-2` strict (max 2 lignes, ellipsis) + tooltip plein texte
5. Project / Repo (truncate)
6. Branch (truncate)
7. Commit SHA (mono, 7 chars)
8. Created (relative)
9. Open URL

Tous les `<td>` reçoivent `max-w-[Xpx] truncate` ou `line-clamp-2`. Ajout composant `<TruncatedText lines={2}>`.

## 3. Detail Deployment — onglets

### Onglet Deployment
- Fix Invalid time value (cf. §1).
- Carte récap avec: preview screenshot via Vercel `https://vercel.com/api/screenshot?...` si dispo, sinon placeholder.
- Bloc "Build & Deployment Settings" (lecture seule pour l'instant): framework, root dir, build cmd, output dir, install cmd, node version (depuis `GET /v9/projects/{id}` — étendre `vercel.ts` types).
- Bloc "Domains assigned" (déjà OK).
- Bloc "Git" — commit author, sha, message, lien GitHub.

### Onglet Logs (temps réel + coloration)
- Remplacer le polling 2.5s par **SSE streaming** Vercel: `GET /v2/deployments/{id}/events?builds=1&follow=1` (mode stream).
- Côté edge function `vercel-api`: nouveau mode `stream: true` qui pipe la réponse Vercel (text/event-stream) au client, OU plus simple: nouvelle edge fn `vercel-logs-stream` qui ouvre la connexion SSE Vercel et la renvoie en SSE au navigateur. Le frontend utilise `EventSource`.
- Coloration: parser ANSI escape codes (`\x1b[XXm`) avec une petite lib zero-dep (`anser` ou implémentation custom 60 lignes) → spans colorés. Couleurs: rouge=error, jaune=warn, vert=success, gris=info, cyan=urls.
- Détection de mots-clés sans ANSI: `error|failed|ERR!` → rouge, `warning|warn` → jaune, `✓|success|ready` → vert.
- Auto-scroll au bas avec bouton "pause autoscroll" quand l'utilisateur scrolle.
- Ajustement `Terminal.tsx`: accepter `children` ANSI-parsé (composant `<AnsiLine text=…/>`).

### Onglet Resources
- Liste réelle des fonctions: `GET /v13/deployments/{id}` retourne `functions`, `routes`, `lambdas`, `outputs`. Afficher: nom, runtime, region, memory, maxDuration, taille bundle.
- Static assets: parser `output` de la réponse v13 (fichiers `type: 'static'`).
- Si la version d'API ne retourne rien → empty state honnête (pas de mock).

### Onglet Source
- Lire l'arborescence du repo via GitHub Trees API: `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1` (ajout `github.repoTree()`).
- Panneau gauche: file tree (lazy expand par dossier). Panneau droit: contenu fichier via `github.repoFile()`.
- **Coloration syntaxique**: utiliser `shiki` (déjà compatible bundle Vite) ou `prism-react-renderer` (plus léger). Choix: `prism-react-renderer` (~30KB) avec thème `vsDark`. Map extension → langage (ts/tsx/js/json/md/css/html/sql…).
- Bouton "Open on GitHub" sur chaque fichier.

### Onglet Open Graph
- Endpoint Vercel non documenté côté API publique. Plan: générer un screenshot via `https://api.microlink.io/?url=https://{deployment.url}&screenshot=true&meta=true` (free tier, sans clé) **uniquement si** l'utilisateur cliquera "Generate preview", sinon empty state. Si refus → garde l'empty state existant.
- Afficher meta tags récupérés: title, description, og:image, twitter:card.

## 4. Séparer Logs / Analytics / Observability

Actuellement les 3 entrées de la sidebar pointent vers `/dashboard/monitoring`. Créer 3 pages distinctes:

### `/dashboard/logs` (nouveau)
- Vue cross-projets des logs runtime: `GET /v1/projects/{id}/logs` (Vercel Log Drains API requires Pro, fallback: agréger les `events` des deployments READY récents par projet).
- Filtres: projet, environment, niveau (info/warn/error), search texte, plage temps.
- Stream live via SSE (cf. §3 Logs).

### `/dashboard/analytics` (nouveau)
- `GET /v1/projects/{id}/analytics?from=…&to=…` — pageviews, visitors, top pages, top referrers, devices.
- Si l'API renvoie 402/403 (plan insuffisant) → empty state "Analytics requires Vercel Pro on the linked project".
- Charts via `recharts` (déjà présent).

### `/dashboard/observability` (renommé Monitoring)
- Edge requests, function invocations, bandwidth: `GET /v1/usage/...` (où dispo) sinon agrégats depuis `getDeployment().functions[i].metrics`.
- 4 cartes (Edge Requests / Fast Data Transfer / Function Invocations / Middleware) — couper proprement en empty state si la team est Hobby.

Mise à jour `App.tsx` (routes `/logs`, `/analytics`, `/observability`) + sidebar `DashboardLayout.tsx` (3 entrées distinctes).

## 5. Pages secondaires restantes

### `/dashboard/domains`
- Vue "Tous les domaines": agrège `listDomains` sur tous les `user_projects`.
- Vue détail domaine (drawer ou route `/domains/{name}`): DNS records via `GET /v4/domains/{domain}/records`, nameservers, SSL certs via `GET /v4/domains/{domain}/certs`, registrar info, age. Reproduit fidèlement la capture `genesis-company.net`.
- Ajout dans `vercel.ts`: `listDomainRecords`, `addDomainRecord`, `removeDomainRecord`, `listCerts`. Allowlist edge fn étendue.
- Achat de domaine: empty state "Coming soon — registrar integration pending".

### `/dashboard/cicd` (Integrations)
- Liste des intégrations réelles connectées (GitHub) + cards "Coming soon" pour Render, Cloudflare, Zoho, Mailcheap, Porkbun.

### `/dashboard/settings` (Project Settings — capture fournie)
- Quand un projet est sélectionné dans le ProjectSwitcher: sous-page Project Settings avec sections General / Build & Deployment / Environments / Git / Deployment Protection / Functions / Domains.
- Onglets sidebar inline (comme capture Vercel) — pas une page séparée: composant `<ProjectSettingsLayout>` interne.
- General: Project Name (`PATCH /v9/projects/{id}` `{ name }`), Project ID (readonly+copy), Data Preferences, Transfer (empty state), Delete Project (`DELETE /v9/projects/{id}` + cleanup `user_projects`).

### `/dashboard/backend` (Environment Variables global) + sur project settings
- Table env vars réelles: `GET /v9/projects/{id}/env`, ajout/édit/delete via `POST/PATCH/DELETE /v9/projects/{id}/env/{id}`. Allowlist déjà OK.

### `/dashboard/billing`
- Garder le flux top-up local; supprimer toute info Vercel fake. Empty state pour "Plan / Invoices" avec mention "Render backend pending".

## 6. Allowlist & API Vercel — extensions

Ajouter dans `vercel-api/index.ts`:
```
/^\/v1\/projects\/[^/]+\/analytics$/
/^\/v1\/projects\/[^/]+\/logs$/
/^\/v1\/usage\/.+$/
/^\/v4\/domains\/[^/]+\/records(\/[^/]+)?$/
/^\/v4\/domains\/[^/]+\/certs$/
/^\/v4\/domains$/
/^\/v9\/projects\/[^/]+\/env\/[^/]+$/
/^\/v13\/deployments\/[^/]+$/  (DELETE)
```

Nouvelle edge fn `vercel-logs-stream`:
- Accepte `deployment_id`, ouvre `GET /v2/deployments/{id}/events?follow=1&builds=1` avec admin token, renvoie un `ReadableStream` SSE au client.
- CORS + auth Supabase identiques aux autres fns.

## 7. Détails techniques

**Fichiers modifiés**
- `src/lib/utils.ts` — helpers date safe
- `src/lib/vercel.ts` — types étendus (ProjectDetail, Function, Route, Cert, Record), nouvelles méthodes API, `streamLogs(id, onEvent)` basé sur `EventSource` pointant vers la nouvelle edge fn
- `src/components/Terminal.tsx` — support `ansi` parsing, auto-scroll lock
- `src/components/dashboard/DashboardPrimitives.tsx` — `TruncatedText`, refonte `DeploymentTable` (ID en 1er, line-clamp commit)
- `src/components/SyntaxHighlighter.tsx` (nouveau) — wrap `prism-react-renderer`
- `src/components/AnsiOutput.tsx` (nouveau) — ANSI → spans Tailwind
- `src/components/FileTree.tsx` (nouveau) — arborescence repo
- `src/pages/dashboard/DeployDetail.tsx` — onglets refondus
- `src/pages/dashboard/Deploy.tsx` — colonnes + truncate
- `src/pages/dashboard/Logs.tsx` (nouveau)
- `src/pages/dashboard/Analytics.tsx` (nouveau)
- `src/pages/dashboard/Observability.tsx` (renommé depuis Monitoring)
- `src/pages/dashboard/Domains.tsx` — refonte type Vercel
- `src/pages/dashboard/DomainDetail.tsx` (nouveau)
- `src/pages/dashboard/Settings.tsx` — onglets project settings
- `src/pages/DashboardLayout.tsx` — sidebar (Logs/Analytics/Observability séparés)
- `src/App.tsx` — routes ajoutées
- `supabase/functions/vercel-api/index.ts` — allowlist étendue
- `supabase/functions/vercel-logs-stream/index.ts` (nouveau)

**Dépendance ajoutée**: `prism-react-renderer` (~30KB) pour la coloration syntaxique. Pas de lib ANSI — parser custom léger (≤60 lignes).

## 8. Hors scope

- Backend Render (à brancher plus tard, l'utilisateur a explicitement demandé de se concentrer sur la structure)
- Réactivation du flux OAuth Vercel Marketplace
- Zoho / Mailcheap / Porkbun / Cloudflare
- Mode édition env vars en masse / import `.env`
- Vercel Web Analytics côté script injection

## Résultat attendu

1. Plus de crash "Invalid time value", plus de spam 404 console.
2. Page Deployments alignée Vercel (ID first, commit clamp-2).
3. Logs colorés temps réel via SSE, plus besoin de refresh.
4. Source = vrai file tree GitHub avec coloration syntaxique.
5. Logs / Analytics / Observability sont 3 pages distinctes.
6. Domains affiche DNS, nameservers, SSL certs réels.
7. Project Settings reproduit la structure Vercel (General / Build / Env / Git / Functions / Delete).
