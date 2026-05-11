## Objectif

Remplacer l'approche "token Vercel" par une vraie **Vercel Integration (OAuth App)**, brancher GitHub OAuth pour l'import de repos, et permettre un workflow complet **Importer un repo GitHub → Créer un projet Vercel → Déployer** depuis l'app, le tout terminé en fin de tour. Ensuite Zoho, Mailcheap, Porkbun, Cloudflare. Stripe est mis de côté.

---

## 1. Vercel — passer du PAT à l'App OAuth (Vercel Integration)

**Ce qui change côté UX**
- Plus de champ "Personal Access Token".
- Bouton **"Install Vercel Integration"** → ouvre `https://vercel.com/integrations/<slug>/new` dans un nouvel onglet.
- Vercel renvoie sur `https://<app>/integrations/vercel/callback?code=…&configurationId=…&teamId=…&next=…`.
- L'app échange le `code` contre un `access_token` (long-lived, scopé à l'install), stocke `team_id`, `configuration_id`, `installation_type` (`user` ou `team`) dans `connected_accounts`.
- Affichage "Installed on <team> · <projects accessibles>".

**Ce qu'il faut côté Vercel (à faire par l'utilisateur, je guiderai)**
1. Aller sur https://vercel.com/dashboard/integrations/console
2. Create Integration → Type: **Generic** → Name: OnNebula
3. Redirect URL: `https://onnebula.lovable.app/integrations/vercel/callback` (+ preview URL)
4. Permissions: Projects R/W, Deployments R/W, Domains R/W, Env R/W, User R, Team R
5. Récupérer **Client ID** et **Client Secret** → je demanderai de les ajouter via le secrets tool (`VERCEL_CLIENT_ID`, `VERCEL_CLIENT_SECRET`, `VERCEL_INTEGRATION_SLUG`).

**Backend**
- Edge function `vercel-oauth-callback` : `POST /v2/oauth/access_token` avec `code`, `client_id`, `client_secret`, `redirect_uri` → upsert dans `connected_accounts`.
- `vercel-api` (déjà existant) : ajout du `team_id` automatiquement, allowlist élargie pour POST `/v9/projects` (création projet) et `/v13/deployments` (création deploy).
- Ajouter route frontend `/integrations/vercel/callback` qui appelle l'edge function puis `navigate('/dashboard/deploy?connected=vercel')`.

---

## 2. GitHub OAuth — réel (remplace le mock)

**Ce qu'il faut côté GitHub (utilisateur)**
1. https://github.com/settings/developers → OAuth Apps → New
2. Homepage: `https://onnebula.lovable.app` · Callback: `https://onnebula.lovable.app/integrations/github/callback`
3. Récupérer Client ID + Secret → secrets `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.

**Backend**
- Edge function `github-oauth-callback` : échange `code` → token, scopes `repo,read:user,read:org`, stockage dans `connected_accounts`.
- Edge function `github-api` (proxy avec allowlist) : `GET /user/repos`, `GET /user/orgs`, `GET /orgs/:org/repos`, `GET /repos/:owner/:repo`, `GET /repos/:owner/:repo/branches`.
- Frontend : `src/lib/github.ts`, refonte `GitHubOAuthDialog` → bouton "Continue with GitHub" qui ouvre l'autorisation OAuth.

---

## 3. Workflow "Deploy from GitHub" de bout en bout

Page **CI/CD** refondue (réelle, plus de seedRepos) :

```
[Connect GitHub] [Connect Vercel]
        │              │
        ▼              ▼
┌─────────────────────────────┐
│  Sélectionner un repo GH    │  ← liste live via github-api
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│  Configure (framework, root │  ← détection auto via package.json
│  build, output, env vars)   │
└──────────────┬──────────────┘
               ▼
   POST /v9/projects (vercel-api)
   {name, gitRepository:{type:"github", repo:"owner/name"},
    framework, rootDirectory, buildCommand, outputDirectory,
    environmentVariables:[…]}
               ▼
   POST /v13/deployments
   {name, gitSource:{type:"github", ref:"main", repoId}}
               ▼
   Redirect → /dashboard/deploy?project=<id>
   VercelLivePanel suit le build en live (déjà en place)
```

L'utilisateur pourra, dès la fin de ce tour, cliquer sur un repo GitHub réel et le voir builder sur Vercel sans quitter l'app.

---

## 4. Zoho Mail (mailbox provisioning)

- Self-Client OAuth (Server-based App) sur https://api-console.zoho.com — secrets `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ORG_ID`.
- Edge function `zoho-mail` : create user, add alias, set forwarding. UI dans `EmailSetup.tsx` : "Provision mailbox" → champs `local-part@domain` → live status.

## 5. Mailcheap (mailbox alternatif / hébergement mail low-cost)

- API Key simple → secret `MAILCHEAP_API_KEY`.
- Edge function `mailcheap-api` : list domains, create mailbox, manage aliases.
- Toggle dans EmailSetup pour choisir provider (Zoho | Mailcheap).

## 6. Porkbun (registrar)

- API Key + Secret API Key → `PORKBUN_API_KEY`, `PORKBUN_SECRET_API_KEY`.
- Edge function `porkbun-api` : domain availability, pricing, register, DNS records (A, CNAME, TXT).
- UI dans `Domains.tsx` : recherche, achat, gestion DNS.

## 7. Cloudflare (DNS, sans proxy pour l'instant)

- API Token (Zone:Read, DNS:Edit) → `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Edge function `cloudflare-api` : list zones, create zone, CRUD DNS records (proxied=false).
- UI : ajouter un domaine externe → instructions nameservers → vérification.

## 8. Audit & tests

- Bouton "Verify credentials" sur chaque intégration (Settings) → ping endpoint dédié de chaque provider.
- Test pages dans `/dashboard/settings` : statuts Live / Error / Disconnected.
- Smoke tests Deno pour chaque edge function (mock fetch).

---

## Détails techniques (résumé)

| Edge function | Rôle |
|---|---|
| `vercel-oauth-callback` | Échange code → token Integration |
| `vercel-api` | Proxy (étendu : create project, create deployment) |
| `github-oauth-callback` | Échange code → token GitHub |
| `github-api` | Proxy GH (repos, orgs, branches) |
| `zoho-mail` | Provisioning Zoho |
| `mailcheap-api` | Provisioning Mailcheap |
| `porkbun-api` | Domaines + DNS Porkbun |
| `cloudflare-api` | Zones + DNS Cloudflare |

| Secret | Source |
|---|---|
| `VERCEL_CLIENT_ID`, `VERCEL_CLIENT_SECRET`, `VERCEL_INTEGRATION_SLUG` | Vercel Integration Console |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub OAuth Apps |
| `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ORG_ID` | Zoho API Console |
| `MAILCHEAP_API_KEY` | Mailcheap dashboard |
| `PORKBUN_API_KEY`, `PORKBUN_SECRET_API_KEY` | Porkbun account |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard |

Aucune table SQL nouvelle requise — tout passe par `connected_accounts` (provider = `vercel` | `github` | `zoho` | `mailcheap` | `porkbun` | `cloudflare`).

---

## Ordre d'exécution une fois approuvé

1. Demander les 3 secrets Vercel + 2 GitHub (bloquant pour le workflow E2E).
2. Implémenter Vercel OAuth + GitHub OAuth + page CI/CD réelle.
3. Tester un déploiement réel d'un repo GH.
4. Enchaîner Zoho → Mailcheap → Porkbun → Cloudflare (chacun derrière son propre add_secret).
5. Audit final : verify_credentials sur tous, statuts Live dans Settings.

**Question avant d'attaquer** : tu confirmes que tu peux créer toi-même la Vercel Integration et l'OAuth App GitHub (je te guide pas-à-pas) ? Si oui, j'attaque le code dès l'approbation et te demande les secrets juste après.