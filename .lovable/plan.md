# Phase 5 — Instantanéité, temps réel, refontes

Objectif global : éliminer les "empty state → loading → data" qui font rétrograder l'UI. Tout doit s'afficher instantanément depuis un cache, puis se rafraîchir silencieusement en arrière-plan (stale-while-revalidate + temps réel).

## 1. Fondations data : cache instantané + temps réel

- Introduire **React Query** (`@tanstack/react-query`, déjà présent via shadcn) comme couche de cache global pour TOUTES les sources externes (Vercel, Render, GitHub, Supabase).
  - `staleTime: 30s`, `gcTime: 24h`, `refetchOnMount: false` quand un cache existe.
  - **Persistance localStorage** via `@tanstack/query-sync-storage-persister` → au prochain mount, les données du dernier session sont affichées **immédiatement**, puis revalidées en tâche de fond.
- Créer `src/hooks/useRealtimeInvalidate.ts` : helper qui s'abonne à `postgres_changes` sur une table et invalide des queryKeys.
- Activer `supabase_realtime` sur `user_projects`, `user_backend_services`, `connected_accounts` (migration).
- Remplacer **tous** les `useEffect + setLoading` actuels (`useDashboardData`, `useGithubRepos`, `useUserProjects`, pages Backend/Logs/Deploy) par `useQuery` avec `placeholderData: keepPreviousData`.
- Règle UI : si `data` existe (même périmé) → afficher data ; sinon → squelettes ; jamais d'empty state pendant un fetch.

## 2. Squelettes partout

Remplacer `Loader2 spinner` et les `animate-pulse` ad-hoc par `<Skeleton>` (shadcn) cohérent :
- Skeletons spécifiques : `ProjectCardSkeleton`, `DeploymentRowSkeleton`, `LogLineSkeleton`, `BackendServiceCardSkeleton`, `MetricChartSkeleton`.
- Critère : un squelette doit avoir la **même forme** que le contenu final (hauteur de ligne, nombre de colonnes).

## 3. Truncation des tableaux

Créer `<TruncCell>` partagé :
- `max-w-[Xch]`, `line-clamp-2`, hauteur fixe (`h-10`).
- `Tooltip` shadcn affichant le contenu complet au hover.
- Pour les commits : afficher `sha · première ligne du message` (line-clamp-1).

Appliquer dans : `Deploy.tsx` (colonne Commit + Branch), `Logs.tsx` (Source), `Backend.tsx`, `Domains.tsx`, `DeployDetail.tsx` (timeline des deploys), `Dashboard.tsx` (recent deployments).

## 4. Page Déploiement (`Deploy.tsx`)

- Colonne Commit : largeur max 280px, 2 lignes max, hauteur de ligne fixe → corrige le bug "hauteur qui explose quand on rétrécit".
- Branch / Author : truncate 1 ligne + tooltip.
- Cache via React Query + realtime invalidation.

## 5. Page Détail Déploiement (`DeployDetail.tsx`) — **bug critique**

Bug actuel : la page charge, affiche tout, puis quelques secondes plus tard repasse en "Déploiement indisponible" sur tous les onglets.

Cause probable : un second `useEffect` qui re-fetch sans `id` valide (ou un fetch concurrent qui écrase l'état). Corrections :
- Migrer tous les fetchs (deployment, files, events, checks, aliases) vers `useQuery` keyed par `deploymentId` → plus d'écrasement d'état entre re-renders.
- Empêcher tout fetch lorsque `deploymentId` est `undefined` (`enabled: !!deploymentId`).
- L'onglet "Déploiement indisponible" n'apparaît QUE si `status === 'success' && data === null` (404 confirmé), jamais pendant un fetch ni sur erreur réseau.
- **Logs en temps réel** : ouvrir le `EventSource` (`vercel-logs-stream`) immédiatement au mount si le deployment est `BUILDING|QUEUED|INITIALIZING`, sinon faire un backfill REST seul. Ajouter une indication "● Live" qui pulse.
- Tous les onglets (Overview, Logs, Source, Checks, Aliases, Firewall) doivent rester montés (Tabs `forceMount`) pour conserver leurs données.

## 6. Page Logs (`Logs.tsx`)

- Backfill instantané depuis cache localStorage → affichage immédiat.
- Stream SSE en parallèle, append au flux.
- **Coloration syntaxique enrichie** : étendre `AnsiOutput.tsx` pour reconnaître :
  - Timestamps (gris), niveaux `INFO|WARN|ERROR|DEBUG` (couleurs), codes HTTP (vert/orange/rouge),
  - URLs (souligné cyan), chemins de fichiers, durées (`123ms`), JSON inline (clé/valeur),
  - Stack traces (rouge atténué + indentation).
- Skeleton lignes pendant le tout premier load (jamais après).

## 7. Pages Analytics / Observability / Dashboard cards

- **Usage** : brancher sur `vercel.getUsage()` (`/v1/integrations/billing/usage`) + Render `/v1/owners/{id}/usage`. Fallback empty seulement si les deux APIs renvoient vraiment 0.
- **Alerts** : brancher sur `vercel.listLogDrains()` + `vercel.getFirewallAttackStatus()` + Render events. Afficher tout event `severity >= warning` des dernières 24h.
- **Recent Previews** : déjà alimentable, le problème est juste le timing → fix via React Query (cache persisté).
- **Analytics** : utiliser `vercel.getProjectAnalytics(projectId, { from, to })` (`/v1/web/insights/stats`) + `vercel-api` autoriser l'endpoint. Charts avec recharts. Plus jamais d'empty si au moins 1 projet importé.
- **Observability** : agréger metrics Vercel (`/v1/web/insights/metrics`) + Render metrics. Skeletons sur les charts pendant 1er load uniquement.

## 8. Backend — sidebar réutilisée + empty states intelligents

- **Plus de deuxième sidebar**. Le `DashboardLayout` détecte `pathname.startsWith('/dashboard/backend')` et change le contenu de la sidebar existante en mode "Backend" :
  - Header : `← Back` (retour menu principal) + label "Backend".
  - Items : Overview, Web Services, Static Sites, Workers, Cron Jobs, Postgres, Key Value, Logs, Settings.
- **Empty states actionnables** :
  - `/dashboard/backend` vide → afficher **directement** le formulaire `BackendNew` (pas un bouton qui mène ailleurs).
  - `/dashboard/backend?type=static` vide → bouton "Create Static Site" qui pré-remplit `type=static_site` et saute l'étape sélection.
  - Idem pour Workers, Cron, Postgres, Key Value.

## 9. Formulaires multi-étapes

Tout formulaire > 5 champs devient un wizard `<Stepper>` (composant déjà présent) :
- `BackendNew.tsx` : Étape 1 type → 2 repo/source → 3 build → 4 env vars → 5 review.
- `DeployNew.tsx` / `DeployConfigure.tsx` : étape repo → branche → env → review.

## 10. Tests CRUD API

Pour chaque endpoint exposé via `vercel-api` et `render-api`, ajouter un script Deno test (`supabase/functions/*/test.ts`) :
- Create → Read → Update → Delete, assertion `status === 200/201/204`.
- Exécuter via `supabase--test_edge_functions` avant de marquer la phase terminée.
- Loguer les échecs `non-200` proprement côté front (toast lisible au lieu de "non-200").

## 11. Page Builder (`Builder.tsx`) — refonte complète

- Suppression du preview fictif. Remplacer par un panneau "Plan & Files" qui montre vraiment les fichiers planifiés par l'IA (parsing des blocs ```path code```).
- Chat IA refondu via **AI Elements** (`Conversation`, `Message`, `MessageResponse`, `PromptInput`, `Tool`, `Shimmer`) — voir doc `chat-ui-composition`.
  - Markdown rendu, code blocks avec coloration (`SyntaxHighlighter`), tool calls dans `<Tool defaultOpen={false}>`.
  - Streaming token-par-token via `builder-chat` (déjà SSE).
  - Identité agent dédiée (pas de `Sparkles`).
- Panneau latéral droit : arborescence fichiers générés (`FileTree`) + diff viewer simple.

## 12. Page UI Generator (`UIGen.tsx`) — refonte

- Layout split : prompt + variantes (3 previews HTML iframes sandboxées) + actions (Export, Copy code, Regenerate).
- Historique des générations persisté localStorage.
- Mêmes primitives AI Elements pour la conversation.

## 13. Création de projet (`DeployNew.tsx`)

- **Plus de re-fetch des dépôts à chaque visite** : `useGithubRepos` migre vers `useQuery` avec `staleTime: 5min` + persistance → arrivée instantanée, refresh silencieux.
- **Option "Empty project"** : créer ligne dans `user_projects` sans repo Git, rediriger vers configure.
- **Nouvelle option "Static site"** : appelle `render-deploy` avec `type: 'static_site'` (Render gère ça nativement) + champ "Build command" / "Publish directory" optionnels.

## 14. Hors périmètre

- Re-design des landing pages publiques.
- Multi-user OAuth Render/Vercel (chaque user a déjà son scope via `user_backend_services`).
- Migration de stack (reste sur React Router + Vite).

## Fichiers principaux touchés

`src/main.tsx` (QueryClientProvider + persister), `src/hooks/useDashboardData.ts`, `useGithubRepos.ts`, nouveaux hooks `useRealtimeInvalidate`, `useVercelDeployment`, `useVercelLogs` ; `src/components/dashboard/DashboardPrimitives.tsx` (TruncCell + skeletons) ; `src/components/AnsiOutput.tsx` (coloration enrichie) ; `src/pages/DashboardLayout.tsx` (sidebar contextuelle Backend) ; pages `Dashboard`, `Deploy`, `DeployDetail`, `DeployNew`, `Logs`, `Analytics`, `Observability`, `Backend`, `BackendNew`, `BackendServiceDetail`, `Builder`, `UIGen` ; edge functions `vercel-api` (whitelist analytics/usage), tests CRUD ; migration realtime publication.
