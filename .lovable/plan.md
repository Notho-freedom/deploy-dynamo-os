## Objective

Stabiliser l'application de bout en bout : réparer Render (500 sur `render-deploy`), corriger l'auth GitHub (403 sur `github-api`), résoudre les instabilités UI et de chargement, terminer les vues « Deployment details », puis exécuter une passe de tests réels avant de rendre un briefing honnête de ce qui est opérationnel.

## Root-cause snapshot

- `render-deploy` 500 : trois causes possibles selon les logs à capturer — (a) `RENDER_OWNER_ID` non passé pour les types `service` (payload envoyé mais silencieusement rejeté par Render si `ownerId` absent selon le type), (b) `serviceDetails.env` requis à `'docker'` mais un `image.ownerId` manquant pour Docker, (c) `envVars` mal filtrés quand le tableau contient des lignes vides.
- `github-api` 403 : renvoyé par la fonction elle-même quand `connected_accounts` n'a pas de ligne pour l'utilisateur (code 412) OU quand le token GitHub a expiré (Render répond 401 → nous renvoyons `status: 401` dans `data`). Le 403 vient du proxy Lovable préview quand la session Supabase est expirée — il faut auto-refresh et re-tenter.
- `trackevents` 403 et WebSocket realtime 403 : bruit du preview Lovable (sans lien avec le code), à ignorer.
- Vues lentes / data incomplètes : plusieurs pages font encore des `await` séquentiels et n'utilisent pas `useQuery` avec `placeholderData`. `DeployDetail` re-fetch la liste des déploiements à chaque tick de polling.

## Scope of work

### 1. Backend — fiabiliser les edge functions
- `render-deploy` : validation Zod du body, log détaillé de la réponse Render sur échec, retour du `detail` complet au client, gestion explicite `env='docker'` (require `image.ownerId` ou `dockerfilePath`), filtrage des `envVars` vides, fallback `ownerId` obligatoire, retour `503` clair si `RENDER_API_KEY` répond `401`.
- `render-api` : sur `401`/`403` amont, propager le message Render (au lieu de `Render 401: ...` brut).
- `github-api` : détecter `status === 401` amont → marquer `connected_accounts` comme expiré et renvoyer `{ needsReauth: true }`. Front réagit avec un toast « Reconnecter GitHub ».
- Ajouter un helper commun `withUser(req)` pour éliminer la duplication et garantir un 401 propre partout.

### 2. Front — session & résilience
- `src/integrations/supabase/client.ts` déjà OK. Ajouter un intercepteur global dans `src/lib/utils.ts::invokeFn()` qui : (a) refresh la session si `access_token` expire dans <60 s, (b) retry une fois sur 401, (c) route les erreurs vers `humanizeApiError`.
- Migrer les derniers `useEffect + setData` restants (`Deploy.tsx`, `DeployNew.tsx`, `Domains.tsx`, `Monitoring.tsx`, `BackendServiceDetail.tsx` onglet Events/Env) vers `useQuery` avec `placeholderData: keepPreviousData` et skeletons.
- `DeployDetail.tsx` : séparer la query « deployment » de la query « logs » ; ne plus invalider la liste sur chaque tick.

### 3. Deployment detail — finir la vue
Onglets manquants ou incomplets à compléter :
- **Overview** : commit auteur/date, durée build, régions actives, taille output, lien preview.
- **Build logs** : streaming SSE déjà branché → afficher badge « ● Live » + auto-scroll toggle + bouton « Copy » + « Download .log ».
- **Runtime logs** : bascule `type=app` quand `state=READY`.
- **Sources** : arbre `git` (fichier, taille) via `github-api /repos/:o/:r/contents/`.
- **Env vars** : lecture seule (Vercel `/v9/projects/:id/env`) avec toggle « Reveal ».
- **Domains** : liste alias + bouton « Assign » (déjà partiel).

### 4. Vues lentes / mal organisées
- `Backend.tsx` : la liste Postgres/KeyValue/Services fait 3 requêtes séquentielles → passer à `useQueries` parallèle, tri stable, colonnes fixes.
- `Dashboard.tsx` : agréger les compteurs via `useQuery` unique côté DB (RPC) au lieu de multiples appels.
- `Analytics.tsx`, `Observability.tsx` : ajouter un `EmptyState` explicite quand l'API renvoie `[]` (au lieu de skeleton infini).

### 5. Tests et validation
- Tests Deno pour `render-deploy`, `render-api`, `github-api`, `vercel-deploy` couvrant Create→Read→Delete (`status ∈ {200,201,204}`). Le test `render-deploy` couvre les 7 kinds.
- Test frontend Vitest pour `useDeploymentLogStream` (mock EventSource, buffer, reconnect).
- Playwright smoke via shell : login → Dashboard → Deploy → BackendNew wizard 5 étapes → screenshots de chaque étape.
- Passe manuelle : je relève les logs `supabase--edge_function_logs` de `render-deploy` après un vrai appel pour confirmer la correction.

### 6. Briefing final
Après stabilisation, je livre un tableau honnête `Feature × Statut (OK / Partiel / Non branché) × Preuve (test/log/screenshot)` pour que tu saches précisément ce qui marche.

## Technical details

- `supabase/functions/render-deploy/index.ts` : ajouter Zod, logs `console.error('render api', r.status, data)`, propager `detail` avec `status: 502` si Render répond >=400.
- `src/lib/utils.ts` : nouveau `invokeFn(name, body)` utilisé par `render.ts`, `vercel.ts`, `github.ts`.
- `useQueries` de `@tanstack/react-query` déjà installé.
- SSE `vercel-logs-stream` déjà `verify_jwt = false` — OK.
- Aucune migration DB requise sauf éventuel `connected_accounts.expired_at`.

## Non-goals

- Refonte visuelle globale, nouvelle skill Builder, ou changement d'auth provider.
- Support Cloudflare / autres registrars au-delà de ce qui existe.
