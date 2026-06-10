# Phase 6 — Closing every gap from the previous loop

Audit constatant ce qui n'est PAS encore livré malgré les phases précédentes :

| Sujet | État actuel | À faire |
|---|---|---|
| Backend form multi-étapes | 2 étapes (type / config) avec ~15 champs sur une seule page | Vrai wizard 5 étapes + tests CRUD |
| Builder | Preview fictif `FakeAppPreview`, chat custom, pas d'AI Elements | Refonte complète |
| UI Generator | Cartes pricing fictives codées en dur | Refonte (vraies variantes IA) |
| Logs déploiement temps réel | SSE existe sur `Logs.tsx` global et `DeployDetail`, mais pas instantané ligne par ligne pendant un build sur la page projet | Brancher SSE dès l'ouverture, append token-par-token |
| Observability | 4 cartes "—" en dur + section déploiements | Vraies métriques live + skeletons |
| Analytics | Fetch `useEffect` qui passe par empty-state si erreur | Migration `useQuery` + cache instantané |

## 1. Backend — wizard multi-étapes (`BackendNew.tsx`)

Utiliser le composant `<Stepper>` existant. 5 étapes :

```text
[1 Type] → [2 Source] → [3 Build & Runtime] → [4 Env vars] → [5 Review]
```

- Étape 1 : grille des 7 types (déjà là).
- Étape 2 : repo GitHub + branche + root dir (skipped si Postgres/KV).
- Étape 3 : runtime + build/start command + publish dir + schedule cron + region + plan.
- Étape 4 : variables d'environnement (avec import `.env` paste).
- Étape 5 : récap lisible + bouton "Create". Erreurs affichées par étape avant `Next`.
- Persister l'état du wizard en `sessionStorage` pour ne pas perdre la saisie.

## 2. Tests CRUD edge functions

Nouveaux fichiers :
- `supabase/functions/render-api/index_test.ts`
- `supabase/functions/vercel-api/index_test.ts`
- `supabase/functions/render-deploy/index_test.ts`

Chaque test couvre Create → Read → Update → Delete avec assertion `status === 200|201|204`. Lancés via `supabase--test_edge_functions`. Mapper proprement les `non-200` vers un toast lisible côté front (helper `humanizeApiError` dans `src/lib/render.ts` et `src/lib/vercel.ts`).

## 3. Logs temps réel pendant déploiement

Objectif : chaque ligne apparaît instantanément, zéro reload.

- `DeployDetail.tsx` onglet Logs : ouvrir `EventSource('vercel-logs-stream')` dès que `deployment.state ∈ {QUEUED, INITIALIZING, BUILDING}`. Indicateur `● Live` qui pulse. Buffer ring 2000 lignes.
- `BackendServiceDetail.tsx` onglet Logs : idem avec `render-logs-stream?resource=srv_xxx&type=build` pendant un deploy, bascule auto vers `type=app` quand `state=live`.
- `Logs.tsx` global : déjà OK, juste ajouter auto-reconnect avec backoff exponentiel (1s → 30s).
- Nouveau hook `useDeploymentLogStream(deploymentId, { source: 'vercel'|'render', active })` qui encapsule backfill REST + SSE + reconnect.

## 4. Observability live (`Observability.tsx`)

Remplacer les 4 cartes "—" :

| Carte | Source |
|---|---|
| Edge Requests | `vercel.getUsage()` → `edge.requests` (24h) |
| Fast Data Transfer | `vercel.getUsage()` → `bandwidth.fastDataTransfer` |
| Function Invocations | `vercel.getUsage()` → `serverless.invocations` |
| Middleware Invocations | `vercel.getUsage()` → `edge.middlewareInvocations` |

- Sparkline 24h dans chaque carte (recharts `<AreaChart>`).
- Section "Active Alerts" : `vercel.listLogDrains()` + `vercel.getFirewallAttackStatus()` + Render events `severity ∈ {warning,error}` < 24h.
- Tous via `useQuery` (`staleTime: 30s`, `refetchInterval: 60s`, `placeholderData: keepPreviousData`).
- Skeletons `MetricChartSkeleton` au tout premier load uniquement. Jamais d'empty si ≥ 1 projet importé.

## 5. Analytics live (`Analytics.tsx`)

- Migrer `useEffect + setData` → `useQuery(['vercel-analytics', selected, range])` avec `placeholderData: keepPreviousData`.
- `staleTime: 60s`, persistance localStorage déjà active via `queryClient.ts`.
- Empty state UNIQUEMENT si pas de projet importé. Erreur API → garde la donnée précédente + toast discret, jamais d'écran "Analytics unavailable" qui efface l'existant.
- Whitelist `/v1/web/insights/stats` et `/v1/integrations/billing/usage` dans `vercel-api/index.ts` (vérifier, ajouter si manque).

## 6. Builder (`Builder.tsx`) — refonte complète

Installation AI Elements :

```bash
bun x ai-elements@latest add conversation message prompt-input shimmer tool
```

Nouvelle structure :

```text
┌─────────────────────────┬──────────────────────────┐
│ Conversation (AI Elem.) │ Plan & Files (réel)      │
│  - Message + Markdown   │  - FileTree parsé du     │
│  - Tool accordion fermé │    stream (blocs ```path)│
│  - Shimmer "Thinking…"  │  - Diff viewer simple    │
│ PromptInput + Submit    │  - Empty: "Awaiting AI"  │
└─────────────────────────┴──────────────────────────┘
```

- Supprimer `FakeAppPreview`, `templates` codés en dur (garder comme suggestions chips dans empty state).
- Logo agent : générer une icône Nebula (imagegen) — pas de `Sparkles`.
- Streaming token-par-token via `builder-chat` SSE (déjà existant), rendu via `<MessageResponse>`.
- Parser des blocs ` ```path/to/file ` pour alimenter `FileTree` en temps réel.
- `<Tool>` collapsed pour chaque appel outil (lint, build, deploy).
- Bouton "Apply to project" → crée le projet réel (pas `addProject` factice).

## 7. UI Generator (`UIGen.tsx`) — refonte

- Supprimer `FakeAppPreview` pricing en dur.
- Layout split :

```text
┌──────────────────┬─────────────────────────────┐
│ PromptInput      │ 3 variantes (iframes HTML   │
│ + presets        │   sandboxées) côte à côte   │
│ + history list   │ Actions: Copy, Export, ↻    │
└──────────────────┴─────────────────────────────┘
```

- Appel `builder-chat` avec system prompt "renvoie 3 variantes HTML/Tailwind autonomes dans 3 blocs ```html".
- Historique persisté `localStorage` (`uigen-history-v1`).
- AI Elements : `Conversation` + `Message` pour le log de génération.
- Iframes `sandbox="allow-scripts"`, srcDoc injecté.

## 8. Persistance & sidebar — finitions

- Vérifier que `useDashboardData`, `useGithubRepos` ne refont PAS de spinner quand cache présent (regression check).
- Sidebar Backend : ajouter items "Static Sites", "Workers", "Cron Jobs" qui filtrent `?type=…` (la liste existe déjà côté data).

## Détails techniques (référence dev)

- Nouveau composant `src/components/dashboard/MetricSparkCard.tsx` (carte + sparkline + delta %).
- Nouveau hook `src/hooks/useDeploymentLogStream.ts` (SSE + reconnect + ring buffer).
- Nouveau hook `src/hooks/useVercelUsage.ts` (24h usage, query key `['vercel-usage', range]`).
- Composants AI Elements installés dans `src/components/ai-elements/`.
- Tests Deno dans `supabase/functions/{render-api,vercel-api,render-deploy}/index_test.ts`.
- Helper `humanizeApiError(err): string` dans `src/lib/utils.ts` (mappage 401/403/404/429/5xx).

## Hors périmètre

- Pas de changement de stack, pas de redesign des landings publiques, pas de nouveau provider de paiement.
- Pas de migration des autres pages déjà conformes (Deploy, Dashboard, DeployDetail) sauf pour brancher `useDeploymentLogStream`.
