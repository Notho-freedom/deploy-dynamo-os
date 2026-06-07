## Objectif

Brancher Render entièrement côté backend — services, bases Postgres, Key Value (Redis), Workers, Cron Jobs, env vars, deploys, logs, metrics — en suivant exactement le pattern admin-only déjà en place pour Vercel. La page `/dashboard/backend` arrête d'être une maquette : tout est piloté par l'API Render réelle via une edge function proxy. Aucune donnée fictive.

## 1. Architecture (miroir du système Vercel)

```text
Frontend (src/lib/render.ts)
   ↓ supabase.functions.invoke
Edge fn render-api (proxy admin)  → api.render.com/v1/*   (Bearer RENDER_API_KEY)
Edge fn render-deploy             → orchestration créer service + premier deploy + insert DB
Edge fn render-logs-stream        → SSE proxy logs Render (verify_jwt=false)
```

- `FLAGS.renderMode = 'admin'` dans `src/lib/featureFlags.ts` (cohérent avec `vercelMode`).
- Secret existant `RENDER_API_KEY` (déjà dans `.env`, à migrer en secret Lovable Cloud — pas client).
- Optionnel `RENDER_OWNER_ID` pour scoper la team/workspace Render.

## 2. Schéma DB

Nouvelle table `user_backend_services` (parallèle à `user_projects`) :

- `id uuid pk`
- `user_id uuid` (RLS owner)
- `render_service_id text` (`srv_xxx`, `dpg_xxx` pour bases)
- `render_service_name text`
- `kind text` — `web_service | static_site | private_service | background_worker | cron_job | postgres | key_value`
- `github_repo_full_name text` nullable
- `branch text` nullable
- `region text` nullable
- `plan text` nullable
- `service_url text` nullable
- `created_at`, `updated_at`

RLS : owner full access + admin override (mêmes policies que `user_projects`). GRANT authenticated + service_role.

## 3. Edge functions

### `supabase/functions/render-api/index.ts`
Calque exact de `vercel-api` :
- Auth JWT via `getClaims` ; admin token serveur uniquement.
- Allowlist regex (paths Render v1) :
  ```
  /^\/v1\/owners(\/[^/]+)?$/
  /^\/v1\/services$/
  /^\/v1\/services\/[^/]+$/
  /^\/v1\/services\/[^/]+\/deploys(\/[^/]+(\/cancel)?)?$/
  /^\/v1\/services\/[^/]+\/env-vars(\/[^/]+)?$/
  /^\/v1\/services\/[^/]+\/custom-domains(\/[^/]+(\/verify)?)?$/
  /^\/v1\/services\/[^/]+\/scale$/
  /^\/v1\/services\/[^/]+\/suspend$/
  /^\/v1\/services\/[^/]+\/resume$/
  /^\/v1\/services\/[^/]+\/restart$/
  /^\/v1\/services\/[^/]+\/events$/
  /^\/v1\/services\/[^/]+\/headers(\/[^/]+)?$/
  /^\/v1\/services\/[^/]+\/routes(\/[^/]+)?$/
  /^\/v1\/services\/[^/]+\/jobs(\/[^/]+)?$/
  /^\/v1\/postgres$/
  /^\/v1\/postgres\/[^/]+(\/(connection-info|suspend|resume|recovery|backups))?$/
  /^\/v1\/key-value$/
  /^\/v1\/key-value\/[^/]+(\/(connection-info|suspend|resume))?$/
  /^\/v1\/registrycredentials(\/[^/]+)?$/
  /^\/v1\/blueprints(\/[^/]+)?$/
  /^\/v1\/notification-settings$/
  /^\/v1\/logs$/
  /^\/v1\/metrics\/(cpu|memory|bandwidth|http-requests|http-latency|active-connections|instance-count|disk-bandwidth|disk-iops|disk-usage)$/
  ```
- Forward `Authorization: Bearer RENDER_API_KEY`, inject `ownerId` query param si `RENDER_OWNER_ID` présent et non déjà fourni.

### `supabase/functions/render-deploy/index.ts`
Orchestration création service web depuis un repo GitHub :
1. `POST /v1/services` avec `serviceDetails` (env=node/static/docker, build/start cmd, plan, region, autoDeploy).
2. Premier deploy auto, mais récupérer `id` du deploy initial via `GET /v1/services/{id}/deploys?limit=1`.
3. `insert into user_backend_services (...)`.
4. Retour `{ service_id, service_name, deploy_id, url }`.

### `supabase/functions/render-logs-stream/index.ts`
- `verify_jwt = false` (config.toml — étendre le bloc existant).
- Accepte `?service_id=...&deploy_id=...&type=app|build|request`.
- Render n'expose pas un vrai SSE public stable : polling côté serveur de `GET /v1/logs?resource=srv_xxx&direction=backward&limit=100` toutes les 2s puis push SSE au client. Dédup par `id`.
- Backoff sur 429 ; close propre quand client coupe.

### `render-cron-trigger` (optionnel, phase 2 si temps) — pas dans ce plan.

## 4. Frontend — client + hooks

### `src/lib/render.ts`
Calque de `src/lib/vercel.ts` :

```ts
interface RenderService { id; name; type; serviceDetails; suspended; createdAt; updatedAt; ... }
interface RenderDeploy { id; status; commit; createdAt; finishedAt; trigger; }
interface RenderEnvVar { key; value? }
interface RenderPostgres { id; name; databaseName; user; plan; region; status; ... }
interface RenderKeyValue { id; name; plan; region; status; ... }
interface RenderLogEntry { id; timestamp; message; level; labels; }
interface RenderMetric { time; value; }
```

API surface :
- `render.listServices()`, `getService(id)`, `updateService`, `deleteService`, `suspend/resume/restart`
- `render.listDeploys(serviceId)`, `getDeploy`, `triggerDeploy(serviceId, clearCache?)`, `cancelDeploy`
- `render.listEnv(serviceId)`, `setEnv(serviceId, vars)`, `deleteEnv`
- `render.listDomains`, `addDomain`, `verifyDomain`, `removeDomain`
- `render.listPostgres()`, `createPostgres`, `getPostgresConnectionInfo`, `listBackups`
- `render.listKeyValue()`, `createKeyValue`, `getKvConnectionInfo`
- `render.metrics(resource, metric, from, to)` → recharts
- `render.listLogs(serviceId, opts)` + `openRenderLogStream(opts, onEvent)` (EventSource → `render-logs-stream`)
- `createServiceAndDeploy(input)` → invoke `render-deploy`

### Hook `src/hooks/useRenderData.ts`
Agrégateur (services par type, latest deploy, env count, status) avec cache 30s — pattern `useDashboardData`.

## 5. Refonte UI

### `/dashboard/backend` (réécriture complète de `Backend.tsx`)
Sidebar interne (style Render) :

- **Overview** — cartes : nb services par type, deploys 24h, échecs, services suspendus, dépenses estimées (somme `plan` * uptime).
- **Web Services** — table : Name, Type, Status (live/suspended/build_failed), Region, Plan, Repo, Branch, Last deploy, Actions (Open, Logs, Restart, Suspend, Resume, Delete). Filtres type + status + search.
- **Background Workers / Cron Jobs / Private Services / Static Sites** — sous-tabs (même table, filtre `type`).
- **Databases (Postgres)** — table : Name, Plan, Region, Status, DB name, User, Created. Action "Connection info" (copy URI masqué).
- **Key Value (Redis)** — idem.
- **Blueprints** — readonly list.
- **Registry credentials** — table CRUD basique.
- **Notifications** — switches sur preferences globales.

### `/dashboard/backend/new` (nouveau, parallèle à `DeployNew`)
Stepper :
1. Choisir type (Web Service / Static Site / Background Worker / Cron Job / Private Service / Postgres / Key Value).
2. Si service GitHub : list repos (réutilise `useGithubRepos`), select branch, auto-detect env (Node/Static/Docker via `package.json` ou `Dockerfile`).
3. Config : name, region, plan, build cmd, start cmd, root dir, autoDeploy, healthcheck path, env vars.
4. Confirm → `createServiceAndDeploy`.
5. Redirect `/dashboard/backend/service/:serviceId`.

### `/dashboard/backend/service/:serviceId` (nouveau, miroir `DeployDetail`)
Onglets :
- **Overview** — preview URL, status, plan, region, repo, branch, autoDeploy switch (`updateService`), instances scale (slider → `POST /scale`), suspend/resume/restart buttons, delete (confirm + cleanup DB).
- **Deploys** — table type Vercel deployments : id court, status (live/build_in_progress/update_failed/canceled), commit message line-clamp-2, branch, duration, created. Bouton "Manual Deploy" (clear cache option), polling 5s sur deploys actifs, cancel.
- **Logs** — terminal temps réel via `render-logs-stream`, ANSI parsé (réutilise `AnsiOutput`), filter type (app/build/request) + level + search.
- **Events** — historique `GET /events` (deploy started, scale changed, env updated, etc.) timeline.
- **Environment** — CRUD env vars (key + value masqué + edit + delete + bulk add `.env` paste).
- **Settings** — Build & Deploy (build cmd, start cmd, root dir, dockerfile path), Auto-Deploy, Health check path, Pre-deploy command.
- **Custom Domains** — list + add + verify (DNS instructions retournées par API) + remove.
- **Metrics** — 4 charts (CPU, Memory, HTTP Requests, HTTP Latency) via `render.metrics()` + recharts, range selector (1h/24h/7d).
- **Scaling** — instance count + plan upgrade (links to Render dashboard pour confirmation paid).

### `/dashboard/backend/database/:dbId` (Postgres detail)
Connection info (masqué), backups list, plan, region, recovery info, suspend/resume.

### Routing (`App.tsx`)
```
/dashboard/backend                       → Backend (overview + tables)
/dashboard/backend/new                   → BackendNew
/dashboard/backend/service/:serviceId    → BackendServiceDetail
/dashboard/backend/database/:dbId        → BackendDatabaseDetail
```

Sidebar `DashboardLayout.tsx` : l'entrée "Backend" pointe déjà vers `/dashboard/backend`, OK.

## 6. Sécurité & flags

- `FLAGS.renderMode='admin'` ; flux OAuth Render gardé en stub désactivé (pas implémenté, juste un commentaire).
- Toutes les writes (delete service / delete DB) passent par un dialog de confirmation avec saisie du nom — pattern Vercel.
- Edge fns refusent toutes les `DELETE` sur `/v1/postgres/{id}` sauf si owner correspondant dans `user_backend_services`.
- Connection info Postgres / KV : value renvoyée masquée par défaut, copy bouton appelle un endpoint dédié `render-secret-reveal` qui ne renvoie qu'une fois.

## 7. Fichiers

**Nouveaux**
- `supabase/functions/render-api/index.ts`
- `supabase/functions/render-deploy/index.ts`
- `supabase/functions/render-logs-stream/index.ts`
- `supabase/migrations/<ts>_user_backend_services.sql`
- `src/lib/render.ts`
- `src/hooks/useRenderData.ts`
- `src/pages/dashboard/BackendNew.tsx`
- `src/pages/dashboard/BackendServiceDetail.tsx`
- `src/pages/dashboard/BackendDatabaseDetail.tsx`
- `src/components/backend/ServiceTable.tsx`
- `src/components/backend/EnvVarsEditor.tsx`
- `src/components/backend/MetricsCharts.tsx`

**Modifiés**
- `src/pages/dashboard/Backend.tsx` — réécriture complète (suppression du mock)
- `src/App.tsx` — 3 routes
- `src/lib/featureFlags.ts` — ajout `renderMode`
- `supabase/config.toml` — bloc `[functions.render-logs-stream]` `verify_jwt = false`
- `src/pages/dashboard/CICD.tsx` — la card "Render" passe de "Coming soon" à "Connected (admin)"

## 8. Secret

`RENDER_API_KEY` est actuellement dans `.env` côté client — fuite. À migrer en secret Lovable Cloud (server-only) ; je le retire de `.env` et demande au user via `add_secret` (s'il n'y est pas déjà côté secrets serveur — à vérifier en début d'implémentation).

Optionnel : demander `RENDER_OWNER_ID` si l'utilisateur a plusieurs teams Render (sinon Render utilise le default owner du token).

## 9. Hors scope (phase ultérieure)

- OAuth Render multi-user (admin-only suffit, miroir Vercel).
- Edition de blueprints YAML.
- Gestion disques persistants Render Disks (juste lecture).
- Billing Render réel (renvoyé vers dashboard Render).

## Résultat

1. La page Backend devient une vraie console Render (services, DB, KV, deploys, logs SSE, metrics, env vars, custom domains).
2. Création d'un service web depuis un repo GitHub en 4 étapes, premier déploiement automatique.
3. Logs temps réel colorés, metrics graphés, déploiements re-déployables et annulables.
4. Même UX et conventions que la partie Vercel — l'utilisateur reconnaît immédiatement les patterns.
