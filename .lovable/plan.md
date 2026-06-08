# Plan — Phase 4 : Multi-tenant Render + refonte pages + Vercel deep dive

## 1. Bug bloquant : crash `charAt`

`DashboardPrimitives.tsx:169` fait `state.charAt(0) + state.slice(1).toLowerCase()` sans garde quand `state` est `undefined` (cas réel : déploiement Vercel sans `readyState`). Crash global de la page Deploy.

**Fix** : normaliser `state = String(state ?? 'QUEUED').toUpperCase()` en entrée du composant `StatusBadge` + fallback `'—'` à l'affichage.

## 2. Render en mode multi-tenant (priorité haute)

Aujourd'hui `Backend.tsx` appelle `render.listServices()` / `listPostgres()` / `listKeyValue()` qui passent par `render-api` avec ton `RENDER_API_KEY` admin → chaque utilisateur voit TOUTES tes apps Render. À corriger.

**Modèle** : tu restes propriétaire unique du compte Render. La table `user_backend_services` (déjà créée) sert d'index de propriété : ligne = (`user_id`, `render_service_id`). Aucun utilisateur ne peut voir ou toucher un service qui n'a pas sa ligne.

**Changements** :

- **Edge `render-api`** : avant le `fetch` vers Render, charger les `render_service_id` (et `postgres` / `key-value` ids) appartenant à l'utilisateur courant via service-role. Puis :
  - `GET /v1/services` → forcer `serviceIds[]` = ceux de l'utilisateur (paramètre supporté par Render). Si vide → retourner `[]` directement, sans appeler Render.
  - `GET /v1/postgres`, `GET /v1/key-value` → idem avec leurs filtres respectifs (`ids[]`).
  - `GET/PATCH/POST/DELETE /v1/services/{id}/...`, `/v1/postgres/{id}/...`, `/v1/key-value/{id}/...`, `/v1/logs?resource=...`, `/v1/metrics/...?resource=...` → vérifier que l'`id`/`resource` appartient bien à l'utilisateur, sinon 403.
  - `POST /v1/services` / `POST /v1/postgres` / `POST /v1/key-value` (création directe via proxy) → bloquer, forcer le passage par `render-deploy` qui enregistre la ligne d'ownership.
- **Edge `render-deploy`** : déjà fait l'`upsert` ownership — ajouter `kind` correct pour postgres / key_value et stocker aussi le `service_url` final pour postgres (host) après création.
- **Edge `render-logs-stream`** : ajouter la même vérification ownership sur le paramètre `resource` avant de polluer.
- **Front `Backend.tsx`** : aucun changement de logique nécessaire (le filtrage devient transparent côté serveur), mais ajouter un état vide explicite « Aucun service — Importer un repo » qui pointe vers `/dashboard/backend/new`.
- **Suppression de service** : quand on `DELETE /v1/services/{id}`, supprimer également la ligne de `user_backend_services`.

## 3. Refonte des pages restantes au standard Vercel

Pages à refondre pour adopter la même structure dense que `Deploy`, `Domains`, `Backend` (toolbar `DashboardToolbar` + `FilterBar` + tables denses, padding cohérent `px-5 py-6`, eyebrow + titre, plus de contenu collé en haut-gauche) :

- **`EmailSetup.tsx`** — wrapper layout dashboard, header `DashboardToolbar`, stepper aligné, panneaux côte à côte, état vide propre quand aucun domaine.
- **`Billing.tsx`** — tabs façon Vercel (Overview/Usage/Invoices/Payment methods), KPI grid en haut, table transactions dense, panneau wallet à droite.
- **`Settings.tsx`** — vrai layout deux colonnes (nav latérale interne Profile/Team/Integrations/API/Webhooks/Preferences + contenu), padding cohérent, intégrations en tableau et non en cartes empilées.
- **`CICD.tsx`** (route "Integrations") — refonte en grille d'intégrations avec status badges, regroupement par catégorie (Source / Hosting / Backend / Email / Domains / Payments), bouton Connect/Disconnect inline.
- **`Logs.tsx`**, **`Analytics.tsx`**, **`Observability.tsx`** — vérifier qu'elles utilisent bien `DashboardToolbar` et `mx-auto max-w-[1600px] px-5 py-6`, sinon les wrapper.
- **`NotFound`** générique du dashboard → composant `EmptyState` standardisé.

Aucune logique métier touchée : uniquement structure, espacement, primitives partagées.

## 4. Sidebar : nettoyage des doublons

Actuellement la sidebar a 3 entrées qui pointent vers `/dashboard/backend` (Storage, Environment Variables, Backend) → confusion. Réorganisation :

- Product : Projects, Deployments, Logs, Analytics, Observability, **Integrations** (→ `/dashboard/cicd`)
- Configure : Domains, **Backend** (→ `/dashboard/backend`), Email, Billing, Settings
- Platform : Builder, UI Generator

## 5. Exploitation profonde de l'API Vercel

Élargir `vercel-api` (allowlist) et `src/lib/vercel.ts` pour exposer ce qui manque, puis brancher dans l'UI existante :

**Nouveaux endpoints proxifiés** :
- `/v1/projects/{id}/aliases` + `/v2/aliases/{alias}` → page Domains : promouvoir un déploiement, gérer les alias.
- `/v6/deployments/{id}/files` + `/v7/deployments/{id}/files/{fileId}` → onglet **Source** sur `DeployDetail` (vrai navigateur de fichiers déployés, déjà ébauché avec `FileTree`).
- `/v1/integrations/log-drains`, `/v1/webhooks` → page Integrations (créer/supprimer).
- `/v1/edge-config`, `/v1/edge-config/{id}/items` → nouvel onglet **Edge Config** dans Backend (à côté de Postgres/KV) — éditeur clé/valeur.
- `/v1/data-cache/purge-all`, `/v1/projects/{id}/protection-bypass` → boutons « Purge cache » et « Generate bypass token » sur `DeployDetail`.
- `/v2/teams/{id}/members`, `/v1/access-groups` → page Settings → Team (membres réels du compte admin masqués → seulement l'équipe Lovable).
- `/v1/integrations/configurations` → status d'install dans Settings.
- `/v9/projects/{id}/transferRequest` & `/v9/projects/{id}/pause` & `/unpause` → boutons cycle de vie dans `DeployDetail` → Settings.
- `/v1/firewall/configs/{id}`, `/v1/security/attack-status` → nouvel onglet **Firewall** sur `DeployDetail`.
- `/v1/checks` (Deployment Checks) → onglet **Checks** sur `DeployDetail`.
- `/v1/projects/{id}/custom-environments` → support des environnements custom dans le sélecteur env.
- `/v1/integrations/billing/usage` → enrichir page Billing avec données réelles Vercel.

**Améliorations UI où ces APIs atterrissent** :
- `DeployDetail.tsx` : ajouter onglets **Source**, **Checks**, **Firewall**, **Cache**, **Protection** ; afficher build steps via `/v3/deployments/{id}/events` (déjà câblé mais limité — ajouter filtres par phase et auto-scroll).
- `Domains.tsx` : actions « Set as production alias », gestion des certs avec `/v4/domains/{name}/certs`, redirections via `/v9/projects/{id}/redirects`.
- `Analytics.tsx` : passer de mock à `/v1/projects/{id}/analytics` (timeseries) + top pages + top referers + Web Vitals via `/v1/projects/{id}/web-vitals`.
- `Logs.tsx` : ajout du filtre par function name, niveau, recherche full-text (params déjà supportés par `/v1/projects/{id}/logs`).
- `Observability.tsx` : speed insights via `/v1/projects/{id}/insights`, monitor des Edge Functions.
- `Settings.tsx` → Webhooks : CRUD réel via `/v1/webhooks`.

**Sécurité** : tout passe par `vercel-api` qui valide JWT, et tout endpoint mutatif retourne une confirmation explicite côté UI.

## 6. Détails techniques

```text
multi-tenant scoping
─────────────────────
front  →  render-api  →  user_backend_services (filter by user_id)
                       └→ Render API (with ids[]= filter OR per-id check)
```

- Ajouter helpers `loadOwnedServiceIds(userId)`, `loadOwnedPostgresIds(userId)`, `loadOwnedKvIds(userId)`, `assertOwnsResource(userId, resourceId, kind)` dans `render-api/index.ts`.
- Cache mémoire 5 s par utilisateur pour éviter une requête DB par appel.
- Sur `DELETE /v1/services/{id}`, supprimer la ligne après succès Render.

## 7. Fichiers touchés (estimation)

- `supabase/functions/render-api/index.ts` (réécriture ownership)
- `supabase/functions/render-deploy/index.ts` (kind/url postgres + retours)
- `supabase/functions/render-logs-stream/index.ts` (check ownership)
- `supabase/functions/vercel-api/index.ts` (allowlist étendue)
- `src/lib/vercel.ts` (nouvelles méthodes)
- `src/components/dashboard/DashboardPrimitives.tsx` (fix charAt)
- `src/pages/DashboardLayout.tsx` (sidebar)
- `src/pages/dashboard/EmailSetup.tsx`, `Billing.tsx`, `Settings.tsx`, `CICD.tsx`, `Logs.tsx`, `Analytics.tsx`, `Observability.tsx` (refonte)
- `src/pages/dashboard/Backend.tsx` (empty state)
- `src/pages/dashboard/DeployDetail.tsx` (onglets Source/Checks/Firewall/Cache/Protection)
- `src/pages/dashboard/Domains.tsx` (aliases, certs, redirects)

## 8. Hors scope

- OAuth Render multi-comptes (rejeté : un seul compte Render admin partagé).
- Refacto du `Builder` et `UIGen`.
- Migration de schéma (la table `user_backend_services` est déjà en place).
