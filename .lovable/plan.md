# Phase Backend Réel — Intégrations Live

Objectif: passer chaque module du mock au réel, dans l'ordre de priorité demandé. À chaque étape: edge functions + UI branchée + badge `Live` + tests.

## 0. Prérequis transverses (à faire en premier)

- Table `connected_accounts` (user_id, provider, access_token, refresh_token, expires_at, scopes, metadata jsonb, RLS strict user_id = auth.uid())
- Table `profiles` (id, user_id unique, display_name, avatar_url, locale, plan) + trigger auto-création sur signup
- Table `user_roles` + enum `app_role` + fonction `has_role()` SECURITY DEFINER (pattern obligatoire — pas de role sur profiles)
- Hook `useIntegration(provider)` → `{ connected, data, loading, connect, disconnect, refresh }`
- Helper `callEdge(name, body)` avec gestion erreur uniforme + toast

## 1. Standards — Auth & fondations

**Auth Lovable Cloud:**

- Email/password + Google OAuth (via `lovable.auth.signInWithOAuth`)
- Refonte `Auth.tsx`: form signup/login propre, validation Zod, `emailRedirectTo: window.location.origin`
- Page `/reset-password` (requise par les règles)
- `App.tsx`: provider `useAuth()` global, `onAuthStateChange` + `getSession()`, redirect garde sur `/dashboard/*`
- `DashboardLayout`: avatar/menu réel depuis `profiles`, logout, switch lang persisté

**Lovable AI Gateway:** déjà branché sur Builder — étendre à UIGen (génération composants) et Backend (génération SQL/policies via prompt).

**Resend:** déjà connecté — câbler 3 templates transactionnels:

- Welcome (post-signup)
- Deploy failed (alerte)
- Invite team member

**Settings → Integrations:** statut live (Lovable AI ✓, Resend ✓, Auth ✓) + scopes affichés + bouton disconnect.

## 2. Vercel — fidélité pixel à leur app

Cible: reproduire le flow Vercel (Import Git Repository → Configure Project → Deploy → Dashboard projet avec Deployments/Analytics/Logs/Settings).

**Auth Vercel:** input Personal Access Token (`vercel.com/account/tokens`) — stocké dans `connected_accounts` chiffré.

- Pourquoi token et pas OAuth: Vercel OAuth réservé aux Integrations Marketplace (validation manuelle). Token est l'approche standard pour les outils tiers.

**Edge functions:**

- `vercel-verify-token` (GET `/v2/user`)
- `vercel-list-projects` (GET `/v9/projects`)
- `vercel-list-deployments` (GET `/v6/deployments?projectId=`)
- `vercel-get-deployment` (GET `/v13/deployments/{id}`)
- `vercel-deployment-logs` (GET `/v2/deployments/{id}/events`, stream SSE)
- `vercel-create-deployment` (POST `/v13/deployments`)
- `vercel-promote-deployment` (POST `/v9/projects/{id}/promote/{deploymentId}`)
- `vercel-cancel-deployment` (PATCH `/v12/deployments/{id}/cancel`)
- `vercel-list-domains`, `vercel-add-domain`, `vercel-list-env`, `vercel-set-env`

**UI à compléter (CICD + Deploy):**

- Étape Import: liste repos Vercel projects existants OU choix nouveau depuis GitHub
- Étape Configure: framework auto-detect (icônes Next/Vite/Remix/Astro/SvelteKit), Build Command, Output Dir, Install Command, Root Dir, Environment Variables editor (ajout/edit/delete, scope Production/Preview/Development)
- Onglets projet Vercel-style: `Overview` | `Deployments` | `Analytics` | `Logs` | `Settings`
- Deployments table: status badge (Ready/Building/Error/Canceled), commit msg, branch, durée, "..." menu (Promote/Redeploy/Cancel/View Logs)
- Logs streaming runtime + build séparés
- Domains tab: ajout domaine, vérification DNS auto, Edge config

## 3. GitHub — OAuth complet

**Setup:** user crée OAuth App sur `github.com/settings/developers` → fournit `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`.

**Edge functions:**

- `github-oauth-start` (génère state, redirect `github.com/login/oauth/authorize`)
- `github-oauth-callback` (échange code → token, stocke en DB, redirect dashboard)
- `github-list-repos` (GET `/user/repos?per_page=100&sort=updated`)
- `github-list-branches`, `github-get-repo`, `github-create-webhook`
- `github-list-commits` (pour Deployments commit msg)

**UI:**

- CICD: vraie liste repos avec search, filter org/personal, last commit
- Webhook auto sur push → trigger redeploy Vercel
- Composant `GitHubOAuthDialog` actuel reste pour le mock fallback

## 4. Zoho Mail — OAuth + provisioning

**Setup:** user crée Self-Client sur `api-console.zoho.com` → `ZOHO_CLIENT_ID` + `ZOHO_CLIENT_SECRET`.

**Edge functions:**

- `zoho-oauth-start` (scopes: `ZohoMail.organization.accounts.ALL`, `ZohoMail.organization.domains.ALL`)
- `zoho-oauth-callback` (region-aware: `.com`/`.eu`/`.in`)
- `zoho-add-domain` (POST `/api/organization/{orgId}/domains`)
- `zoho-verify-domain` (DNS TXT check)
- `zoho-create-mailbox` (POST `/api/organization/{orgId}/accounts`)
- `zoho-list-mailboxes`

**UI EmailSetup pixel-close:**

- Étape 1: Add domain
- Étape 2: DNS records (MX, SPF TXT, DKIM, verification TXT) avec copy-to-clipboard, statut propagation polling
- Étape 3: Create mailboxes (admin + aliases)
- Étape 4: Inbox preview avec composer (envoi via Zoho API)

## 5. Namecheap — domaines  
  
//NOTE: MOVE TO CLOUDFLARE IF IS BETER OR USE MULTI-REGISTRA

**Setup:** user récupère API key sur `ap.www.namecheap.com/Profile/Tools/ApiAccess` + whitelist IP edge functions Supabase.

- Note: Namecheap whitelist par IP — edge functions ont IPs dynamiques. Workaround: proxy via service IP statique OU recommander Porkbun/Cloudflare Registrar (API plus moderne, pas de whitelist).

**Edge functions:**

- `namecheap-domains-check` (availability)
- `namecheap-domains-create` (purchase via wallet)
- `namecheap-domains-list`
- `namecheap-dns-set-hosts` (manage records)
- `namecheap-domains-renew`

**UI Domains:**

- Search + buy flow avec preview prix XOF/USD (conversion live)
- DNS editor inline (A, AAAA, CNAME, MX, TXT, SRV)
- Auto-renew toggle
- Drawer "Connect to Vercel project" → set CNAME auto

## 6. Oubliés — couverture complète

**Stripe (Billing):** `enable_stripe_payments` → checkout réel, customer portal, webhooks (`stripe-webhook` edge function). Plans: Free / Starter $9 / Pro $29 / Enterprise.

**Mobile Money (XOF):** MTN MoMo Open API (`momodeveloper.mtn.com` — sandbox dispo), Orange Money API (`developer.orange.com`), Wave (API publique limitée — fallback paiement par lien). Edge functions `momo-collect`, `orange-collect`, webhook callbacks.

**Monitoring:** brancher Vercel Analytics API + Sentry (optionnel — connector si dispo) pour erreurs réelles. Sinon Logflare via Supabase logs.

**Storage (Backend module):** Supabase Storage buckets réels — upload/list/download/delete, policies par user.

**Realtime:** activer sur table `deployments` pour live updates dashboard sans refresh.

## 7. Tests & vérifications finales

Pour chaque intégration:

- **Test edge function:** `supabase--curl_edge_functions` avec cas nominal + cas erreur (token invalide, scope manquant)
- **Test UI:** flow complet connect → action → disconnect → reconnect
- **Test sécurité:** RLS bloque cross-user, secrets jamais exposés au client, validation Zod sur tous les inputs
- **Test logs:** `supabase--edge_function_logs` propres, pas de leaks token
- Badge `Live` apparaît une fois connecté, `Demo` sinon
- Toast confirmation/erreur uniformes

## 8. Détails techniques

```text
connected_accounts
├── id uuid pk
├── user_id uuid (RLS: auth.uid() = user_id)
├── provider text (vercel|github|zoho|namecheap|stripe)
├── access_token text (chiffré via pgsodium si dispo, sinon vault)
├── refresh_token text nullable
├── expires_at timestamptz nullable
├── scopes text[]
├── metadata jsonb (orgId Zoho, teamId Vercel, etc.)
├── created_at, updated_at
└── unique (user_id, provider)
```

- Tous les edge functions: CORS, JWT verify in-code (pas dans config.toml), Zod input, error envelope uniforme
- Refresh token automatique via wrapper `getValidToken(userId, provider)` qui rafraîchit si `expires_at < now() + 5min`
- i18n: clés FR/EN pour chaque libellé d'intégration

## 9. Ordre de livraison concret

**Passe 1 (cette itération):** Sections 0 + 1 + 2 (auth standards complets + Vercel intégral). Charge ~25 fichiers + 10 edge functions.

**Passe 2:** Section 3 (GitHub OAuth) — demandera `GITHUB_CLIENT_ID/SECRET`.

**Passe 3:** Section 4 (Zoho) — demandera `ZOHO_CLIENT_ID/SECRET` + région.

**Passe 4:** Section 5 (Namecheap ou Porkbun selon décision) + section 6 oubliés + section 7 tests E2E.

## ⚠️ Décisions à confirmer avant de démarrer

1. **Vercel auth:** Personal Access Token (recommandé, marche tout de suite) ou attendre OAuth Marketplace (semaines de validation) ? : ASK ME IN CHAT
2. **Namecheap vs alternative:** garder Namecheap malgré contrainte IP whitelist, ou switch Porkbun/Cloudflare Registrar ? : MOVE TO CLOUDFLARE FIRST IF IS BETER OR USE MULTI-REGISTRA
3. **Stripe:** activer maintenant en passe 1 (billing live) ou plus tard ? : NOW IF USER INTERVENTION IS NOT NEED ELSE AFTER
4. **Mobile Money:** sandbox MTN/Orange suffit pour démo ou besoin prod (= contrats commerciaux à signer) ? : IGNORER POUR LE MOMENT,  NOUS PASSERONS PAR DES AGREGATEURS PLUS TARD 